import mongoose, { type Document } from 'mongoose';
import { type PaymentStatus } from '@eventflow/shared';
export interface IPayment extends Document {
    merchantTransactionId: string;
    providerTransactionId?: string;
    bookingId: mongoose.Types.ObjectId;
    bookingReference: string;
    provider: 'PHONEPE' | 'PHONEPE_DEV';
    amount: number;
    amountPaise: number;
    currency: string;
    status: PaymentStatus;
    redirectUrl?: string;
    idempotencyKey?: string;
    rawInitResponse?: Record<string, unknown>;
    rawStatusResponse?: Record<string, unknown>;
    verifiedAt?: Date;
    failureReason?: string;
    refundedAmount: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PaymentModel: mongoose.Model<IPayment, {}, {}, {}, mongoose.Document<unknown, {}, IPayment, {}, {}> & IPayment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface IWebhookEvent extends Document {
    provider: string;
    eventKey: string;
    merchantTransactionId?: string;
    verified: boolean;
    processingStatus: 'PROCESSED' | 'DUPLICATE' | 'REJECTED' | 'FAILED';
    payload: Record<string, unknown>;
    errorMessage?: string;
    createdAt: Date;
}
export declare const WebhookEventModel: mongoose.Model<IWebhookEvent, {}, {}, {}, mongoose.Document<unknown, {}, IWebhookEvent, {}, {}> & IWebhookEvent & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=payment.model.d.ts.map