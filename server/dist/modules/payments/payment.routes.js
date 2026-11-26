import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { getPagination, sendSuccess } from '../../utils/response.js';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { PaymentModel, WebhookEventModel } from './payment.model.js';
import { BookingModel } from '../bookings/booking.model.js';
import { TicketModel } from '../tickets/ticket.model.js';
import { getPaymentGatewayAdapter } from './phonepe.adapter.js';
import { initiatePaymentForBooking, processPhonePeWebhook, settleVerifiedPayment, } from './payment.service.js';
const router = Router();
const initSchema = z.object({
    bookingId: z.string().min(1),
    idempotencyKey: z.string().min(8).max(128).optional(),
});
router.post('/initiate', validateBody(initSchema), async (req, res, next) => {
    try {
        const payment = await initiatePaymentForBooking(req.body.bookingId, req.body.idempotencyKey, req);
        sendSuccess(res, payment, { statusCode: 201 });
    }
    catch (err) {
        next(err);
    }
});
// PhonePe webhook endpoint (verifies authenticity via X-VERIFY or Basic SHA256)
router.post('/webhook/phonepe', async (req, res, next) => {
    try {
        const result = await processPhonePeWebhook(req);
        sendSuccess(res, result);
    }
    catch (err) {
        next(err);
    }
});
// Verify payment status from server (queries PhonePe API in prod/UAT, or DB in dev mode)
router.get('/status/:merchantTransactionId', async (req, res, next) => {
    try {
        const payment = await PaymentModel.findOne({
            merchantTransactionId: req.params.merchantTransactionId,
        });
        if (!payment)
            throw new NotFoundError('Payment not found');
        if (payment.status === 'PENDING' && env.PAYMENT_PROVIDER_MODE !== 'development') {
            const adapter = getPaymentGatewayAdapter();
            const statusRes = await adapter.checkPaymentStatus(payment.merchantTransactionId);
            await settleVerifiedPayment({
                payment,
                status: statusRes.status,
                amountPaise: statusRes.amountPaise || payment.amountPaise,
                currency: statusRes.currency,
                providerTransactionId: statusRes.providerTransactionId,
                failureReason: statusRes.failureReason,
                rawResponse: statusRes.rawResponse,
            });
        }
        const updatedPayment = await PaymentModel.findById(payment._id).lean();
        const booking = await BookingModel.findById(payment.bookingId).lean();
        const tickets = booking?.status === 'PAID'
            ? await TicketModel.find({ bookingId: booking._id, status: { $ne: 'REISSUED' } }).lean()
            : [];
        sendSuccess(res, { payment: updatedPayment, booking, tickets });
    }
    catch (err) {
        next(err);
    }
});
// Clearly guarded Development Adapter simulation endpoint (blocked when PAYMENT_PROVIDER_MODE !== 'development')
const devSimSchema = z.object({
    outcome: z.enum(['COMPLETED', 'FAILED', 'PENDING']),
    failureReason: z.string().optional(),
});
router.post('/dev-simulate/:merchantTransactionId', validateBody(devSimSchema), async (req, res, next) => {
    try {
        if (env.PAYMENT_PROVIDER_MODE !== 'development') {
            throw new ForbiddenError('Development payment simulation is disabled outside development mode');
        }
        const payment = await PaymentModel.findOne({
            merchantTransactionId: req.params.merchantTransactionId,
        });
        if (!payment)
            throw new NotFoundError('Payment not found');
        const settled = await settleVerifiedPayment({
            payment,
            status: req.body.outcome,
            amountPaise: payment.amountPaise,
            currency: payment.currency,
            providerTransactionId: `DEVPG-${payment.merchantTransactionId}`,
            failureReason: req.body.failureReason,
            rawResponse: { simulatedOutcome: req.body.outcome, mode: 'development' },
        });
        const booking = await BookingModel.findById(payment.bookingId).lean();
        sendSuccess(res, { payment: settled, booking });
    }
    catch (err) {
        next(err);
    }
});
// Admin payment listing & reconciliation
router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = {};
        if (req.query.status)
            filter.status = String(req.query.status);
        if (req.query.search) {
            const q = String(req.query.search).trim();
            filter.$or = [
                { merchantTransactionId: new RegExp(q, 'i') },
                { bookingReference: new RegExp(q, 'i') },
                { providerTransactionId: new RegExp(q, 'i') },
            ];
        }
        const [items, total] = await Promise.all([
            PaymentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            PaymentModel.countDocuments(filter),
        ]);
        sendSuccess(res, items, {
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        next(err);
    }
});
router.get('/webhooks/history', authenticate, requireRole('admin'), async (_req, res, next) => {
    try {
        const events = await WebhookEventModel.find().sort({ createdAt: -1 }).limit(100).lean();
        sendSuccess(res, events);
    }
    catch (err) {
        next(err);
    }
});
export const paymentRoutes = router;
//# sourceMappingURL=payment.routes.js.map