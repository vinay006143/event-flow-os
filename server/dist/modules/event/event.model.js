import mongoose, { Schema } from 'mongoose';
import { env } from '../../config/env.js';
const registrationFieldSubSchema = new Schema({
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: {
        type: String,
        enum: ['text', 'email', 'phone', 'number', 'select', 'textarea', 'checkbox'],
        required: true,
    },
    required: { type: Boolean, default: true },
    placeholder: String,
    helpText: String,
    options: [String],
    min: Number,
    max: Number,
    pattern: String,
    displayOrder: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
    categoryRestrictions: [String],
}, { _id: false });
const eventConfigSchema = new Schema({
    singletonKey: { type: String, default: 'PRIMARY_EVENT', unique: true },
    eventCode: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },
    description: { type: String, default: '' },
    highlights: { type: [String], default: [] },
    artists: [
        {
            _id: false,
            name: { type: String, required: true },
            role: { type: String, required: true },
            subtitle: String,
            photoUrl: String,
        },
    ],
    partners: [
        {
            _id: false,
            category: { type: String, required: true },
            name: { type: String, required: true },
            logoUrl: String,
        },
    ],
    floorPlan: {
        plotSize: String,
        stageDetails: { type: [String], default: [] },
        photoZones: { type: [String], default: [] },
        imageUrl: String,
    },
    posters: {
        heroUrl: String,
        artistsUrl: String,
        floorPlanUrl: String,
    },
    scheduleItems: [
        {
            _id: false,
            time: { type: String, required: true },
            title: { type: String, required: true },
            description: String,
        },
    ],
    faqs: [
        {
            _id: false,
            question: { type: String, required: true },
            answer: { type: String, required: true },
        },
    ],
    branding: {
        logoUrl: String,
        bannerUrl: String,
        primaryColor: { type: String, default: '#B45309' },
        accentColor: { type: String, default: '#F59E0B' },
        surfaceTheme: {
            type: String,
            enum: ['sacred-gold', 'midnight-indigo', 'ivory-classic'],
            default: 'sacred-gold',
        },
    },
    eventDate: { type: Date, required: true },
    eventEndDate: { type: Date },
    doorsOpenTime: { type: String, default: '16:30 IST' },
    timezone: { type: String, default: env.TIMEZONE },
    venue: {
        name: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, default: 'Rajahmundry' },
        state: { type: String, default: 'Andhra Pradesh' },
        country: { type: String, default: 'India' },
        mapsLink: {
            type: String,
            default: 'https://maps.google.com/?q=Exhibition+Grounds+AV+Apparao+Road+Rajahmundry',
        },
    },
    contact: {
        email: { type: String, default: 'support@nightofdevotion.in' },
        phone: { type: String, default: '+91 90000 00000' },
        whatsappNumber: { type: String, default: '+91 90000 00000' },
        supportHours: { type: String, default: '09:00 AM – 09:00 PM IST' },
    },
    operations: {
        registrationOpen: { type: Boolean, default: true },
        salesOpen: { type: Boolean, default: true },
        checkoutEnabled: { type: Boolean, default: true },
        checkinOpen: { type: Boolean, default: true },
        restoreInventoryOnCancel: { type: Boolean, default: true },
        restoreInventoryOnRefund: { type: Boolean, default: true },
        reservationExpiryMinutes: { type: Number, default: env.RESERVATION_EXPIRY_MINUTES },
        maxTicketsPerBooking: { type: Number, default: env.MAX_TICKETS_PER_BOOKING },
        emergencyBanner: { type: String, default: '' },
        emergencyAnnouncement: { type: String, default: '' },
    },
    registrationFields: { type: [registrationFieldSubSchema], default: [] },
    ticketTemplate: {
        idPrefix: { type: String, default: 'EFO' },
        headerText: { type: String, default: 'OFFICIAL ENTRY PASS' },
        footerText: { type: String, default: 'Powered by EventFlow OS' },
        entryInstructions: {
            type: [String],
            default: [
                'Carry a digital or printed copy of this individual QR pass.',
                'Each pass admits one attendee only and is invalid after check-in.',
                'Gates open 90 minutes prior to the main programme.',
                'Carry a valid photo ID matching the attendee name.',
            ],
        },
        accentColor: { type: String, default: '#B45309' },
    },
    notifications: {
        whatsappEnabled: { type: Boolean, default: true },
        emailEnabled: { type: Boolean, default: true },
        reminderOffsetsDays: { type: [Number], default: [7, 3, 1, 0] },
        whatsappTemplateName: { type: String, default: 'event_ticket_pass_v1' },
    },
    policies: {
        termsAndConditions: {
            type: String,
            default: 'Entry is permitted only with a valid, unredeemed individual QR ticket issued by EventFlow OS. Organizers reserve the right to security screening and gate assignment.',
        },
        privacyPolicy: {
            type: String,
            default: 'Attendee information is collected solely for event ticketing, entry verification, and essential event notifications.',
        },
        refundPolicy: {
            type: String,
            default: 'Cancellations and refunds are governed by the official event refund policy. Once a ticket is checked in or revoked, it is ineligible for refund.',
        },
    },
}, { timestamps: true });
export const EventConfigModel = mongoose.model('EventConfig', eventConfigSchema);
//# sourceMappingURL=event.model.js.map