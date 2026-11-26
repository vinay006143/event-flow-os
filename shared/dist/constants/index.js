export const USER_ROLES = ['admin', 'staff'];
export const STAFF_PERMISSIONS = [
    'SCAN_TICKETS',
    'MANUAL_LOOKUP',
    'VIEW_RECENT_SCANS',
    'VIEW_ASSIGNED_GATES',
    'VIEW_SUPPORT_ISSUES',
    'MANAGE_DEVICE_HEARTBEAT',
];
export const BOOKING_STATUSES = [
    'RESERVED',
    'PENDING_PAYMENT',
    'PAID',
    'FAILED',
    'EXPIRED',
    'CANCELLED',
    'REFUND_PENDING',
    'PARTIALLY_REFUNDED',
    'REFUNDED',
];
export const TICKET_STATUSES = [
    'ISSUED',
    'CHECKED_IN',
    'CHECKED_OUT',
    'CANCELLED',
    'REFUNDED',
    'REVOKED',
    'REISSUED',
];
export const PAYMENT_STATUSES = [
    'INITIATED',
    'PENDING',
    'COMPLETED',
    'FAILED',
    'REFUND_PENDING',
    'PARTIALLY_REFUNDED',
    'REFUNDED',
];
export const REFUND_STATUSES = [
    'INITIATED',
    'PENDING',
    'COMPLETED',
    'FAILED',
    'REJECTED',
];
export const CHECKIN_RESULTS = [
    'VALID',
    'CHECKED_OUT',
    'NOT_CHECKED_IN',
    'ALREADY_CHECKED_IN',
    'INVALID',
    'CANCELLED',
    'REFUNDED',
    'REVOKED',
    'WRONG_EVENT',
    'UNAUTHORIZED_GATE',
    'EXPIRED',
];
export const RESERVATION_STATUSES = [
    'ACTIVE',
    'CONVERTED',
    'EXPIRED',
    'RELEASED',
];
export const NOTIFICATION_CHANNELS = ['WHATSAPP', 'EMAIL'];
export const NOTIFICATION_STATUSES = [
    'QUEUED',
    'SENT',
    'DELIVERED',
    'FAILED',
    'SKIPPED',
];
export const SUPPORT_STATUSES = [
    'OPEN',
    'IN_PROGRESS',
    'WAITING_USER',
    'RESOLVED',
    'CLOSED',
];
export const SUPPORT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const PROMO_DISCOUNT_TYPES = ['FIXED', 'PERCENTAGE'];
export const BOOKING_TRANSITIONS = {
    RESERVED: ['PENDING_PAYMENT', 'EXPIRED', 'CANCELLED'],
    PENDING_PAYMENT: ['PAID', 'FAILED', 'EXPIRED', 'CANCELLED'],
    PAID: ['CANCELLED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED'],
    FAILED: ['PENDING_PAYMENT', 'CANCELLED', 'EXPIRED'],
    EXPIRED: [],
    CANCELLED: ['REFUND_PENDING', 'REFUNDED'],
    REFUND_PENDING: ['PARTIALLY_REFUNDED', 'REFUNDED', 'PAID'],
    PARTIALLY_REFUNDED: ['REFUND_PENDING', 'REFUNDED'],
    REFUNDED: [],
};
export function canTransitionBooking(from, to) {
    if (from === to)
        return true;
    return BOOKING_TRANSITIONS[from].includes(to);
}
//# sourceMappingURL=index.js.map