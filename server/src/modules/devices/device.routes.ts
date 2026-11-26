import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, requireStaffPermission } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { sendSuccess } from '../../utils/response.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { ScannerDeviceModel } from './device.model.js';
import { recordAudit } from '../audit/audit.service.js';

const router = Router();

router.get('/', authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.user!.role === 'staff') {
      filter.$or = [
        { assignedStaffId: req.user!.id },
        { assignedGateId: { $in: req.user!.assignedGateIds } },
      ];
    }
    const devices = await ScannerDeviceModel.find(filter)
      .populate('assignedGateId', 'code name')
      .populate('assignedStaffId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    sendSuccess(res, devices);
  } catch (err) {
    next(err);
  }
});

const createDeviceSchema = z.object({
  deviceCode: z.string().trim().min(2).max(40).toUpperCase(),
  name: z.string().trim().min(2).max(120),
  assignedGateId: z.string().optional().nullable(),
  assignedStaffId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']).default('ACTIVE'),
});

router.post('/', authenticate, requireRole('admin'), validateBody(createDeviceSchema), async (req, res, next) => {
  try {
    const exists = await ScannerDeviceModel.findOne({ deviceCode: req.body.deviceCode });
    if (exists) throw new ConflictError('Device code already exists');

    const device = await ScannerDeviceModel.create(req.body);
    await recordAudit({
      actorId: req.user!.id,
      actorRole: 'admin',
      actorEmail: req.user!.email,
      action: 'DEVICE_REGISTERED',
      entityType: 'ScannerDevice',
      entityId: String(device._id),
      entityReference: device.deviceCode,
      req,
    });

    sendSuccess(res, device, { statusCode: 201, message: 'Scanner device registered' });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const device = await ScannerDeviceModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!device) throw new NotFoundError('Device not found');

    await recordAudit({
      actorId: req.user!.id,
      actorRole: 'admin',
      actorEmail: req.user!.email,
      action: req.body.status === 'SUSPENDED' ? 'DEVICE_SUSPENDED' : 'DEVICE_UPDATED',
      entityType: 'ScannerDevice',
      entityId: String(device._id),
      entityReference: device.deviceCode,
      req,
      metadata: { updates: req.body },
    });

    sendSuccess(res, device, { message: 'Scanner device updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const device = await ScannerDeviceModel.findByIdAndDelete(req.params.id);
    if (!device) throw new NotFoundError('Device not found');

    await recordAudit({
      actorId: req.user!.id,
      actorRole: 'admin',
      actorEmail: req.user!.email,
      action: 'DEVICE_DELETED',
      entityType: 'ScannerDevice',
      entityId: String(device._id),
      entityReference: device.deviceCode,
      req,
    });

    sendSuccess(res, { deleted: true, id: String(device._id) }, { message: 'Scanner device deleted' });
  } catch (err) {
    next(err);
  }
});

const heartbeatSchema = z.object({
  deviceCode: z.string().trim().min(2).toUpperCase(),
  gateId: z.string().optional(),
  appVersion: z.string().optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  networkType: z.string().optional(),
});

router.post(
  '/heartbeat',
  authenticate,
  requireRole('admin', 'staff'),
  requireStaffPermission('MANAGE_DEVICE_HEARTBEAT'),
  validateBody(heartbeatSchema),
  async (req, res, next) => {
    try {
      const device = await ScannerDeviceModel.findOne({ deviceCode: req.body.deviceCode });
      if (!device) throw new NotFoundError('Device not registered');
      if (device.status === 'SUSPENDED') {
        throw new ForbiddenError('This scanner device has been suspended by the administrator', 'DEVICE_SUSPENDED');
      }

      device.lastHeartbeatAt = new Date();
      if (req.body.appVersion) device.appVersion = req.body.appVersion;
      if (req.body.batteryLevel !== undefined) device.batteryLevel = req.body.batteryLevel;
      if (req.body.networkType) device.networkType = req.body.networkType;
      await device.save();

      sendSuccess(res, device);
    } catch (err) {
      next(err);
    }
  },
);

export const deviceRoutes = router;
