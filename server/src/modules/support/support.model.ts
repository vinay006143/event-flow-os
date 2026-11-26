import mongoose, { Schema, type Document } from 'mongoose';
import {
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  type SupportPriority,
  type SupportStatus,
} from '@eventflow/shared';

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
  notes: Array<{ authorName: string; note: string; at: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const supportTicketSchema = new Schema<ISupportTicket>(
  {
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
  },
  { timestamps: true },
);

export const SupportTicketModel = mongoose.model<ISupportTicket>(
  'SupportTicket',
  supportTicketSchema,
);
