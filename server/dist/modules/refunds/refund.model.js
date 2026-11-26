import mongoose, { Schema } from 'mongoose';
import { REFUND_STATUSES } from '@eventflow/shared';
const refundSchema = new Schema({
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
}, { timestamps: true });
export const RefundModel = mongoose.model('Refund', refundSchema);
//# sourceMappingURL=refund.model.js.map