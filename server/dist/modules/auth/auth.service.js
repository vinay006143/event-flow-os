import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UserModel } from '../users/user.model.js';
import { SessionModel } from './session.model.js';
import { hashPassword, randomToken, sha256, verifyPassword } from '../../utils/crypto.js';
import { BadRequestError, ForbiddenError, UnauthorizedError } from '../../utils/errors.js';
import { recordAudit } from '../audit/audit.service.js';
function issueAccessToken(user, sessionId) {
    return jwt.sign({
        sub: String(user._id),
        role: user.role,
        tv: user.tokenVersion,
        sid: sessionId,
    }, env.JWT_ACCESS_SECRET);
}
export function sanitizeUser(user) {
    return {
        id: String(user._id),
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        status: user.status,
        permissions: user.permissions ?? [],
        assignedGateIds: (user.assignedGateIds ?? []).map((id) => String(id)),
        assignedDeviceIds: (user.assignedDeviceIds ?? []).map((id) => String(id)),
        lastLoginAt: user.lastLoginAt,
    };
}
export async function loginWithPassword(input, req) {
    const email = input.email.toLowerCase().trim();
    const user = await UserModel.findOne({ email });
    if (!user) {
        await recordAudit({
            actorRole: input.expectedRole ?? 'public',
            actorEmail: email,
            action: 'AUTH_LOGIN_FAILED',
            entityType: 'User',
            result: 'FAILURE',
            req,
            metadata: { reason: 'user_not_found' },
        });
        throw new UnauthorizedError('Invalid email or password');
    }
    if (input.expectedRole && user.role !== input.expectedRole) {
        await recordAudit({
            actorId: String(user._id),
            actorRole: user.role,
            actorEmail: user.email,
            action: 'AUTH_LOGIN_ROLE_MISMATCH',
            entityType: 'User',
            result: 'FAILURE',
            req,
            metadata: { expectedRole: input.expectedRole },
        });
        throw new ForbiddenError(`This login portal is restricted to ${input.expectedRole} accounts`);
    }
    if (user.status !== 'ACTIVE') {
        await recordAudit({
            actorId: String(user._id),
            actorRole: user.role,
            actorEmail: user.email,
            action: 'AUTH_LOGIN_SUSPENDED',
            entityType: 'User',
            result: 'FAILURE',
            req,
        });
        throw new ForbiddenError('Account is suspended. Contact the event administrator.', 'ACCOUNT_SUSPENDED');
    }
    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
        await recordAudit({
            actorId: String(user._id),
            actorRole: user.role,
            actorEmail: user.email,
            action: 'AUTH_LOGIN_FAILED',
            entityType: 'User',
            result: 'FAILURE',
            req,
            metadata: { reason: 'invalid_password' },
        });
        throw new UnauthorizedError('Invalid email or password');
    }
    const rawRefresh = randomToken(40);
    const refreshHash = sha256(rawRefresh);
    const session = await SessionModel.create({
        userId: user._id,
        refreshTokenHash: refreshHash,
        deviceCode: input.deviceCode,
        ipAddress: req?.ip,
        userAgent: req?.headers['user-agent'],
    });
    user.lastLoginAt = new Date();
    await user.save();
    const accessToken = issueAccessToken(user, String(session._id));
    await recordAudit({
        actorId: String(user._id),
        actorRole: user.role,
        actorEmail: user.email,
        action: 'AUTH_LOGIN_SUCCESS',
        entityType: 'User',
        entityId: String(user._id),
        req,
        metadata: { deviceCode: input.deviceCode },
    });
    return {
        user: sanitizeUser(user),
        accessToken,
        refreshToken: rawRefresh,
    };
}
export async function refreshAuthSession(rawRefreshToken, req) {
    if (!rawRefreshToken) {
        throw new UnauthorizedError('Refresh token is required');
    }
    const hash = sha256(rawRefreshToken);
    const session = await SessionModel.findOne({ refreshTokenHash: hash });
    if (!session || session.revokedAt || (session.expiresAt && session.expiresAt < new Date())) {
        throw new UnauthorizedError('Invalid or expired refresh session');
    }
    const user = await UserModel.findById(session.userId);
    if (!user || user.status !== 'ACTIVE') {
        throw new ForbiddenError('Account is unavailable or suspended');
    }
    // Rotate refresh token
    session.revokedAt = new Date();
    await session.save();
    const newRawRefresh = randomToken(40);
    const newSession = await SessionModel.create({
        userId: user._id,
        refreshTokenHash: sha256(newRawRefresh),
        deviceCode: session.deviceCode,
        ipAddress: req?.ip,
        userAgent: req?.headers['user-agent'],
    });
    const accessToken = issueAccessToken(user, String(newSession._id));
    return {
        user: sanitizeUser(user),
        accessToken,
        refreshToken: newRawRefresh,
    };
}
export async function logoutSession(rawRefreshToken, userId, req) {
    if (rawRefreshToken) {
        await SessionModel.updateOne({ refreshTokenHash: sha256(rawRefreshToken), revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
    }
    if (userId) {
        await recordAudit({
            actorId: userId,
            actorRole: req?.user?.role ?? 'staff',
            actorEmail: req?.user?.email,
            action: 'AUTH_LOGOUT',
            entityType: 'User',
            entityId: userId,
            req,
        });
    }
}
export async function revokeAllUserSessions(userId) {
    await SessionModel.updateMany({ userId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
    await UserModel.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
}
export async function changeOwnPassword(userId, currentPassword, newPassword, req) {
    const user = await UserModel.findById(userId);
    if (!user)
        throw new UnauthorizedError('User not found');
    const valid = await verifyPassword(user.passwordHash, currentPassword);
    if (!valid) {
        throw new BadRequestError('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
    }
    if (newPassword.length < 8) {
        throw new BadRequestError('New password must be at least 8 characters long');
    }
    user.passwordHash = await hashPassword(newPassword);
    user.tokenVersion += 1;
    await user.save();
    await revokeAllUserSessions(userId);
    await recordAudit({
        actorId: userId,
        actorRole: user.role,
        actorEmail: user.email,
        action: 'AUTH_PASSWORD_CHANGED',
        entityType: 'User',
        entityId: userId,
        req,
    });
}
//# sourceMappingURL=auth.service.js.map