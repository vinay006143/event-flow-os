import mongoose, { type Document } from 'mongoose';
import type { RegistrationFieldConfig } from '@eventflow/shared';
export interface IEventConfig extends Document {
    singletonKey: string;
    eventCode: string;
    name: string;
    subtitle: string;
    description: string;
    highlights: string[];
    artists?: Array<{
        name: string;
        role: string;
        subtitle?: string;
        photoUrl?: string;
    }>;
    partners?: Array<{
        category: string;
        name: string;
        logoUrl?: string;
    }>;
    floorPlan?: {
        plotSize: string;
        stageDetails: string[];
        photoZones: string[];
        imageUrl?: string;
    };
    posters?: {
        heroUrl?: string;
        artistsUrl?: string;
        floorPlanUrl?: string;
    };
    scheduleItems: Array<{
        time: string;
        title: string;
        description?: string;
    }>;
    faqs: Array<{
        question: string;
        answer: string;
    }>;
    branding: {
        logoUrl?: string;
        bannerUrl?: string;
        primaryColor: string;
        accentColor: string;
        surfaceTheme: 'sacred-gold' | 'midnight-indigo' | 'ivory-classic';
    };
    eventDate: Date;
    eventEndDate?: Date;
    doorsOpenTime: string;
    timezone: string;
    venue: {
        name: string;
        address: string;
        city: string;
        state: string;
        country: string;
        mapsLink: string;
    };
    contact: {
        email: string;
        phone: string;
        whatsappNumber: string;
        supportHours: string;
    };
    operations: {
        registrationOpen: boolean;
        salesOpen: boolean;
        checkoutEnabled: boolean;
        checkinOpen: boolean;
        restoreInventoryOnCancel: boolean;
        restoreInventoryOnRefund: boolean;
        reservationExpiryMinutes: number;
        maxTicketsPerBooking: number;
        emergencyBanner?: string;
        emergencyAnnouncement?: string;
    };
    registrationFields: RegistrationFieldConfig[];
    ticketTemplate: {
        idPrefix: string;
        headerText: string;
        footerText: string;
        entryInstructions: string[];
        accentColor: string;
    };
    notifications: {
        whatsappEnabled: boolean;
        emailEnabled: boolean;
        reminderOffsetsDays: number[];
        whatsappTemplateName: string;
    };
    policies: {
        termsAndConditions: string;
        privacyPolicy: string;
        refundPolicy: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const EventConfigModel: mongoose.Model<IEventConfig, {}, {}, {}, mongoose.Document<unknown, {}, IEventConfig, {}, {}> & IEventConfig & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=event.model.d.ts.map