import mongoose, { Schema } from 'mongoose';
import { CHECKIN_RESULTS } from '@eventflow/shared';
const checkinSchema = new Schema({
    ticketDocId: { type: Schema.Types.ObjectId, ref: 'Ticket', index: true },
    ticketId: { type: String, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    bookingReference: { type: String, index: true },
    attendeeId: { type: Schema.Types.ObjectId, ref: 'Attendee' },
    attendeeName: { type: String },
    ticketTypeName: { type: String },
    gateId: { type: Schema.Types.ObjectId, ref: 'Gate', index: true },
    gateCode: { type: String },
    gateName: { type: String },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    staffName: { type: String, required: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'ScannerDevice' },
    deviceCode: { type: String },
    method: { type: String, enum: ['QR_SCAN', 'MANUAL_LOOKUP'], default: 'QR_SCAN' },
    result: { type: String, enum: CHECKIN_RESULTS, required: true, index: true },
    message: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
checkinSchema.index({ createdAt: -1 });
export const CheckinModel = mongoose.model('Checkin', checkinSchema);
//# sourceMappingURL=checkin.model.js.map