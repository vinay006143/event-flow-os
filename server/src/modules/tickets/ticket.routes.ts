import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { otpRateLimiter } from '../../middleware/rateLimit.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { getPagination, sendSuccess } from '../../utils/response.js';
import { NotFoundError, UnauthorizedError } from '../../utils/errors.js';
import { sha256 } from '../../utils/crypto.js';
import { RetrievalOtpModel, TicketModel } from './ticket.model.js';
import { BookingModel } from '../bookings/booking.model.js';
import { AttendeeModel } from '../attendees/attendee.model.js';
import { getOrCreateEventConfig } from '../event/event.service.js';
import {
  issueTicketsForPaidBooking,
  reissueTicket,
  renderOrFetchTicketAsset,
  requestMyTicketsOtp,
  revokeTicket,
  verifyMyTicketsOtp,
} from './ticket.service.js';
import { sendOtpNotification, dispatchBookingTicketsNotifications } from '../notifications/notification.service.js';

const router = Router();

// Public OTP request for My Tickets
const otpReqSchema = z.object({
  mobile: z.string().trim().optional(),
  bookingReference: z.string().trim().optional(),
});

router.post('/retrieve/request-otp', otpRateLimiter, validateBody(otpReqSchema), async (req, res, next) => {
  try {
    const result = await requestMyTicketsOtp(req.body);
    await sendOtpNotification({
      mobile: result.lookupKey,
      email: result.targetEmail,
      otp: result.rawOtpForNotification,
    });
    const { rawOtpForNotification: _hidden, ...safeResponse } = result;
    sendSuccess(res, safeResponse, { message: 'OTP sent to your registered contact' });
  } catch (err) {
    next(err);
  }
});

const otpVerifySchema = z.object({
  mobile: z.string().trim().optional(),
  bookingReference: z.string().trim().optional(),
  otp: z.string().trim().min(4).max(10),
});

router.post('/retrieve/verify-otp', otpRateLimiter, validateBody(otpVerifySchema), async (req, res, next) => {
  try {
    const data = await verifyMyTicketsOtp(req.body);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

// Public individual ticket view by unguessable secureReference
router.get('/pass/:secureReference', async (req, res, next) => {
  try {
    const ticket = await TicketModel.findOne({ secureReference: req.params.secureReference }).lean();
    if (!ticket) throw new NotFoundError('Ticket pass not found');
    const [event, attendee] = await Promise.all([
      getOrCreateEventConfig(),
      AttendeeModel.findById(ticket.attendeeId).select('age mobile email').lean(),
    ]);
    const rawMob = attendee?.mobile || ticket.attendeeMobile || '';
    const maskedMobile = rawMob.length > 4 ? `${'*'.repeat(Math.max(4, rawMob.length - 4))}${rawMob.slice(-4)}` : rawMob;

    sendSuccess(res, {
      ticket: {
        ticketId: ticket.ticketId,
        secureReference: ticket.secureReference,
        bookingReference: ticket.bookingReference,
        ticketTypeName: ticket.ticketTypeName,
        attendeeName: ticket.attendeeName,
        attendeeAge: attendee?.age ?? null,
        maskedMobile,
        qrToken: ticket.status === 'ISSUED' ? ticket.qrToken : null,
        status: ticket.status,
        issuedAt: ticket.issuedAt,
        checkedInAt: ticket.checkedInAt,
      },
      event: {
        name: event.name,
        subtitle: event.subtitle,
        eventDate: event.eventDate,
        doorsOpenTime: event.doorsOpenTime,
        timezone: event.timezone,
        venue: event.venue,
        contact: event.contact,
        highlights: event.highlights,
        artists: event.artists,
        partners: event.partners,
        ticketTemplate: event.ticketTemplate,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Download PDF or PNG by secureReference (or admin auth)
router.get('/pass/:secureReference/download', async (req, res, next) => {
  try {
    const format = req.query.format === 'png' ? 'png' : 'pdf';
    const ticket = await TicketModel.findOne({ secureReference: req.params.secureReference });
    if (!ticket) throw new NotFoundError('Ticket not found');

    const buf = await renderOrFetchTicketAsset(ticket, format);
    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'image/png');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${ticket.ticketId}.${format}"`,
    );
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

// Resend tickets via verified OTP retrieval session or booking retrieval token
router.post('/retrieve/resend', otpRateLimiter, async (req, res, next) => {
  try {
    const bookingRef = String(req.body.bookingReference ?? '').toUpperCase();
    const sessionToken = String(req.body.retrievalSessionToken ?? req.headers['x-retrieval-token'] ?? '');
    if (!bookingRef || !sessionToken) {
      throw new UnauthorizedError('Booking reference and retrieval session token are required');
    }
    const booking = await BookingModel.findOne({ bookingReference: bookingRef });
    if (!booking) throw new NotFoundError('Booking not found');

    const hash = sha256(sessionToken);
    const otpSession = await RetrievalOtpModel.findOne({
      lookupKey: booking.primaryContact.mobile,
      verifiedTokenHash: hash,
      expiresAt: { $gt: new Date() },
    });

    if (!otpSession && booking.retrievalTokenHash !== hash) {
      throw new UnauthorizedError('Invalid or expired retrieval session');
    }

    await dispatchBookingTicketsNotifications(String(booking._id));
    sendSuccess(res, { resent: true }, { message: 'Tickets queued for resend' });
  } catch (err) {
    next(err);
  }
});

// Admin ticket routes
router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query as Record<string, unknown>);
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.search) {
      const q = String(req.query.search).trim();
      filter.$or = [
        { ticketId: new RegExp(q, 'i') },
        { bookingReference: new RegExp(q, 'i') },
        { attendeeName: new RegExp(q, 'i') },
        { attendeeMobile: new RegExp(q, 'i') },
      ];
    }

    const [items, total] = await Promise.all([
      TicketModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      TicketModel.countDocuments(filter),
    ]);

    sendSuccess(res, items, {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/recover/:bookingId', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const tickets = await issueTicketsForPaidBooking(String(req.params.bookingId));
    sendSuccess(res, tickets, { message: `Recovered/issued ${tickets.length} ticket(s)` });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/revoke', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const reason = String(req.body.reason ?? 'Revoked by administrator');
    const ticket = await revokeTicket(
      String(req.params.id),
      reason,
      { id: req.user!.id, email: req.user!.email },
      req,
    );
    sendSuccess(res, ticket, { message: 'Ticket revoked' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reissue', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const reason = String(req.body.reason ?? 'Reissued by administrator');
    const result = await reissueTicket(
      String(req.params.id),
      reason,
      { id: req.user!.id, email: req.user!.email },
      req,
    );
    sendSuccess(res, result, { message: 'Ticket reissued with a fresh QR token' });
  } catch (err) {
    next(err);
  }
});

export const ticketRoutes = router;
