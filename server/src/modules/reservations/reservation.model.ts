import mongoose, { Schema, type Document } from 'mongoose';
import { RESERVATION_STATUSES, type ReservationStatus } from '@eventflow/shared';

export interface IReservationItem {
  ticketTypeId: mongoose.Types.ObjectId;
  ticketTypeName: string;
  ticketTypeCode: string;
  quantity: number;
  unitPrice: number;
}

export interface IReservation extends Document {
  reservationCode: string;
  items: IReservationItem[];
  totalQuantity: number;
  subtotalAmount: number;
  discountAmount: number;
  finalAmount: number;
  promoCode?: string;
  status: ReservationStatus;
  idempotencyKey?: string;
  expiresAt: Date;
  convertedBookingId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reservationSchema = new Schema<IReservation>(
  {
    reservationCode: { type: String, required: true, unique: true },
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
    totalQuantity: { type: Number, required: true, min: 1 },
    subtotalAmount: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    finalAmount: { type: Number, required: true, min: 0 },
    promoCode: { type: String },
    status: { type: String, enum: RESERVATION_STATUSES, default: 'ACTIVE', index: true },
    idempotencyKey: { type: String, sparse: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    convertedBookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
  },
  { timestamps: true },
);

export const ReservationModel = mongoose.model<IReservation>('Reservation', reservationSchema);
