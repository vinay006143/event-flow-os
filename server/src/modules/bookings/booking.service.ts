import type { Request } from 'express';
import { canTransitionBooking, type BookingStatus, type CreateBookingInput } from '@eventflow/shared';
import { BookingModel, type IBooking } from './booking.model.js';
import { AttendeeModel } from '../attendees/attendee.model.js';
import { ReservationModel } from '../reservations/reservation.model.js';
import { TicketTypeModel } from '../ticket-types/ticket-type.model.js';
import { getOrCreateEventConfig } from '../event/event.service.js';
import {
  consumePromoCodeAtomically,
  validateAndCalculatePromo,
} from '../promo-codes/promo-code.service.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors.js';
import { generateBookingReference, randomToken, sha256 } from '../../utils/crypto.js';
import { recordAudit } from '../audit/audit.service.js';

export async function transitionBookingStatus(
  bookingId: string,
  toStatus: BookingStatus,
  options?: { reason?: string; actor?: string },
): Promise<IBooking> {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) throw new NotFoundError('Booking not found');

  if (!canTransitionBooking(booking.status, toStatus)) {
    throw new ConflictError(
      `Invalid booking state transition from ${booking.status} to ${toStatus}`,
      'INVALID_STATE_TRANSITION',
    );
  }

  const fromStatus = booking.status;
  if (fromStatus === toStatus) return booking;

  booking.status = toStatus;
  if (toStatus === 'PAID' && !booking.paidAt) booking.paidAt = new Date();
  if (toStatus === 'CANCELLED' && !booking.cancelledAt) booking.cancelledAt = new Date();
  booking.history.push({
    fromStatus,
    toStatus,
    reason: options?.reason,
    actor: options?.actor ?? 'system',
    at: new Date(),
  });
  await booking.save();
  return booking;
}

export async function createBookingFromReservation(
  input: CreateBookingInput,
  req?: Request,
): Promise<{ booking: IBooking; attendees: Awaited<ReturnType<typeof AttendeeModel.find>>; retrievalToken: string }> {
  if (input.idempotencyKey) {
    const existing = await BookingModel.findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) {
      const attendees = await AttendeeModel.find({ bookingId: existing._id }).sort({ attendeeIndex: 1 });
      const freshToken = randomToken(24);
      existing.retrievalTokenHash = sha256(freshToken);
      await existing.save();
      return { booking: existing, attendees, retrievalToken: freshToken };
    }
  }

  const eventConfig = await getOrCreateEventConfig();
  if (!eventConfig.operations.registrationOpen || !eventConfig.operations.salesOpen) {
    throw new BadRequestError('Event registration is currently paused', 'REGISTRATION_PAUSED');
  }

  const reservation = await ReservationModel.findById(input.reservationId);
  if (!reservation) {
    throw new NotFoundError('Reservation not found');
  }
  if (reservation.status !== 'ACTIVE') {
    throw new BadRequestError(`Reservation is ${reservation.status}`, 'RESERVATION_NOT_ACTIVE');
  }
  if (reservation.expiresAt <= new Date()) {
    throw new BadRequestError('Your ticket reservation has expired. Please select tickets again.', 'RESERVATION_EXPIRED');
  }

  // Verify attendee counts match reserved ticket categories exactly
  if (input.attendees.length !== reservation.totalQuantity) {
    throw new BadRequestError(
      `Expected ${reservation.totalQuantity} attendee records, received ${input.attendees.length}`,
      'ATTENDEE_COUNT_MISMATCH',
    );
  }

  const reservedByType = new Map<string, { qty: number; name: string; code: string; unitPrice: number }>();
  for (const item of reservation.items) {
    reservedByType.set(String(item.ticketTypeId), {
      qty: item.quantity,
      name: item.ticketTypeName,
      code: item.ticketTypeCode,
      unitPrice: item.unitPrice,
    });
  }

  const providedCountByType = new Map<string, number>();
  for (const att of input.attendees) {
    providedCountByType.set(att.ticketTypeId, (providedCountByType.get(att.ticketTypeId) ?? 0) + 1);
  }

  for (const [ttId, meta] of reservedByType.entries()) {
    if (providedCountByType.get(ttId) !== meta.qty) {
      throw new BadRequestError(
        `Attendee allocation mismatch for ${meta.name}`,
        'ATTENDEE_CATEGORY_MISMATCH',
      );
    }
  }

  // Validate dynamic registration fields per attendee
  const enabledFields = eventConfig.registrationFields.filter((f) => f.enabled);
  for (let idx = 0; idx < input.attendees.length; idx++) {
    const att = input.attendees[idx]!;
    for (const field of enabledFields) {
      if (
        field.categoryRestrictions &&
        field.categoryRestrictions.length > 0 &&
        !field.categoryRestrictions.includes(att.ticketTypeId)
      ) {
        continue;
      }
      const val =
        field.key === 'fullName'
          ? att.fullName
          : field.key === 'age'
            ? att.age
            : field.key === 'mobile'
              ? att.mobile
              : field.key === 'email'
                ? att.email
                : att.customFields?.[field.key];

      if (field.required && (val === undefined || val === null || val === '')) {
        throw new BadRequestError(
          `Attendee #${idx + 1}: "${field.label}" is required`,
          'REQUIRED_REGISTRATION_FIELD',
        );
      }
      if (field.type === 'number' && val !== undefined && val !== '') {
        const num = Number(val);
        if (Number.isNaN(num)) {
          throw new BadRequestError(`Attendee #${idx + 1}: "${field.label}" must be a number`);
        }
        if (field.min !== undefined && num < field.min) {
          throw new BadRequestError(`Attendee #${idx + 1}: "${field.label}" must be at least ${field.min}`);
        }
        if (field.max !== undefined && num > field.max) {
          throw new BadRequestError(`Attendee #${idx + 1}: "${field.label}" must be at most ${field.max}`);
        }
      }
    }
  }

  // Re-evaluate promo code on server with primaryContact.mobile (enforces perUserLimit)
  const promoCodeStr = input.promoCode ?? reservation.promoCode;
  let discountAmount = 0;
  let appliedPromoId: string | undefined;
  let appliedPromoCode: string | undefined;

  if (promoCodeStr) {
    const promoResult = await validateAndCalculatePromo({
      code: promoCodeStr,
      items: reservation.items.map((i) => ({
        ticketTypeId: String(i.ticketTypeId),
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      })),
      userMobile: input.primaryContact.mobile,
    });
    discountAmount = promoResult.discountAmount;
    appliedPromoId = String(promoResult.promoCode._id);
    appliedPromoCode = promoResult.promoCode.code;
  }

  const finalAmount = Math.max(0, reservation.subtotalAmount - discountAmount);
  const retrievalToken = randomToken(24);
  const bookingReference = generateBookingReference(eventConfig.eventCode);

  const booking = await BookingModel.create({
    bookingReference,
    reservationId: reservation._id,
    primaryContact: input.primaryContact,
    items: reservation.items,
    totalTickets: reservation.totalQuantity,
    subtotalAmount: reservation.subtotalAmount,
    discountAmount,
    finalAmount,
    currency: 'INR',
    promoCode: appliedPromoCode,
    status: 'RESERVED',
    whatsappOptIn: input.whatsappOptIn,
    retrievalTokenHash: sha256(retrievalToken),
    idempotencyKey: input.idempotencyKey,
    history: [{ toStatus: 'RESERVED', actor: 'public', reason: 'Booking created from reservation', at: new Date() }],
  });

  if (appliedPromoId && appliedPromoCode) {
    try {
      await consumePromoCodeAtomically({
        promoCodeId: appliedPromoId,
        code: appliedPromoCode,
        bookingId: String(booking._id),
        userMobile: input.primaryContact.mobile,
        userEmail: input.primaryContact.email,
        discountApplied: discountAmount,
      });
    } catch (err) {
      await BookingModel.deleteOne({ _id: booking._id });
      throw err;
    }
  }

  const attendeeDocs = input.attendees.map((att, index) => {
    const meta = reservedByType.get(att.ticketTypeId)!;
    return {
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      ticketTypeId: att.ticketTypeId,
      ticketTypeName: meta.name,
      ticketTypeCode: meta.code,
      attendeeIndex: index + 1,
      fullName: att.fullName,
      age: att.age,
      mobile: att.mobile,
      email: att.email || input.primaryContact.email,
      customFields: att.customFields ?? {},
      status: 'ACTIVE' as const,
    };
  });

  const attendees = await AttendeeModel.insertMany(attendeeDocs);

  await recordAudit({
    actorRole: 'public',
    action: 'BOOKING_CREATED',
    entityType: 'Booking',
    entityId: String(booking._id),
    entityReference: booking.bookingReference,
    req,
    metadata: { totalTickets: booking.totalTickets, finalAmount: booking.finalAmount },
  });

  return { booking, attendees, retrievalToken };
}

export async function finalizeReservationToSold(booking: IBooking): Promise<void> {
  const reservation = await ReservationModel.findOneAndUpdate(
    { _id: booking.reservationId, status: 'ACTIVE' },
    { $set: { status: 'CONVERTED', convertedBookingId: booking._id } },
    { new: true },
  );

  if (reservation) {
    for (const item of reservation.items) {
      await TicketTypeModel.updateOne(
        { _id: item.ticketTypeId },
        {
          $inc: {
            reservedQuantity: -item.quantity,
            soldQuantity: item.quantity,
          },
        },
      );
    }
  }
}
