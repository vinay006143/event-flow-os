import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import fs from 'fs/promises';
import type { Express } from 'express';

import { connectDatabase, disconnectDatabase } from '../../server/src/database/connection.js';
import { seedInitialDeploymentData } from '../../server/src/database/seed.js';
import { createApp } from '../../server/src/app.js';
import { TicketTypeModel } from '../../server/src/modules/ticket-types/ticket-type.model.js';
import { GateModel } from '../../server/src/modules/gates/gate.model.js';
import { ScannerDeviceModel } from '../../server/src/modules/devices/device.model.js';

let app: Express;
let adminToken = '';
let staffToken = '';
let regularTypeId = '';
let gateAId = '';

describe('Integration: P1 Operations, Permissions, Cancellations, Support & Emergency Controls', () => {
  beforeAll(async () => {
    await connectDatabase();
    await seedInitialDeploymentData();
    app = createApp();

    const adminLogin = await request(app).post('/api/v1/auth/admin/login').send({
      email: process.env.ADMIN_EMAIL || 'admin@eventflowos.in',
      password: process.env.ADMIN_PASSWORD || 'EventFlow@Admin2026!',
    });
    adminToken = adminLogin.body.data.accessToken;

    const staffLogin = await request(app).post('/api/v1/auth/staff/login').send({
      email: process.env.STAFF_EMAIL || 'staff@eventflowos.in',
      password: process.env.STAFF_PASSWORD || 'EventFlow@Staff2026!',
      deviceCode: 'SCAN-GATEA-01',
    });
    staffToken = staffLogin.body.data.accessToken;

    const regular = await TicketTypeModel.findOne({ code: 'REGULAR' });
    regularTypeId = String(regular!._id);
    const gateA = await GateModel.findOne({ code: 'GATE-A' });
    gateAId = String(gateA!._id);
  });

  afterAll(async () => {
    await disconnectDatabase();
    await fs.rm('./tmp-test-storage', { recursive: true, force: true }).catch(() => undefined);
  });

  it('handles ticket cancellation, revocation, and scanner rejection for both states', async () => {
    const resv = await request(app).post('/api/v1/reservations').send({
      items: [{ ticketTypeId: regularTypeId, quantity: 2 }],
    });
    const book = await request(app).post('/api/v1/bookings').send({
      reservationId: resv.body.data._id,
      primaryContact: { fullName: 'Cancel Test', mobile: '9876540001', email: 'cancel@example.com' },
      attendees: [
        { ticketTypeId: regularTypeId, fullName: 'Att One', age: 29, mobile: '9876540001' },
        { ticketTypeId: regularTypeId, fullName: 'Att Two', age: 31, mobile: '9876540002' },
      ],
      acceptedTerms: true,
    });
    const payInit = await request(app).post('/api/v1/payments/initiate').send({
      bookingId: book.body.data.booking._id,
    });
    await request(app)
      .post(`/api/v1/payments/dev-simulate/${payInit.body.data.merchantTransactionId}`)
      .send({ outcome: 'COMPLETED' });

    const statusRes = await request(app).get(
      `/api/v1/payments/status/${payInit.body.data.merchantTransactionId}`,
    );
    const [t1, t2] = statusRes.body.data.tickets;

    // Cancel t1
    const cancelRes = await request(app)
      .post('/api/v1/refunds/cancel')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ bookingId: book.body.data.booking._id, ticketId: t1.ticketId, reason: 'Guest cannot attend' });
    expect(cancelRes.status).toBe(200);

    const scanCancelled = await request(app)
      .post('/api/v1/checkins/scan')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: t1.qrToken, gateId: gateAId });
    expect(scanCancelled.body.data.result).toBe('CANCELLED');

    // Revoke t2
    const revokeRes = await request(app)
      .post(`/api/v1/tickets/${t2._id}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Security revocation' });
    expect(revokeRes.status).toBe(200);

    const scanRevoked = await request(app)
      .post('/api/v1/checkins/scan')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: t2.qrToken, gateId: gateAId });
    expect(scanRevoked.body.data.result).toBe('REVOKED');
  });

  it('enforces gate assignment restrictions for newly provisioned staff and suspended devices', async () => {
    const newGate = await request(app)
      .post('/api/v1/gates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'GATE-C', name: 'Gate C Restricted' });
    expect(newGate.status).toBe(201);

    // Create restricted staff NOT assigned to Gate C
    const newStaff = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Gate A Only Staff',
        email: 'gatea.only@eventflow.local',
        password: 'StaffPassword@123',
        assignedGateIds: [gateAId],
        permissions: ['SCAN_TICKETS', 'MANUAL_LOOKUP', 'VIEW_ASSIGNED_GATES'],
      });
    expect(newStaff.status).toBe(201);

    const staffLogin = await request(app).post('/api/v1/auth/staff/login').send({
      email: 'gatea.only@eventflow.local',
      password: 'StaffPassword@123',
    });
    const restrictedToken = staffLogin.body.data.accessToken;

    // Issue a valid ticket and attempt scan at Gate C -> UNAUTHORIZED_GATE
    const resv = await request(app).post('/api/v1/reservations').send({
      items: [{ ticketTypeId: regularTypeId, quantity: 1 }],
    });
    const book = await request(app).post('/api/v1/bookings').send({
      reservationId: resv.body.data._id,
      primaryContact: { fullName: 'Gate Auth Test', mobile: '9876540009', email: 'gate@example.com' },
      attendees: [{ ticketTypeId: regularTypeId, fullName: 'Gate Auth Test', age: 30, mobile: '9876540009' }],
      acceptedTerms: true,
    });
    const payInit = await request(app).post('/api/v1/payments/initiate').send({
      bookingId: book.body.data.booking._id,
    });
    await request(app)
      .post(`/api/v1/payments/dev-simulate/${payInit.body.data.merchantTransactionId}`)
      .send({ outcome: 'COMPLETED' });
    const statusRes = await request(app).get(
      `/api/v1/payments/status/${payInit.body.data.merchantTransactionId}`,
    );
    const ticket = statusRes.body.data.tickets[0];

    const unauthorizedGate = await request(app)
      .post('/api/v1/checkins/scan')
      .set('Authorization', `Bearer ${restrictedToken}`)
      .send({ qrToken: ticket.qrToken, gateId: newGate.body.data._id });
    expect(unauthorizedGate.body.data.result).toBe('UNAUTHORIZED_GATE');

    // Device suspension check
    const dev = await ScannerDeviceModel.findOne({ deviceCode: 'SCAN-GATEA-01' });
    await request(app)
      .patch(`/api/v1/devices/${dev!._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' });

    const suspendedDevScan = await request(app)
      .post('/api/v1/checkins/scan')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: ticket.qrToken, gateId: gateAId, deviceId: 'SCAN-GATEA-01' });
    expect(suspendedDevScan.status).toBe(403);

    // Re-enable device & test manual lookup + manual check-in
    await request(app)
      .patch(`/api/v1/devices/${dev!._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });

    const lookup = await request(app)
      .get(`/api/v1/checkins/lookup?q=${encodeURIComponent(ticket.ticketId)}`)
      .set('Authorization', `Bearer ${restrictedToken}`);
    expect(lookup.status).toBe(200);
    expect(lookup.body.data).toHaveLength(1);

    const manual = await request(app)
      .post('/api/v1/checkins/manual')
      .set('Authorization', `Bearer ${restrictedToken}`)
      .send({ ticketId: ticket.ticketId, gateId: gateAId });
    expect(manual.status).toBe(200);
    expect(manual.body.data.result).toBe('VALID');
  });

  it('supports public support tickets, admin resolution, and emergency sales pause', async () => {
    const supRes = await request(app).post('/api/v1/support').send({
      category: 'Ticket Delivery',
      subject: 'Need ticket PDF copy',
      description: 'Did not receive WhatsApp attachment yet for my booking.',
      contactName: 'Devotee',
      contactMobile: '9876543299',
    });
    expect(supRes.status).toBe(201);

    const resolveRes = await request(app)
      .patch(`/api/v1/support/${supRes.body.data._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RESOLVED', resolution: 'Resent via My Tickets' });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe('RESOLVED');

    // Pause sales via emergency control -> reservation blocked
    const pauseRes = await request(app)
      .post('/api/v1/system/emergency')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'PAUSE_SALES', confirm: true });
    expect(pauseRes.status).toBe(200);

    const blockedResv = await request(app).post('/api/v1/reservations').send({
      items: [{ ticketTypeId: regularTypeId, quantity: 1 }],
    });
    expect(blockedResv.status).toBe(400);

    // Resume sales
    await request(app)
      .post('/api/v1/system/emergency')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'RESUME_SALES', confirm: true });
  });
});
