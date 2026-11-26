import mongoose, { type Document } from 'mongoose';
export interface ISession extends Document {
    userId: mongoose.Types.ObjectId;
    refreshTokenHash: string;
    deviceCode?: string;
    ipAddress?: string;
    userAgent?: string;
    revokedAt?: Date;
    expiresAt?: Date;
    createdAt: Date;
}
export declare const SessionModel: mongoose.Model<ISession, {}, {}, {}, mongoose.Document<unknown, {}, ISession, {}, {}> & ISession & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=session.model.d.ts.map