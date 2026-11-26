import mongoose from 'mongoose';
import type { Request } from 'express';
export declare function processRefund(params: {
    bookingId: string;
    amount?: number;
    ticketIds?: string[];
    reason: string;
}, actor: {
    id: string;
    email: string;
}, req?: Request): Promise<mongoose.Document<unknown, {}, import("./refund.model.js").IRefund, {}, {}> & import("./refund.model.js").IRefund & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
export declare function cancelBookingOrTicket(params: {
    bookingId: string;
    ticketId?: string;
    reason: string;
}, actor: {
    id: string;
    email: string;
}, req?: Request): Promise<{
    cancelledTicket: mongoose.Document<unknown, {}, import("../tickets/ticket.model.js").ITicket, {}, {}> & import("../tickets/ticket.model.js").ITicket & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    };
    booking?: undefined;
} | {
    booking: import("../bookings/booking.model.js").IBooking;
    cancelledTicket?: undefined;
}>;
//# sourceMappingURL=refund.service.d.ts.map