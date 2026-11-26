import mongoose, { type Document } from 'mongoose';
export interface IScannerDevice extends Document {
    deviceCode: string;
    name: string;
    assignedGateId?: mongoose.Types.ObjectId | null;
    assignedStaffId?: mongoose.Types.ObjectId | null;
    status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
    appVersion?: string;
    batteryLevel?: number;
    networkType?: string;
    lastHeartbeatAt?: Date;
    lastActivityAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ScannerDeviceModel: mongoose.Model<IScannerDevice, {}, {}, {}, mongoose.Document<unknown, {}, IScannerDevice, {}, {}> & IScannerDevice & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=device.model.d.ts.map