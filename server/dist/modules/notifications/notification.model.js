import mongoose, { Schema } from 'mongoose';
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES, } from '@eventflow/shared';
const notificationLogSchema = new Schema({
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    bookingReference: { type: String, index: true },
    ticketId: { type: String },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true, index: true },
    templateType: {
        type: String,
        enum: [
            'BOOKING_CONFIRMATION',
            'TICKET_DELIVERY',
            'TICKET_RESEND',
            'OTP',
            'REMINDER',
            'REFUND_UPDATE',
            'ANNOUNCEMENT',
        ],
        required: true,
    },
    recipient: { type: String, required: true },
    subject: { type: String },
    messagePreview: { type: String, required: true },
    status: { type: String, enum: NOTIFICATION_STATUSES, default: 'QUEUED', index: true },
    providerMode: { type: String, required: true },
    providerMessageId: { type: String },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
    sentAt: { type: Date },
    hasAttachment: { type: Boolean, default: false },
    attachmentName: { type: String },
    attachmentMimeType: { type: String },
    attachmentCount: { type: Number, default: 0 },
    attachmentSizeBytes: { type: Number },
    attachmentUrl: { type: String },
}, { timestamps: true });
notificationLogSchema.index({ createdAt: -1 });
export const NotificationLogModel = mongoose.model('NotificationLog', notificationLogSchema);
//# sourceMappingURL=notification.model.js.map