import mongoose, { Schema } from 'mongoose';
import { RESERVATION_STATUSES } from '@eventflow/shared';
const reservationSchema = new Schema({
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
}, { timestamps: true });
export const ReservationModel = mongoose.model('Reservation', reservationSchema);
//# sourceMappingURL=reservation.model.js.map