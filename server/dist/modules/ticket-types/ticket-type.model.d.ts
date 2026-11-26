import mongoose, { type Document } from 'mongoose';
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
export declare const TicketTypeModel: mongoose.Model<ITicketType, {}, {}, {}, mongoose.Document<unknown, {}, ITicketType, {}, {}> & ITicketType & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ticket-type.model.d.ts.map