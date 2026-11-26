import { Router } from 'express';
import { createBookingSchema } from '@eventflow/shared';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { getPagination, sendSuccess } from '../../utils/response.js';
import { NotFoundError, UnauthorizedError } from '../../utils/errors.js';
import { sha256 } from '../../utils/crypto.js';
import { BookingModel } from './booking.model.js';
import { AttendeeModel } from '../attendees/attendee.model.js';
import { TicketModel } from '../tickets/ticket.model.js';
import { PaymentModel } from '../payments/payment.model.js';
import { NotificationLogModel } from '../notifications/notification.model.js';
import { createBookingFromReservation } from './booking.service.js';
const router = Router();
router.post('/', validateBody(createBookingSchema), async (req, res, next) => {
    try {
        const result = await createBookingFromReservation(req.body, req);
        sendSuccess(res, {
            booking: result.booking,
            attendees: result.attendees,
            retrievalToken: result.retrievalToken,
        }, { statusCode: 201, message: 'Booking created, proceed to payment' });
    }
    catch (err) {
        next(err);
    }
});
// Public booking lookup requires the secret retrievalToken (not predictable bookingReference alone)
router.get('/public/:bookingReference', async (req, res, next) => {
    try {
        const token = String(req.query.token ?? req.headers['x-retrieval-token'] ?? '');
        if (!token)
            throw new UnauthorizedError('Retrieval token is required');
        const booking = await BookingModel.findOne({
            bookingReference: req.params.bookingReference.toUpperCase(),
        }).lean();
        if (!booking)
            throw new NotFoundError('Booking not found');
        if (booking.retrievalTokenHash !== sha256(token)) {
            throw new UnauthorizedError('Invalid booking retrieval token');
        }
        const [attendees, tickets, payment] = await Promise.all([
            AttendeeModel.find({ bookingId: booking._id }).sort({ attendeeIndex: 1 }).lean(),
            TicketModel.find({ bookingId: booking._id, status: { $ne: 'REISSUED' } }).lean(),
            PaymentModel.findOne({ bookingId: booking._id }).sort({ createdAt: -1 }).lean(),
        ]);
        sendSuccess(res, { booking, attendees, tickets, payment });
    }
    catch (err) {
        next(err);
    }
});
// Admin endpoints
router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = {};
        if (req.query.status)
            filter.status = String(req.query.status);
        if (req.query.search) {
            const q = String(req.query.search).trim();
            const matchingTickets = await TicketModel.find({ ticketId: new RegExp(q, 'i') })
                .select('bookingId')
                .lean();
            const bookingIds = matchingTickets.map((t) => t.bookingId);
            filter.$or = [
                { bookingReference: new RegExp(q, 'i') },
                { 'primaryContact.fullName': new RegExp(q, 'i') },
                { 'primaryContact.mobile': new RegExp(q, 'i') },
                { 'primaryContact.email': new RegExp(q, 'i') },
                ...(bookingIds.length > 0 ? [{ _id: { $in: bookingIds } }] : []),
            ];
        }
        const [items, total] = await Promise.all([
            BookingModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            BookingModel.countDocuments(filter),
        ]);
        sendSuccess(res, items, {
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const booking = await BookingModel.findById(req.params.id).lean();
        if (!booking)
            throw new NotFoundError('Booking not found');
        const [attendees, tickets, payments, notifications] = await Promise.all([
            AttendeeModel.find({ bookingId: booking._id }).sort({ attendeeIndex: 1 }).lean(),
            TicketModel.find({ bookingId: booking._id }).sort({ createdAt: -1 }).lean(),
            PaymentModel.find({ bookingId: booking._id }).sort({ createdAt: -1 }).lean(),
            NotificationLogModel.find({ bookingId: booking._id }).sort({ createdAt: -1 }).lean(),
        ]);
        sendSuccess(res, { booking, attendees, tickets, payments, notifications });
    }
    catch (err) {
        next(err);
    }
});
export const bookingRoutes = router;
//# sourceMappingURL=booking.routes.js.map