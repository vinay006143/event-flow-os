import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { UserModel } from '../modules/users/user.model.js';
export async function authenticate(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        const cookieToken = req.cookies?.access_token;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : cookieToken;
        if (!token) {
            throw new UnauthorizedError('Missing authentication token');
        }
        let payload;
        try {
            payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
        }
        catch {
            throw new UnauthorizedError('Invalid or expired authentication token');
        }
        const user = await UserModel.findById(payload.sub).lean();
        if (!user) {
            throw new UnauthorizedError('Account no longer exists');
        }
        if (user.status !== 'ACTIVE') {
            throw new ForbiddenError('Account has been suspended', 'ACCOUNT_SUSPENDED');
        }
        if (user.tokenVersion !== payload.tv) {
            throw new UnauthorizedError('Session has been invalidated, please log in again');
        }
        req.user = {
            id: String(user._id),
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: user.permissions ?? [],
            assignedGateIds: (user.assignedGateIds ?? []).map((g) => String(g)),
            tokenVersion: user.tokenVersion,
            sessionId: payload.sid,
        };
        next();
    }
    catch (err) {
        next(err);
    }
}
export function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            next(new UnauthorizedError('Authentication required'));
            return;
        }
        if (!roles.includes(req.user.role)) {
            next(new ForbiddenError('You do not have permission to access this resource'));
            return;
        }
        next();
    };
}
export function requireStaffPermission(...required) {
    return (req, _res, next) => {
        if (!req.user) {
            next(new UnauthorizedError('Authentication required'));
            return;
        }
        if (req.user.role === 'admin') {
            next();
            return;
        }
        const missing = required.filter((perm) => !req.user.permissions.includes(perm));
        if (missing.length > 0) {
            next(new ForbiddenError(`Missing required staff permission: ${missing.join(', ')}`));
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.middleware.js.map