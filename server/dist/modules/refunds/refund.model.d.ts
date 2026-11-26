import mongoose, { type Document } from 'mongoose';
import { type RefundStatus } from '@eventflow/shared';
export interface IRefund extends Document {
    refundReference: string;
    bookingId: mongoose.Types.ObjectId;
    bookingReference: string;
    paymentId: mongoose.Types.ObjectId;
    merchantTransactionId: string;
    refundType: 'FULL' | 'PARTIAL';
    ticketIds: string[];
    amount: number;
    amountPaise: number;
    reason: string;
    status: RefundStatus;
    providerRefundId?: string;
    providerResponse?: Record<string, unknown>;
    actorId: mongoose.Types.ObjectId;
    actorEmail: string;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const RefundModel: mongoose.Model<IRefund, {}, {}, {}, mongoose.Document<unknown, {}, IRefund, {}, {}> & IRefund & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=refund.model.d.ts.map