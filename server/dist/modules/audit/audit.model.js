import mongoose, { Schema } from 'mongoose';
const auditLogSchema = new Schema({
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorRole: {
        type: String,
        enum: ['admin', 'staff', 'system', 'public'],
        required: true,
    },
    actorEmail: { type: String },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, index: true },
    entityReference: { type: String, index: true },
    result: { type: String, enum: ['SUCCESS', 'FAILURE'], default: 'SUCCESS', index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed },
}, {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
});
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
export const AuditLogModel = mongoose.model('AuditLog', auditLogSchema);
//# sourceMappingURL=audit.model.js.map