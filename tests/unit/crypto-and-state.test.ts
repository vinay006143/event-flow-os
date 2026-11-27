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

  it('encrypts client credentials locally with AES-GCM-256 and enforces 20-day expiry', async () => {
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    (globalThis as unknown as { localStorage: typeof mockStorage }).localStorage = mockStorage;
    (globalThis as unknown as { sessionStorage: typeof mockStorage }).sessionStorage = mockStorage;

    const {
      CREDENTIAL_VALIDITY_DAYS,
      CREDENTIAL_TTL_MS,
      saveEncryptedCredentials,
      loadEncryptedCredentials,
    } = await import('../../client/src/lib/credentialVault.js');

    expect(CREDENTIAL_VALIDITY_DAYS).toBe(20);
    expect(CREDENTIAL_TTL_MS).toBe(20 * 24 * 60 * 60 * 1000);

    const saved = await saveEncryptedCredentials('admin', {
      email: 'admin@eventflowos.in',
      password: 'EventFlow@Admin2026!',
      accessToken: 'jwt-token-sample',
    });

    const rawStored = store.get('efo_enc_vault_admin_v1')!;
    expect(rawStored).toBeTruthy();
    expect(rawStored).not.toContain('EventFlow@Admin2026!');
    expect(rawStored).not.toContain('admin@eventflowos.in');
    expect(saved.expiresAt - saved.savedAt).toBe(CREDENTIAL_TTL_MS);

    const loaded = await loadEncryptedCredentials('admin');
    expect(loaded?.email).toBe('admin@eventflowos.in');
    expect(loaded?.password).toBe('EventFlow@Admin2026!');
    expect(loaded?.accessToken).toBe('jwt-token-sample');

    // Expired vault (>20 days) is purged and returns null
    await saveEncryptedCredentials('staff', {
      email: 'staff@eventflowos.in',
      password: 'EventFlow@Staff2026!',
      expiresAt: Date.now() - 1000,
    });
    const expired = await loadEncryptedCredentials('staff');
    expect(expired).toBeNull();
    expect(store.get('efo_enc_vault_staff_v1')).toBeUndefined();
  });
});
