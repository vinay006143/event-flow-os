import type { Request } from 'express';
import { PromoCodeModel, PromoCodeUsageModel, type IPromoCode } from './promo-code.model.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors.js';
import { recordAudit } from '../audit/audit.service.js';

export interface PromoCalculationResult {
  promoCode: IPromoCode;
  discountAmount: number;
  eligibleSubtotal: number;
}

export async function validateAndCalculatePromo(params: {
  code: string;
  items: Array<{ ticketTypeId: string; unitPrice: number; quantity: number }>;
  userMobile?: string;
}): Promise<PromoCalculationResult> {
  const normalized = params.code.trim().toUpperCase();
  const promo = await PromoCodeModel.findOne({ code: normalized });
  if (!promo || !promo.isActive) {
    throw new BadRequestError('Promo code is invalid or inactive', 'INVALID_PROMO_CODE');
  }

  const now = new Date();
  if (promo.startDate && now < promo.startDate) {
    throw new BadRequestError('Promo code is not active yet', 'PROMO_NOT_STARTED');
  }
  if (promo.endDate && now > promo.endDate) {
    throw new BadRequestError('Promo code has expired', 'PROMO_EXPIRED');
  }
  if (promo.totalUsageLimit != null && promo.usedCount >= promo.totalUsageLimit) {
    throw new BadRequestError('Promo code usage limit reached', 'PROMO_LIMIT_REACHED');
  }

  if (params.userMobile) {
    const userUses = await PromoCodeUsageModel.countDocuments({
      promoCodeId: promo._id,
      userMobile: params.userMobile.trim(),
    });
    if (userUses >= promo.perUserLimit) {
      throw new BadRequestError(
        'You have already reached the usage limit for this promo code',
        'PROMO_USER_LIMIT_REACHED',
      );
    }
  }

  const totalSubtotal = params.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  if (totalSubtotal < promo.minPurchaseAmount) {
    throw new BadRequestError(
      `Minimum purchase of ₹${promo.minPurchaseAmount} required for this promo code`,
      'PROMO_MIN_PURCHASE_NOT_MET',
    );
  }

  const allowedIds = promo.applicableTicketTypeIds.map((id) => String(id));
  const eligibleSubtotal =
    allowedIds.length === 0
      ? totalSubtotal
      : params.items
          .filter((i) => allowedIds.includes(i.ticketTypeId))
          .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  if (eligibleSubtotal <= 0) {
    throw new BadRequestError(
      'Promo code is not applicable to the selected ticket categories',
      'PROMO_CATEGORY_MISMATCH',
    );
  }

  let discount =
    promo.discountType === 'FIXED'
      ? promo.discountValue
      : Math.round((eligibleSubtotal * promo.discountValue) / 100);

  if (promo.maxDiscountAmount != null && discount > promo.maxDiscountAmount) {
    discount = promo.maxDiscountAmount;
  }
  discount = Math.max(0, Math.min(discount, eligibleSubtotal));

  return { promoCode: promo, discountAmount: discount, eligibleSubtotal };
}

export async function consumePromoCodeAtomically(params: {
  promoCodeId: string;
  code: string;
  bookingId: string;
  userMobile: string;
  userEmail?: string;
  discountApplied: number;
}): Promise<void> {
  const existingUsage = await PromoCodeUsageModel.findOne({ bookingId: params.bookingId });
  if (existingUsage) return;

  const updated = await PromoCodeModel.findOneAndUpdate(
    {
      _id: params.promoCodeId,
      isActive: true,
      $or: [
        { totalUsageLimit: null },
        { totalUsageLimit: { $exists: false } },
        { $expr: { $lt: ['$usedCount', '$totalUsageLimit'] } },
      ],
    },
    { $inc: { usedCount: 1 } },
    { new: true },
  );

  if (!updated) {
    throw new ConflictError('Promo code usage limit reached during checkout', 'PROMO_LIMIT_REACHED');
  }

  await PromoCodeUsageModel.create({
    promoCodeId: params.promoCodeId,
    code: params.code,
    bookingId: params.bookingId,
    userMobile: params.userMobile,
    userEmail: params.userEmail,
    discountApplied: params.discountApplied,
  });
}

export async function createPromoCode(
  input: Record<string, unknown>,
  actor: { id: string; email: string },
  req?: Request,
) {
  const code = String(input.code).trim().toUpperCase();
  const exists = await PromoCodeModel.findOne({ code });
  if (exists) throw new ConflictError('Promo code already exists');

  const created = await PromoCodeModel.create({ ...input, code });
  await recordAudit({
    actorId: actor.id,
    actorRole: 'admin',
    actorEmail: actor.email,
    action: 'PROMO_CODE_CREATED',
    entityType: 'PromoCode',
    entityId: String(created._id),
    entityReference: created.code,
    req,
  });
  return created;
}

export async function updatePromoCode(
  id: string,
  updates: Record<string, unknown>,
  actor: { id: string; email: string },
  req?: Request,
) {
  const promo = await PromoCodeModel.findByIdAndUpdate(id, updates, { new: true });
  if (!promo) throw new NotFoundError('Promo code not found');

  await recordAudit({
    actorId: actor.id,
    actorRole: 'admin',
    actorEmail: actor.email,
    action: 'PROMO_CODE_UPDATED',
    entityType: 'PromoCode',
    entityId: String(promo._id),
    entityReference: promo.code,
    req,
    metadata: { updates },
  });
  return promo;
}

export async function deletePromoCode(
  id: string,
  actor: { id: string; email: string },
  req?: Request,
) {
  const promo = await PromoCodeModel.findByIdAndDelete(id);
  if (!promo) throw new NotFoundError('Promo code not found');

  await recordAudit({
    actorId: actor.id,
    actorRole: 'admin',
    actorEmail: actor.email,
    action: 'PROMO_CODE_DELETED',
    entityType: 'PromoCode',
    entityId: String(promo._id),
    entityReference: promo.code,
    req,
  });

  return { deleted: true, id: String(promo._id) };
}
