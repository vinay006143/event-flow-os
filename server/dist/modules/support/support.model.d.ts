import mongoose, { type Document } from 'mongoose';
import { type SupportPriority, type SupportStatus } from '@eventflow/shared';
export interface ISupportTicket extends Document {
    reference: string;
    category: string;
    subject: string;
    description: string;
    priority: SupportPriority;
    status: SupportStatus;
    bookingReference?: string;
    contactName: string;
    contactMobile: string;
    contactEmail?: string;
    assignedToId?: mongoose.Types.ObjectId;
    assignedToName?: string;
    resolution?: string;
    notes: Array<{
        authorName: string;
        note: string;
        at: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SupportTicketModel: mongoose.Model<ISupportTicket, {}, {}, {}, mongoose.Document<unknown, {}, ISupportTicket, {}, {}> & ISupportTicket & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=support.model.d.ts.map