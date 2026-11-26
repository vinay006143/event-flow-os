import type { Request } from 'express';
import { type IUser } from '../users/user.model.js';
export declare function sanitizeUser(user: IUser): {
    id: string;
    name: string;
    email: string;
    mobile: string | undefined;
    role: "admin" | "staff";
    status: import("../users/user.model.js").UserStatus;
    permissions: ("SCAN_TICKETS" | "MANUAL_LOOKUP" | "VIEW_RECENT_SCANS" | "VIEW_ASSIGNED_GATES" | "VIEW_SUPPORT_ISSUES" | "MANAGE_DEVICE_HEARTBEAT")[];
    assignedGateIds: string[];
    assignedDeviceIds: string[];
    lastLoginAt: Date | undefined;
};
export declare function loginWithPassword(input: {
    email: string;
    password: string;
    expectedRole?: 'admin' | 'staff';
    deviceCode?: string;
}, req?: Request): Promise<{
    user: {
        id: string;
        name: string;
        email: string;
        mobile: string | undefined;
        role: "admin" | "staff";
        status: import("../users/user.model.js").UserStatus;
        permissions: ("SCAN_TICKETS" | "MANUAL_LOOKUP" | "VIEW_RECENT_SCANS" | "VIEW_ASSIGNED_GATES" | "VIEW_SUPPORT_ISSUES" | "MANAGE_DEVICE_HEARTBEAT")[];
        assignedGateIds: string[];
        assignedDeviceIds: string[];
        lastLoginAt: Date | undefined;
    };
    accessToken: string;
    refreshToken: string;
}>;
export declare function refreshAuthSession(rawRefreshToken: string, req?: Request): Promise<{
    user: {
        id: string;
        name: string;
        email: string;
        mobile: string | undefined;
        role: "admin" | "staff";
        status: import("../users/user.model.js").UserStatus;
        permissions: ("SCAN_TICKETS" | "MANUAL_LOOKUP" | "VIEW_RECENT_SCANS" | "VIEW_ASSIGNED_GATES" | "VIEW_SUPPORT_ISSUES" | "MANAGE_DEVICE_HEARTBEAT")[];
        assignedGateIds: string[];
        assignedDeviceIds: string[];
        lastLoginAt: Date | undefined;
    };
    accessToken: string;
    refreshToken: string;
}>;
export declare function logoutSession(rawRefreshToken?: string, userId?: string, req?: Request): Promise<void>;
export declare function revokeAllUserSessions(userId: string): Promise<void>;
export declare function changeOwnPassword(userId: string, currentPassword: string, newPassword: string, req?: Request): Promise<void>;
//# sourceMappingURL=auth.service.d.ts.map