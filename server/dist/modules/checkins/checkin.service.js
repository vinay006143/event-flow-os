import { TicketModel } from '../tickets/ticket.model.js';
import { GateModel } from '../gates/gate.model.js';
import { ScannerDeviceModel } from '../devices/device.model.js';
import { CheckinModel } from './checkin.model.js';
import { getOrCreateEventConfig } from '../event/event.service.js';
import { verifyQrTokenFormat } from '../../utils/crypto.js';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { recordAudit } from '../audit/audit.service.js';
async function logCheckinAttempt(params) {
    await CheckinModel.create({
        ticketDocId: params.ticket?._id,
        ticketId: params.ticket?.ticketId,
        bookingId: params.ticket?.bookingId,
        bookingReference: params.ticket?.bookingReference,
        attendeeId: params.ticket?.attendeeId,
        attendeeName: params.ticket?.attendeeName,
        ticketTypeName: params.ticket?.ticketTypeName,
        gateId: params.gate?._id,
        gateCode: params.gate?.code,
        gateName: params.gate?.name,
        staffId: params.actor.id,
        staffName: params.actor.name,
        deviceId: params.device?._id,
        deviceCode: params.device?.deviceCode,
        method: params.method,
        result: params.result,
        message: params.message,
    });
}
async function resolveAndAuthorizeGateAndDevice(params) {
    const gate = await GateModel.findById(params.gateId);
    if (!gate || !gate.isActive) {
        throw new NotFoundError('Selected gate is inactive or does not exist');
    }
    let device = null;
    if (params.deviceId) {
        device = await ScannerDeviceModel.findOne({
            $or: [
                ...(params.deviceId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: params.deviceId }] : []),
                { deviceCode: params.deviceId.toUpperCase() },
            ],
        });
        if (!device || device.status !== 'ACTIVE') {
            throw new ForbiddenError('Scanner device is not authorized or has been suspended', 'DEVICE_UNAUTHORIZED');
        }
        device.lastActivityAt = new Date();
        await device.save();
    }
    const gateAuthorized = params.actor.role === 'admin' || params.actor.assignedGateIds.includes(String(gate._id));
    return { gate, device, gateAuthorized };
}
async function executeAtomicTicketCheckin(params) {
    const { ticket, gate, gateAuthorized, device, actor, method } = params;
    const scannedAt = new Date();
    if (!gateAuthorized || !gate) {
        const message = 'Staff member is not assigned to this gate';
        await logCheckinAttempt({ ticket, gate, actor, device, method, result: 'UNAUTHORIZED_GATE', message });
        return {
            admitted: false,
            result: 'UNAUTHORIZED_GATE',
            message,
            ticket: {
                ticketId: ticket.ticketId,
                bookingReference: ticket.bookingReference,
                attendeeName: ticket.attendeeName,
                ticketTypeName: ticket.ticketTypeName,
                status: ticket.status,
            },
            scannedAt,
        };
    }
    // Category-level gate restriction
    if (gate.allowedTicketTypeIds.length > 0 &&
        !gate.allowedTicketTypeIds.some((id) => String(id) === String(ticket.ticketTypeId))) {
        const message = `${ticket.ticketTypeName} tickets are not permitted at ${gate.name}`;
        await logCheckinAttempt({ ticket, gate, actor, device, method, result: 'UNAUTHORIZED_GATE', message });
        return {
            admitted: false,
            result: 'UNAUTHORIZED_GATE',
            message,
            ticket: {
                ticketId: ticket.ticketId,
                bookingReference: ticket.bookingReference,
                attendeeName: ticket.attendeeName,
                ticketTypeName: ticket.ticketTypeName,
                status: ticket.status,
            },
            gate: { id: String(gate._id), code: gate.code, name: gate.name },
            scannedAt,
        };
    }
    if (ticket.status === 'CANCELLED') {
        const message = 'Ticket has been cancelled';
        await logCheckinAttempt({ ticket, gate, actor, device, method, result: 'CANCELLED', message });
        return {
            admitted: false,
            result: 'CANCELLED',
            message,
            ticket: {
                ticketId: ticket.ticketId,
                bookingReference: ticket.bookingReference,
                attendeeName: ticket.attendeeName,
                ticketTypeName: ticket.ticketTypeName,
                status: ticket.status,
            },
            scannedAt,
        };
    }
    if (ticket.status === 'REFUNDED') {
        const message = 'Ticket has been refunded and is no longer valid';
        await logCheckinAttempt({ ticket, gate, actor, device, method, result: 'REFUNDED', message });
        return {
            admitted: false,
            result: 'REFUNDED',
            message,
            ticket: {
                ticketId: ticket.ticketId,
                bookingReference: ticket.bookingReference,
                attendeeName: ticket.attendeeName,
                ticketTypeName: ticket.ticketTypeName,
                status: ticket.status,
            },
            scannedAt,
        };
    }
    if (ticket.status === 'REVOKED' || ticket.status === 'REISSUED') {
        const message = ticket.status === 'REISSUED'
            ? 'This pass was replaced by a reissued ticket'
            : 'Ticket has been revoked by event administration';
        await logCheckinAttempt({ ticket, gate, actor, device, method, result: 'REVOKED', message });
        return {
            admitted: false,
            result: 'REVOKED',
            message,
            ticket: {
                ticketId: ticket.ticketId,
                bookingReference: ticket.bookingReference,
                attendeeName: ticket.attendeeName,
                ticketTypeName: ticket.ticketTypeName,
                status: ticket.status,
            },
            scannedAt,
        };
    }
    // Atomic check-in guard: transitions ISSUED or CHECKED_OUT -> CHECKED_IN once
    const checkedInTicket = await TicketModel.findOneAndUpdate({ _id: ticket._id, status: { $in: ['ISSUED', 'CHECKED_OUT'] } }, {
        $set: {
            status: 'CHECKED_IN',
            checkedInAt: scannedAt,
            checkedInGateId: gate._id,
            checkedInStaffId: actor.id,
        },
    }, { new: true });
    if (!checkedInTicket) {
        const latest = await TicketModel.findById(ticket._id);
        const message = `Already checked in${latest?.checkedInAt ? ` at ${latest.checkedInAt.toISOString()}` : ''}`;
        await logCheckinAttempt({
            ticket: latest ?? ticket,
            gate,
            actor,
            device,
            method,
            result: 'ALREADY_CHECKED_IN',
            message,
        });
        return {
            admitted: false,
            result: 'ALREADY_CHECKED_IN',
            message,
            ticket: {
                ticketId: ticket.ticketId,
                bookingReference: ticket.bookingReference,
                attendeeName: ticket.attendeeName,
                ticketTypeName: ticket.ticketTypeName,
                status: latest?.status ?? 'CHECKED_IN',
                checkedInAt: latest?.checkedInAt,
            },
            gate: { id: String(gate._id), code: gate.code, name: gate.name },
            scannedAt,
        };
    }
    const message = `Entry approved for ${checkedInTicket.attendeeName} (${checkedInTicket.ticketTypeName})`;
    await logCheckinAttempt({
        ticket: checkedInTicket,
        gate,
        actor,
        device,
        method,
        result: 'VALID',
        message,
    });
    return {
        admitted: true,
        result: 'VALID',
        message,
        ticket: {
            ticketId: checkedInTicket.ticketId,
            bookingReference: checkedInTicket.bookingReference,
            attendeeName: checkedInTicket.attendeeName,
            ticketTypeName: checkedInTicket.ticketTypeName,
            status: checkedInTicket.status,
            checkedInAt: checkedInTicket.checkedInAt,
        },
        gate: { id: String(gate._id), code: gate.code, name: gate.name },
        scannedAt,
    };
}
export async function scanAndCheckinQr(params) {
    const eventConfig = await getOrCreateEventConfig();
    if (!eventConfig.operations.checkinOpen) {
        throw new ForbiddenError('Gate check-ins are currently paused by the administrator', 'CHECKIN_PAUSED');
    }
    const { gate, device, gateAuthorized } = await resolveAndAuthorizeGateAndDevice({
        gateId: params.gateId,
        deviceId: params.deviceId,
        actor: params.actor,
    });
    const scannedAt = new Date();
    const parsed = verifyQrTokenFormat(params.qrToken);
    if (!parsed.valid) {
        const message = 'Invalid or tampered QR ticket token';
        await logCheckinAttempt({
            gate,
            actor: params.actor,
            device,
            method: 'QR_SCAN',
            result: 'INVALID',
            message,
        });
        return { admitted: false, result: 'INVALID', message, scannedAt };
    }
    if (parsed.eventId !== eventConfig.eventCode) {
        const message = `Ticket belongs to event "${parsed.eventId}", expected "${eventConfig.eventCode}"`;
        await logCheckinAttempt({
            gate,
            actor: params.actor,
            device,
            method: 'QR_SCAN',
            result: 'WRONG_EVENT',
            message,
        });
        return { admitted: false, result: 'WRONG_EVENT', message, scannedAt };
    }
    const ticket = await TicketModel.findOne({ qrTokenHash: parsed.tokenHash });
    if (!ticket) {
        const message = 'Ticket not found in system records';
        await logCheckinAttempt({
            gate,
            actor: params.actor,
            device,
            method: 'QR_SCAN',
            result: 'INVALID',
            message,
        });
        return { admitted: false, result: 'INVALID', message, scannedAt };
    }
    return executeAtomicTicketCheckin({
        ticket,
        gate,
        gateAuthorized,
        device,
        actor: params.actor,
        method: 'QR_SCAN',
    });
}
export async function manualCheckinByTicketId(params, req) {
    const eventConfig = await getOrCreateEventConfig();
    if (!eventConfig.operations.checkinOpen) {
        throw new ForbiddenError('Gate check-ins are currently paused by the administrator', 'CHECKIN_PAUSED');
    }
    const { gate, device, gateAuthorized } = await resolveAndAuthorizeGateAndDevice({
        gateId: params.gateId,
        deviceId: params.deviceId,
        actor: params.actor,
    });
    const ticket = await TicketModel.findOne({ ticketId: params.ticketId.trim().toUpperCase() });
    if (!ticket) {
        throw new NotFoundError('Ticket ID not found');
    }
    const res = await executeAtomicTicketCheckin({
        ticket,
        gate,
        gateAuthorized,
        device,
        actor: params.actor,
        method: 'MANUAL_LOOKUP',
    });
    await recordAudit({
        actorId: params.actor.id,
        actorRole: params.actor.role,
        actorEmail: params.actor.email,
        action: 'MANUAL_CHECKIN_ATTEMPT',
        entityType: 'Ticket',
        entityId: String(ticket._id),
        entityReference: ticket.ticketId,
        result: res.admitted ? 'SUCCESS' : 'FAILURE',
        req,
        metadata: { gateCode: gate.code, checkinResult: res.result },
    });
    return res;
}
export async function reverseCheckin(ticketDocId, reason, actor, req) {
    const ticket = await TicketModel.findById(ticketDocId);
    if (!ticket)
        throw new NotFoundError('Ticket not found');
    if (ticket.status !== 'CHECKED_IN') {
        throw new ForbiddenError('Ticket is not currently checked in');
    }
    ticket.status = 'ISSUED';
    ticket.checkedInAt = undefined;
    ticket.checkedInGateId = undefined;
    ticket.checkedInStaffId = undefined;
    await ticket.save();
    await recordAudit({
        actorId: actor.id,
        actorRole: 'admin',
        actorEmail: actor.email,
        action: 'CHECKIN_REVERSED',
        entityType: 'Ticket',
        entityId: String(ticket._id),
        entityReference: ticket.ticketId,
        req,
        metadata: { reason },
    });
    return ticket;
}
async function executeAtomicTicketCheckout(params) {
    const { ticket, gate, gateAuthorized, device, actor, method } = params;
    const scannedAt = new Date();
    if (!gateAuthorized || !gate) {
        const message = 'Staff member is not assigned to this gate';
        await logCheckinAttempt({ ticket, gate, actor, device, method, result: 'UNAUTHORIZED_GATE', message });
        return {
            admitted: false,
            result: 'UNAUTHORIZED_GATE',
            message,
            ticket: {
                ticketId: ticket.ticketId,
                bookingReference: ticket.bookingReference,
                attendeeName: ticket.attendeeName,
                ticketTypeName: ticket.ticketTypeName,
                status: ticket.status,
            },
            scannedAt,
        };
    }
    if (ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED' || ticket.status === 'REVOKED' || ticket.status === 'REISSUED') {
        const resMap = {
            CANCELLED: 'CANCELLED',
            REFUNDED: 'REFUNDED',
            REVOKED: 'REVOKED',
            REISSUED: 'REVOKED',
        };
        const result = resMap[ticket.status] ?? 'INVALID';
        const message = `Ticket status is ${ticket.status}`;
        await logCheckinAttempt({ ticket, gate, actor, device, method, result, message });
        return {
            admitted: false,
            result,
            message,
            ticket: {
                ticketId: ticket.ticketId,
                bookingReference: ticket.bookingReference,
                attendeeName: ticket.attendeeName,
                ticketTypeName: ticket.ticketTypeName,
                status: ticket.status,
            },
            scannedAt,
        };
    }
    const checkedOutTicket = await TicketModel.findOneAndUpdate({ _id: ticket._id, status: 'CHECKED_IN' }, { $set: { status: 'CHECKED_OUT', checkedOutAt: scannedAt } }, { new: true });
    if (!checkedOutTicket) {
        const latest = await TicketModel.findById(ticket._id);
        const message = latest?.status === 'CHECKED_OUT'
            ? `Attendee already checked out${latest.checkedOutAt ? ` at ${latest.checkedOutAt.toISOString()}` : ''}`
            : 'Attendee is not currently checked in';
        await logCheckinAttempt({
            ticket: latest ?? ticket,
            gate,
            actor,
            device,
            method,
            result: 'NOT_CHECKED_IN',
            message,
        });
        return {
            admitted: false,
            result: 'NOT_CHECKED_IN',
            message,
            ticket: {
                ticketId: ticket.ticketId,
                bookingReference: ticket.bookingReference,
                attendeeName: ticket.attendeeName,
                ticketTypeName: ticket.ticketTypeName,
                status: latest?.status ?? ticket.status,
                checkedInAt: latest?.checkedInAt,
                checkedOutAt: latest?.checkedOutAt,
            },
            gate: { id: String(gate._id), code: gate.code, name: gate.name },
            scannedAt,
        };
    }
    const message = `Check-out recorded for ${checkedOutTicket.attendeeName} (${checkedOutTicket.ticketTypeName})`;
    await logCheckinAttempt({
        ticket: checkedOutTicket,
        gate,
        actor,
        device,
        method,
        result: 'CHECKED_OUT',
        message,
    });
    return {
        admitted: true,
        result: 'CHECKED_OUT',
        message,
        ticket: {
            ticketId: checkedOutTicket.ticketId,
            bookingReference: checkedOutTicket.bookingReference,
            attendeeName: checkedOutTicket.attendeeName,
            ticketTypeName: checkedOutTicket.ticketTypeName,
            status: checkedOutTicket.status,
            checkedInAt: checkedOutTicket.checkedInAt,
            checkedOutAt: checkedOutTicket.checkedOutAt,
        },
        gate: { id: String(gate._id), code: gate.code, name: gate.name },
        scannedAt,
    };
}
export async function inspectQrTicket(params) {
    const eventConfig = await getOrCreateEventConfig();
    if (!eventConfig.operations.checkinOpen) {
        throw new ForbiddenError('Gate check-ins are currently paused by the administrator', 'CHECKIN_PAUSED');
    }
    const { gate, gateAuthorized } = await resolveAndAuthorizeGateAndDevice({
        gateId: params.gateId,
        deviceId: params.deviceId,
        actor: params.actor,
    });
    const scannedAt = new Date();
    const parsed = verifyQrTokenFormat(params.qrToken);
    if (!parsed.valid) {
        return {
            valid: false,
            result: 'INVALID',
            message: 'Invalid or tampered QR ticket token',
            canCheckIn: false,
            canCheckOut: false,
            recommendedAction: null,
            scannedAt,
        };
    }
    if (parsed.eventId !== eventConfig.eventCode) {
        return {
            valid: false,
            result: 'WRONG_EVENT',
            message: `Ticket belongs to event "${parsed.eventId}", expected "${eventConfig.eventCode}"`,
            canCheckIn: false,
            canCheckOut: false,
            recommendedAction: null,
            scannedAt,
        };
    }
    const ticket = await TicketModel.findOne({ qrTokenHash: parsed.tokenHash });
    if (!ticket) {
        return {
            valid: false,
            result: 'INVALID',
            message: 'Ticket not found in system records',
            canCheckIn: false,
            canCheckOut: false,
            recommendedAction: null,
            scannedAt,
        };
    }
    const ticketSummary = {
        ticketId: ticket.ticketId,
        bookingReference: ticket.bookingReference,
        attendeeName: ticket.attendeeName,
        ticketTypeName: ticket.ticketTypeName,
        status: ticket.status,
        checkedInAt: ticket.checkedInAt,
        checkedOutAt: ticket.checkedOutAt,
    };
    const gateSummary = { id: String(gate._id), code: gate.code, name: gate.name };
    if (!gateAuthorized) {
        return {
            valid: false,
            result: 'UNAUTHORIZED_GATE',
            message: 'Staff member is not assigned to this gate',
            canCheckIn: false,
            canCheckOut: false,
            recommendedAction: null,
            ticket: ticketSummary,
            gate: gateSummary,
            scannedAt,
        };
    }
    if (gate.allowedTicketTypeIds.length > 0 &&
        !gate.allowedTicketTypeIds.some((id) => String(id) === String(ticket.ticketTypeId))) {
        return {
            valid: false,
            result: 'UNAUTHORIZED_GATE',
            message: `${ticket.ticketTypeName} tickets are not permitted at ${gate.name}`,
            canCheckIn: false,
            canCheckOut: false,
            recommendedAction: null,
            ticket: ticketSummary,
            gate: gateSummary,
            scannedAt,
        };
    }
    if (ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED' || ticket.status === 'REVOKED' || ticket.status === 'REISSUED') {
        const resultMap = {
            CANCELLED: 'CANCELLED',
            REFUNDED: 'REFUNDED',
            REVOKED: 'REVOKED',
            REISSUED: 'REVOKED',
        };
        return {
            valid: false,
            result: resultMap[ticket.status] ?? 'INVALID',
            message: `Ticket cannot be used because its status is ${ticket.status}`,
            canCheckIn: false,
            canCheckOut: false,
            recommendedAction: null,
            ticket: ticketSummary,
            gate: gateSummary,
            scannedAt,
        };
    }
    if (ticket.status === 'CHECKED_IN') {
        return {
            valid: true,
            result: 'VALID',
            message: `${ticket.attendeeName} is currently checked in. Select Check Out or verify entry status.`,
            canCheckIn: false,
            canCheckOut: true,
            recommendedAction: 'CHECK_OUT',
            ticket: ticketSummary,
            gate: gateSummary,
            scannedAt,
        };
    }
    return {
        valid: true,
        result: 'VALID',
        message: `Valid pass for ${ticket.attendeeName}. Select Check In or Check Out and submit.`,
        canCheckIn: true,
        canCheckOut: false,
        recommendedAction: 'CHECK_IN',
        ticket: ticketSummary,
        gate: gateSummary,
        scannedAt,
    };
}
export async function processTicketGateAction(params, req) {
    const eventConfig = await getOrCreateEventConfig();
    if (!eventConfig.operations.checkinOpen) {
        throw new ForbiddenError('Gate check-ins are currently paused by the administrator', 'CHECKIN_PAUSED');
    }
    const { gate, device, gateAuthorized } = await resolveAndAuthorizeGateAndDevice({
        gateId: params.gateId,
        deviceId: params.deviceId,
        actor: params.actor,
    });
    let ticket = null;
    let method = 'QR_SCAN';
    if (params.qrToken) {
        const parsed = verifyQrTokenFormat(params.qrToken);
        if (!parsed.valid) {
            return { admitted: false, result: 'INVALID', message: 'Invalid or tampered QR ticket token', scannedAt: new Date() };
        }
        if (parsed.eventId !== eventConfig.eventCode) {
            return {
                admitted: false,
                result: 'WRONG_EVENT',
                message: `Ticket belongs to event "${parsed.eventId}", expected "${eventConfig.eventCode}"`,
                scannedAt: new Date(),
            };
        }
        ticket = await TicketModel.findOne({ qrTokenHash: parsed.tokenHash });
        method = 'QR_SCAN';
    }
    else if (params.ticketId) {
        ticket = await TicketModel.findOne({ ticketId: params.ticketId.trim().toUpperCase() });
        method = 'MANUAL_LOOKUP';
    }
    if (!ticket) {
        throw new NotFoundError('Ticket not found');
    }
    const res = params.action === 'CHECK_OUT'
        ? await executeAtomicTicketCheckout({ ticket, gate, gateAuthorized, device, actor: params.actor, method })
        : await executeAtomicTicketCheckin({ ticket, gate, gateAuthorized, device, actor: params.actor, method });
    await recordAudit({
        actorId: params.actor.id,
        actorRole: params.actor.role,
        actorEmail: params.actor.email,
        action: params.action === 'CHECK_OUT' ? 'GATE_CHECKOUT_ACTION' : 'GATE_CHECKIN_ACTION',
        entityType: 'Ticket',
        entityId: String(ticket._id),
        entityReference: ticket.ticketId,
        result: res.admitted ? 'SUCCESS' : 'FAILURE',
        req,
        metadata: { gateCode: gate.code, method, checkinResult: res.result },
    });
    return res;
}
//# sourceMappingURL=checkin.service.js.map