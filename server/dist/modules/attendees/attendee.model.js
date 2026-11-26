import mongoose, { Schema } from 'mongoose';
const attendeeSchema = new Schema({
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    bookingReference: { type: String, required: true, index: true },
    ticketTypeId: { type: Schema.Types.ObjectId, ref: 'TicketType', required: true },
    ticketTypeName: { type: String, required: true },
    ticketTypeCode: { type: String, required: true },
    attendeeIndex: { type: Number, required: true, min: 1 },
    fullName: { type: String, required: true, trim: true, index: true },
    age: { type: Number },
    mobile: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    customFields: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['ACTIVE', 'CANCELLED', 'REFUNDED'], default: 'ACTIVE', index: true },
}, { timestamps: true });
attendeeSchema.index({ bookingId: 1, attendeeIndex: 1 }, { unique: true });
export const AttendeeModel = mongoose.model('Attendee', attendeeSchema);
//# sourceMappingURL=attendee.model.js.map