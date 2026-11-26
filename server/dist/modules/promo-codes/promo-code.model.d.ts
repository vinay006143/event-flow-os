import mongoose, { type Document } from 'mongoose';
import { type PromoDiscountType } from '@eventflow/shared';
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
export declare const PromoCodeModel: mongoose.Model<IPromoCode, {}, {}, {}, mongoose.Document<unknown, {}, IPromoCode, {}, {}> & IPromoCode & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface IPromoCodeUsage extends Document {
    promoCodeId: mongoose.Types.ObjectId;
    code: string;
    bookingId: mongoose.Types.ObjectId;
    userMobile: string;
    userEmail?: string;
    discountApplied: number;
    createdAt: Date;
}
export declare const PromoCodeUsageModel: mongoose.Model<IPromoCodeUsage, {}, {}, {}, mongoose.Document<unknown, {}, IPromoCodeUsage, {}, {}> & IPromoCodeUsage & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=promo-code.model.d.ts.map