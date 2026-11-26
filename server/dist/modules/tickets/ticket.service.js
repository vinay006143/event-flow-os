import { BookingModel } from '../bookings/booking.model.js';
import { AttendeeModel } from '../attendees/attendee.model.js';
import { getOrCreateEventConfig } from '../event/event.service.js';
import { RetrievalOtpModel, TicketModel } from './ticket.model.js';
import { renderTicketPdf, renderTicketPng } from './ticket.renderer.js';
import { storageService } from '../../services/storage.service.js';
import { generateNumericOtp, generateTicketId, randomToken, sha256, signQrToken, } from '../../utils/crypto.js';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../utils/errors.js';
import { recordAudit } from '../audit/audit.service.js';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
export async function issueTicketsForPaidBooking(bookingId) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking)
        throw new NotFoundError('Booking not found');
    if (booking.status !== 'PAID') {
        throw new BadRequestError('Tickets can only be issued after verified payment', 'PAYMENT_NOT_VERIFIED');
    }
    booking.ticketGenerationStatus = 'PENDING';
    booking.ticketGenerationError = undefined;
    await booking.save();
    try {
        const eventConfig = await getOrCreateEventConfig();
        const attendees = await AttendeeModel.find({
            bookingId: booking._id,
            status: 'ACTIVE',
        }).sort({ attendeeIndex: 1 });
        const issuedTickets = [];
        for (const attendee of attendees) {
            let ticket = await TicketModel.findOne({
                attendeeId: attendee._id,
                status: { $in: ['ISSUED', 'CHECKED_IN'] },
            });
            if (!ticket) {
                const ticketId = generateTicketId(eventConfig.eventCode);
                const secureReference = randomToken(16);
                const { token, tokenHash } = signQrToken(ticketId, eventConfig.eventCode);
                ticket = await TicketModel.create({
                    ticketId,
                    secureReference,
                    bookingId: booking._id,
                    bookingReference: booking.bookingReference,
                    attendeeId: attendee._id,
                    ticketTypeId: attendee.ticketTypeId,
                    ticketTypeName: attendee.ticketTypeName,
                    ticketTypeCode: attendee.ticketTypeCode,
                    eventCode: eventConfig.eventCode,
                    attendeeName: attendee.fullName,
                    attendeeMobile: attendee.mobile,
                    qrToken: token,
                    qrTokenHash: tokenHash,
                    status: 'ISSUED',
                    issuedAt: new Date(),
                });
            }
            if (!ticket.pdfStorageKey || !ticket.imageStorageKey) {
                const [pdfBuf, pngBuf] = await Promise.all([
                    renderTicketPdf(ticket, eventConfig),
                    renderTicketPng(ticket, eventConfig, attendee.age),
                ]);
                const pdfKey = await storageService.putObject(`tickets/${booking.bookingReference}/${ticket.ticketId}.pdf`, pdfBuf, 'application/pdf');
                const imgKey = await storageService.putObject(`tickets/${booking.bookingReference}/${ticket.ticketId}-minimal-8x14.png`, pngBuf, 'image/png');
                ticket.pdfStorageKey = pdfKey;
                ticket.imageStorageKey = imgKey;
                await ticket.save();
            }
            issuedTickets.push(ticket);
        }
        booking.ticketGenerationStatus = 'COMPLETED';
        booking.ticketsIssuedAt = booking.ticketsIssuedAt ?? new Date();
        await booking.save();
        return issuedTickets;
    }
    catch (err) {
        booking.ticketGenerationStatus = 'FAILED';
        booking.ticketGenerationError = err instanceof Error ? err.message : 'Ticket generation failed';
        await booking.save();
        logger.error({ err, bookingId }, 'Ticket generation failed for paid booking');
        throw err;
    }
}
export async function renderOrFetchTicketAsset(ticket, format) {
    const key = format === 'pdf' ? ticket.pdfStorageKey : ticket.imageStorageKey;
    if (key) {
        try {
            return await storageService.getObject(key);
        }
        catch {
            // Regenerate below if missing on disk
        }
    }
    const [eventConfig, attendee] = await Promise.all([
        getOrCreateEventConfig(),
        AttendeeModel.findById(ticket.attendeeId).select('age').lean(),
    ]);
    const buf = format === 'pdf'
        ? await renderTicketPdf(ticket, eventConfig)
        : await renderTicketPng(ticket, eventConfig, attendee?.age);
    const ext = format === 'pdf' ? 'pdf' : 'shiva-8x14.png';
    const savedKey = await storageService.putObject(`tickets/${ticket.bookingReference}/${ticket.ticketId}-${ext}`, buf, format === 'pdf' ? 'application/pdf' : 'image/png');
    if (format === 'pdf')
        ticket.pdfStorageKey = savedKey;
    else
        ticket.imageStorageKey = savedKey;
    await ticket.save();
    return buf;
}
export async function revokeTicket(ticketDocId, reason, actor, req) {
    const ticket = await TicketModel.findById(ticketDocId);
    if (!ticket)
        throw new NotFoundError('Ticket not found');
    if (ticket.status === 'REVOKED' || ticket.status === 'REFUNDED' || ticket.status === 'CANCELLED') {
        throw new BadRequestError(`Ticket is already ${ticket.status}`);
    }
    ticket.status = 'REVOKED';
    ticket.revokedAt = new Date();
    ticket.revokedReason = reason;
    await ticket.save();
    await recordAudit({
        actorId: actor.id,
        actorRole: 'admin',
        actorEmail: actor.email,
        action: 'TICKET_REVOKED',
        entityType: 'Ticket',
        entityId: String(ticket._id),
        entityReference: ticket.ticketId,
        req,
        metadata: { reason },
    });
    return ticket;
}
export async function reissueTicket(ticketDocId, reason, actor, req) {
    const oldTicket = await TicketModel.findById(ticketDocId);
    if (!oldTicket)
        throw new NotFoundError('Ticket not found');
    if (oldTicket.status === 'CHECKED_IN') {
        throw new BadRequestError('Cannot reissue an already checked-in ticket');
    }
    if (oldTicket.status === 'REFUNDED' || oldTicket.status === 'CANCELLED') {
        throw new BadRequestError(`Cannot reissue a ${oldTicket.status} ticket`);
    }
    const eventConfig = await getOrCreateEventConfig();
    const newTicketId = generateTicketId(eventConfig.eventCode);
    const { token, tokenHash } = signQrToken(newTicketId, eventConfig.eventCode);
    oldTicket.status = 'REISSUED';
    oldTicket.revokedAt = new Date();
    oldTicket.revokedReason = reason;
    oldTicket.reissuedToTicketId = newTicketId;
    await oldTicket.save();
    const newTicket = await TicketModel.create({
        ticketId: newTicketId,
        secureReference: randomToken(16),
        bookingId: oldTicket.bookingId,
        bookingReference: oldTicket.bookingReference,
        attendeeId: oldTicket.attendeeId,
        ticketTypeId: oldTicket.ticketTypeId,
        ticketTypeName: oldTicket.ticketTypeName,
        ticketTypeCode: oldTicket.ticketTypeCode,
        eventCode: eventConfig.eventCode,
        attendeeName: oldTicket.attendeeName,
        attendeeMobile: oldTicket.attendeeMobile,
        qrToken: token,
        qrTokenHash: tokenHash,
        status: 'ISSUED',
        issuedAt: new Date(),
        reissuedFromTicketId: oldTicket.ticketId,
    });
    await renderOrFetchTicketAsset(newTicket, 'pdf');
    await renderOrFetchTicketAsset(newTicket, 'png');
    await recordAudit({
        actorId: actor.id,
        actorRole: 'admin',
        actorEmail: actor.email,
        action: 'TICKET_REISSUED',
        entityType: 'Ticket',
        entityId: String(newTicket._id),
        entityReference: newTicket.ticketId,
        req,
        metadata: { oldTicketId: oldTicket.ticketId, reason },
    });
    return { oldTicket, newTicket };
}
export async function requestMyTicketsOtp(params) {
    const mobile = params.mobile?.trim();
    const bookingRef = params.bookingReference?.trim().toUpperCase();
    if (!mobile && !bookingRef) {
        throw new BadRequestError('Provide mobile number or booking reference');
    }
    let bookingFilter = { status: { $in: ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'CANCELLED'] } };
    if (bookingRef && mobile) {
        bookingFilter = { ...bookingFilter, bookingReference: bookingRef, 'primaryContact.mobile': mobile };
    }
    else if (bookingRef) {
        bookingFilter = { ...bookingFilter, bookingReference: bookingRef };
    }
    else if (mobile) {
        bookingFilter = { ...bookingFilter, 'primaryContact.mobile': mobile };
    }
    const booking = await BookingModel.findOne(bookingFilter).sort({ createdAt: -1 });
    if (!booking) {
        throw new NotFoundError('No confirmed booking found matching those details');
    }
    const lookupKey = booking.primaryContact.mobile;
    const otp = generateNumericOtp(6);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);
    await RetrievalOtpModel.deleteMany({ lookupKey });
    await RetrievalOtpModel.create({
        lookupKey,
        otpHash: sha256(otp),
        attempts: 0,
        expiresAt,
    });
    const maskedMobile = lookupKey.length > 4 ? `${'*'.repeat(lookupKey.length - 4)}${lookupKey.slice(-4)}` : lookupKey;
    return {
        lookupKey,
        maskedMobile,
        targetEmail: booking.primaryContact.email,
        expiresInMinutes: env.OTP_EXPIRES_MINUTES,
        // In development/test mode without live SMS gateway, expose devOtp for verification
        ...(env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
        rawOtpForNotification: otp,
    };
}
export async function verifyMyTicketsOtp(params) {
    const mobile = params.mobile?.trim();
    const bookingRef = params.bookingReference?.trim().toUpperCase();
    let lookupKey = mobile;
    if (!lookupKey && bookingRef) {
        const b = await BookingModel.findOne({ bookingReference: bookingRef });
        if (!b)
            throw new NotFoundError('Booking not found');
        lookupKey = b.primaryContact.mobile;
    }
    if (!lookupKey)
        throw new BadRequestError('Mobile number or booking reference required');
    const record = await RetrievalOtpModel.findOne({ lookupKey, expiresAt: { $gt: new Date() } }).sort({
        createdAt: -1,
    });
    if (!record) {
        throw new UnauthorizedError('OTP expired or not requested');
    }
    if (record.attempts >= 5) {
        throw new ForbiddenError('Maximum OTP verification attempts exceeded. Request a new OTP.');
    }
    if (record.otpHash !== sha256(params.otp.trim())) {
        record.attempts += 1;
        await record.save();
        throw new UnauthorizedError('Invalid OTP code');
    }
    const sessionToken = randomToken(32);
    record.verifiedTokenHash = sha256(sessionToken);
    await record.save();
    const bookings = await BookingModel.find({
        'primaryContact.mobile': lookupKey,
        ...(bookingRef ? { bookingReference: bookingRef } : {}),
        status: { $in: ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'CANCELLED'] },
    })
        .sort({ createdAt: -1 })
        .lean();
    const bookingIds = bookings.map((b) => b._id);
    const tickets = await TicketModel.find({
        bookingId: { $in: bookingIds },
        status: { $ne: 'REISSUED' },
    }).lean();
    return {
        retrievalSessionToken: sessionToken,
        bookings,
        tickets,
    };
}
//# sourceMappingURL=ticket.service.js.map