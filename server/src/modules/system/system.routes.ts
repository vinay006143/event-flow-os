import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { sendSuccess } from '../../utils/response.js';
import { getOrCreateEventConfig, updateEventConfig } from '../event/event.service.js';
import { expireStaleReservations } from '../reservations/reservation.service.js';
import { BookingModel } from '../bookings/booking.model.js';
import { ReservationModel } from '../reservations/reservation.model.js';
import { TicketTypeModel } from '../ticket-types/ticket-type.model.js';
import { TicketModel } from '../tickets/ticket.model.js';
import { issueTicketsForPaidBooking } from '../tickets/ticket.service.js';
import { UserModel } from '../users/user.model.js';
import { ScannerDeviceModel } from '../devices/device.model.js';
import { revokeAllUserSessions } from '../auth/auth.service.js';
import { recordAudit } from '../audit/audit.service.js';

const router = Router();

router.get('/health', (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    success: dbReady,
    service: 'eventflow-api',
    environment: env.NODE_ENV,
    paymentProviderMode: env.PAYMENT_PROVIDER_MODE,
    whatsappProviderMode: env.WHATSAPP_PROVIDER_MODE,
    storageMode: env.STORAGE_PROVIDER_MODE,
    database: dbReady ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

router.get('/status', authenticate, requireRole('admin'), async (_req, res, next) => {
  try {
    const [config, failedBookings, activeReservations] = await Promise.all([
      getOrCreateEventConfig(),
      BookingModel.countDocuments({ status: 'PAID', ticketGenerationStatus: 'FAILED' }),
      ReservationModel.countDocuments({ status: 'ACTIVE' }),
    ]);

    sendSuccess(res, {
      environment: env.NODE_ENV,
      modes: {
        payment: env.PAYMENT_PROVIDER_MODE,
        whatsapp: env.WHATSAPP_PROVIDER_MODE,
        email: env.EMAIL_PROVIDER_MODE,
        storage: env.STORAGE_PROVIDER_MODE,
        queue: 'in-process',
      },
      operations: config.operations,
      recovery: {
        failedTicketGenerations: failedBookings,
        activeReservations,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Inventory reconciliation: recomputes reserved & sold quantities from active reservations & active issued/checked-in tickets
router.post('/reconcile-inventory', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const expired = await expireStaleReservations();
    const ticketTypes = await TicketTypeModel.find();
    const summary: Array<{ code: string; sold: number; reserved: number }> = [];

    for (const tt of ticketTypes) {
      const [soldCount, activeRes] = await Promise.all([
        TicketModel.countDocuments({ ticketTypeId: tt._id, status: { $in: ['ISSUED', 'CHECKED_IN'] } }),
        ReservationModel.aggregate([
          { $match: { status: 'ACTIVE', expiresAt: { $gt: new Date() } } },
          { $unwind: '$items' },
          { $match: { 'items.ticketTypeId': tt._id } },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } },
        ]),
      ]);
      const reservedQty = activeRes[0]?.qty ?? 0;
      tt.soldQuantity = soldCount;
      tt.reservedQuantity = reservedQty;
      await tt.save();
      summary.push({ code: tt.code, sold: soldCount, reserved: reservedQty });
    }

    await recordAudit({
      actorId: req.user!.id,
      actorRole: 'admin',
      actorEmail: req.user!.email,
      action: 'SYSTEM_INVENTORY_RECONCILED',
      entityType: 'System',
      req,
      metadata: { expiredReservations: expired, summary },
    });

    sendSuccess(res, { expiredReservations: expired, summary }, { message: 'Inventory reconciled' });
  } catch (err) {
    next(err);
  }
});

// Recover all paid bookings whose ticket generation failed
router.post('/recover-tickets', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const failed = await BookingModel.find({
      status: 'PAID',
      ticketGenerationStatus: { $in: ['FAILED', 'NOT_STARTED', 'PENDING'] },
    });

    const recovered: string[] = [];
    for (const b of failed) {
      await issueTicketsForPaidBooking(String(b._id));
      recovered.push(b.bookingReference);
    }

    await recordAudit({
      actorId: req.user!.id,
      actorRole: 'admin',
      actorEmail: req.user!.email,
      action: 'SYSTEM_TICKET_RECOVERY_RUN',
      entityType: 'System',
      req,
      metadata: { recoveredCount: recovered.length, recovered },
    });

    sendSuccess(res, { recoveredCount: recovered.length, recovered });
  } catch (err) {
    next(err);
  }
});

// Admin Emergency Controls
const emergencyActionSchema = z.object({
  action: z.enum([
    'PAUSE_SALES',
    'RESUME_SALES',
    'DISABLE_CHECKOUT',
    'ENABLE_CHECKOUT',
    'PAUSE_CHECKIN',
    'RESUME_CHECKIN',
    'SUSPEND_ALL_STAFF',
    'DISABLE_ALL_DEVICES',
    'SET_ANNOUNCEMENT',
  ]),
  announcement: z.string().max(500).optional(),
  banner: z.string().max(300).optional(),
  confirm: z.literal(true),
});

router.post(
  '/emergency',
  authenticate,
  requireRole('admin'),
  validateBody(emergencyActionSchema),
  async (req, res, next) => {
    try {
      const { action, announcement, banner } = req.body as z.infer<typeof emergencyActionSchema>;
      const actor = { id: req.user!.id, email: req.user!.email };

      if (action === 'PAUSE_SALES') {
        await updateEventConfig({ operations: { salesOpen: false } as never }, actor, req);
      } else if (action === 'RESUME_SALES') {
        await updateEventConfig({ operations: { salesOpen: true } as never }, actor, req);
      } else if (action === 'DISABLE_CHECKOUT') {
        await updateEventConfig({ operations: { checkoutEnabled: false } as never }, actor, req);
      } else if (action === 'ENABLE_CHECKOUT') {
        await updateEventConfig({ operations: { checkoutEnabled: true } as never }, actor, req);
      } else if (action === 'PAUSE_CHECKIN') {
        await updateEventConfig({ operations: { checkinOpen: false } as never }, actor, req);
      } else if (action === 'RESUME_CHECKIN') {
        await updateEventConfig({ operations: { checkinOpen: true } as never }, actor, req);
      } else if (action === 'SUSPEND_ALL_STAFF') {
        const staffUsers = await UserModel.find({ role: 'staff', status: 'ACTIVE' });
        await UserModel.updateMany({ role: 'staff' }, { $set: { status: 'SUSPENDED' } });
        for (const s of staffUsers) {
          await revokeAllUserSessions(String(s._id));
        }
      } else if (action === 'DISABLE_ALL_DEVICES') {
        await ScannerDeviceModel.updateMany({}, { $set: { status: 'SUSPENDED' } });
      } else if (action === 'SET_ANNOUNCEMENT') {
        await updateEventConfig(
          {
            operations: {
              emergencyAnnouncement: announcement ?? '',
              emergencyBanner: banner ?? '',
            } as never,
          },
          actor,
          req,
        );
      }

      await recordAudit({
        actorId: req.user!.id,
        actorRole: 'admin',
        actorEmail: req.user!.email,
        action: `EMERGENCY_${action}`,
        entityType: 'EmergencyControl',
        req,
        metadata: { announcement, banner },
      });

      const updated = await getOrCreateEventConfig();
      sendSuccess(res, updated.operations, { message: `Emergency action ${action} executed` });
    } catch (err) {
      next(err);
    }
  },
);

export const systemRoutes = router;
