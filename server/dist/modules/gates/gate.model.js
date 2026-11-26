import mongoose, { Schema } from 'mongoose';
const gateSchema = new Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    allowedTicketTypeIds: [{ type: Schema.Types.ObjectId, ref: 'TicketType' }],
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });
export const GateModel = mongoose.model('Gate', gateSchema);
//# sourceMappingURL=gate.model.js.map