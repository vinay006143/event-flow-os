import mongoose from 'mongoose';
import { AuditLogModel } from './audit.model.js';
import { logger } from '../../config/logger.js';
export async function recordAudit(entry) {
    try {
        await AuditLogModel.create({
            actorId: entry.actorId ? new mongoose.Types.ObjectId(entry.actorId) : undefined,
            actorRole: entry.actorRole,
            actorEmail: entry.actorEmail,
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            entityReference: entry.entityReference,
            result: entry.result ?? 'SUCCESS',
            ipAddress: entry.req?.ip,
            userAgent: entry.req?.headers['user-agent'],
            metadata: entry.metadata,
        });
    }
    catch (err) {
        logger.error({ err, action: entry.action }, 'Failed to persist audit log');
    }
}
//# sourceMappingURL=audit.service.js.map