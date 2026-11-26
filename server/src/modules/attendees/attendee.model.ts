import mongoose, { Schema, type Document } from 'mongoose';

export interface IAttendee extends Document {
  bookingId: mongoose.Types.ObjectId;
  bookingReference: string;
  ticketTypeId: mongoose.Types.ObjectId;
  ticketTypeName: string;
  ticketTypeCode: string;
  attendeeIndex: number;
  fullName: string;
  age?: number;
  mobile: string;
  email?: string;
  customFields: Record<string, unknown>;
  status: 'ACTIVE' | 'CANCELLED' | 'REFUNDED';
  createdAt: Date;
  updatedAt: Date;
}

const attendeeSchema = new Schema<IAttendee>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    bookingReference: { type: String, required: true, index: true },
    ticketTypeId: { type: Schema.Types.ObjectId, ref: 'TicketType', required: true },
    ticketTypeName: { type: String, required: true },
    ticketTypeCode: { type: String, required: true },
    attendeeIndex: { type: Number, required: true, min: 1 },
    fullName: { type: String, required: true, trim: true, index: true },
    age: { type: Number },
    mobile: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    customFields: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['ACTIVE', 'CANCELLED', 'REFUNDED'], default: 'ACTIVE', index: true },
  },
  { timestamps: true },
);

attendeeSchema.index({ bookingId: 1, attendeeIndex: 1 }, { unique: true });

export const AttendeeModel = mongoose.model<IAttendee>('Attendee', attendeeSchema);
