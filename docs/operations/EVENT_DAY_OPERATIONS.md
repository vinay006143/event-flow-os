# Event Day Operations & Contingency Plan — Night of Devotion

## Primary Strategy: Online Gate Verification
For the pilot deployment at Exhibition Grounds, Rajahmundry, **online QR validation is mandatory** as the primary check-in strategy to guarantee real-time cross-gate duplicate prevention. Offline check-in is intentionally not treated as equivalent to server validation.

## Pre-Event Checklist (T-24 Hours)
1. Verify `/api/v1/system/health` returns `database: "connected"`.
2. Run **Reconcile Inventory** in `/admin/system-settings` and verify zero failed ticket generations.
3. Verify all entry gates (`GATE-A`, `GATE-B`) and scanner devices (`SCAN-GATEA-01`, etc.) are `ACTIVE`.
4. Confirm each Staff operator can log in at `/staff/login`, see only their assigned gates, and send a successful device heartbeat.
5. Take a pre-event MongoDB backup (`infrastructure/scripts/backup-mongo.sh`).

## Hardware & Connectivity Contingency Plan
- **Backup Phones:** Keep at least 2 pre-charged standby Android smartphones with `/staff/scanner` bookmarked and registered device codes ready.
- **Backup Internet:** Equip each gate lead with dual-SIM 4G/5G mobile hotspots in addition to venue Wi-Fi.
- **Charging Equipment:** Provide 20,000mAh power banks and charging cables at every gate desk.
- **Manual Lookup Procedure:** If a scanner camera fails or an attendee's screen is cracked, use `/staff/manual-lookup` to search by `Ticket ID`, `Booking Reference`, or `Name` and check in at the assigned gate.
- **Lost Pass Recovery:** Direct attendees to `/my-tickets` for OTP self-retrieval, or have Admin resend passes from `/admin/bookings`.
- **Emergency Pause / Broadcast:** Use `/admin/emergency` to pause sales, disable compromised devices/staff, or publish urgent venue announcements immediately.
