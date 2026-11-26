import { Router } from 'express';
import { z } from 'zod';
import { createSupportTicketSchema, SUPPORT_PRIORITIES, SUPPORT_STATUSES } from '@eventflow/shared';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { getPagination, sendSuccess } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';
import { randomCode } from '../../utils/crypto.js';
import { SupportTicketModel } from './support.model.js';
import { recordAudit } from '../audit/audit.service.js';

const router = Router();

router.post('/', validateBody(createSupportTicketSchema), async (req, res, next) => {
  try {
    const ticket = await SupportTicketModel.create({
      ...req.body,
      reference: `SUP-${randomCode(7)}`,
      status: 'OPEN',
    });
    sendSuccess(res, ticket, { statusCode: 201, message: 'Support request submitted' });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query as Record<string, unknown>);
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.priority) filter.priority = String(req.query.priority);
    if (req.query.search) {
      const q = String(req.query.search).trim();
      filter.$or = [
        { reference: new RegExp(q, 'i') },
        { subject: new RegExp(q, 'i') },
        { contactName: new RegExp(q, 'i') },
        { bookingReference: new RegExp(q, 'i') },
      ];
    }

    const [items, total] = await Promise.all([
      SupportTicketModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SupportTicketModel.countDocuments(filter),
    ]);

    sendSuccess(res, items, { meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

const updateSupportSchema = z.object({
  status: z.enum(SUPPORT_STATUSES).optional(),
  priority: z.enum(SUPPORT_PRIORITIES).optional(),
  resolution: z.string().max(1500).optional(),
  note: z.string().max(1000).optional(),
});

router.patch('/:id', authenticate, requireRole('admin'), validateBody(updateSupportSchema), async (req, res, next) => {
  try {
    const ticket = await SupportTicketModel.findById(req.params.id);
    if (!ticket) throw new NotFoundError('Support ticket not found');

    if (req.body.status) ticket.status = req.body.status;
    if (req.body.priority) ticket.priority = req.body.priority;
    if (req.body.resolution) ticket.resolution = req.body.resolution;
    if (req.body.note) {
      ticket.notes.push({ authorName: req.user!.name, note: req.body.note, at: new Date() });
    }
    await ticket.save();

    await recordAudit({
      actorId: req.user!.id,
      actorRole: 'admin',
      actorEmail: req.user!.email,
      action: 'SUPPORT_TICKET_UPDATED',
      entityType: 'SupportTicket',
      entityId: String(ticket._id),
      entityReference: ticket.reference,
      req,
      metadata: { status: ticket.status },
    });

    sendSuccess(res, ticket, { message: 'Support ticket updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const ticket = await SupportTicketModel.findByIdAndDelete(req.params.id);
    if (!ticket) throw new NotFoundError('Support ticket not found');

    await recordAudit({
      actorId: req.user!.id,
      actorRole: 'admin',
      actorEmail: req.user!.email,
      action: 'SUPPORT_TICKET_DELETED',
      entityType: 'SupportTicket',
      entityId: String(ticket._id),
      entityReference: ticket.reference,
      req,
    });

    sendSuccess(res, { deleted: true, id: String(ticket._id) }, { message: 'Support ticket deleted' });
  } catch (err) {
    next(err);
  }
});

export const supportRoutes = router;
