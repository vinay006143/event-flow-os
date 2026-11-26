import mongoose from 'mongoose';
import { RefundModel } from './refund.model.js';
import { BookingModel } from '../bookings/booking.model.js';
import { PaymentModel } from '../payments/payment.model.js';
import { TicketModel } from '../tickets/ticket.model.js';
import { AttendeeModel } from '../attendees/attendee.model.js';
import { TicketTypeModel } from '../ticket-types/ticket-type.model.js';
import { getOrCreateEventConfig } from '../event/event.service.js';
import { transitionBookingStatus } from '../bookings/booking.service.js';
import { getPaymentGatewayAdapter } from '../payments/phonepe.adapter.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors.js';
import { randomCode } from '../../utils/crypto.js';
import { recordAudit } from '../audit/audit.service.js';
async function findBookingByIdOrRef(idOrRef) {
    const cleaned = idOrRef.trim();
    if (mongoose.isValidObjectId(cleaned)) {
        const byId = await BookingModel.findById(cleaned);
        if (byId)
            return byId;
    }
    return BookingModel.findOne({ bookingReference: cleaned.toUpperCase() });
}
export async function processRefund(params, actor, req) {
    const booking = await findBookingByIdOrRef(params.bookingId);
    if (!booking)
        throw new NotFoundError('Booking not found');
    if (!['PAID', 'PARTIALLY_REFUNDED', 'CANCELLED'].includes(booking.status)) {
        throw new BadRequestError(`Booking in ${booking.status} state is not eligible for refund`);
    }
    const payment = await PaymentModel.findOne({
        bookingId: booking._id,
        status: { $in: ['COMPLETED', 'PARTIALLY_REFUNDED'] },
    });
    if (!payment) {
        throw new BadRequestError('No completed payment found for this booking');
    }
    const remainingEligible = Math.max(0, payment.amount - payment.refundedAmount);
    if (remainingEligible <= 0) {
        throw new ConflictError('Booking has already been fully refunded', 'ALREADY_FULLY_REFUNDED');
    }
    const requestedAmount = params.amount !== undefined ? params.amount : remainingEligible;
    if (requestedAmount <= 0 || requestedAmount > remainingEligible) {
        throw new BadRequestError(`Refund amount ₹${requestedAmount} exceeds eligible remaining amount ₹${remainingEligible}`, 'REFUND_LIMIT_EXCEEDED');
    }
    // Prevent refunding already checked-in tickets
    const ticketFilter = { bookingId: booking._id, status: { $in: ['ISSUED', 'CHECKED_IN'] } };
    if (params.ticketIds && params.ticketIds.length > 0) {
        ticketFilter.ticketId = { $in: params.ticketIds };
    }
    const targetTickets = await TicketModel.find(ticketFilter);
    const checkedIn = targetTickets.filter((t) => t.status === 'CHECKED_IN');
    if (checkedIn.length > 0) {
        throw new BadRequestError(`Ticket(s) ${checkedIn.map((t) => t.ticketId).join(', ')} already checked in and cannot be refunded`);
    }
    const refundReference = `REF-${booking.bookingReference}-${randomCode(5)}`;
    const refundType = requestedAmount >= remainingEligible ? 'FULL' : 'PARTIAL';
    const refundDoc = await RefundModel.create({
        refundReference,
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        paymentId: payment._id,
        merchantTransactionId: payment.merchantTransactionId,
        refundType,
        ticketIds: targetTickets.map((t) => t.ticketId),
        amount: requestedAmount,
        amountPaise: Math.round(requestedAmount * 100),
        reason: params.reason,
        status: 'INITIATED',
        actorId: actor.id,
        actorEmail: actor.email,
    });
    const adapter = getPaymentGatewayAdapter();
    const providerResult = payment.amountPaise === 0
        ? { status: 'COMPLETED', providerRefundId: `FREE-${refundReference}`, rawResponse: { free: true } }
        : await adapter.initiateRefund({
            merchantTransactionId: payment.merchantTransactionId,
            merchantRefundId: refundReference,
            amountPaise: Math.round(requestedAmount * 100),
        });
    if (providerResult.status === 'FAILED') {
        refundDoc.status = 'FAILED';
        refundDoc.providerResponse = providerResult.rawResponse;
        await refundDoc.save();
        throw new BadRequestError(providerResult.errorMessage ?? 'Provider refund failed');
    }
    refundDoc.status = providerResult.status;
    refundDoc.providerRefundId = providerResult.providerRefundId;
    refundDoc.providerResponse = providerResult.rawResponse;
    if (providerResult.status === 'COMPLETED') {
        refundDoc.completedAt = new Date();
    }
    await refundDoc.save();
    // Only finalize refund accounting & ticket revocation when provider confirms
    if (providerResult.status === 'COMPLETED') {
        payment.refundedAmount += requestedAmount;
        payment.status = payment.refundedAmount >= payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
        await payment.save();
        booking.refundedAmount += requestedAmount;
        await booking.save();
        const nextBookingStatus = payment.refundedAmount >= payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
        await transitionBookingStatus(String(booking._id), nextBookingStatus, {
            actor: actor.email,
            reason: `Refund ${refundReference}: ${params.reason}`,
        });
        const eventConfig = await getOrCreateEventConfig();
        for (const ticket of targetTickets) {
            if (ticket.status === 'ISSUED') {
                ticket.status = 'REFUNDED';
                ticket.revokedAt = new Date();
                ticket.revokedReason = `Refunded (${refundReference})`;
                await ticket.save();
                await AttendeeModel.updateOne({ _id: ticket.attendeeId }, { $set: { status: 'REFUNDED' } });
                if (eventConfig.operations.restoreInventoryOnRefund) {
                    await TicketTypeModel.updateOne({ _id: ticket.ticketTypeId, soldQuantity: { $gte: 1 } }, { $inc: { soldQuantity: -1 } });
                }
            }
        }
    }
    else {
        await transitionBookingStatus(String(booking._id), 'REFUND_PENDING', {
            actor: actor.email,
            reason: `Refund pending at provider (${refundReference})`,
        });
    }
    await recordAudit({
        actorId: actor.id,
        actorRole: 'admin',
        actorEmail: actor.email,
        action: 'REFUND_PROCESSED',
        entityType: 'Refund',
        entityId: String(refundDoc._id),
        entityReference: refundReference,
        req,
        metadata: {
            bookingReference: booking.bookingReference,
            amount: requestedAmount,
            status: refundDoc.status,
            ticketIds: refundDoc.ticketIds,
        },
    });
    return refundDoc;
}
export async function cancelBookingOrTicket(params, actor, req) {
    const booking = await findBookingByIdOrRef(params.bookingId);
    if (!booking)
        throw new NotFoundError('Booking not found');
    const eventConfig = await getOrCreateEventConfig();
    if (params.ticketId) {
        const ticket = await TicketModel.findOne({ bookingId: booking._id, ticketId: params.ticketId });
        if (!ticket)
            throw new NotFoundError('Ticket not found in booking');
        if (ticket.status === 'CHECKED_IN') {
            throw new BadRequestError('Cannot cancel a ticket that has already checked in');
        }
        if (ticket.status !== 'ISSUED') {
            throw new BadRequestError(`Ticket is already ${ticket.status}`);
        }
        ticket.status = 'CANCELLED';
        ticket.revokedAt = new Date();
        ticket.revokedReason = params.reason;
        await ticket.save();
        await AttendeeModel.updateOne({ _id: ticket.attendeeId }, { $set: { status: 'CANCELLED' } });
        if (eventConfig.operations.restoreInventoryOnCancel) {
            await TicketTypeModel.updateOne({ _id: ticket.ticketTypeId, soldQuantity: { $gte: 1 } }, { $inc: { soldQuantity: -1 } });
        }
        await recordAudit({
            actorId: actor.id,
            actorRole: 'admin',
            actorEmail: actor.email,
            action: 'TICKET_CANCELLED',
            entityType: 'Ticket',
            entityId: String(ticket._id),
            entityReference: ticket.ticketId,
            req,
            metadata: { reason: params.reason },
        });
        return { cancelledTicket: ticket };
    }
    const tickets = await TicketModel.find({ bookingId: booking._id, status: { $in: ['ISSUED', 'CHECKED_IN'] } });
    if (tickets.some((t) => t.status === 'CHECKED_IN')) {
        throw new BadRequestError('Cannot cancel a booking containing checked-in tickets');
    }
    for (const ticket of tickets) {
        ticket.status = 'CANCELLED';
        ticket.revokedAt = new Date();
        ticket.revokedReason = params.reason;
        await ticket.save();
        await AttendeeModel.updateOne({ _id: ticket.attendeeId }, { $set: { status: 'CANCELLED' } });
        if (eventConfig.operations.restoreInventoryOnCancel) {
            await TicketTypeModel.updateOne({ _id: ticket.ticketTypeId, soldQuantity: { $gte: 1 } }, { $inc: { soldQuantity: -1 } });
        }
    }
    const updatedBooking = await transitionBookingStatus(String(booking._id), 'CANCELLED', {
        actor: actor.email,
        reason: params.reason,
    });
    await recordAudit({
        actorId: actor.id,
        actorRole: 'admin',
        actorEmail: actor.email,
        action: 'BOOKING_CANCELLED',
        entityType: 'Booking',
        entityId: String(booking._id),
        entityReference: booking.bookingReference,
        req,
        metadata: { reason: params.reason },
    });
    return { booking: updatedBooking };
}
//# sourceMappingURL=refund.service.js.map