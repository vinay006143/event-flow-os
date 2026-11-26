import { Router } from 'express';
import { z } from 'zod';
import { createPromoCodeSchema } from '@eventflow/shared';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { sendSuccess } from '../../utils/response.js';
import { PromoCodeModel } from './promo-code.model.js';
import {
  createPromoCode,
  deletePromoCode,
  updatePromoCode,
  validateAndCalculatePromo,
} from './promo-code.service.js';
import { TicketTypeModel } from '../ticket-types/ticket-type.model.js';

const router = Router();

const validatePromoRequestSchema = z.object({
  code: z.string().min(1),
  items: z.array(z.object({ ticketTypeId: z.string().min(1), quantity: z.number().int().min(1) })).min(1),
  userMobile: z.string().optional(),
});

router.post('/validate', validateBody(validatePromoRequestSchema), async (req, res, next) => {
  try {
    const ids = req.body.items.map((i: { ticketTypeId: string }) => i.ticketTypeId);
    const ticketTypes = await TicketTypeModel.find({ _id: { $in: ids }, isActive: true });
    const priceMap = new Map(ticketTypes.map((tt) => [String(tt._id), tt.price]));

    const pricedItems = req.body.items.map((i: { ticketTypeId: string; quantity: number }) => ({
      ticketTypeId: i.ticketTypeId,
      unitPrice: priceMap.get(i.ticketTypeId) ?? 0,
      quantity: i.quantity,
    }));

    const result = await validateAndCalculatePromo({
      code: req.body.code,
      items: pricedItems,
      userMobile: req.body.userMobile,
    });

    sendSuccess(res, {
      code: result.promoCode.code,
      discountType: result.promoCode.discountType,
      discountValue: result.promoCode.discountValue,
      discountAmount: result.discountAmount,
      description: result.promoCode.description,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, requireRole('admin'), async (_req, res, next) => {
  try {
    const items = await PromoCodeModel.find().sort({ createdAt: -1 }).lean();
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validateBody(createPromoCodeSchema),
  async (req, res, next) => {
    try {
      const created = await createPromoCode(req.body, { id: req.user!.id, email: req.user!.email }, req);
      sendSuccess(res, created, { statusCode: 201, message: 'Promo code created' });
    } catch (err) {
      next(err);
    }
  },
);

router.patch('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const updated = await updatePromoCode(
      String(req.params.id),
      req.body,
      { id: req.user!.id, email: req.user!.email },
      req,
    );
    sendSuccess(res, updated, { message: 'Promo code updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await deletePromoCode(
      String(req.params.id),
      { id: req.user!.id, email: req.user!.email },
      req,
    );
    sendSuccess(res, result, { message: 'Promo code deleted' });
  } catch (err) {
    next(err);
  }
});

export const promoCodeRoutes = router;
