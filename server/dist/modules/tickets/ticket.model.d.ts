import mongoose, { type Document } from 'mongoose';
import { type TicketStatus } from '@eventflow/shared';
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
export declare const TicketModel: mongoose.Model<ITicket, {}, {}, {}, mongoose.Document<unknown, {}, ITicket, {}, {}> & ITicket & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface IRetrievalOtp extends Document {
    lookupKey: string;
    otpHash: string;
    attempts: number;
    verifiedTokenHash?: string;
    expiresAt: Date;
    createdAt: Date;
}
export declare const RetrievalOtpModel: mongoose.Model<IRetrievalOtp, {}, {}, {}, mongoose.Document<unknown, {}, IRetrievalOtp, {}, {}> & IRetrievalOtp & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ticket.model.d.ts.map