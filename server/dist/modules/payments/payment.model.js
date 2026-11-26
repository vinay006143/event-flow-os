import mongoose, { Schema } from 'mongoose';
import { PAYMENT_STATUSES } from '@eventflow/shared';
const paymentSchema = new Schema({
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
}, { timestamps: true });
export const PaymentModel = mongoose.model('Payment', paymentSchema);
const webhookEventSchema = new Schema({
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
}, { timestamps: { createdAt: true, updatedAt: false } });
export const WebhookEventModel = mongoose.model('WebhookEvent', webhookEventSchema);
//# sourceMappingURL=payment.model.js.map