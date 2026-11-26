import mongoose, { type Document } from 'mongoose';
export interface IGate extends Document {
    code: string;
    name: string;
    description?: string;
    allowedTicketTypeIds: mongoose.Types.ObjectId[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const GateModel: mongoose.Model<IGate, {}, {}, {}, mongoose.Document<unknown, {}, IGate, {}, {}> & IGate & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=gate.model.d.ts.map