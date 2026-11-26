import mongoose, { type Document } from 'mongoose';
import { type NotificationChannel, type NotificationStatus } from '@eventflow/shared';
export interface INotificationLog extends Document {
    bookingId?: mongoose.Types.ObjectId;
    bookingReference?: string;
    ticketId?: string;
    channel: NotificationChannel;
    templateType: 'BOOKING_CONFIRMATION' | 'TICKET_DELIVERY' | 'TICKET_RESEND' | 'OTP' | 'REMINDER' | 'REFUND_UPDATE' | 'ANNOUNCEMENT';
    recipient: string;
    subject?: string;
    messagePreview: string;
    status: NotificationStatus;
    providerMode: string;
    providerMessageId?: string;
    attempts: number;
    lastError?: string;
    sentAt?: Date;
    hasAttachment?: boolean;
    attachmentName?: string;
    attachmentMimeType?: string;
    attachmentCount?: number;
    attachmentSizeBytes?: number;
    attachmentUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const NotificationLogModel: mongoose.Model<INotificationLog, {}, {}, {}, mongoose.Document<unknown, {}, INotificationLog, {}, {}> & INotificationLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=notification.model.d.ts.map