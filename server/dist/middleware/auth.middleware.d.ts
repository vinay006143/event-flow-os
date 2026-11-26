import type { NextFunction, Request, Response } from 'express';
import type { StaffPermission, UserRole } from '@eventflow/shared';
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
export declare function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void>;
export declare function requireRole(...roles: UserRole[]): (req: Request, _res: Response, next: NextFunction) => void;
export declare function requireStaffPermission(...required: StaffPermission[]): (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map