import { Router } from 'express';
import { AuditLogModel } from './audit.model.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { getPagination, sendSuccess } from '../../utils/response.js';
const router = Router();
router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = {};
        if (req.query.action)
            filter.action = String(req.query.action);
        if (req.query.entityType)
            filter.entityType = String(req.query.entityType);
        if (req.query.result)
            filter.result = String(req.query.result);
        if (req.query.search) {
            const q = String(req.query.search).trim();
            filter.$or = [
                { action: new RegExp(q, 'i') },
                { entityReference: new RegExp(q, 'i') },
                { actorEmail: new RegExp(q, 'i') },
            ];
        }
        const [items, total] = await Promise.all([
            AuditLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            AuditLogModel.countDocuments(filter),
        ]);
        sendSuccess(res, items, {
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        next(err);
    }
});
export const auditRoutes = router;
//# sourceMappingURL=audit.routes.js.map