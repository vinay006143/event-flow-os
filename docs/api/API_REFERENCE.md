# EventFlow OS — REST API v1 Reference

Base URL: `/api/v1`

## Response Envelope
All responses follow a consistent structure:
- Success: `{ "success": true, "data": ..., "meta": { "requestId": "..." } }`
- Error: `{ "success": false, "error": { "code": "...", "message": "...", "requestId": "..." } }`

## Key Endpoints

### Authentication (`/api/v1/auth`)
- `POST /auth/admin/login` — Single-Admin login (rate limited)
- `POST /auth/staff/login` — Restricted Staff login (supports `deviceCode`)
- `POST /auth/refresh` — Rotate refresh session
- `POST /auth/logout` — Revoke current session
- `GET /auth/me` — Current authenticated user profile
- `POST /auth/change-password` — Change own password & revoke active sessions

### Public Event & Ticketing
- `GET /event/public` — Active event config, branding, venue, policies, schedule, FAQs
- `GET /ticket-types/public` — Active categories with live `availableQuantity`
- `GET /registration/fields` — Dynamic registration form fields
- `POST /promo-codes/validate` — Server-side promo discount check
- `POST /reservations` — Atomic inventory reservation lock
- `POST /bookings` — Create booking + N attendee records from active reservation
- `POST /payments/initiate` — Initiate PhonePe checkout
- `POST /payments/webhook/phonepe` — PhonePe verified webhook receiver (idempotent)
- `GET /payments/status/:merchantTransactionId` — Server-verified status + issued tickets
- `POST /tickets/retrieve/request-otp` — Request OTP for My Tickets
- `POST /tickets/retrieve/verify-otp` — Verify OTP & retrieve bookings/tickets
- `GET /tickets/pass/:secureReference` — View individual digital pass
- `GET /tickets/pass/:secureReference/download?format=pdf|png` — Download PDF or PNG pass
- `POST /support` — Submit attendee support ticket

### Staff Scanner (`/api/v1/checkins`, `/gates`, `/devices`)
- `GET /gates` — Assigned active gates
- `POST /checkins/scan` — Verify & atomically check in QR token
- `POST /checkins/manual` — Manual check-in by Ticket ID
- `GET /checkins/lookup?q=...` — Restricted lookup for staff
- `GET /checkins/recent` — Recent scan log
- `POST /devices/heartbeat` — Scanner device heartbeat

### Admin Operations (Admin Role Only)
- `GET /analytics/dashboard` & `GET /analytics/event-day`
- `GET /bookings`, `GET /bookings/:id`
- `GET /attendees`, `PATCH /attendees/:id`
- `GET /tickets`, `POST /tickets/recover/:bookingId`, `POST /tickets/:id/revoke`, `POST /tickets/:id/reissue`
- `GET /payments`, `GET /payments/webhooks/history`
- `GET /refunds`, `POST /refunds`, `POST /refunds/cancel`
- `GET /staff`, `POST /staff`, `PATCH /staff/:id`, `POST /staff/:id/reset-password`
- `GET /gates`, `POST /gates`, `PATCH /gates/:id`
- `GET /devices`, `POST /devices`, `PATCH /devices/:id`
- `GET /promo-codes`, `POST /promo-codes`, `PATCH /promo-codes/:id`
- `GET /notifications`, `POST /notifications/:id/retry`, `POST /notifications/resend-booking/:bookingId`
- `GET /reports/export/:type` (`bookings` | `attendees` | `checkins` | `payments`)
- `GET /support`, `PATCH /support/:id`
- `GET /audit`
- `GET /system/health`, `GET /system/status`, `POST /system/reconcile-inventory`, `POST /system/recover-tickets`, `POST /system/emergency`
