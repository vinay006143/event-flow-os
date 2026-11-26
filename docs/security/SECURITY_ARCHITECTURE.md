# Security Architecture — EventFlow OS

## Role & Access Control Enforcement
- **Single Admin Enforcement:** MongoDB unique partial index `unique_single_admin_role` on `{ role: 1 }` where `role === 'admin'` prevents creating a second Admin at the database layer. No public Admin registration endpoint exists.
- **Restricted Staff:** Staff accounts are created exclusively by Admin, scoped to explicit `permissions` (`StaffPermission[]`), `assignedGateIds`, and `assignedDeviceIds`. All checks run server-side in `auth.middleware.ts` and `checkin.service.ts`.
- **Password & Session Security:** Passwords hashed with **Argon2id**; refresh tokens hashed with SHA-256 and rotated on every refresh; `tokenVersion` revocation invalidates compromised sessions immediately.

## Payment & Webhook Security
- Frontend payment redirects or query parameters are never trusted.
- Webhooks require valid PhonePe `X-VERIFY` / Basic SHA-256 signatures (or HMAC signature in dev adapter) and are deduplicated via `WebhookEventModel.eventKey`.
- Payment amounts are verified in paise against `PaymentModel.amountPaise` before transitioning a booking to `PAID`.

## QR Token Security
- QR tokens (`EFO1.<base64url>.<hmac>`) contain only version, ticket ID, event code, and a 96-bit random nonce—zero PII or DB documents.
- Verification uses constant-time `crypto.timingSafeEqual` against `QR_SIGNING_SECRET` and checks live database state (`ISSUED` -> `CHECKED_IN` atomically).

## Audit Trail
- Sensitive admin, auth, payment, refund, ticket revocation/reissue, staff, gate, device, and emergency actions are recorded in append-only `AuditLogModel`.
