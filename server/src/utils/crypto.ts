import argon2 from 'argon2';
import crypto from 'crypto';
import { env } from '../config/env.js';

const CROCKFORD_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function randomCode(length = 6): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    const byte = bytes[i] ?? 0;
    out += CROCKFORD_ALPHABET[byte % CROCKFORD_ALPHABET.length];
  }
  return out;
}

export function generateTicketId(eventCode = 'NOD'): string {
  const cleanCode = eventCode.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) || 'EVT';
  return `EFO-${cleanCode}-${randomCode(6)}`;
}

export function generateBookingReference(eventCode = 'NOD'): string {
  const cleanCode = eventCode.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) || 'EVT';
  return `BK-${cleanCode}-${randomCode(7)}`;
}

export function generateNumericOtp(digits = 6): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return String(crypto.randomInt(min, max + 1));
}

export interface QrTokenPayload {
  v: number;
  tid: string;
  eid: string;
  nonce: string;
}

/**
 * Generates an opaque, cryptographically signed QR token.
 * Contains zero PII or database documents: only version, ticket code, event id, random nonce, and HMAC-SHA256 signature.
 */
export function signQrToken(ticketId: string, eventId: string): { token: string; tokenHash: string } {
  const nonce = crypto.randomBytes(12).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ v: 1, tid: ticketId, eid: eventId, n: nonce }),
    'utf8',
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', env.QR_SIGNING_SECRET)
    .update(body)
    .digest('base64url');
  const token = `EFO1.${body}.${sig}`;
  return { token, tokenHash: sha256(token) };
}

export function verifyQrTokenFormat(
  token: string,
): { valid: true; ticketId: string; eventId: string; tokenHash: string } | { valid: false } {
  if (!token || typeof token !== 'string') return { valid: false };
  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'EFO1') return { valid: false };

  const body = parts[1];
  const sig = parts[2];
  if (!body || !sig) return { valid: false };

  const expectedSig = crypto
    .createHmac('sha256', env.QR_SIGNING_SECRET)
    .update(body)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false };
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      v?: number;
      tid?: string;
      eid?: string;
    };
    if (parsed.v !== 1 || !parsed.tid || !parsed.eid) return { valid: false };
    return {
      valid: true,
      ticketId: parsed.tid,
      eventId: parsed.eid,
      tokenHash: sha256(token.trim()),
    };
  } catch {
    return { valid: false };
  }
}
