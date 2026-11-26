import { z } from 'zod';
import { PROMO_DISCOUNT_TYPES, STAFF_PERMISSIONS, SUPPORT_PRIORITIES } from '../constants/index.js';
export const registrationFieldTypeSchema = z.enum([
    'text',
    'email',
    'phone',
    'number',
    'select',
    'textarea',
    'checkbox',
]);
export const registrationFieldSchema = z.object({
    key: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_]+$/),
    label: z.string().min(1).max(120),
    type: registrationFieldTypeSchema,
    required: z.boolean().default(true),
    placeholder: z.string().max(200).optional(),
    helpText: z.string().max(300).optional(),
    options: z.array(z.string()).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    displayOrder: z.number().int().min(0).default(0),
    enabled: z.boolean().default(true),
    categoryRestrictions: z.array(z.string()).optional(),
});
export const createReservationSchema = z.object({
    items: z
        .array(z.object({
        ticketTypeId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
    }))
        .min(1),
    promoCode: z.string().trim().max(50).optional(),
    idempotencyKey: z.string().min(8).max(128).optional(),
});
function preprocessMobile(val) {
    if (typeof val !== 'string')
        return val;
    const cleaned = val.trim().replace(/[\s()-]/g, '').replace(/^0+(?=\d{10}$)/, '');
    return cleaned;
}
const mobileFieldSchema = z.preprocess(preprocessMobile, z.string().regex(/^[6-9]\d{9}$|^\+?[1-9]\d{7,14}$/, 'Enter a valid 10-digit mobile number'));
export const attendeeInputSchema = z.object({
    ticketTypeId: z.string().min(1),
    fullName: z.string().trim().min(2, 'Attendee name must be at least 2 characters').max(120),
    age: z.coerce.number().int().min(1, 'Age must be at least 1').max(120).optional(),
    mobile: mobileFieldSchema,
    email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
    customFields: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export const createBookingSchema = z.object({
    reservationId: z.string().min(1),
    primaryContact: z.object({
        fullName: z.string().trim().min(2, 'Primary contact name must be at least 2 characters').max(120),
        mobile: mobileFieldSchema,
        email: z.string().trim().email('Enter a valid primary contact email'),
    }),
    attendees: z.array(attendeeInputSchema).min(1),
    promoCode: z
        .string()
        .trim()
        .max(50)
        .optional()
        .nullable()
        .transform((v) => (v && v.length > 0 ? v : undefined)),
    whatsappOptIn: z.boolean().default(true),
    acceptedTerms: z.literal(true, {
        errorMap: () => ({ message: 'You must accept the event terms and policies' }),
    }),
    idempotencyKey: z.string().min(8).max(128).optional(),
});
export const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(6).max(128),
    deviceCode: z.string().trim().max(64).optional(),
});
export const createStaffSchema = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    mobile: z.string().trim().min(8).max(20).optional(),
    password: z.string().min(8).max(128),
    permissions: z.array(z.enum(STAFF_PERMISSIONS)).default(['SCAN_TICKETS', 'MANUAL_LOOKUP', 'VIEW_RECENT_SCANS']),
    assignedGateIds: z.array(z.string()).default([]),
});
export const createGateSchema = z.object({
    code: z.string().trim().min(2).max(32).regex(/^[A-Z0-9_-]+$/),
    name: z.string().trim().min(2).max(120),
    description: z.string().max(400).optional(),
    allowedTicketTypeIds: z.array(z.string()).default([]),
    isActive: z.boolean().default(true),
});
export const createTicketTypeSchema = z.object({
    code: z.string().trim().min(2).max(32).regex(/^[A-Z0-9_-]+$/),
    name: z.string().trim().min(2).max(120),
    description: z.string().max(1000).default(''),
    price: z.number().min(0),
    currency: z.string().default('INR'),
    capacity: z.number().int().min(1),
    maxPerBooking: z.number().int().min(1).max(20).default(10),
    saleStart: z.string().datetime().optional().nullable(),
    saleEnd: z.string().datetime().optional().nullable(),
    isActive: z.boolean().default(true),
    displayOrder: z.number().int().min(0).default(0),
    perks: z.array(z.string()).default([]),
    restrictions: z.string().max(500).optional(),
    badgeColor: z.string().max(32).optional(),
});
export const createPromoCodeSchema = z.object({
    code: z.string().trim().min(2).max(40).toUpperCase(),
    description: z.string().max(300).optional(),
    discountType: z.enum(PROMO_DISCOUNT_TYPES),
    discountValue: z.number().positive(),
    minPurchaseAmount: z.number().min(0).default(0),
    maxDiscountAmount: z.number().positive().optional().nullable(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
    totalUsageLimit: z.number().int().positive().optional().nullable(),
    perUserLimit: z.number().int().positive().default(1),
    applicableTicketTypeIds: z.array(z.string()).default([]),
    isActive: z.boolean().default(true),
});
export const scanTicketSchema = z.object({
    qrToken: z.string().min(10).max(512),
    gateId: z.string().min(1),
    deviceId: z.string().optional(),
    clientTimestamp: z.string().optional(),
});
export const createSupportTicketSchema = z.object({
    category: z.string().trim().min(2).max(80),
    subject: z.string().trim().min(3).max(160),
    description: z.string().trim().min(10).max(2000),
    priority: z.enum(SUPPORT_PRIORITIES).default('MEDIUM'),
    bookingReference: z.string().trim().max(64).optional(),
    contactName: z.string().trim().min(2).max(120),
    contactMobile: z.string().trim().min(8).max(20),
    contactEmail: z.string().trim().email().optional().or(z.literal('')),
});
//# sourceMappingURL=index.js.map