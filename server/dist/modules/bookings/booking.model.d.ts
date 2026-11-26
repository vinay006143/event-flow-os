import mongoose, { type Document } from 'mongoose';
import { type BookingStatus } from '@eventflow/shared';
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
export declare const BookingModel: mongoose.Model<IBooking, {}, {}, {}, mongoose.Document<unknown, {}, IBooking, {}, {}> & IBooking & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=booking.model.d.ts.map