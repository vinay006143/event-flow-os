import mongoose, { Schema, type Document } from 'mongoose';

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

const sessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    deviceCode: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    revokedAt: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel = mongoose.model<ISession>('Session', sessionSchema);
