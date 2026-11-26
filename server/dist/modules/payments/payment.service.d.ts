import type { Request } from 'express';
import { type IPayment } from './payment.model.js';
export declare function initiatePaymentForBooking(bookingId: string, idempotencyKey?: string, req?: Request): Promise<IPayment>;
export declare function settleVerifiedPayment(params: {
    payment: IPayment;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    amountPaise: number;
    currency: string;
    providerTransactionId?: string;
    failureReason?: string;
    rawResponse?: Record<string, unknown>;
}): Promise<IPayment>;
export declare function processPhonePeWebhook(req: Request): Promise<{
    duplicate: boolean;
    event: import("mongoose").Document<unknown, {}, import("./payment.model.js").IWebhookEvent, {}, {}> & import("./payment.model.js").IWebhookEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    };
    payment?: undefined;
} | {
    duplicate: boolean;
    payment: IPayment;
    event?: undefined;
}>;
//# sourceMappingURL=payment.service.d.ts.map