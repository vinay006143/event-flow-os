import mongoose, { type Document } from 'mongoose';
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
export declare const AttendeeModel: mongoose.Model<IAttendee, {}, {}, {}, mongoose.Document<unknown, {}, IAttendee, {}, {}> & IAttendee & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=attendee.model.d.ts.map