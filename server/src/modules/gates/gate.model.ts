import mongoose, { Schema, type Document } from 'mongoose';

export interface IGate extends Document {
  code: string;
  name: string;
  description?: string;
  allowedTicketTypeIds: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const gateSchema = new Schema<IGate>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    allowedTicketTypeIds: [{ type: Schema.Types.ObjectId, ref: 'TicketType' }],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const GateModel = mongoose.model<IGate>('Gate', gateSchema);
