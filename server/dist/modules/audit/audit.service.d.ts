import type { Request } from 'express';
import mongoose from 'mongoose';
export interface AuditEntryInput {
    actorId?: string | mongoose.Types.ObjectId;
    actorRole: 'admin' | 'staff' | 'system' | 'public';
    actorEmail?: string;
    action: string;
    entityType: string;
    entityId?: string;
    entityReference?: string;
    result?: 'SUCCESS' | 'FAILURE';
    req?: Request;
    metadata?: Record<string, unknown>;
}
export declare function recordAudit(entry: AuditEntryInput): Promise<void>;
//# sourceMappingURL=audit.service.d.ts.map