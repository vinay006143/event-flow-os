import { env } from '../../config/env.js';
import { EventConfigModel, type IEventConfig } from './event.model.js';
import { recordAudit } from '../audit/audit.service.js';
import type { Request } from 'express';

export const DEFAULT_REGISTRATION_FIELDS = [
  {
    key: 'fullName',
    label: 'Full Name',
    type: 'text' as const,
    required: true,
    placeholder: 'Enter attendee full name',
    displayOrder: 1,
    enabled: true,
  },
  {
    key: 'age',
    label: 'Age',
    type: 'number' as const,
    required: true,
    placeholder: 'Age in years',
    min: 1,
    max: 120,
    displayOrder: 2,
    enabled: true,
  },
  {
    key: 'mobile',
    label: 'Mobile Number (WhatsApp)',
    type: 'phone' as const,
    required: true,
    placeholder: '10-digit mobile number',
    displayOrder: 3,
    enabled: true,
  },
  {
    key: 'email',
    label: 'Email Address',
    type: 'email' as const,
    required: false,
    placeholder: 'name@example.com',
    displayOrder: 4,
    enabled: true,
  },
];

export async function getOrCreateEventConfig(): Promise<IEventConfig> {
  let config = await EventConfigModel.findOne({ singletonKey: 'PRIMARY_EVENT' });
  if (!config) {
    config = await EventConfigModel.create({
      singletonKey: 'PRIMARY_EVENT',
      eventCode: env.DEFAULT_EVENT_CODE,
      name: env.DEFAULT_EVENT_NAME,
      subtitle: env.DEFAULT_EVENT_SUBTITLE,
      description:
        'A soulful evening of prayers, music, and togetherness. Rajamahendravaram — get ready for soul-soothing bhajans and devotional music that immerses your mind in peace and devotion.',
      highlights: [
        'Bhajan Jamming — Collective Sacred Sing-Along',
        'Devotional Music — Live Classical & Bhajan Ensemble',
        'Spiritual Unity — Nirantaram Sanatanam Celebration',
        'Adiyogi, Siva Parvati & Vigneswara Photo Zones',
      ],
      artists: [
        {
          name: 'Hari Teja & Hari Nithya',
          role: 'Featuring Artists',
          subtitle: 'Live Devotional Music & Bhajan Ensemble',
          photoUrl: '/assets/event/guests/hari-teja-nithya.png',
        },
        {
          name: 'Snigdha Nayani',
          role: 'Anchor & Host',
          subtitle: 'Evening Host & Programme Presenter',
          photoUrl: '/assets/event/guests/snigdha-nayani.png',
        },
      ],
      partners: [
        { category: 'Organised By', name: 'Vybe', logoUrl: '/assets/event/sponsors/vybe.png' },
        { category: 'Organised By', name: 'Inspire Events', logoUrl: '/assets/event/sponsors/inspire.png' },
        { category: 'Organised By', name: 'Sri Megaa Events', logoUrl: '/assets/event/sponsors/megaa.png' },
        { category: 'Makeover Partner', name: 'BornPretty', logoUrl: '/assets/event/sponsors/bornpretty.png' },
        { category: 'Radio Partner', name: 'RED FM 93.5', logoUrl: '/assets/event/sponsors/redfm.png' },
        { category: 'Photography Partner', name: 'RC Studios', logoUrl: '/assets/event/sponsors/rcstudios.png' },
        { category: 'Marketing Partner', name: 'One Ad Agency', logoUrl: '/assets/event/sponsors/onead.png' },
      ],
      floorPlan: {
        plotSize: '250 ft (W) × 250 ft (D) • 62,500 sq ft Devotional Theme Layout',
        stageDetails: [
          'Front Truss 60 ft (W) • Main Stage 50 ft (W) × 20 ft (H)',
          'LED Wall 30 ft (W) × 10 ft (H) with Temple Theme Side Backdrops',
          'VIP Zone: 500 Members (50 Round Tables + 10 Stage-Front Sofas + VIP Gates)',
          'Theater Seating: 1,500 Members (170 ft × 110 ft) with Main & Regular Entrances',
        ],
        photoZones: [
          'Adiyogi Large Installation',
          'Siva Parvati Life-Size Idol Zone',
          'Vigneswara (Ganesh) Photo Zone',
        ],
        imageUrl: '/assets/event/poster-floorplan.jpg',
      },
      posters: {
        heroUrl: '/assets/event/poster-hero.jpg',
        artistsUrl: '/assets/event/poster-artists.jpg',
        floorPlanUrl: '/assets/event/poster-floorplan.jpg',
      },
      branding: {
        primaryColor: '#0B1D4D',
        accentColor: '#F59E0B',
        surfaceTheme: 'midnight-indigo',
      },
      scheduleItems: [
        { time: '04:30 PM', title: 'Gates Open & QR Check-in', description: 'Main Entry, Regular Entrances & VIP Gates open' },
        { time: '05:30 PM', title: 'Photo Zones & Temple Gathering', description: 'Visit Adiyogi, Siva Parvati & Vigneswara installations' },
        { time: '06:00 PM', title: 'Night of Devotion — Live Performance', description: 'Featuring Hari Teja & Hari Nithya, anchored by Snigdha Nayani' },
        { time: '08:30 PM', title: 'Bhajan Jamming & Closing Prayers', description: 'Collective devotion & spiritual unity finale' },
      ],
      faqs: [
        {
          question: 'Do multiple tickets in one booking share a single QR code?',
          answer:
            'No. Every attendee receives their own individual Ticket ID and unique QR code pass for entry.',
        },
        {
          question: 'What is the difference between Regular (Rs. 699/-) and Premium (Rs. 1,199/-)?',
          answer:
            'Regular (Rs. 699/-) provides Theater Seating (1,500 capacity) via Main/Regular entrances. Premium (Rs. 1,199/-) provides VIP Zone round-table seating near the stage (500 capacity) with dedicated VIP Gate entry.',
        },
        {
          question: 'Who do I contact for sponsorships, stalls, or bulk enquiries?',
          answer:
            'Please call or WhatsApp our event enquiry desk at +91 9640509090.',
        },
        {
          question: 'How will I receive and retrieve my tickets?',
          answer:
            'After verified payment, individual passes are delivered via WhatsApp & Email and can be downloaded anytime from My Tickets via OTP.',
        },
      ],
      eventDate: new Date(env.DEFAULT_EVENT_DATE),
      doorsOpenTime: '04:30 PM IST (Show 6:00 PM onwards)',
      venue: {
        name: env.DEFAULT_VENUE_NAME,
        address: 'Beside GAIL Office, A.V. Apparao Road, Rajahmundry, Andhra Pradesh, India',
        city: 'Rajahmundry',
        state: 'Andhra Pradesh',
        country: 'India',
        mapsLink: 'https://maps.google.com/?q=Exhibition+Grounds+GAIL+Office+AV+Apparao+Road+Rajahmundry',
      },
      contact: {
        email: 'support@nightofdevotion.in',
        phone: '+91 9640509090',
        whatsappNumber: '+91 9640509090',
        supportHours: '09:00 AM – 09:00 PM IST',
      },
      registrationFields: DEFAULT_REGISTRATION_FIELDS,
    });
  }
  return config;
}

export async function updateEventConfig(
  updates: Partial<IEventConfig>,
  actor: { id: string; email: string },
  req?: Request,
): Promise<IEventConfig> {
  const current = await getOrCreateEventConfig();
  const allowedTopLevel = [
    'eventCode',
    'name',
    'subtitle',
    'description',
    'highlights',
    'artists',
    'partners',
    'floorPlan',
    'posters',
    'scheduleItems',
    'faqs',
    'branding',
    'eventDate',
    'eventEndDate',
    'doorsOpenTime',
    'timezone',
    'venue',
    'contact',
    'operations',
    'registrationFields',
    'ticketTemplate',
    'notifications',
    'policies',
  ] as const;

  for (const key of allowedTopLevel) {
    if (updates[key] !== undefined) {
      if (
        typeof updates[key] === 'object' &&
        updates[key] !== null &&
        !Array.isArray(updates[key]) &&
        !(updates[key] instanceof Date)
      ) {
        const existingVal = current.get(key) as Record<string, unknown> | undefined;
        current.set(key, { ...(existingVal ?? {}), ...(updates[key] as Record<string, unknown>) });
      } else {
        current.set(key, updates[key]);
      }
    }
  }

  await current.save();

  await recordAudit({
    actorId: actor.id,
    actorRole: 'admin',
    actorEmail: actor.email,
    action: 'EVENT_CONFIG_UPDATED',
    entityType: 'EventConfig',
    entityId: String(current._id),
    entityReference: current.eventCode,
    req,
    metadata: { updatedKeys: Object.keys(updates) },
  });

  return current;
}
