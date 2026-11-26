import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { getPagination, sendSuccess } from '../../utils/response.js';
import { NotificationLogModel } from './notification.model.js';
import {
  broadcastAdminAnnouncement,
  dispatchBookingTicketsNotifications,
  previewBroadcastRecipients,
  retryNotificationById,
  type BroadcastAudience,
} from './notification.service.js';
import { recordAudit } from '../audit/audit.service.js';

const router = Router();

const attachmentSchema = z
  .object({
    filename: z.string().trim().min(1).max(180).default('attachment.png'),
    mimeType: z.string().trim().optional(),
    dataUrl: z.string().optional(),
    url: z.string().trim().url().optional(),
  })
  .refine((v) => Boolean(v.dataUrl || v.url), {
    message: 'Image attachment requires an uploaded image or valid URL',
  });

const broadcastSchema = z.object({
  channels: z.array(z.enum(['WHATSAPP', 'EMAIL'])).min(1),
  audience: z.enum(['ALL_ACTIVE', 'CHECKED_IN', 'NOT_CHECKED_IN', 'TICKET_TYPE']).default('ALL_ACTIVE'),
  ticketTypeId: z.string().optional(),
  subject: z.string().trim().min(2).max(160),
  message: z.string().trim().min(5).max(2000),
  attachment: attachmentSchema.optional(),
});

router.get('/recipients-preview', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const audience = (String(req.query.audience || 'ALL_ACTIVE') as BroadcastAudience);
    const ticketTypeId = req.query.ticketTypeId ? String(req.query.ticketTypeId) : undefined;
    const summary = await previewBroadcastRecipients({ audience, ticketTypeId });
    sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/broadcast',
  authenticate,
  requireRole('admin'),
  validateBody(broadcastSchema),
  async (req, res, next) => {
    try {
      const result = await broadcastAdminAnnouncement(req.body);
      await recordAudit({
        actorId: req.user!.id,
        actorRole: 'admin',
        actorEmail: req.user!.email,
        action: 'NOTIFICATION_BROADCAST_SENT',
        entityType: 'NotificationLog',
        req,
        metadata: {
          channels: req.body.channels,
          audience: req.body.audience,
          subject: req.body.subject,
          hasAttachment: Boolean(req.body.attachment),
          attachmentName: req.body.attachment?.filename,
          stats: result,
        },
      });
      sendSuccess(res, result, { message: 'Broadcast message dispatched to attendees' });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query as Record<string, unknown>);
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.channel) filter.channel = String(req.query.channel);
    if (req.query.bookingReference) {
      filter.bookingReference = new RegExp(String(req.query.bookingReference), 'i');
    }

    const [items, total] = await Promise.all([
      NotificationLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      NotificationLogModel.countDocuments(filter),
    ]);

    sendSuccess(res, items, {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/retry', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const retried = await retryNotificationById(String(req.params.id));
    await recordAudit({
      actorId: req.user!.id,
      actorRole: 'admin',
      actorEmail: req.user!.email,
      action: 'NOTIFICATION_RETRIED',
      entityType: 'NotificationLog',
      entityId: String(retried._id),
      entityReference: retried.bookingReference,
      req,
    });
    sendSuccess(res, retried, { message: 'Notification retry executed' });
  } catch (err) {
    next(err);
  }
});

router.post('/resend-booking/:bookingId', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const bookingId = String(req.params.bookingId);
    const logs = await dispatchBookingTicketsNotifications(bookingId);
    await recordAudit({
      actorId: req.user!.id,
      actorRole: 'admin',
      actorEmail: req.user!.email,
      action: 'NOTIFICATION_BOOKING_RESEND',
      entityType: 'Booking',
      entityId: bookingId,
      req,
    });
    sendSuccess(res, logs, { message: 'Booking notifications resent' });
  } catch (err) {
    next(err);
  }
});

export const notificationRoutes = router;
