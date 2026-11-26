import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { getPagination, sendSuccess } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';
import { AttendeeModel } from './attendee.model.js';
import { TicketModel } from '../tickets/ticket.model.js';
import { BookingModel } from '../bookings/booking.model.js';
import { recordAudit } from '../audit/audit.service.js';

const router = Router();

router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query as Record<string, unknown>);
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.search) {
      const q = String(req.query.search).trim();
      filter.$or = [
        { fullName: new RegExp(q, 'i') },
        { mobile: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { bookingReference: new RegExp(q, 'i') },
      ];
    }

    const [attendees, total] = await Promise.all([
      AttendeeModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AttendeeModel.countDocuments(filter),
    ]);

    const attIds = attendees.map((a) => a._id);
    const tickets = await TicketModel.find({
      attendeeId: { $in: attIds },
      status: { $ne: 'REISSUED' },
    }).lean();
    const ticketByAtt = new Map(tickets.map((t) => [String(t.attendeeId), t]));

    const enriched = attendees.map((a) => ({
      ...a,
      ticket: ticketByAtt.get(String(a._id)) ?? null,
    }));

    sendSuccess(res, enriched, {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const attendee = await AttendeeModel.findById(req.params.id).lean();
    if (!attendee) throw new NotFoundError('Attendee not found');
    const [booking, tickets] = await Promise.all([
      BookingModel.findById(attendee.bookingId).lean(),
      TicketModel.find({ attendeeId: attendee._id }).sort({ createdAt: -1 }).lean(),
    ]);
    sendSuccess(res, { attendee, booking, tickets });
  } catch (err) {
    next(err);
  }
});

const updateAttendeeSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  age: z.coerce.number().int().min(1).max(120).optional(),
  mobile: z.string().trim().min(8).max(20).optional(),
  email: z.string().trim().email().optional(),
});

router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateBody(updateAttendeeSchema),
  async (req, res, next) => {
    try {
      const attendee = await AttendeeModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!attendee) throw new NotFoundError('Attendee not found');

      if (req.body.fullName) {
        await TicketModel.updateMany(
          { attendeeId: attendee._id, status: { $in: ['ISSUED', 'CHECKED_IN'] } },
          { $set: { attendeeName: req.body.fullName } },
        );
      }

      await recordAudit({
        actorId: req.user!.id,
        actorRole: 'admin',
        actorEmail: req.user!.email,
        action: 'ATTENDEE_UPDATED',
        entityType: 'Attendee',
        entityId: String(attendee._id),
        entityReference: attendee.bookingReference,
        req,
        metadata: { updates: req.body },
      });

      sendSuccess(res, attendee, { message: 'Attendee updated' });
    } catch (err) {
      next(err);
    }
  },
);

export const attendeeRoutes = router;
