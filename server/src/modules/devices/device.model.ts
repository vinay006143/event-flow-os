import mongoose, { Schema, type Document } from 'mongoose';

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

const scannerDeviceSchema = new Schema<IScannerDevice>(
  {
    deviceCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    assignedGateId: { type: Schema.Types.ObjectId, ref: 'Gate', default: null },
    assignedStaffId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'PENDING'], default: 'ACTIVE', index: true },
    appVersion: { type: String },
    batteryLevel: { type: Number },
    networkType: { type: String },
    lastHeartbeatAt: { type: Date },
    lastActivityAt: { type: Date },
  },
  { timestamps: true },
);

export const ScannerDeviceModel = mongoose.model<IScannerDevice>(
  'ScannerDevice',
  scannerDeviceSchema,
);
