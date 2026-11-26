# Deployment Guide — Linux VPS + Docker Compose + Nginx + HTTPS

## Prerequisites
- Ubuntu 22.04+ / Debian 12+ Linux VPS
- Docker Engine & Docker Compose plugin (`docker compose`)
- Domain DNS A record pointing to the VPS IP
- TLS certificates (Let's Encrypt / Certbot)

## Setup Steps

1. Clone the repository and configure environment:
   ```bash
   cp .env.example .env
   ```
2. Set production secrets in `.env`:
   - `NODE_ENV=production`
   - Strong 64-char random values for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `QR_SIGNING_SECRET`
   - `COOKIE_SECURE=true`
   - Real `ADMIN_EMAIL` & `ADMIN_PASSWORD`
   - Production PhonePe (`PAYMENT_PROVIDER_MODE=phonepe_prod`), WhatsApp (`WHATSAPP_PROVIDER_MODE=meta_cloud`), Email (`EMAIL_PROVIDER_MODE=smtp`), and S3 (`STORAGE_PROVIDER_MODE=s3`) credentials.
3. Place SSL certificates in `infrastructure/nginx/certs/fullchain.pem` and `privkey.pem` and enable the port 443 server block in `infrastructure/nginx/default.conf`.
4. Launch the stack:
   ```bash
   bash infrastructure/scripts/deploy.sh
   ```

## Backups & Restore
- Create compressed MongoDB backup:
  ```bash
  bash infrastructure/scripts/backup-mongo.sh ./backups
  ```
- Restore from backup:
  ```bash
  bash infrastructure/scripts/restore-mongo.sh ./backups/eventflow_YYYYMMDD_HHMMSS.archive.gz
  ```
