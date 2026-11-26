# EventFlow OS — Deployment Guide (Render Backend + Vercel Frontend)

## Architecture Overview
- **Database**: MongoDB Atlas (`eventflow_os`)
- **Backend API**: **Render** Web Service (`server/` + `@eventflow/shared`)
- **Frontend SPA + API Proxy**: **Vercel** (`client/dist` + `vercel.json` `/api/*` rewrite)

Using `vercel.json`'s `/api/:path*` rewrite keeps browser API requests on the same origin (`*.vercel.app`), so non-expiring `HttpOnly` auth cookies work cleanly across Chrome, Safari, and mobile scanners without third-party cookie restrictions.

---

## Step 1: Prepare MongoDB Atlas Network Access
1. In **MongoDB Atlas → Network Access**, add IP access rule:
   - `0.0.0.0/0` (Allow Access from Anywhere — required because Render outbound IPs change dynamically unless on a static-IP paid add-on), and secure your DB user with a strong password.

---

## Step 2: Deploy Backend API on Render
1. Push your repository to **GitHub / GitLab**.
2. In **Render Dashboard → New → Web Service**, connect the repo (or use `render.yaml` via **New → Blueprint**).
3. Configure service settings (leave **Root Directory** blank `.` so npm workspaces resolve `@eventflow/shared`):
   - **Runtime**: `Node` (Node 20+)
   - **Build Command**: `npm install --include=dev && npm run build:shared && npm run build:server`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/v1/system/health`
4. Add **Environment Variables** in Render:
   - `NODE_ENV=production`
   - `COOKIE_SECURE=true`
   - `USE_IN_MEMORY_MONGO=false`
   - `MONGODB_URI=<your MongoDB Atlas SRV URI>`
   - `MONGODB_DB_NAME=eventflow_os`
   - `STORAGE_PROVIDER_MODE=mongodb`
   - `JWT_ACCESS_SECRET=<random 48+ char string>`
   - `JWT_REFRESH_SECRET=<random 48+ char string>`
   - `QR_SIGNING_SECRET=<random 48+ char string>`
   - `FRONTEND_URL=https://<your-project>.vercel.app`
   - `CORS_ORIGINS=https://<your-project>.vercel.app`
   - `ADMIN_EMAIL=admin@eventflowos.in`
   - `ADMIN_PASSWORD=<strong admin password>`
   - `STAFF_EMAIL=staff@eventflowos.in`
   - `STAFF_PASSWORD=<strong staff password>`
   - *(Optional live payments/messaging)*: `PAYMENT_PROVIDER_MODE`, `PHONEPE_*`, `WHATSAPP_PROVIDER_MODE=meta_cloud`, `WHATSAPP_*`, `EMAIL_PROVIDER_MODE=smtp`, `SMTP_*`, `EMAIL_FROM`
5. Deploy and verify `https://<your-render-service>.onrender.com/api/v1/system/health` returns `200 OK`.

---

## Step 3: Update `vercel.json` & Deploy Frontend on Vercel
1. Open `vercel.json` at the repo root and replace `https://eventflow-os-api.onrender.com/api/:path*` with your real Render service URL:
   ```json
   {
     "source": "/api/:path*",
     "destination": "https://<your-render-service>.onrender.com/api/:path*"
   }
   ```
   Commit & push that URL update.
2. In **Vercel Dashboard → Add New → Project**, import the GitHub repo:
   - **Framework Preset**: `Other` (or Vite — `vercel.json` overrides build & output)
   - **Root Directory**: `.` (repo root, so workspaces build `@eventflow/shared` + `client`)
   - **Install Command**: `npm install`
   - **Build Command**: `npm run build:shared && npm run build:client`
   - **Output Directory**: `client/dist`
3. Add **Environment Variable** in Vercel:
   - `VITE_API_BASE_URL=/api/v1`
4. Click **Deploy**.
5. After Vercel assigns your live URL (or custom domain), ensure `FRONTEND_URL` and `CORS_ORIGINS` in **Render** match it exactly (no trailing slash), then trigger a quick redeploy/restart in Render if changed.

---

## Step 4: Post-Deploy Verification Checklist
1. Visit `https://<your-project>.vercel.app/` and confirm landing page + images load.
2. Refresh `https://<your-project>.vercel.app/admin/login` (confirms SPA rewrite prevents 404).
3. Sign in at `/admin/login` with `admin@eventflowos.in`, refresh `/admin/dashboard` (confirms `HttpOnly` cookie session persists).
4. Open **Event Day Control** and check live stats + Checkout toggle.
5. Open `/staff/login` on HTTPS (camera QR scanning requires HTTPS in mobile browsers, which Vercel provides automatically).

> **Free-Tier Cold Start Note**: Render's Free Web Service spins down after 15 minutes of inactivity (~30–50s wake-up on the first request). For active ticket launches or event day check-in, upgrade Render to **Starter ($7/mo)** or higher so the API stays warm continuously.
