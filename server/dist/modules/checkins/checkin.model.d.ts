import mongoose, { type Document } from 'mongoose';
import { type CheckinResult } from '@eventflow/shared';
export interface ICheckin extends Document {
    ticketDocId?: mongoose.Types.ObjectId;
    ticketId?: string;
    bookingId?: mongoose.Types.ObjectId;
    bookingReference?: string;
    attendeeId?: mongoose.Types.ObjectId;
    attendeeName?: string;
    ticketTypeName?: string;
    gateId?: mongoose.Types.ObjectId;
    gateCode?: string;
    gateName?: string;
    staffId: mongoose.Types.ObjectId;
    staffName: string;
    deviceId?: mongoose.Types.ObjectId;
    deviceCode?: string;
    method: 'QR_SCAN' | 'MANUAL_LOOKUP';
    result: CheckinResult;
    message: string;
    createdAt: Date;
}
export declare const CheckinModel: mongoose.Model<ICheckin, {}, {}, {}, mongoose.Document<unknown, {}, ICheckin, {}, {}> & ICheckin & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=checkin.model.d.ts.map