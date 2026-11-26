import mongoose, { Schema } from 'mongoose';
import { SUPPORT_PRIORITIES, SUPPORT_STATUSES, } from '@eventflow/shared';
const supportTicketSchema = new Schema({
    reference: { type: String, required: true, unique: true },
    category: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    priority: { type: String, enum: SUPPORT_PRIORITIES, default: 'MEDIUM', index: true },
    status: { type: String, enum: SUPPORT_STATUSES, default: 'OPEN', index: true },
    bookingReference: { type: String, index: true },
    contactName: { type: String, required: true },
    contactMobile: { type: String, required: true },
    contactEmail: { type: String },
    assignedToId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedToName: { type: String },
    resolution: { type: String },
    notes: [
        {
            _id: false,
            authorName: { type: String, required: true },
            note: { type: String, required: true },
            at: { type: Date, default: Date.now },
        },
    ],
}, { timestamps: true });
export const SupportTicketModel = mongoose.model('SupportTicket', supportTicketSchema);
//# sourceMappingURL=support.model.js.map