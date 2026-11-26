import mongoose, { Schema, type Document } from 'mongoose';
import { BOOKING_STATUSES, type BookingStatus } from '@eventflow/shared';

export interface IBookingItem {
  ticketTypeId: mongoose.Types.ObjectId;
  ticketTypeName: string;
  ticketTypeCode: string;
  quantity: number;
  unitPrice: number;
}

export interface IBookingHistoryEntry {
  fromStatus?: BookingStatus;
  toStatus: BookingStatus;
  reason?: string;
  actor?: string;
  at: Date;
}

export interface IBooking extends Document {
  bookingReference: string;
  reservationId: mongoose.Types.ObjectId;
  primaryContact: {
    fullName: string;
    mobile: string;
    email: string;
  };
  items: IBookingItem[];
  totalTickets: number;
  subtotalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  promoCode?: string;
  status: BookingStatus;
  whatsappOptIn: boolean;
  retrievalTokenHash: string;
  idempotencyKey?: string;
  ticketGenerationStatus: 'NOT_STARTED' | 'PENDING' | 'COMPLETED' | 'FAILED';
  ticketGenerationError?: string;
  ticketsIssuedAt?: Date;
  paidAt?: Date;
  cancelledAt?: Date;
  refundedAmount: number;
  history: IBookingHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    bookingReference: { type: String, required: true, unique: true },
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', required: true, index: true },
    primaryContact: {
      fullName: { type: String, required: true, trim: true },
      mobile: { type: String, required: true, trim: true, index: true },
      email: { type: String, required: true, trim: true, lowercase: true, index: true },
    },
    items: [
      {
        _id: false,
        ticketTypeId: { type: Schema.Types.ObjectId, ref: 'TicketType', required: true },
        ticketTypeName: { type: String, required: true },
        ticketTypeCode: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
      },
    ],
    totalTickets: { type: Number, required: true, min: 1 },
    subtotalAmount: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    finalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    promoCode: { type: String },
    status: { type: String, enum: BOOKING_STATUSES, default: 'RESERVED', index: true },
    whatsappOptIn: { type: Boolean, default: true },
    retrievalTokenHash: { type: String, required: true },
    idempotencyKey: { type: String, sparse: true, unique: true },
    ticketGenerationStatus: {
      type: String,
      enum: ['NOT_STARTED', 'PENDING', 'COMPLETED', 'FAILED'],
      default: 'NOT_STARTED',
      index: true,
    },
    ticketGenerationError: { type: String },
    ticketsIssuedAt: { type: Date },
    paidAt: { type: Date },
    cancelledAt: { type: Date },
    refundedAmount: { type: Number, default: 0, min: 0 },
    history: [
      {
        _id: false,
        fromStatus: { type: String, enum: BOOKING_STATUSES },
        toStatus: { type: String, enum: BOOKING_STATUSES, required: true },
        reason: String,
        actor: String,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ 'primaryContact.mobile': 1, bookingReference: 1 });

export const BookingModel = mongoose.model<IBooking>('Booking', bookingSchema);
