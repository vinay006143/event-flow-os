import { Router } from 'express';
import { z } from 'zod';
import { scanTicketSchema } from '@eventflow/shared';
import { authenticate, requireRole, requireStaffPermission } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { getPagination, sendSuccess } from '../../utils/response.js';
import { BadRequestError } from '../../utils/errors.js';
import { CheckinModel } from './checkin.model.js';
import { TicketModel } from '../tickets/ticket.model.js';
import { inspectQrTicket, manualCheckinByTicketId, processTicketGateAction, reverseCheckin, scanAndCheckinQr, } from './checkin.service.js';
const router = Router();
router.post('/inspect', authenticate, requireRole('admin', 'staff'), requireStaffPermission('SCAN_TICKETS'), validateBody(scanTicketSchema), async (req, res, next) => {
    try {
        const result = await inspectQrTicket({
            qrToken: req.body.qrToken,
            gateId: req.body.gateId,
            deviceId: req.body.deviceId,
            actor: req.user,
        });
        sendSuccess(res, result);
    }
    catch (err) {
        next(err);
    }
});
const gateActionSchema = z
    .object({
    qrToken: z.string().min(10).max(512).optional(),
    ticketId: z.string().min(3).optional(),
    action: z.enum(['CHECK_IN', 'CHECK_OUT']),
    gateId: z.string().min(1),
    deviceId: z.string().optional(),
})
    .refine((v) => Boolean(v.qrToken || v.ticketId), { message: 'qrToken or ticketId is required' });
router.post('/action', authenticate, requireRole('admin', 'staff'), requireStaffPermission('SCAN_TICKETS'), validateBody(gateActionSchema), async (req, res, next) => {
    try {
        const result = await processTicketGateAction({
            qrToken: req.body.qrToken,
            ticketId: req.body.ticketId,
            action: req.body.action,
            gateId: req.body.gateId,
            deviceId: req.body.deviceId,
            actor: req.user,
        }, req);
        sendSuccess(res, result);
    }
    catch (err) {
        next(err);
    }
});
router.post('/scan', authenticate, requireRole('admin', 'staff'), requireStaffPermission('SCAN_TICKETS'), validateBody(scanTicketSchema), async (req, res, next) => {
    try {
        const result = await scanAndCheckinQr({
            qrToken: req.body.qrToken,
            gateId: req.body.gateId,
            deviceId: req.body.deviceId,
            actor: req.user,
        });
        sendSuccess(res, result);
    }
    catch (err) {
        next(err);
    }
});
const manualCheckinSchema = z.object({
    ticketId: z.string().min(3),
    gateId: z.string().min(1),
    deviceId: z.string().optional(),
});
router.post('/manual', authenticate, requireRole('admin', 'staff'), requireStaffPermission('MANUAL_LOOKUP'), validateBody(manualCheckinSchema), async (req, res, next) => {
    try {
        const result = await manualCheckinByTicketId({
            ticketId: req.body.ticketId,
            gateId: req.body.gateId,
            deviceId: req.body.deviceId,
            actor: req.user,
        }, req);
        sendSuccess(res, result);
    }
    catch (err) {
        next(err);
    }
});
// Restricted manual lookup for staff (never exposes full attendee export)
router.get('/lookup', authenticate, requireRole('admin', 'staff'), requireStaffPermission('MANUAL_LOOKUP'), async (req, res, next) => {
    try {
        const q = String(req.query.q ?? '').trim();
        if (q.length < 3) {
            throw new BadRequestError('Enter at least 3 characters to look up a ticket');
        }
        const tickets = await TicketModel.find({
            $or: [
                { ticketId: new RegExp(q, 'i') },
                { bookingReference: new RegExp(q, 'i') },
                { attendeeName: new RegExp(q, 'i') },
                { attendeeMobile: new RegExp(q, 'i') },
            ],
        })
            .select('ticketId bookingReference attendeeName attendeeMobile ticketTypeName status checkedInAt')
            .limit(15)
            .lean();
        const sanitized = tickets.map((t) => ({
            ticketId: t.ticketId,
            bookingReference: t.bookingReference,
            attendeeName: t.attendeeName,
            maskedMobile: t.attendeeMobile.length > 4
                ? `${'*'.repeat(t.attendeeMobile.length - 4)}${t.attendeeMobile.slice(-4)}`
                : t.attendeeMobile,
            ticketTypeName: t.ticketTypeName,
            status: t.status,
            checkedInAt: t.checkedInAt,
        }));
        sendSuccess(res, sanitized);
    }
    catch (err) {
        next(err);
    }
});
router.get('/recent', authenticate, requireRole('admin', 'staff'), requireStaffPermission('VIEW_RECENT_SCANS'), async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = {};
        if (req.user.role === 'staff') {
            filter.staffId = req.user.id;
        }
        if (req.query.result)
            filter.result = String(req.query.result);
        if (req.query.gateId)
            filter.gateId = String(req.query.gateId);
        const [items, total] = await Promise.all([
            CheckinModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            CheckinModel.countDocuments(filter),
        ]);
        sendSuccess(res, items, {
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:ticketDocId/reverse', authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const reason = String(req.body.reason ?? 'Manual reversal by administrator');
        const updated = await reverseCheckin(String(req.params.ticketDocId), reason, req.user, req);
        sendSuccess(res, updated, { message: 'Check-in reversed' });
    }
    catch (err) {
        next(err);
    }
});
export const checkinRoutes = router;
//# sourceMappingURL=checkin.routes.js.map