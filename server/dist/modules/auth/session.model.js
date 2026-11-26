import mongoose, { Schema } from 'mongoose';
const sessionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    deviceCode: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    revokedAt: { type: Date },
    expiresAt: { type: Date },
}, { timestamps: { createdAt: true, updatedAt: false } });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const SessionModel = mongoose.model('Session', sessionSchema);
//# sourceMappingURL=session.model.js.map