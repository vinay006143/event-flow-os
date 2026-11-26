import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { getPagination, sendSuccess } from '../../utils/response.js';
import { RefundModel } from './refund.model.js';
import { cancelBookingOrTicket, processRefund } from './refund.service.js';

const router = Router();

router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query as Record<string, unknown>);
    const [items, total] = await Promise.all([
      RefundModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      RefundModel.countDocuments(),
    ]);
    sendSuccess(res, items, { meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

const refundSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.number().positive().optional(),
  ticketIds: z.array(z.string()).optional(),
  reason: z.string().trim().min(3).max(500),
});

router.post('/', authenticate, requireRole('admin'), validateBody(refundSchema), async (req, res, next) => {
  try {
    const refund = await processRefund(req.body, { id: req.user!.id, email: req.user!.email }, req);
    sendSuccess(res, refund, { statusCode: 201, message: 'Refund processed' });
  } catch (err) {
    next(err);
  }
});

const cancelSchema = z.object({
  bookingId: z.string().min(1),
  ticketId: z.string().optional(),
  reason: z.string().trim().min(3).max(500),
});

router.post('/cancel', authenticate, requireRole('admin'), validateBody(cancelSchema), async (req, res, next) => {
  try {
    const result = await cancelBookingOrTicket(req.body, { id: req.user!.id, email: req.user!.email }, req);
    sendSuccess(res, result, { message: 'Cancellation completed' });
  } catch (err) {
    next(err);
  }
});

export const refundRoutes = router;
