import type { Request } from 'express';
import { type ITicket } from './ticket.model.js';
export declare function issueTicketsForPaidBooking(bookingId: string): Promise<ITicket[]>;
export declare function renderOrFetchTicketAsset(ticket: ITicket, format: 'pdf' | 'png'): Promise<Buffer>;
export declare function revokeTicket(ticketDocId: string, reason: string, actor: {
    id: string;
    email: string;
}, req?: Request): Promise<ITicket>;
export declare function reissueTicket(ticketDocId: string, reason: string, actor: {
    id: string;
    email: string;
}, req?: Request): Promise<{
    oldTicket: ITicket;
    newTicket: ITicket;
}>;
export declare function requestMyTicketsOtp(params: {
    mobile?: string;
    bookingReference?: string;
}): Promise<{
    rawOtpForNotification: string;
    devOtp?: string | undefined;
    lookupKey: string;
    maskedMobile: string;
    targetEmail: string;
    expiresInMinutes: number;
}>;
export declare function verifyMyTicketsOtp(params: {
    mobile?: string;
    bookingReference?: string;
    otp: string;
}): Promise<{
    retrievalSessionToken: string;
    bookings: (import("mongoose").FlattenMaps<import("../bookings/booking.model.js").IBooking> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[];
    tickets: (import("mongoose").FlattenMaps<ITicket> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[];
}>;
//# sourceMappingURL=ticket.service.d.ts.map