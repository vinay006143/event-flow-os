import mongoose, { Schema, type Document } from 'mongoose';
import { TICKET_STATUSES, type TicketStatus } from '@eventflow/shared';

export interface ITicket extends Document {
  ticketId: string;
  secureReference: string;
  bookingId: mongoose.Types.ObjectId;
  bookingReference: string;
  attendeeId: mongoose.Types.ObjectId;
  ticketTypeId: mongoose.Types.ObjectId;
  ticketTypeName: string;
  ticketTypeCode: string;
  eventCode: string;
  attendeeName: string;
  attendeeMobile: string;
  qrToken: string;
  qrTokenHash: string;
  status: TicketStatus;
  issuedAt: Date;
  checkedInAt?: Date;
  checkedOutAt?: Date;
  checkedInGateId?: mongoose.Types.ObjectId;
  checkedInStaffId?: mongoose.Types.ObjectId;
  revokedAt?: Date;
  revokedReason?: string;
  reissuedFromTicketId?: string;
  reissuedToTicketId?: string;
  pdfStorageKey?: string;
  imageStorageKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
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
  },
  { timestamps: true },
);

// Prevent duplicate active issued tickets for the same attendee
ticketSchema.index(
  { attendeeId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['ISSUED', 'CHECKED_IN', 'CHECKED_OUT'] } },
    name: 'unique_active_ticket_per_attendee',
  },
);

export const TicketModel = mongoose.model<ITicket>('Ticket', ticketSchema);

export interface IRetrievalOtp extends Document {
  lookupKey: string;
  otpHash: string;
  attempts: number;
  verifiedTokenHash?: string;
  expiresAt: Date;
  createdAt: Date;
}

const retrievalOtpSchema = new Schema<IRetrievalOtp>(
  {
    lookupKey: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    verifiedTokenHash: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

retrievalOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RetrievalOtpModel = mongoose.model<IRetrievalOtp>('RetrievalOtp', retrievalOtpSchema);
