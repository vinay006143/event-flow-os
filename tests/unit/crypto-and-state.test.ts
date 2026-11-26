import { describe, expect, it } from 'vitest';
import { canTransitionBooking } from '../../shared/src/constants/index.js';
import {
  generateBookingReference,
  generateTicketId,
  hashPassword,
  signQrToken,
  verifyPassword,
  verifyQrTokenFormat,
} from '../../server/src/utils/crypto.js';

describe('Unit: Crypto, QR Security & State Machine', () => {
  it('hashes and verifies passwords with Argon2id', async () => {
    const hash = await hashPassword('SacredEvent@2026');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(hash, 'SacredEvent@2026')).toBe(true);
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });

  it('generates readable unique Ticket IDs and Booking References', () => {
    const t1 = generateTicketId('NOD');
    const t2 = generateTicketId('NOD');
    const b1 = generateBookingReference('NOD');
    expect(t1).toMatch(/^EFO-NOD-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
    expect(t1).not.toBe(t2);
    expect(b1).toMatch(/^BK-NOD-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{7}$/);
  });

  it('signs and verifies HMAC QR tokens and rejects tampered tokens', () => {
    const { token, tokenHash } = signQrToken('EFO-NOD-7K92X1', 'NOD');
    expect(token.startsWith('EFO1.')).toBe(true);
    const parsed = verifyQrTokenFormat(token);
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.ticketId).toBe('EFO-NOD-7K92X1');
      expect(parsed.eventId).toBe('NOD');
      expect(parsed.tokenHash).toBe(tokenHash);
    }

    // Tamper signature
    const tampered = `${token.slice(0, -4)}XXXX`;
    expect(verifyQrTokenFormat(tampered).valid).toBe(false);
    expect(verifyQrTokenFormat('not-a-valid-token').valid).toBe(false);
  });

  it('enforces valid booking status transitions', () => {
    expect(canTransitionBooking('RESERVED', 'PENDING_PAYMENT')).toBe(true);
    expect(canTransitionBooking('PENDING_PAYMENT', 'PAID')).toBe(true);
    expect(canTransitionBooking('PAID', 'REFUNDED')).toBe(true);
    expect(canTransitionBooking('EXPIRED', 'PAID')).toBe(false);
    expect(canTransitionBooking('REFUNDED', 'PAID')).toBe(false);
  });
});
