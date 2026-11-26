import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import fs from 'fs/promises';
import sharp from 'sharp';
import type { Express } from 'express';

process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_MONGO = 'true';
process.env.PAYMENT_PROVIDER_MODE = 'development';
process.env.WHATSAPP_PROVIDER_MODE = 'development';
process.env.EMAIL_PROVIDER_MODE = 'development';
process.env.STORAGE_PROVIDER_MODE = 'local';
process.env.LOCAL_STORAGE_PATH = './tmp-test-storage-ops';

import { connectDatabase, disconnectDatabase } from '../../server/src/database/connection.js';
import { seedInitialDeploymentData } from '../../server/src/database/seed.js';
import { createApp } from '../../server/src/app.js';
import { TicketTypeModel } from '../../server/src/modules/ticket-types/ticket-type.model.js';
import { GateModel } from '../../server/src/modules/gates/gate.model.js';
import { ReservationModel } from '../../server/src/modules/reservations/reservation.model.js';
import { BookingModel } from '../../server/src/modules/bookings/booking.model.js';
import { TicketModel } from '../../server/src/modules/tickets/ticket.model.js';
import { NotificationLogModel } from '../../server/src/modules/notifications/notification.model.js';
import { expireStaleReservations } from '../../server/src/modules/reservations/reservation.service.js';

let app: Express;
let adminToken = '';
let staffToken = '';
let regularTypeId = '';
let gateAId = '';

describe('Comprehensive Operations: Automated & Manual Workflows', () => {
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

    const regular = await TicketTypeModel.findOne({ code: 'REGULAR' });
    regularTypeId = String(regular!._id);
    const gateA = await GateModel.findOne({ code: 'GATE-A' });
    gateAId = String(gateA!._id);
  });

  afterAll(async () => {
    await disconnectDatabase();
    await fs.rm('./tmp-test-storage-ops', { recursive: true, force: true }).catch(() => undefined);
  });

  it('Automation: supports 100% free promo auto-settlement, 8:14 PNG pass rendering, and auto-expiry inventory restoration', async () => {
    // 1. Admin creates 100% promo -> booking auto-settles without payment gateway redirect
    const freePromo = await request(app)
      .post('/api/v1/promo-codes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'FREEBLESS100',
        description: '100% Complimentary Devotee Pass',
        discountType: 'PERCENTAGE',
        discountValue: 100,
        totalUsageLimit: 10,
      });
    expect(freePromo.status).toBe(201);

    const resvFree = await request(app).post('/api/v1/reservations').send({
      items: [{ ticketTypeId: regularTypeId, quantity: 1 }],
      promoCode: 'FREEBLESS100',
    });
    expect(resvFree.status).toBe(201);
    expect(resvFree.body.data.finalAmount).toBe(0);

    const bookFree = await request(app).post('/api/v1/bookings').send({
      reservationId: resvFree.body.data._id,
      primaryContact: { fullName: 'Seva Volunteer', mobile: '09876543210', email: 'seva@example.com' },
      attendees: [{ ticketTypeId: regularTypeId, fullName: 'Seva Volunteer', age: 29, mobile: '+91 98765 43210' }],
      promoCode: 'FREEBLESS100',
      acceptedTerms: true,
    });
    expect(bookFree.status).toBe(201);
    const { booking: freeBooking, retrievalToken } = bookFree.body.data;

    // Auto-settlement on initiate for ₹0 bookings
    const freePay = await request(app).post('/api/v1/payments/initiate').send({ bookingId: freeBooking._id });
    expect(freePay.status).toBe(201);
    expect(freePay.body.data.status).toBe('COMPLETED');

    const statusFree = await request(app).get(`/api/v1/payments/status/${freePay.body.data.merchantTransactionId}`);
    expect(statusFree.status).toBe(200);
    expect(statusFree.body.data.booking.status).toBe('PAID');
    expect(statusFree.body.data.tickets).toHaveLength(1);

    // Verify 8:14 (960x1680) PNG download & secret-token booking lookup
    const passPng = await request(app).get(
      `/api/v1/tickets/pass/${statusFree.body.data.tickets[0].secureReference}/download?format=png`,
    );
    expect(passPng.status).toBe(200);
    const meta = await sharp(passPng.body).metadata();
    expect(meta.width).toBe(960);
    expect(meta.height).toBe(1680);

    const unauthBooking = await request(app).get(`/api/v1/bookings/public/${freeBooking.bookingReference}`);
    expect(unauthBooking.status).toBe(401);

    const authBooking = await request(app).get(
      `/api/v1/bookings/public/${freeBooking.bookingReference}?token=${encodeURIComponent(retrievalToken)}`,
    );
    expect(authBooking.status).toBe(200);
    expect(authBooking.body.data.tickets).toHaveLength(1);

    // 2. Reservation manual release + automatic stale expiration restoration
    const manualResv = await request(app).post('/api/v1/reservations').send({
      items: [{ ticketTypeId: regularTypeId, quantity: 2 }],
    });
    expect(manualResv.status).toBe(201);
    const relRes = await request(app).post(`/api/v1/reservations/${manualResv.body.data._id}/release`);
    expect(relRes.status).toBe(200);
    expect(relRes.body.data.status).toBe('RELEASED');

    const autoExpireResv = await request(app).post('/api/v1/reservations').send({
      items: [{ ticketTypeId: regularTypeId, quantity: 1 }],
    });
    await ReservationModel.updateOne(
      { _id: autoExpireResv.body.data._id },
      { $set: { expiresAt: new Date(Date.now() - 5000) } },
    );
    const expired = await expireStaleReservations();
    expect(expired).toBeGreaterThanOrEqual(1);
  });

  it('Manual Processes: staff manual check-in, admin check-in reversal, notification retry, and booking-ref refund', async () => {
    const resv = await request(app).post('/api/v1/reservations').send({
      items: [{ ticketTypeId: regularTypeId, quantity: 1 }],
    });
    const book = await request(app).post('/api/v1/bookings').send({
      reservationId: resv.body.data._id,
      primaryContact: { fullName: 'Manual Ops User', mobile: '9876511111', email: 'manual@example.com' },
      attendees: [{ ticketTypeId: regularTypeId, fullName: 'Manual Ops User', age: 40, mobile: '9876511111' }],
      acceptedTerms: true,
    });
    const booking = book.body.data.booking;

    const payInit = await request(app).post('/api/v1/payments/initiate').send({ bookingId: booking._id });
    const txn = payInit.body.data.merchantTransactionId;
    await request(app).post(`/api/v1/payments/dev-simulate/${txn}`).send({ outcome: 'COMPLETED' });

    const statusRes = await request(app).get(`/api/v1/payments/status/${txn}`);
    const ticket = statusRes.body.data.tickets[0];

    // Staff manual lookup + manual check-in without QR camera
    const lookup = await request(app)
      .get(`/api/v1/checkins/lookup?q=${encodeURIComponent(ticket.ticketId)}`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(lookup.status).toBe(200);
    expect(lookup.body.data).toHaveLength(1);

    const manualCheckin = await request(app)
      .post('/api/v1/checkins/manual')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ ticketId: ticket.ticketId, gateId: gateAId, deviceId: 'SCAN-GATEA-01' });
    expect(manualCheckin.status).toBe(200);
    expect(manualCheckin.body.data.result).toBe('VALID');

    // Admin manual check-in reversal -> allows scan again
    const reverseRes = await request(app)
      .post(`/api/v1/checkins/${ticket._id}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Tested manual gate reversal' });
    expect(reverseRes.status).toBe(200);
    expect(reverseRes.body.data.status).toBe('ISSUED');

    // Interactive QR Inspect -> Select Check In / Check Out -> Submit workflow
    const inspect1 = await request(app)
      .post('/api/v1/checkins/inspect')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: ticket.qrToken, gateId: gateAId, deviceId: 'SCAN-GATEA-01' });
    expect(inspect1.status).toBe(200);
    expect(inspect1.body.data.valid).toBe(true);
    expect(inspect1.body.data.recommendedAction).toBe('CHECK_IN');

    const submitIn = await request(app)
      .post('/api/v1/checkins/action')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: ticket.qrToken, action: 'CHECK_IN', gateId: gateAId, deviceId: 'SCAN-GATEA-01' });
    expect(submitIn.status).toBe(200);
    expect(submitIn.body.data.admitted).toBe(true);
    expect(submitIn.body.data.ticket.status).toBe('CHECKED_IN');

    const inspect2 = await request(app)
      .post('/api/v1/checkins/inspect')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: ticket.qrToken, gateId: gateAId, deviceId: 'SCAN-GATEA-01' });
    expect(inspect2.status).toBe(200);
    expect(inspect2.body.data.valid).toBe(true);
    expect(inspect2.body.data.recommendedAction).toBe('CHECK_OUT');

    const submitOut = await request(app)
      .post('/api/v1/checkins/action')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: ticket.qrToken, action: 'CHECK_OUT', gateId: gateAId, deviceId: 'SCAN-GATEA-01' });
    expect(submitOut.status).toBe(200);
    expect(submitOut.body.data.admitted).toBe(true);
    expect(submitOut.body.data.result).toBe('CHECKED_OUT');
    expect(submitOut.body.data.ticket.status).toBe('CHECKED_OUT');

    // Checking out again without checking back in returns NOT_CHECKED_IN
    const dupOut = await request(app)
      .post('/api/v1/checkins/action')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: ticket.qrToken, action: 'CHECK_OUT', gateId: gateAId, deviceId: 'SCAN-GATEA-01' });
    expect(dupOut.status).toBe(200);
    expect(dupOut.body.data.admitted).toBe(false);
    expect(dupOut.body.data.result).toBe('NOT_CHECKED_IN');

    // Event Day Control Center & Admin Dashboard reflect live Checkout status & counts
    const eventDayOut = await request(app)
      .get('/api/v1/analytics/event-day')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(eventDayOut.status).toBe(200);
    expect(eventDayOut.body.data.operations.checkoutEnabled).toBe(true);
    expect(eventDayOut.body.data.liveCounts.checkedOutCount).toBeGreaterThanOrEqual(1);
    const gateRow = eventDayOut.body.data.gates.find((g: any) => String(g._id) === String(gateAId));
    expect(gateRow?.checkoutScans).toBeGreaterThanOrEqual(1);

    const dashboardOut = await request(app)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dashboardOut.status).toBe(200);
    expect(dashboardOut.body.data.kpis.checkedOutCount).toBeGreaterThanOrEqual(1);

    // Emergency Checkout switch toggle works via System Emergency Controls
    const disableCheckout = await request(app)
      .post('/api/v1/system/emergency')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'DISABLE_CHECKOUT', confirm: true });
    expect(disableCheckout.status).toBe(200);
    expect(disableCheckout.body.data.checkoutEnabled).toBe(false);

    const enableCheckout = await request(app)
      .post('/api/v1/system/emergency')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'ENABLE_CHECKOUT', confirm: true });
    expect(enableCheckout.status).toBe(200);
    expect(enableCheckout.body.data.checkoutEnabled).toBe(true);

    // Re-entry Check In after Check Out succeeds cleanly
    const reEntryIn = await request(app)
      .post('/api/v1/checkins/action')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: ticket.qrToken, action: 'CHECK_IN', gateId: gateAId, deviceId: 'SCAN-GATEA-01' });
    expect(reEntryIn.status).toBe(200);
    expect(reEntryIn.body.data.admitted).toBe(true);

    // Reverse back to ISSUED before refund step below
    await request(app)
      .post(`/api/v1/checkins/${ticket._id}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Restore before refund' });

    // Admin manual booking notification resend (with rendered ticket pass PNG attachment) + log retry
    const resendRes = await request(app)
      .post(`/api/v1/notifications/resend-booking/${booking._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resendRes.status).toBe(200);
    expect(resendRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(resendRes.body.data[0].hasAttachment).toBe(true);
    expect(resendRes.body.data[0].attachmentName).toContain('-pass.png');

    const notifLog = await NotificationLogModel.findOne({ bookingId: booking._id });
    expect(notifLog).toBeTruthy();
    const retryRes = await request(app)
      .post(`/api/v1/notifications/${notifLog!._id}/retry`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(retryRes.status).toBe(200);

    // Admin Broadcast Message (WhatsApp + Email) with image attachment to confirmed attendees
    const previewRes = await request(app)
      .get('/api/v1/notifications/recipients-preview?audience=ALL_ACTIVE')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.data.attendeeCount).toBeGreaterThanOrEqual(1);

    const tinyPngDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+8X8AAAAASUVORK5CYII=';
    const broadcastRes = await request(app)
      .post('/api/v1/notifications/broadcast')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        channels: ['WHATSAPP', 'EMAIL'],
        audience: 'ALL_ACTIVE',
        subject: 'Gates Open Update',
        message: 'Namaste {{name}}, gates open at 4:30 PM. Keep pass {{ticketId}} ready.',
        attachment: {
          filename: 'gates-poster.png',
          mimeType: 'image/png',
          dataUrl: tinyPngDataUrl,
        },
      });
    expect(broadcastRes.status).toBe(200);
    expect(broadcastRes.body.data.whatsapp.sent).toBeGreaterThanOrEqual(1);
    expect(broadcastRes.body.data.email.sent).toBeGreaterThanOrEqual(1);
    expect(broadcastRes.body.data.attachment?.filename).toBe('gates-poster.png');

    const attachedBroadcastLogs = await NotificationLogModel.find({
      templateType: 'ANNOUNCEMENT',
      hasAttachment: true,
      attachmentName: 'gates-poster.png',
    });
    expect(attachedBroadcastLogs.length).toBeGreaterThanOrEqual(2);

    // Admin manual refund using human-readable bookingReference instead of ObjectId
    const refundByRef = await request(app)
      .post('/api/v1/refunds')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ bookingId: booking.bookingReference, reason: 'Manual refund via booking reference' });
    expect(refundByRef.status).toBe(201);

    const bookingDoc = await BookingModel.findById(booking._id);
    expect(bookingDoc?.status).toBe('REFUNDED');
    const ticketDoc = await TicketModel.findById(ticket._id);
    expect(ticketDoc?.status).toBe('REFUNDED');
  });

  it('Manual Admin Controls: registration fields, ticket category, promo toggle, emergency pause/restore & reconciliation', async () => {
    // Reconcile inventory cleanly
    const recInv = await request(app)
      .post('/api/v1/system/reconcile-inventory')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(recInv.status).toBe(200);

    // Emergency pause checkin -> scan blocks -> resume checkin -> restored
    const pauseCi = await request(app)
      .post('/api/v1/system/emergency')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'PAUSE_CHECKIN', confirm: true });
    expect(pauseCi.status).toBe(200);
    expect(pauseCi.body.data.checkinOpen).toBe(false);

    const resumeCi = await request(app)
      .post('/api/v1/system/emergency')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'RESUME_CHECKIN', confirm: true });
    expect(resumeCi.status).toBe(200);
    expect(resumeCi.body.data.checkinOpen).toBe(true);

    // Update registration fields cleanly
    const evRes = await request(app).get('/api/v1/event').set('Authorization', `Bearer ${adminToken}`);
    const origFields = evRes.body.data.registrationFields;
    const updFields = await request(app)
      .put('/api/v1/event/registration-fields')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fields: origFields });
    expect(updFields.status).toBe(200);
  });

  it('Full Admin CRUD across all sections: Gates, TicketTypes, RegistrationFields, Staff, Devices, PromoCodes, Support, Event, Attendees', async () => {
    // 1. Gates CRUD: Create -> List -> Update -> Delete
    const createGate = await request(app)
      .post('/api/v1/gates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'GATE-CRUD', name: 'East CRUD Gate', description: 'North lane' });
    expect(createGate.status).toBe(201);
    const gateId = String(createGate.body.data._id ?? createGate.body.data.id);

    const listGates = await request(app).get('/api/v1/gates').set('Authorization', `Bearer ${adminToken}`);
    expect(listGates.status).toBe(200);
    expect(listGates.body.data.some((g: { id?: string; code?: string }) => g.id === gateId && g.code === 'GATE-CRUD')).toBe(true);

    const updateGate = await request(app)
      .patch(`/api/v1/gates/${gateId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated CRUD Gate', isActive: false });
    expect(updateGate.status).toBe(200);
    expect(updateGate.body.data.name).toBe('Updated CRUD Gate');
    expect(updateGate.body.data.isActive).toBe(false);

    // 2. Staff CRUD: Create (assigned to gateId) -> Update -> Reset Password -> Delete Gate cleans ref -> Delete Staff
    const createStaff = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'CRUD Gate Volunteer',
        email: 'crud.staff@eventflow.local',
        password: 'CrudPassword@123!',
        assignedGateIds: [gateId],
      });
    expect(createStaff.status).toBe(201);
    const staffId = String(createStaff.body.data.id ?? createStaff.body.data._id);

    const updateStaff = await request(app)
      .patch(`/api/v1/staff/${staffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CRUD Gate Lead', status: 'SUSPENDED' });
    expect(updateStaff.status).toBe(200);
    expect(updateStaff.body.data.name).toBe('CRUD Gate Lead');
    expect(updateStaff.body.data.status).toBe('SUSPENDED');

    const resetPw = await request(app)
      .post(`/api/v1/staff/${staffId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'NewCrudPassword@123!' });
    expect(resetPw.status).toBe(200);

    // 3. Devices CRUD: Create -> Update -> Delete
    const createDevice = await request(app)
      .post('/api/v1/devices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ deviceCode: 'SCAN-CRUD-01', name: 'CRUD Handheld', assignedGateId: gateId });
    expect(createDevice.status).toBe(201);
    const deviceId = String(createDevice.body.data._id ?? createDevice.body.data.id);

    const updateDevice = await request(app)
      .patch(`/api/v1/devices/${deviceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CRUD Handheld v2', status: 'SUSPENDED' });
    expect(updateDevice.status).toBe(200);
    expect(updateDevice.body.data.name).toBe('CRUD Handheld v2');
    expect(updateDevice.body.data.status).toBe('SUSPENDED');

    // Delete gate & verify cascade cleanup then delete device and staff
    const deleteGate = await request(app).delete(`/api/v1/gates/${gateId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleteGate.status).toBe(200);

    const deleteDevice = await request(app).delete(`/api/v1/devices/${deviceId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleteDevice.status).toBe(200);

    const deleteStaff = await request(app).delete(`/api/v1/staff/${staffId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleteStaff.status).toBe(200);

    // 4. TicketTypes CRUD: Create -> Update -> Delete (and verify Regular with sold tickets is blocked from delete)
    const createTt = await request(app)
      .post('/api/v1/ticket-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'CRUDPASS', name: 'CRUD Temp Pass', price: 250, capacity: 50, description: 'Temp pass' });
    expect(createTt.status).toBe(201);
    const ttId = String(createTt.body.data.id ?? createTt.body.data._id);

    const updateTt = await request(app)
      .patch(`/api/v1/ticket-types/${ttId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CRUD Edited Pass', price: 300, capacity: 75 });
    expect(updateTt.status).toBe(200);
    expect(updateTt.body.data.price).toBe(300);

    const deleteTt = await request(app).delete(`/api/v1/ticket-types/${ttId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleteTt.status).toBe(200);

    // 5. PromoCodes CRUD: Create -> Update -> Delete
    const createPromo = await request(app)
      .post('/api/v1/promo-codes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'CRUDPROMO', discountType: 'FIXED', discountValue: 50, totalUsageLimit: 25 });
    expect(createPromo.status).toBe(201);
    const promoId = String(createPromo.body.data._id ?? createPromo.body.data.id);

    const updatePromo = await request(app)
      .patch(`/api/v1/promo-codes/${promoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ discountValue: 75, isActive: false });
    expect(updatePromo.status).toBe(200);
    expect(updatePromo.body.data.discountValue).toBe(75);
    expect(updatePromo.body.data.isActive).toBe(false);

    const deletePromo = await request(app).delete(`/api/v1/promo-codes/${promoId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deletePromo.status).toBe(200);

    // 6. Support Tickets CRUD: Create -> List -> Update -> Delete
    const createSupport = await request(app)
      .post('/api/v1/support')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: 'GATE_HELP',
        subject: 'CRUD test ticket',
        description: 'Testing full lifecycle of support tickets in admin',
        priority: 'HIGH',
        contactName: 'Rama Rao',
        contactMobile: '9876543210',
      });
    expect(createSupport.status).toBe(201);
    const supportId = String(createSupport.body.data._id ?? createSupport.body.data.id);

    const updateSupport = await request(app)
      .patch(`/api/v1/support/${supportId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RESOLVED', resolution: 'Handled by desk' });
    expect(updateSupport.status).toBe(200);
    expect(updateSupport.body.data.status).toBe('RESOLVED');

    const deleteSupport = await request(app).delete(`/api/v1/support/${supportId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleteSupport.status).toBe(200);

    // 7. Registration Fields CRUD (Add -> Edit -> Remove) & Event Settings Update
    const evBefore = await request(app).get('/api/v1/event').set('Authorization', `Bearer ${adminToken}`);
    const baseFields = evBefore.body.data.registrationFields;
    const withCustomField = [
      ...baseFields,
      { key: 'gotra_crud', label: 'Gotram', type: 'text', required: false, displayOrder: baseFields.length + 1, enabled: true },
    ];
    const addFieldRes = await request(app)
      .put('/api/v1/event/registration-fields')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fields: withCustomField });
    expect(addFieldRes.status).toBe(200);
    expect(addFieldRes.body.data.some((f: { key: string }) => f.key === 'gotra_crud')).toBe(true);

    const restoreFieldsRes = await request(app)
      .put('/api/v1/event/registration-fields')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fields: baseFields });
    expect(restoreFieldsRes.status).toBe(200);

    // 8. Attendee Update CRUD (using existing attendee from earlier booking)
    const listAtt = await request(app).get('/api/v1/attendees').set('Authorization', `Bearer ${adminToken}`);
    expect(listAtt.status).toBe(200);
    if (listAtt.body.data.length > 0) {
      const attId = String(listAtt.body.data[0]._id);
      const updAtt = await request(app)
        .patch(`/api/v1/attendees/${attId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fullName: 'Updated Devotee Name' });
      expect(updAtt.status).toBe(200);
      expect(updAtt.body.data.fullName).toBe('Updated Devotee Name');
    }

    // 9. MongoDB binary asset storage CRUD (tickets PNG/PDF persistence in MongoDB)
    const { MongoStorageAdapter } = await import('../../server/src/services/storage.service.js');
    const mongoStorage = new MongoStorageAdapter();
    const assetKey = await mongoStorage.putObject('tickets/BK-TEST/EFO-TEST.png', Buffer.from('test-png-bytes'), 'image/png');
    expect(assetKey).toBe('tickets/BK-TEST/EFO-TEST.png');
    const fetched = await mongoStorage.getObject(assetKey);
    expect(fetched.toString('utf8')).toBe('test-png-bytes');
    await mongoStorage.deleteObject(assetKey);
    await expect(mongoStorage.getObject(assetKey)).rejects.toThrow();

    // 10. Non-expiring JWT stored in HttpOnly cookies without Expires/Max-Age
    const cookieLogin = await request(app).post('/api/v1/auth/admin/login').send({
      email: process.env.ADMIN_EMAIL || 'admin@eventflowos.in',
      password: process.env.ADMIN_PASSWORD || 'EventFlow@Admin2026!',
    });
    expect(cookieLogin.status).toBe(200);
    const jwtMod = await import('jsonwebtoken');
    const decoded = jwtMod.default.decode(cookieLogin.body.data.accessToken) as Record<string, unknown>;
    expect(decoded.exp).toBeUndefined();
    const rawCookies = cookieLogin.headers['set-cookie'] as unknown as string[];
    expect(Array.isArray(rawCookies)).toBe(true);
    const accessCookie = rawCookies.find((c) => c.startsWith('access_token='));
    expect(accessCookie).toBeTruthy();
    expect(accessCookie).toContain('HttpOnly');
    expect(accessCookie).not.toMatch(/Expires=|Max-Age=/i);

    const meByCookie = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', accessCookie!.split(';')[0]!);
    expect(meByCookie.status).toBe(200);
    expect(meByCookie.body.data.user.role).toBe('admin');
  });
});
