import mongoose, { Schema, type Document } from 'mongoose';
import { PAYMENT_STATUSES, type PaymentStatus } from '@eventflow/shared';

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

const paymentSchema = new Schema<IPayment>(
  {
    merchantTransactionId: { type: String, required: true, unique: true },
    providerTransactionId: { type: String, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    bookingReference: { type: String, required: true, index: true },
    provider: { type: String, enum: ['PHONEPE', 'PHONEPE_DEV'], required: true },
    amount: { type: Number, required: true, min: 0 },
    amountPaise: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'INITIATED', index: true },
    redirectUrl: { type: String },
    idempotencyKey: { type: String, sparse: true, unique: true },
    rawInitResponse: { type: Schema.Types.Mixed },
    rawStatusResponse: { type: Schema.Types.Mixed },
    verifiedAt: { type: Date },
    failureReason: { type: String },
    refundedAmount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export const PaymentModel = mongoose.model<IPayment>('Payment', paymentSchema);

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

const webhookEventSchema = new Schema<IWebhookEvent>(
  {
    provider: { type: String, required: true },
    eventKey: { type: String, required: true, unique: true },
    merchantTransactionId: { type: String, index: true },
    verified: { type: Boolean, required: true },
    processingStatus: {
      type: String,
      enum: ['PROCESSED', 'DUPLICATE', 'REJECTED', 'FAILED'],
      required: true,
    },
    payload: { type: Schema.Types.Mixed, required: true },
    errorMessage: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const WebhookEventModel = mongoose.model<IWebhookEvent>('WebhookEvent', webhookEventSchema);
