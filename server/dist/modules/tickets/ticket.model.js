import mongoose, { Schema } from 'mongoose';
import { TICKET_STATUSES } from '@eventflow/shared';
const ticketSchema = new Schema({
    ticketId: { type: String, required: true, unique: true },
    secureReference: { type: String, required: true, unique: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    bookingReference: { type: String, required: true, index: true },
    attendeeId: { type: Schema.Types.ObjectId, ref: 'Attendee', required: true, index: true },
    ticketTypeId: { type: Schema.Types.ObjectId, ref: 'TicketType', required: true },
    ticketTypeName: { type: String, required: true },
    ticketTypeCode: { type: String, required: true },
    eventCode: { type: String, required: true },
    attendeeName: { type: String, required: true, index: true },
    attendeeMobile: { type: String, required: true, index: true },
    qrToken: { type: String, required: true },
    qrTokenHash: { type: String, required: true, unique: true },
    status: { type: String, enum: TICKET_STATUSES, default: 'ISSUED', index: true },
    issuedAt: { type: Date, default: Date.now },
    checkedInAt: { type: Date },
    checkedOutAt: { type: Date },
    checkedInGateId: { type: Schema.Types.ObjectId, ref: 'Gate' },
    checkedInStaffId: { type: Schema.Types.ObjectId, ref: 'User' },
    revokedAt: { type: Date },
    revokedReason: { type: String },
    reissuedFromTicketId: { type: String },
    reissuedToTicketId: { type: String },
    pdfStorageKey: { type: String },
    imageStorageKey: { type: String },
}, { timestamps: true });
// Prevent duplicate active issued tickets for the same attendee
ticketSchema.index({ attendeeId: 1 }, {
    unique: true,
    partialFilterExpression: { status: { $in: ['ISSUED', 'CHECKED_IN', 'CHECKED_OUT'] } },
    name: 'unique_active_ticket_per_attendee',
});
export const TicketModel = mongoose.model('Ticket', ticketSchema);
const retrievalOtpSchema = new Schema({
    lookupKey: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    verifiedTokenHash: { type: String },
    expiresAt: { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
retrievalOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RetrievalOtpModel = mongoose.model('RetrievalOtp', retrievalOtpSchema);
//# sourceMappingURL=ticket.model.js.map