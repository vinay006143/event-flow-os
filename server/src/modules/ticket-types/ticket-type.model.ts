import mongoose, { Schema, type Document } from 'mongoose';

export interface ITicketType extends Document {
  code: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  capacity: number;
  reservedQuantity: number;
  soldQuantity: number;
  saleStart?: Date | null;
  saleEnd?: Date | null;
  maxPerBooking: number;
  isActive: boolean;
  displayOrder: number;
  perks: string[];
  restrictions?: string;
  badgeColor: string;
  createdAt: Date;
  updatedAt: Date;
}

const ticketTypeSchema = new Schema<ITicketType>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    capacity: { type: Number, required: true, min: 0 },
    reservedQuantity: { type: Number, default: 0, min: 0 },
    soldQuantity: { type: Number, default: 0, min: 0 },
    saleStart: { type: Date, default: null },
    saleEnd: { type: Date, default: null },
    maxPerBooking: { type: Number, default: 10, min: 1, max: 20 },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 },
    perks: { type: [String], default: [] },
    restrictions: { type: String },
    badgeColor: { type: String, default: '#B45309' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

ticketTypeSchema.virtual('availableQuantity').get(function (this: ITicketType) {
  return Math.max(0, this.capacity - this.soldQuantity - this.reservedQuantity);
});

export const TicketTypeModel = mongoose.model<ITicketType>('TicketType', ticketTypeSchema);
