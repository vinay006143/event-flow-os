# System Architecture — EventFlow OS

## Architectural Pattern
EventFlow OS is a **modular monolith** built on the MERN stack with TypeScript across all layers (`shared`, `server`, `worker`, `client`).

```
[Public Attendee Browser] ──┐
[Admin Control Console]   ──┼──▶ [Nginx Reverse Proxy] ──▶ [Express REST API /api/v1] ──▶ [MongoDB]
[Staff Scanner PWA]       ──┘                                        │                        ▲
                                                                     ▼                        │
                                                            [Redis / BullMQ] ──▶ [Worker] ────┘
                                                                     │
                                              ┌──────────────────────┼──────────────────────┐
                                              ▼                      ▼                      ▼
                                     [PhonePe Gateway]     [WhatsApp / SMTP]     [S3 / Local Storage]
```

## Core Data Flows

1. **Reservation & Checkout:**
   - `POST /api/v1/reservations` atomically increments `reservedQuantity` on `TicketType` only when `capacity - (soldQuantity + reservedQuantity) >= quantity`.
   - `POST /api/v1/bookings` validates dynamic `EventConfig.registrationFields`, creates 1 `Booking` + N `Attendee` records, and atomically consumes promo code usage if applicable.
2. **Payment Verification & Ticket Issuance:**
   - `POST /api/v1/payments/initiate` creates a `Payment` record and redirects to PhonePe (or Development Adapter).
   - Tickets are **only** issued after verified server-side payment (`settleVerifiedPayment`), which validates amount (in paise), currency (`INR`), and webhook authenticity.
   - `issueTicketsForPaidBooking` creates 1 `Ticket` per `Attendee` with a unique `ticketId`, unguessable `secureReference`, and HMAC-SHA256 `qrToken`, then renders PDF & PNG assets to object storage.
3. **Atomic Gate Check-in:**
   - `POST /api/v1/checkins/scan` verifies HMAC signature, event code, gate assignment, device status, and atomically transitions `Ticket.status` from `ISSUED` to `CHECKED_IN`.
