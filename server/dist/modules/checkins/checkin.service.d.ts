import type { Request } from 'express';
import type { CheckinResult } from '@eventflow/shared';
import { type ITicket } from '../tickets/ticket.model.js';
import type { AuthenticatedUser } from '../../middleware/auth.middleware.js';
export interface ScanEvaluationResponse {
    admitted: boolean;
    result: CheckinResult;
    message: string;
    ticket?: {
        ticketId: string;
        bookingReference: string;
        attendeeName: string;
        ticketTypeName: string;
        status: string;
        checkedInAt?: Date;
        checkedOutAt?: Date;
    };
    gate?: {
        id: string;
        code: string;
        name: string;
    };
    scannedAt: Date;
}
export interface InspectQrResponse {
    valid: boolean;
    result: CheckinResult;
    message: string;
    canCheckIn: boolean;
    canCheckOut: boolean;
    recommendedAction: 'CHECK_IN' | 'CHECK_OUT' | null;
    ticket?: {
        ticketId: string;
        bookingReference: string;
        attendeeName: string;
        ticketTypeName: string;
        status: string;
        checkedInAt?: Date;
        checkedOutAt?: Date;
    };
    gate?: {
        id: string;
        code: string;
        name: string;
    };
    scannedAt: Date;
}
export declare function scanAndCheckinQr(params: {
    qrToken: string;
    gateId: string;
    deviceId?: string;
    actor: AuthenticatedUser;
}): Promise<ScanEvaluationResponse>;
export declare function manualCheckinByTicketId(params: {
    ticketId: string;
    gateId: string;
    deviceId?: string;
    actor: AuthenticatedUser;
}, req?: Request): Promise<ScanEvaluationResponse>;
export declare function reverseCheckin(ticketDocId: string, reason: string, actor: AuthenticatedUser, req?: Request): Promise<import("mongoose").Document<unknown, {}, ITicket, {}, {}> & ITicket & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare function inspectQrTicket(params: {
    qrToken: string;
    gateId: string;
    deviceId?: string;
    actor: AuthenticatedUser;
}): Promise<InspectQrResponse>;
export declare function processTicketGateAction(params: {
    qrToken?: string;
    ticketId?: string;
    action: 'CHECK_IN' | 'CHECK_OUT';
    gateId: string;
    deviceId?: string;
    actor: AuthenticatedUser;
}, req?: Request): Promise<ScanEvaluationResponse>;
//# sourceMappingURL=checkin.service.d.ts.map