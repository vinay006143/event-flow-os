import mongoose, { Schema } from 'mongoose';
const scannerDeviceSchema = new Schema({
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
}, { timestamps: true });
export const ScannerDeviceModel = mongoose.model('ScannerDevice', scannerDeviceSchema);
//# sourceMappingURL=device.model.js.map