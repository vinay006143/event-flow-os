import { type INotificationLog } from './notification.model.js';
export interface NotificationAttachment {
    filename: string;
    mimeType: string;
    buffer?: Buffer;
    url?: string;
    cid?: string;
}
export interface AdminAttachmentInput {
    filename?: string;
    mimeType?: string;
    dataUrl?: string;
    url?: string;
}
export declare function dispatchBookingTicketsNotifications(bookingId: string): Promise<INotificationLog[]>;
export declare function sendOtpNotification(params: {
    mobile: string;
    email?: string;
    otp: string;
}): Promise<void>;
export declare function retryNotificationById(logId: string): Promise<INotificationLog>;
export type BroadcastAudience = 'ALL_ACTIVE' | 'CHECKED_IN' | 'NOT_CHECKED_IN' | 'TICKET_TYPE';
export declare function previewBroadcastRecipients(params: {
    audience: BroadcastAudience;
    ticketTypeId?: string;
}): Promise<{
    attendeeCount: number;
    uniqueWhatsAppCount: number;
    uniqueEmailCount: number;
    whatsappMode: "development" | "meta_cloud";
    emailMode: "development" | "smtp";
}>;
export declare function broadcastAdminAnnouncement(params: {
    channels: Array<'WHATSAPP' | 'EMAIL'>;
    audience: BroadcastAudience;
    ticketTypeId?: string;
    subject: string;
    message: string;
    attachment?: AdminAttachmentInput;
}): Promise<{
    recipientCount: number;
    whatsapp: {
        attempted: number;
        sent: number;
        failed: number;
    };
    email: {
        attempted: number;
        sent: number;
        failed: number;
    };
    attachment: {
        filename: string;
        mimeType: string;
        sizeBytes: number | undefined;
        url: string | undefined;
    } | null;
}>;
//# sourceMappingURL=notification.service.d.ts.map