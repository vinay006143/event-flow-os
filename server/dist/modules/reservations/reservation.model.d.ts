import mongoose, { type Document } from 'mongoose';
import { type ReservationStatus } from '@eventflow/shared';
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
export declare const ReservationModel: mongoose.Model<IReservation, {}, {}, {}, mongoose.Document<unknown, {}, IReservation, {}, {}> & IReservation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=reservation.model.d.ts.map