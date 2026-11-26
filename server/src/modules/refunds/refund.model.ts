import mongoose, { Schema, type Document } from 'mongoose';
import { REFUND_STATUSES, type RefundStatus } from '@eventflow/shared';

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

const refundSchema = new Schema<IRefund>(
  {
    refundReference: { type: String, required: true, unique: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    bookingReference: { type: String, required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    merchantTransactionId: { type: String, required: true },
    refundType: { type: String, enum: ['FULL', 'PARTIAL'], required: true },
    ticketIds: { type: [String], default: [] },
    amount: { type: Number, required: true, min: 0 },
    amountPaise: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true },
    status: { type: String, enum: REFUND_STATUSES, default: 'INITIATED', index: true },
    providerRefundId: { type: String },
    providerResponse: { type: Schema.Types.Mixed },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorEmail: { type: String, required: true },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

export const RefundModel = mongoose.model<IRefund>('Refund', refundSchema);
