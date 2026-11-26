import { z } from 'zod';
export declare const registrationFieldTypeSchema: z.ZodEnum<["text", "email", "phone", "number", "select", "textarea", "checkbox"]>;
export declare const registrationFieldSchema: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodString;
    type: z.ZodEnum<["text", "email", "phone", "number", "select", "textarea", "checkbox"]>;
    required: z.ZodDefault<z.ZodBoolean>;
    placeholder: z.ZodOptional<z.ZodString>;
    helpText: z.ZodOptional<z.ZodString>;
    options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    min: z.ZodOptional<z.ZodNumber>;
    max: z.ZodOptional<z.ZodNumber>;
    pattern: z.ZodOptional<z.ZodString>;
    displayOrder: z.ZodDefault<z.ZodNumber>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    categoryRestrictions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    key: string;
    label: string;
    type: "number" | "text" | "email" | "phone" | "select" | "textarea" | "checkbox";
    required: boolean;
    displayOrder: number;
    enabled: boolean;
    placeholder?: string | undefined;
    helpText?: string | undefined;
    options?: string[] | undefined;
    min?: number | undefined;
    max?: number | undefined;
    pattern?: string | undefined;
    categoryRestrictions?: string[] | undefined;
}, {
    key: string;
    label: string;
    type: "number" | "text" | "email" | "phone" | "select" | "textarea" | "checkbox";
    required?: boolean | undefined;
    placeholder?: string | undefined;
    helpText?: string | undefined;
    options?: string[] | undefined;
    min?: number | undefined;
    max?: number | undefined;
    pattern?: string | undefined;
    displayOrder?: number | undefined;
    enabled?: boolean | undefined;
    categoryRestrictions?: string[] | undefined;
}>;
export type RegistrationFieldConfig = z.infer<typeof registrationFieldSchema>;
export declare const createReservationSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        ticketTypeId: z.ZodString;
        quantity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        ticketTypeId: string;
        quantity: number;
    }, {
        ticketTypeId: string;
        quantity: number;
    }>, "many">;
    promoCode: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    items: {
        ticketTypeId: string;
        quantity: number;
    }[];
    promoCode?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    items: {
        ticketTypeId: string;
        quantity: number;
    }[];
    promoCode?: string | undefined;
    idempotencyKey?: string | undefined;
}>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export declare const attendeeInputSchema: z.ZodObject<{
    ticketTypeId: z.ZodString;
    fullName: z.ZodString;
    age: z.ZodOptional<z.ZodNumber>;
    mobile: z.ZodEffects<z.ZodString, string, unknown>;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    customFields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
}, "strip", z.ZodTypeAny, {
    ticketTypeId: string;
    fullName: string;
    mobile: string;
    email?: string | undefined;
    age?: number | undefined;
    customFields?: Record<string, string | number | boolean> | undefined;
}, {
    ticketTypeId: string;
    fullName: string;
    email?: string | undefined;
    age?: number | undefined;
    mobile?: unknown;
    customFields?: Record<string, string | number | boolean> | undefined;
}>;
export declare const createBookingSchema: z.ZodObject<{
    reservationId: z.ZodString;
    primaryContact: z.ZodObject<{
        fullName: z.ZodString;
        mobile: z.ZodEffects<z.ZodString, string, unknown>;
        email: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        fullName: string;
        mobile: string;
    }, {
        email: string;
        fullName: string;
        mobile?: unknown;
    }>;
    attendees: z.ZodArray<z.ZodObject<{
        ticketTypeId: z.ZodString;
        fullName: z.ZodString;
        age: z.ZodOptional<z.ZodNumber>;
        mobile: z.ZodEffects<z.ZodString, string, unknown>;
        email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        customFields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
    }, "strip", z.ZodTypeAny, {
        ticketTypeId: string;
        fullName: string;
        mobile: string;
        email?: string | undefined;
        age?: number | undefined;
        customFields?: Record<string, string | number | boolean> | undefined;
    }, {
        ticketTypeId: string;
        fullName: string;
        email?: string | undefined;
        age?: number | undefined;
        mobile?: unknown;
        customFields?: Record<string, string | number | boolean> | undefined;
    }>, "many">;
    promoCode: z.ZodEffects<z.ZodNullable<z.ZodOptional<z.ZodString>>, string | undefined, string | null | undefined>;
    whatsappOptIn: z.ZodDefault<z.ZodBoolean>;
    acceptedTerms: z.ZodLiteral<true>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reservationId: string;
    primaryContact: {
        email: string;
        fullName: string;
        mobile: string;
    };
    attendees: {
        ticketTypeId: string;
        fullName: string;
        mobile: string;
        email?: string | undefined;
        age?: number | undefined;
        customFields?: Record<string, string | number | boolean> | undefined;
    }[];
    whatsappOptIn: boolean;
    acceptedTerms: true;
    promoCode?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    reservationId: string;
    primaryContact: {
        email: string;
        fullName: string;
        mobile?: unknown;
    };
    attendees: {
        ticketTypeId: string;
        fullName: string;
        email?: string | undefined;
        age?: number | undefined;
        mobile?: unknown;
        customFields?: Record<string, string | number | boolean> | undefined;
    }[];
    acceptedTerms: true;
    promoCode?: string | null | undefined;
    idempotencyKey?: string | undefined;
    whatsappOptIn?: boolean | undefined;
}>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    deviceCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    deviceCode?: string | undefined;
}, {
    email: string;
    password: string;
    deviceCode?: string | undefined;
}>;
export declare const createStaffSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    mobile: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
    permissions: z.ZodDefault<z.ZodArray<z.ZodEnum<["SCAN_TICKETS", "MANUAL_LOOKUP", "VIEW_RECENT_SCANS", "VIEW_ASSIGNED_GATES", "VIEW_SUPPORT_ISSUES", "MANAGE_DEVICE_HEARTBEAT"]>, "many">>;
    assignedGateIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    name: string;
    permissions: ("SCAN_TICKETS" | "MANUAL_LOOKUP" | "VIEW_RECENT_SCANS" | "VIEW_ASSIGNED_GATES" | "VIEW_SUPPORT_ISSUES" | "MANAGE_DEVICE_HEARTBEAT")[];
    assignedGateIds: string[];
    mobile?: string | undefined;
}, {
    email: string;
    password: string;
    name: string;
    mobile?: string | undefined;
    permissions?: ("SCAN_TICKETS" | "MANUAL_LOOKUP" | "VIEW_RECENT_SCANS" | "VIEW_ASSIGNED_GATES" | "VIEW_SUPPORT_ISSUES" | "MANAGE_DEVICE_HEARTBEAT")[] | undefined;
    assignedGateIds?: string[] | undefined;
}>;
export declare const createGateSchema: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    allowedTicketTypeIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    code: string;
    name: string;
    allowedTicketTypeIds: string[];
    isActive: boolean;
    description?: string | undefined;
}, {
    code: string;
    name: string;
    description?: string | undefined;
    allowedTicketTypeIds?: string[] | undefined;
    isActive?: boolean | undefined;
}>;
export declare const createTicketTypeSchema: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    price: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    capacity: z.ZodNumber;
    maxPerBooking: z.ZodDefault<z.ZodNumber>;
    saleStart: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    saleEnd: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    displayOrder: z.ZodDefault<z.ZodNumber>;
    perks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    restrictions: z.ZodOptional<z.ZodString>;
    badgeColor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    displayOrder: number;
    name: string;
    description: string;
    isActive: boolean;
    price: number;
    currency: string;
    capacity: number;
    maxPerBooking: number;
    perks: string[];
    saleStart?: string | null | undefined;
    saleEnd?: string | null | undefined;
    restrictions?: string | undefined;
    badgeColor?: string | undefined;
}, {
    code: string;
    name: string;
    price: number;
    capacity: number;
    displayOrder?: number | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    currency?: string | undefined;
    maxPerBooking?: number | undefined;
    saleStart?: string | null | undefined;
    saleEnd?: string | null | undefined;
    perks?: string[] | undefined;
    restrictions?: string | undefined;
    badgeColor?: string | undefined;
}>;
export declare const createPromoCodeSchema: z.ZodObject<{
    code: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    discountType: z.ZodEnum<["FIXED", "PERCENTAGE"]>;
    discountValue: z.ZodNumber;
    minPurchaseAmount: z.ZodDefault<z.ZodNumber>;
    maxDiscountAmount: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    startDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    endDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    totalUsageLimit: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    perUserLimit: z.ZodDefault<z.ZodNumber>;
    applicableTicketTypeIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    code: string;
    isActive: boolean;
    discountType: "FIXED" | "PERCENTAGE";
    discountValue: number;
    minPurchaseAmount: number;
    perUserLimit: number;
    applicableTicketTypeIds: string[];
    description?: string | undefined;
    maxDiscountAmount?: number | null | undefined;
    startDate?: string | null | undefined;
    endDate?: string | null | undefined;
    totalUsageLimit?: number | null | undefined;
}, {
    code: string;
    discountType: "FIXED" | "PERCENTAGE";
    discountValue: number;
    description?: string | undefined;
    isActive?: boolean | undefined;
    minPurchaseAmount?: number | undefined;
    maxDiscountAmount?: number | null | undefined;
    startDate?: string | null | undefined;
    endDate?: string | null | undefined;
    totalUsageLimit?: number | null | undefined;
    perUserLimit?: number | undefined;
    applicableTicketTypeIds?: string[] | undefined;
}>;
export declare const scanTicketSchema: z.ZodObject<{
    qrToken: z.ZodString;
    gateId: z.ZodString;
    deviceId: z.ZodOptional<z.ZodString>;
    clientTimestamp: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    qrToken: string;
    gateId: string;
    deviceId?: string | undefined;
    clientTimestamp?: string | undefined;
}, {
    qrToken: string;
    gateId: string;
    deviceId?: string | undefined;
    clientTimestamp?: string | undefined;
}>;
export declare const createSupportTicketSchema: z.ZodObject<{
    category: z.ZodString;
    subject: z.ZodString;
    description: z.ZodString;
    priority: z.ZodDefault<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "URGENT"]>>;
    bookingReference: z.ZodOptional<z.ZodString>;
    contactName: z.ZodString;
    contactMobile: z.ZodString;
    contactEmail: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    description: string;
    category: string;
    subject: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    contactName: string;
    contactMobile: string;
    bookingReference?: string | undefined;
    contactEmail?: string | undefined;
}, {
    description: string;
    category: string;
    subject: string;
    contactName: string;
    contactMobile: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
    bookingReference?: string | undefined;
    contactEmail?: string | undefined;
}>;
//# sourceMappingURL=index.d.ts.map