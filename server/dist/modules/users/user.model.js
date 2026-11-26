import mongoose, { Schema } from 'mongoose';
import { STAFF_PERMISSIONS, USER_ROLES } from '@eventflow/shared';
const userSchema = new Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE', index: true },
    permissions: [{ type: String, enum: STAFF_PERMISSIONS }],
    assignedGateIds: [{ type: Schema.Types.ObjectId, ref: 'Gate' }],
    assignedDeviceIds: [{ type: Schema.Types.ObjectId, ref: 'ScannerDevice' }],
    tokenVersion: { type: Number, default: 1 },
    lastLoginAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
// Architecture Rule 3.2 & 8: Exactly ONE Admin account is permitted in the entire deployment.
userSchema.index({ role: 1 }, {
    unique: true,
    partialFilterExpression: { role: 'admin' },
    name: 'unique_single_admin_role',
});
export const UserModel = mongoose.model('User', userSchema);
//# sourceMappingURL=user.model.js.map