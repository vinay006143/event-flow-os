import { Router } from 'express';
import { z } from 'zod';
import { createStaffSchema, STAFF_PERMISSIONS } from '@eventflow/shared';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { sendSuccess } from '../../utils/response.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors.js';
import { hashPassword } from '../../utils/crypto.js';
import { UserModel } from '../users/user.model.js';
import { revokeAllUserSessions, sanitizeUser } from '../auth/auth.service.js';
import { CheckinModel } from '../checkins/checkin.model.js';
import { ScannerDeviceModel } from '../devices/device.model.js';
import { recordAudit } from '../audit/audit.service.js';

const router = Router();

router.get('/', authenticate, requireRole('admin'), async (_req, res, next) => {
  try {
    const staff = await UserModel.find({ role: 'staff' }).sort({ createdAt: -1 });
    const stats = await CheckinModel.aggregate([
      { $match: { result: 'VALID' } },
      { $group: { _id: '$staffId', totalScans: { $sum: 1 }, lastScanAt: { $max: '$createdAt' } } },
    ]);
    const statsMap = new Map(stats.map((s) => [String(s._id), s]));

    sendSuccess(
      res,
      staff.map((u) => ({
        ...sanitizeUser(u),
        stats: statsMap.get(String(u._id)) ?? { totalScans: 0, lastScanAt: null },
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireRole('admin'), validateBody(createStaffSchema), async (req, res, next) => {
  try {
    const email = String(req.body.email).toLowerCase().trim();
    const existing = await UserModel.findOne({ email });
    if (existing) throw new ConflictError('An account with this email already exists');

    const passwordHash = await hashPassword(req.body.password);
    const staff = await UserModel.create({
      name: req.body.name,
      email,
      mobile: req.body.mobile,
      passwordHash,
      role: 'staff', // Strictly staff; single admin cannot be created via API
      status: 'ACTIVE',
      permissions: req.body.permissions,
      assignedGateIds: req.body.assignedGateIds,
      createdBy: req.user!.id,
    });

    await recordAudit({
      actorId: req.user!.id,
      actorRole: 'admin',
      actorEmail: req.user!.email,
      action: 'STAFF_CREATED',
      entityType: 'User',
      entityId: String(staff._id),
      entityReference: staff.email,
      req,
      metadata: { permissions: staff.permissions, assignedGateIds: req.body.assignedGateIds },
    });

    sendSuccess(res, sanitizeUser(staff), { statusCode: 201, message: 'Staff account created' });
  } catch (err) {
    next(err);
  }
});

const updateStaffSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  mobile: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  permissions: z.array(z.enum(STAFF_PERMISSIONS)).optional(),
  assignedGateIds: z.array(z.string()).optional(),
  assignedDeviceIds: z.array(z.string()).optional(),
});

router.patch('/:id', authenticate, requireRole('admin'), validateBody(updateStaffSchema), async (req, res, next) => {
  try {
    const staff = await UserModel.findOne({ _id: req.params.id, role: 'staff' });
    if (!staff) throw new NotFoundError('Staff member not found');

    Object.assign(staff, req.body);
    await staff.save();

    if (req.body.status === 'SUSPENDED') {
      await revokeAllUserSessions(String(staff._id));
    }

    await recordAudit({
      actorId: req.user!.id,
      actorRole: 'admin',
      actorEmail: req.user!.email,
      action: req.body.status === 'SUSPENDED' ? 'STAFF_SUSPENDED' : 'STAFF_UPDATED',
      entityType: 'User',
      entityId: String(staff._id),
      entityReference: staff.email,
      req,
      metadata: { updates: req.body },
    });

    sendSuccess(res, sanitizeUser(staff), { message: 'Staff member updated' });
  } catch (err) {
    next(err);
  }
});

const resetPassSchema = z.object({
  newPassword: z.string().min(8).max(128),
});

router.post('/:id/reset-password', authenticate, requireRole('admin'), validateBody(resetPassSchema), async (req, res, next) => {
  try {
    const staff = await UserModel.findOne({ _id: req.params.id, role: 'staff' });
    if (!staff) throw new NotFoundError('Staff member not found');
    if (req.body.newPassword.length < 8) throw new BadRequestError('Password too short');

    staff.passwordHash = await hashPassword(req.body.newPassword);
    staff.tokenVersion += 1;
    await staff.save();
    await revokeAllUserSessions(String(staff._id));

    await recordAudit({
      actorId: req.user!.id,
      actorRole: 'admin',
      actorEmail: req.user!.email,
      action: 'STAFF_PASSWORD_RESET',
      entityType: 'User',
      entityId: String(staff._id),
      entityReference: staff.email,
      req,
    });

    sendSuccess(res, { reset: true }, { message: 'Staff password reset and sessions revoked' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const staff = await UserModel.findOneAndDelete({ _id: req.params.id, role: 'staff' });
    if (!staff) throw new NotFoundError('Staff member not found');

    await Promise.all([
      revokeAllUserSessions(String(staff._id)),
      ScannerDeviceModel.updateMany({ assignedStaffId: staff._id }, { $set: { assignedStaffId: null } }),
    ]);

    await recordAudit({
      actorId: req.user!.id,
      actorRole: 'admin',
      actorEmail: req.user!.email,
      action: 'STAFF_DELETED',
      entityType: 'User',
      entityId: String(staff._id),
      entityReference: staff.email,
      req,
    });

    sendSuccess(res, { deleted: true, id: String(staff._id) }, { message: 'Staff account deleted' });
  } catch (err) {
    next(err);
  }
});

export const staffRoutes = router;
