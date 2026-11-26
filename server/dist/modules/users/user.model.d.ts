import mongoose, { type Document } from 'mongoose';
import { type StaffPermission, type UserRole } from '@eventflow/shared';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export interface IUser extends Document {
    name: string;
    email: string;
    mobile?: string;
    passwordHash: string;
    role: UserRole;
    status: UserStatus;
    permissions: StaffPermission[];
    assignedGateIds: mongoose.Types.ObjectId[];
    assignedDeviceIds: mongoose.Types.ObjectId[];
    tokenVersion: number;
    lastLoginAt?: Date;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const UserModel: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=user.model.d.ts.map