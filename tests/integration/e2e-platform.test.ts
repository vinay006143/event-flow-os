import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import fs from 'fs/promises';
import type { Express } from 'express';

process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_MONGO = 'true';
process.env.PAYMENT_PROVIDER_MODE = 'development';
process.env.WHATSAPP_PROVIDER_MODE = 'development';
process.env.EMAIL_PROVIDER_MODE = 'development';
process.env.STORAGE_PROVIDER_MODE = 'local';
process.env.LOCAL_STORAGE_PATH = './tmp-test-storage';

import { connectDatabase, disconnectDatabase } from '../../server/src/database/connection.js';
import { seedInitialDeploymentData } from '../../server/src/database/seed.js';
import { createApp } from '../../server/src/app.js';
import { TicketTypeModel } from '../../server/src/modules/ticket-types/ticket-type.model.js';
import { UserModel } from '../../server/src/modules/users/user.model.js';
import { ReservationModel } from '../../server/src/modules/reservations/reservation.model.js';
import { BookingModel } from '../../server/src/modules/bookings/booking.model.js';
import { TicketModel } from '../../server/src/modules/tickets/ticket.model.js';
import { expireStaleReservations } from '../../server/src/modules/reservations/reservation.service.js';
import { signDevWebhookPayload } from '../../server/src/modules/payments/phonepe.adapter.js';
import { signQrToken } from '../../server/src/utils/crypto.js';
import { GateModel } from '../../server/src/modules/gates/gate.model.js';

let app: Express;
let adminToken = '';
let staffToken = '';
let regularTypeId = '';
let premiumTypeId = '';
let gateAId = '';
let gateBId = '';

describe('E2E & Integration: EventFlow OS Complete Platform', () => {
  beforeAll(async () => {
    await connectDatabase();
    await seedInitialDeploymentData();
    app = createApp();

    const adminLogin = await request(app).post('/api/v1/auth/admin/login').send({
      email: process.env.ADMIN_EMAIL || 'admin@eventflowos.in',
      password: process.env.ADMIN_PASSWORD || 'EventFlow@Admin2026!',
    });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;

    const staffLogin = await request(app).post('/api/v1/auth/staff/login').send({
      email: process.env.STAFF_EMAIL || 'staff@eventflowos.in',
      password: process.env.STAFF_PASSWORD || 'EventFlow@Staff2026!',
      deviceCode: 'SCAN-GATEA-01',
    });
    expect(staffLogin.status).toBe(200);
    staffToken = staffLogin.body.data.accessToken;

    const types = await TicketTypeModel.find().sort({ price: 1 });
    regularTypeId = String(types[0]!._id);
    premiumTypeId = String(types[1]!._id);

    const gates = await GateModel.find().sort({ code: 1 });
    gateAId = String(gates[0]!._id);
    gateBId = String(gates[1]!._id);
  });

  afterAll(async () => {
    await disconnectDatabase();
    await fs.rm('./tmp-test-storage', { recursive: true, force: true }).catch(() => undefined);
  });

  it('enforces single Admin constraint and rejects staff on admin endpoints', async () => {
    await expect(
      UserModel.create({
        name: 'Rogue Second Admin',
        email: 'second.admin@eventflow.local',
        passwordHash: 'hash',
        role: 'admin',
      }),
    ).rejects.toThrow();

    const res = await request(app)
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it('validates dynamic registration fields and creates 3 individual tickets for 3-ticket booking', async () => {
    // Promo validation: invalid vs valid
    const invalidPromo = await request(app).post('/api/v1/promo-codes/validate').send({
      code: 'BADCODE99',
      items: [{ ticketTypeId: regularTypeId, quantity: 1 }],
    });
    expect(invalidPromo.status).toBe(400);

    const validPromo = await request(app).post('/api/v1/promo-codes/validate').send({
      code: 'SANATANAM10',
      items: [{ ticketTypeId: regularTypeId, quantity: 3 }],
    });
    expect(validPromo.status).toBe(200);
    expect(validPromo.body.data.discountAmount).toBeGreaterThan(0);

    // Reserve 2 Regular + 1 Premium = 3 tickets
    const resvRes = await request(app).post('/api/v1/reservations').send({
      items: [
        { ticketTypeId: regularTypeId, quantity: 2 },
        { ticketTypeId: premiumTypeId, quantity: 1 },
      ],
      promoCode: 'SANATANAM10',
    });
    expect(resvRes.status).toBe(201);
    const reservation = resvRes.body.data;
    expect(reservation.totalQuantity).toBe(3);

    // Registration validation: missing required attendee name fails
    const badReg = await request(app).post('/api/v1/bookings').send({
      reservationId: reservation._id,
      primaryContact: { fullName: 'Rama Rao', mobile: '9876543211', email: 'rama@example.com' },
      attendees: [
        { ticketTypeId: regularTypeId, fullName: '', age: 30, mobile: '9876543211' },
        { ticketTypeId: regularTypeId, fullName: 'Sita Devi', age: 28, mobile: '9876543212' },
        { ticketTypeId: premiumTypeId, fullName: 'Lakshman', age: 25, mobile: '9876543213' },
      ],
      acceptedTerms: true,
    });
    expect(badReg.status).toBe(400);

    // Valid booking with 3 attendees
    const bookRes = await request(app).post('/api/v1/bookings').send({
      reservationId: reservation._id,
      primaryContact: { fullName: 'Rama Rao', mobile: '9876543211', email: 'rama@example.com' },
      attendees: [
        { ticketTypeId: regularTypeId, fullName: 'Rama Rao', age: 30, mobile: '9876543211' },
        { ticketTypeId: regularTypeId, fullName: 'Sita Devi', age: 28, mobile: '9876543212' },
        { ticketTypeId: premiumTypeId, fullName: 'Lakshman', age: 25, mobile: '9876543213' },
      ],
      promoCode: 'SANATANAM10',
      acceptedTerms: true,
    });
    expect(bookRes.status).toBe(201);
    const { booking, attendees } = bookRes.body.data;
    expect(attendees).toHaveLength(3);

    // Initiate payment
    const payInit = await request(app).post('/api/v1/payments/initiate').send({ bookingId: booking._id });
    expect(payInit.status).toBe(201);
    const txnId = payInit.body.data.merchantTransactionId;

    // Verify unverified webhook is rejected
    const badWebhook = await request(app)
      .post('/api/v1/payments/webhook/phonepe')
      .set('x-dev-webhook-signature', 'deadbeef')
      .send({ merchantTransactionId: txnId, status: 'COMPLETED', amountPaise: booking.finalAmount * 100 });
    expect(badWebhook.status).toBe(401);

    // Signed webhook completes payment & issues 3 individual tickets
    const webhookPayload = {
      eventId: `evt-${txnId}-1`,
      merchantTransactionId: txnId,
      status: 'COMPLETED',
      amountPaise: booking.finalAmount * 100,
    };
    const goodWebhook = await request(app)
      .post('/api/v1/payments/webhook/phonepe')
      .set('x-dev-webhook-signature', signDevWebhookPayload(webhookPayload))
      .send(webhookPayload);
    expect(goodWebhook.status).toBe(200);
    expect(goodWebhook.body.data.duplicate).toBe(false);

    // Duplicate webhook is safely ignored
    const dupWebhook = await request(app)
      .post('/api/v1/payments/webhook/phonepe')
      .set('x-dev-webhook-signature', signDevWebhookPayload(webhookPayload))
      .send(webhookPayload);
    expect(dupWebhook.status).toBe(200);
    expect(dupWebhook.body.data.duplicate).toBe(true);

    // Verify 3 tickets with 3 unique IDs and 3 unique QR tokens
    const statusCheck = await request(app).get(`/api/v1/payments/status/${txnId}`);
    expect(statusCheck.status).toBe(200);
    expect(statusCheck.body.data.booking.status).toBe('PAID');
    const tickets = statusCheck.body.data.tickets;
    expect(tickets).toHaveLength(3);
    expect(new Set(tickets.map((t: { ticketId: string }) => t.ticketId)).size).toBe(3);
    expect(new Set(tickets.map((t: { qrToken: string }) => t.qrToken)).size).toBe(3);

    // Verify PDF & PNG downloads work
    const pdfRes = await request(app).get(
      `/api/v1/tickets/pass/${tickets[0].secureReference}/download?format=pdf`,
    );
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');

    const pngRes = await request(app).get(
      `/api/v1/tickets/pass/${tickets[0].secureReference}/download?format=png`,
    );
    expect(pngRes.status).toBe(200);
    expect(pngRes.headers['content-type']).toContain('image/png');

    // Secure OTP retrieval
    const otpReq = await request(app)
      .post('/api/v1/tickets/retrieve/request-otp')
      .send({ bookingReference: booking.bookingReference });
    expect(otpReq.status).toBe(200);
    const devOtp = otpReq.body.data.devOtp;

    const otpVerify = await request(app)
      .post('/api/v1/tickets/retrieve/verify-otp')
      .send({ bookingReference: booking.bookingReference, otp: devOtp });
    expect(otpVerify.status).toBe(200);
    expect(otpVerify.body.data.tickets).toHaveLength(3);

    // QR Scanning: Valid scan, concurrent duplicate scan prevention, wrong-event, unauthorized gate
    const firstTicket = tickets[0];
    const [scan1, scan2] = await Promise.all([
      request(app)
        .post('/api/v1/checkins/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ qrToken: firstTicket.qrToken, gateId: gateAId, deviceId: 'SCAN-GATEA-01' }),
      request(app)
        .post('/api/v1/checkins/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ qrToken: firstTicket.qrToken, gateId: gateAId, deviceId: 'SCAN-GATEA-01' }),
    ]);

    const outcomes = [scan1.body.data.result, scan2.body.data.result].sort();
    expect(outcomes).toEqual(['ALREADY_CHECKED_IN', 'VALID']);

    // Regular ticket at Premium-only Gate B -> UNAUTHORIZED_GATE
    const secondRegular = tickets[1];
    const wrongGateScan = await request(app)
      .post('/api/v1/checkins/scan')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: secondRegular.qrToken, gateId: gateBId });
    expect(wrongGateScan.body.data.result).toBe('UNAUTHORIZED_GATE');

    // Wrong event QR token -> WRONG_EVENT
    const otherEventQr = signQrToken('EFO-OTHER-123456', 'OTHER_EVT').token;
    const wrongEvtScan = await request(app)
      .post('/api/v1/checkins/scan')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: otherEventQr, gateId: gateAId });
    expect(wrongEvtScan.body.data.result).toBe('WRONG_EVENT');

    // Ticket Reissue: old QR becomes REVOKED/REISSUED, new QR is VALID
    const reissueRes = await request(app)
      .post(`/api/v1/tickets/${secondRegular._id}/reissue`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Lost phone recovery' });
    expect(reissueRes.status).toBe(200);
    const reissuedNew = reissueRes.body.data.newTicket;

    const oldQrScan = await request(app)
      .post('/api/v1/checkins/scan')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: secondRegular.qrToken, gateId: gateAId });
    expect(oldQrScan.body.data.result).toBe('REVOKED');

    const newQrScan = await request(app)
      .post('/api/v1/checkins/scan')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: reissuedNew.qrToken, gateId: gateAId });
    expect(newQrScan.body.data.result).toBe('VALID');

    // Ticket Revoke & Partial Refund on Ticket #3 (Premium)
    const thirdTicket = tickets[2];
    const partialRefund = await request(app)
      .post('/api/v1/refunds')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bookingId: booking._id,
        amount: 200,
        ticketIds: [thirdTicket.ticketId],
        reason: 'Partial refund test',
      });
    expect(partialRefund.status).toBe(201);

    const refundedScan = await request(app)
      .post('/api/v1/checkins/scan')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: thirdTicket.qrToken, gateId: gateBId });
    expect(refundedScan.body.data.result).toBe('REFUNDED');

    // Over-refund attempt rejected
    const overRefund = await request(app)
      .post('/api/v1/refunds')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bookingId: booking._id,
        amount: booking.finalAmount + 500,
        reason: 'Over-refund attempt',
      });
    expect(overRefund.status).toBe(400);
  });

  it('prevents payment failure from issuing tickets and supports ticket generation recovery', async () => {
    const resv = await request(app).post('/api/v1/reservations').send({
      items: [{ ticketTypeId: regularTypeId, quantity: 1 }],
    });
    const book = await request(app).post('/api/v1/bookings').send({
      reservationId: resv.body.data._id,
      primaryContact: { fullName: 'Test User', mobile: '9876500001', email: 'test1@example.com' },
      attendees: [{ ticketTypeId: regularTypeId, fullName: 'Test User', age: 25, mobile: '9876500001' }],
      acceptedTerms: true,
    });
    const payInit = await request(app).post('/api/v1/payments/initiate').send({
      bookingId: book.body.data.booking._id,
    });
    const txn = payInit.body.data.merchantTransactionId;

    // Simulate failure
    await request(app).post(`/api/v1/payments/dev-simulate/${txn}`).send({ outcome: 'FAILED' });
    const statusFailed = await request(app).get(`/api/v1/payments/status/${txn}`);
    expect(statusFailed.body.data.booking.status).toBe('FAILED');
    expect(statusFailed.body.data.tickets).toHaveLength(0);

    // Simulate failed ticket generation recovery on a PAID booking
    await BookingModel.updateOne(
      { _id: book.body.data.booking._id },
      { $set: { status: 'PAID', ticketGenerationStatus: 'FAILED' } },
    );
    const recoverRes = await request(app)
      .post('/api/v1/system/recover-tickets')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(recoverRes.status).toBe(200);
    expect(recoverRes.body.data.recoveredCount).toBeGreaterThanOrEqual(1);
    const recoveredTickets = await TicketModel.find({ bookingId: book.body.data.booking._id });
    expect(recoveredTickets).toHaveLength(1);
  });

  it('prevents inventory overselling under concurrent requests and restores expired reservations', async () => {
    const limited = await TicketTypeModel.create({
      code: `LIM-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      name: 'Limited VIP',
      price: 999,
      capacity: 3,
      maxPerBooking: 3,
      isActive: true,
    });

    // Fire 4 concurrent requests for 2 tickets each (total capacity = 3 -> at most 1 succeeds)
    const results = await Promise.all([
      request(app).post('/api/v1/reservations').send({ items: [{ ticketTypeId: String(limited._id), quantity: 2 }] }),
      request(app).post('/api/v1/reservations').send({ items: [{ ticketTypeId: String(limited._id), quantity: 2 }] }),
      request(app).post('/api/v1/reservations').send({ items: [{ ticketTypeId: String(limited._id), quantity: 2 }] }),
      request(app).post('/api/v1/reservations').send({ items: [{ ticketTypeId: String(limited._id), quantity: 2 }] }),
    ]);

    const successes = results.filter((r) => r.status === 201);
    expect(successes).toHaveLength(1);

    // Force-expire that reservation and verify inventory is restored
    await ReservationModel.updateOne(
      { _id: successes[0]!.body.data._id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
    const expiredCount = await expireStaleReservations();
    expect(expiredCount).toBeGreaterThanOrEqual(1);

    const refreshed = await TicketTypeModel.findById(limited._id);
    expect(refreshed?.reservedQuantity).toBe(0);
  });

  it('serves live admin dashboard, event day control, support, audit logs, and CSV exports', async () => {
    const dash = await request(app)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dash.status).toBe(200);
    expect(dash.body.data.kpis.paidBookings).toBeGreaterThanOrEqual(1);

    const eventDay = await request(app)
      .get('/api/v1/analytics/event-day')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(eventDay.status).toBe(200);
    expect(eventDay.body.data.liveCounts.checkedInCount).toBeGreaterThanOrEqual(2);

    const audit = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(audit.status).toBe(200);
    expect(audit.body.data.length).toBeGreaterThan(0);

    const csv = await request(app)
      .get('/api/v1/reports/export/bookings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');
  });
});
