# Deployment Guide

This document covers how to deploy this backend service to [Railway](https://railway.app) and connect it to a Railway PostgreSQL database.

---

## Prerequisites

- A [Railway account](https://railway.app)
- This repository pushed to GitHub
- Node.js >= 18

---

## Deploying to Railway

### Step 1 — Create a New Railway Project

1. Go to [railway.app/dashboard](https://railway.app/dashboard).
2. Click **New Project**.
3. Select **Deploy from GitHub repo**.
4. Authorize Railway to access your GitHub account if prompted.
5. Select this repository.

Railway will auto-detect the Node.js runtime via Nixpacks and begin the first deployment.

---

### Step 2 — Set Environment Variables

In your Railway project → select your service → click **Variables**.

Set the following:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Your deployed frontend URL (e.g. `https://yourapp.com`) |

> `PORT` and `DATABASE_URL` are managed by Railway automatically. Do not set them manually.

---

### Step 3 — Connect a Custom Domain (optional)

1. In Railway → your service → **Settings** → **Networking**.
2. Click **Generate Domain** for a free `.railway.app` subdomain, or add your own custom domain.

---

### Step 4 — Enable Auto-Deploy on Push

Railway auto-deploys on every push to the connected branch (default: `main`) once connected via GitHub.

No GitHub Actions deployment workflow is needed — Railway handles this natively.

---

## Provisioning Railway PostgreSQL

### Step 1 — Add PostgreSQL to your project

1. In your Railway project, click **New** (the + button).
2. Select **Database** → **PostgreSQL**.
3. Railway provisions a PostgreSQL instance in the same project.

### Step 2 — Link the database to your backend service

1. In your backend service → **Variables** → click **Add Reference**.
2. Select the PostgreSQL service and reference `DATABASE_URL`.

Railway will now inject `DATABASE_URL` into your backend environment automatically on every deploy.

### Step 3 — Get the connection string for local development

1. Click on your PostgreSQL service in Railway.
2. Go to the **Connect** tab.
3. Copy the **Connection URL** (it looks like `postgresql://postgres:PASSWORD@HOST:PORT/railway`).
4. Paste it into your local `.env` file:
   ```
   DATABASE_URL=postgresql://postgres:PASSWORD@HOST:PORT/railway
   ```

---

## Health Check

The `/health` endpoint is used by Railway to verify the service started successfully.

```
GET /health
→ 200 OK
→ { "status": "ok" }
```

This is configured in `railway.json`:

```json
{
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30
  }
}
```

If the health check fails, Railway will mark the deploy as failed and roll back automatically.

---

## Verifying a Successful Deploy

After deploying:

```bash
# Replace with your actual Railway service URL
curl https://YOUR_RAILWAY_SERVICE_URL/health

# Expected output
{"status":"ok"}
```

If you get a 502 or timeout, check:
1. Railway build logs for errors.
2. That `DATABASE_URL` is correctly linked.
3. That your `start` script works locally: `npm start`.

---

## Rolling Back

In Railway → your service → **Deployments** tab → click on any previous deployment → click **Redeploy**.

---

## Environment Variable Reference

See `.env.example` in the project root for the full list of supported environment variables with descriptions.
