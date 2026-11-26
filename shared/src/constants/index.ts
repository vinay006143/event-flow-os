export const USER_ROLES = ['admin', 'staff'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const STAFF_PERMISSIONS = [
  'SCAN_TICKETS',
  'MANUAL_LOOKUP',
  'VIEW_RECENT_SCANS',
  'VIEW_ASSIGNED_GATES',
  'VIEW_SUPPORT_ISSUES',
  'MANAGE_DEVICE_HEARTBEAT',
] as const;
export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

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
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const TICKET_STATUSES = [
  'ISSUED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
  'REFUNDED',
  'REVOKED',
  'REISSUED',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'INITIATED',
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REFUND_PENDING',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const REFUND_STATUSES = [
  'INITIATED',
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REJECTED',
] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

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
] as const;
export type CheckinResult = (typeof CHECKIN_RESULTS)[number];

export const RESERVATION_STATUSES = [
  'ACTIVE',
  'CONVERTED',
  'EXPIRED',
  'RELEASED',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ['WHATSAPP', 'EMAIL'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = [
  'QUEUED',
  'SENT',
  'DELIVERED',
  'FAILED',
  'SKIPPED',
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const SUPPORT_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_USER',
  'RESOLVED',
  'CLOSED',
] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

export const PROMO_DISCOUNT_TYPES = ['FIXED', 'PERCENTAGE'] as const;
export type PromoDiscountType = (typeof PROMO_DISCOUNT_TYPES)[number];

export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
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

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return true;
  return BOOKING_TRANSITIONS[from].includes(to);
}
