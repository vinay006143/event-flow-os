import { Router } from 'express';
import { createGateSchema } from '@eventflow/shared';
import { authenticate, requireRole, requireStaffPermission } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { sendSuccess } from '../../utils/response.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import { GateModel } from './gate.model.js';
import { CheckinModel } from '../checkins/checkin.model.js';
import { UserModel } from '../users/user.model.js';
import { ScannerDeviceModel } from '../devices/device.model.js';
import { recordAudit } from '../audit/audit.service.js';
const router = Router();
router.get('/', authenticate, requireRole('admin', 'staff'), requireStaffPermission('VIEW_ASSIGNED_GATES'), async (req, res, next) => {
    try {
        const filter = {};
        if (req.user.role === 'staff') {
            filter._id = { $in: req.user.assignedGateIds };
            filter.isActive = true;
        }
        const gates = await GateModel.find(filter).sort({ code: 1 }).lean();
        const gateStats = await CheckinModel.aggregate([
            { $match: { result: 'VALID' } },
            { $group: { _id: '$gateId', totalCheckins: { $sum: 1 }, lastCheckinAt: { $max: '$createdAt' } } },
        ]);
        const statsMap = new Map(gateStats.map((s) => [String(s._id), s]));
        const enriched = gates.map((g) => ({
            ...g,
            id: String(g._id),
            stats: statsMap.get(String(g._id)) ?? { totalCheckins: 0, lastCheckinAt: null },
        }));
        sendSuccess(res, enriched);
    }
    catch (err) {
        next(err);
    }
});
router.post('/', authenticate, requireRole('admin'), validateBody(createGateSchema), async (req, res, next) => {
    try {
        const code = String(req.body.code).toUpperCase();
        const exists = await GateModel.findOne({ code });
        if (exists)
            throw new ConflictError('Gate code already exists');
        const gate = await GateModel.create({ ...req.body, code });
        await recordAudit({
            actorId: req.user.id,
            actorRole: 'admin',
            actorEmail: req.user.email,
            action: 'GATE_CREATED',
            entityType: 'Gate',
            entityId: String(gate._id),
            entityReference: gate.code,
            req,
        });
        sendSuccess(res, gate, { statusCode: 201, message: 'Gate created' });
    }
    catch (err) {
        next(err);
    }
});
router.patch('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const updates = { ...req.body };
        if (updates.code)
            updates.code = String(updates.code).trim().toUpperCase();
        const gate = await GateModel.findByIdAndUpdate(req.params.id, updates, { new: true });
        if (!gate)
            throw new NotFoundError('Gate not found');
        await recordAudit({
            actorId: req.user.id,
            actorRole: 'admin',
            actorEmail: req.user.email,
            action: 'GATE_UPDATED',
            entityType: 'Gate',
            entityId: String(gate._id),
            entityReference: gate.code,
            req,
            metadata: { updates },
        });
        sendSuccess(res, gate, { message: 'Gate updated' });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const gate = await GateModel.findByIdAndDelete(req.params.id);
        if (!gate)
            throw new NotFoundError('Gate not found');
        await Promise.all([
            UserModel.updateMany({ assignedGateIds: gate._id }, { $pull: { assignedGateIds: gate._id } }),
            ScannerDeviceModel.updateMany({ assignedGateId: gate._id }, { $set: { assignedGateId: null } }),
        ]);
        await recordAudit({
            actorId: req.user.id,
            actorRole: 'admin',
            actorEmail: req.user.email,
            action: 'GATE_DELETED',
            entityType: 'Gate',
            entityId: String(gate._id),
            entityReference: gate.code,
            req,
        });
        sendSuccess(res, { deleted: true, id: String(gate._id) }, { message: 'Gate deleted' });
    }
    catch (err) {
        next(err);
    }
});
export const gateRoutes = router;
//# sourceMappingURL=gate.routes.js.map