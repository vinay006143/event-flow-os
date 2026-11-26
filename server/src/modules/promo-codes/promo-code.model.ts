import mongoose, { Schema, type Document } from 'mongoose';
import { PROMO_DISCOUNT_TYPES, type PromoDiscountType } from '@eventflow/shared';

export interface IPromoCode extends Document {
  code: string;
  description?: string;
  discountType: PromoDiscountType;
  discountValue: number;
  minPurchaseAmount: number;
  maxDiscountAmount?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  totalUsageLimit?: number | null;
  usedCount: number;
  perUserLimit: number;
  applicableTicketTypeIds: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const promoCodeSchema = new Schema<IPromoCode>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String },
    discountType: { type: String, enum: PROMO_DISCOUNT_TYPES, required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minPurchaseAmount: { type: Number, default: 0, min: 0 },
    maxDiscountAmount: { type: Number, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    totalUsageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1, min: 1 },
    applicableTicketTypeIds: [{ type: Schema.Types.ObjectId, ref: 'TicketType' }],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const PromoCodeModel = mongoose.model<IPromoCode>('PromoCode', promoCodeSchema);

export interface IPromoCodeUsage extends Document {
  promoCodeId: mongoose.Types.ObjectId;
  code: string;
  bookingId: mongoose.Types.ObjectId;
  userMobile: string;
  userEmail?: string;
  discountApplied: number;
  createdAt: Date;
}

const promoCodeUsageSchema = new Schema<IPromoCodeUsage>(
  {
    promoCodeId: { type: Schema.Types.ObjectId, ref: 'PromoCode', required: true, index: true },
    code: { type: String, required: true, uppercase: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    userMobile: { type: String, required: true, index: true },
    userEmail: { type: String },
    discountApplied: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

promoCodeUsageSchema.index({ promoCodeId: 1, userMobile: 1 });

export const PromoCodeUsageModel = mongoose.model<IPromoCodeUsage>(
  'PromoCodeUsage',
  promoCodeUsageSchema,
);
