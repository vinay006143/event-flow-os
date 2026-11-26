import type { Request } from 'express';
import { type IPromoCode } from './promo-code.model.js';
export interface PromoCalculationResult {
    promoCode: IPromoCode;
    discountAmount: number;
    eligibleSubtotal: number;
}
export declare function validateAndCalculatePromo(params: {
    code: string;
    items: Array<{
        ticketTypeId: string;
        unitPrice: number;
        quantity: number;
    }>;
    userMobile?: string;
}): Promise<PromoCalculationResult>;
export declare function consumePromoCodeAtomically(params: {
    promoCodeId: string;
    code: string;
    bookingId: string;
    userMobile: string;
    userEmail?: string;
    discountApplied: number;
}): Promise<void>;
export declare function createPromoCode(input: Record<string, unknown>, actor: {
    id: string;
    email: string;
}, req?: Request): Promise<import("mongoose").Document<unknown, {}, IPromoCode, {}, {}> & IPromoCode & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare function updatePromoCode(id: string, updates: Record<string, unknown>, actor: {
    id: string;
    email: string;
}, req?: Request): Promise<import("mongoose").Document<unknown, {}, IPromoCode, {}, {}> & IPromoCode & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare function deletePromoCode(id: string, actor: {
    id: string;
    email: string;
}, req?: Request): Promise<{
    deleted: boolean;
    id: string;
}>;
//# sourceMappingURL=promo-code.service.d.ts.map