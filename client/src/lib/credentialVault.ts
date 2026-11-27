export type PortalType = 'admin' | 'staff';

export const CREDENTIAL_VALIDITY_DAYS = 20;
export const CREDENTIAL_TTL_MS = CREDENTIAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000;

const VAULT_KEYS: Record<PortalType, string> = {
  admin: 'efo_enc_vault_admin_v1',
  staff: 'efo_enc_vault_staff_v1',
};

const SESSION_TOKEN_KEYS: Record<PortalType, string> = {
  admin: 'efo_session_token_admin_v1',
  staff: 'efo_session_token_staff_v1',
};

const DEVICE_KEY_STORAGE = 'efo_device_cipher_key_v1';

export interface VaultUserSnapshot {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: 'admin' | 'staff';
  status: string;
  permissions: string[];
  assignedGateIds: string[];
}

export interface StoredCredentialPayload {
  email: string;
  password: string;
  deviceCode?: string;
  name?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: VaultUserSnapshot;
  autoLoginPaused?: boolean;
  savedAt: number;
  expiresAt: number;
}

interface EncryptedEnvelope {
  v: 1;
  alg: 'AES-GCM-256' | 'XOR-HMAC-FALLBACK';
  iv: string;
  cipher: string;
  savedAt: number;
  expiresAt: number;
}

const memoryTokens: Partial<Record<PortalType, string>> = {};

export function detectPortalFromPath(pathname?: string): PortalType | null {
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  if (path.startsWith('/staff')) return 'staff';
  if (path.startsWith('/admin')) return 'admin';
  return null;
}

export function setPortalToken(portal: PortalType, token?: string | null) {
  if (token) {
    memoryTokens[portal] = token;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_TOKEN_KEYS[portal], token);
    }
  } else {
    delete memoryTokens[portal];
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SESSION_TOKEN_KEYS[portal]);
    }
  }
}

export function getPortalToken(portal?: PortalType | null): string | undefined {
  const target = portal ?? detectPortalFromPath();
  if (!target) return undefined;
  if (memoryTokens[target]) return memoryTokens[target];
  if (typeof sessionStorage !== 'undefined') {
    const sess = sessionStorage.getItem(SESSION_TOKEN_KEYS[target]);
    if (sess) {
      memoryTokens[target] = sess;
      return sess;
    }
  }
  return undefined;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function getOrCreateDeviceKeyBytes(): Uint8Array {
  try {
    const existing = localStorage.getItem(DEVICE_KEY_STORAGE);
    if (existing) {
      const parsed = base64ToBytes(existing);
      if (parsed.length === 32) return parsed;
    }
  } catch {
    // regenerate if corrupted
  }
  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  try {
    localStorage.setItem(DEVICE_KEY_STORAGE, bytesToBase64(raw));
  } catch {
    // ignore storage quota errors
  }
  return raw;
}

async function encryptString(plaintext: string): Promise<{ alg: EncryptedEnvelope['alg']; iv: string; cipher: string }> {
  const keyBytes = getOrCreateDeviceKeyBytes();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const plainBytes = new TextEncoder().encode(plaintext);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const keyCopy = Uint8Array.from(keyBytes);
    const ivCopy = Uint8Array.from(iv);
    const cryptoKey = await crypto.subtle.importKey('raw', keyCopy.buffer, { name: 'AES-GCM' }, false, ['encrypt']);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivCopy.buffer }, cryptoKey, Uint8Array.from(plainBytes).buffer);
    return {
      alg: 'AES-GCM-256',
      iv: bytesToBase64(iv),
      cipher: bytesToBase64(new Uint8Array(encrypted)),
    };
  }

  // Fallback for non-HTTPS LAN origins where crypto.subtle is unavailable
  const out = new Uint8Array(plainBytes.length);
  for (let i = 0; i < plainBytes.length; i += 1) {
    out[i] = plainBytes[i]! ^ keyBytes[i % keyBytes.length]! ^ iv[i % iv.length]!;
  }
  return {
    alg: 'XOR-HMAC-FALLBACK',
    iv: bytesToBase64(iv),
    cipher: bytesToBase64(out),
  };
}

async function decryptString(envelope: EncryptedEnvelope): Promise<string | null> {
  try {
    const keyBytes = getOrCreateDeviceKeyBytes();
    const iv = base64ToBytes(envelope.iv);
    const cipherBytes = base64ToBytes(envelope.cipher);

    if (envelope.alg === 'AES-GCM-256' && typeof crypto !== 'undefined' && crypto.subtle) {
      const keyCopy = Uint8Array.from(keyBytes);
      const ivCopy = Uint8Array.from(iv);
      const cipherCopy = Uint8Array.from(cipherBytes);
      const cryptoKey = await crypto.subtle.importKey('raw', keyCopy.buffer, { name: 'AES-GCM' }, false, ['decrypt']);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivCopy.buffer }, cryptoKey, cipherCopy.buffer);
      return new TextDecoder().decode(decrypted);
    }

    if (envelope.alg === 'XOR-HMAC-FALLBACK') {
      const out = new Uint8Array(cipherBytes.length);
      for (let i = 0; i < cipherBytes.length; i += 1) {
        out[i] = cipherBytes[i]! ^ keyBytes[i % keyBytes.length]! ^ iv[i % iv.length]!;
      }
      return new TextDecoder().decode(out);
    }

    return null;
  } catch {
    return null;
  }
}

export async function saveEncryptedCredentials(
  portal: PortalType,
  data: Omit<StoredCredentialPayload, 'savedAt' | 'expiresAt'> & { savedAt?: number; expiresAt?: number },
): Promise<StoredCredentialPayload> {
  const now = Date.now();
  const payload: StoredCredentialPayload = {
    ...data,
    savedAt: data.savedAt ?? now,
    expiresAt: data.expiresAt ?? now + CREDENTIAL_TTL_MS,
  };
  const encrypted = await encryptString(JSON.stringify(payload));
  const envelope: EncryptedEnvelope = {
    v: 1,
    alg: encrypted.alg,
    iv: encrypted.iv,
    cipher: encrypted.cipher,
    savedAt: payload.savedAt,
    expiresAt: payload.expiresAt,
  };
  localStorage.setItem(VAULT_KEYS[portal], JSON.stringify(envelope));
  if (payload.accessToken) {
    setPortalToken(portal, payload.accessToken);
  }
  return payload;
}

export async function loadEncryptedCredentials(portal: PortalType): Promise<StoredCredentialPayload | null> {
  try {
    const raw = localStorage.getItem(VAULT_KEYS[portal]);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as EncryptedEnvelope;
    if (!envelope || typeof envelope.expiresAt !== 'number' || Date.now() > envelope.expiresAt) {
      clearSavedCredentials(portal);
      return null;
    }
    const plain = await decryptString(envelope);
    if (!plain) return null;
    const parsed = JSON.parse(plain) as StoredCredentialPayload;
    if (!parsed || typeof parsed.expiresAt !== 'number' || Date.now() > parsed.expiresAt) {
      clearSavedCredentials(portal);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedCredentials(portal: PortalType) {
  try {
    localStorage.removeItem(VAULT_KEYS[portal]);
    if (portal === 'admin') localStorage.removeItem('efo_saved_admin_login');
    if (portal === 'staff') localStorage.removeItem('efo_saved_staff_login');
  } catch {
    // ignore storage errors
  }
  setPortalToken(portal, null);
}
