import mongoose, { type Document } from 'mongoose';
export interface IAuditLog extends Document {
    actorId?: mongoose.Types.ObjectId;
    actorRole: 'admin' | 'staff' | 'system' | 'public';
    actorEmail?: string;
    action: string;
    entityType: string;
    entityId?: string;
    entityReference?: string;
    result: 'SUCCESS' | 'FAILURE';
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}
export declare const AuditLogModel: mongoose.Model<IAuditLog, {}, {}, {}, mongoose.Document<unknown, {}, IAuditLog, {}, {}> & IAuditLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=audit.model.d.ts.map