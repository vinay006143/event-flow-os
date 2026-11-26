import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { StaffPermission, UserRole } from '@eventflow/shared';
import { env } from '../config/env.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { UserModel } from '../modules/users/user.model.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: StaffPermission[];
  assignedGateIds: string[];
  tokenVersion: number;
  sessionId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface JwtAccessPayload {
  sub: string;
  role: UserRole;
  tv: number;
  sid?: string;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.access_token as string | undefined;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : cookieToken;

    if (!token) {
      throw new UnauthorizedError('Missing authentication token');
    }

    let payload: JwtAccessPayload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
    } catch {
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
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
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

export function requireStaffPermission(...required: StaffPermission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }
    if (req.user.role === 'admin') {
      next();
      return;
    }
    const missing = required.filter((perm) => !req.user!.permissions.includes(perm));
    if (missing.length > 0) {
      next(new ForbiddenError(`Missing required staff permission: ${missing.join(', ')}`));
      return;
    }
    next();
  };
}
