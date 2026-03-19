# Local Development Guide

This guide walks through running the Payout Operations backend locally from scratch.

---

## Prerequisites

- Node.js >= 18
- PostgreSQL running locally (or a Railway connection string)
- Git

---

## Step 1 — Install Dependencies

```bash
npm install
```

---

## Step 2 — Configure Environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/payout_db
FRONTEND_URL=http://localhost:3001
JWT_SECRET=any-long-random-string-change-in-production
JWT_EXPIRES_IN=8h

# Fincra — leave as-is for now (stub mode active)
FINCRA_API_BASE_URL=https://sandboxapi.fincra.com
FINCRA_API_KEY=stub
FINCRA_BUSINESS_ID=stub
FINCRA_WEBHOOK_SECRET=stub
```

> `FINCRA_API_KEY`, `FINCRA_BUSINESS_ID`, and `FINCRA_WEBHOOK_SECRET` can be any string while `fincraService.js` is in stub mode. The real API calls are commented out with `// TODO: uncomment when credentials available`.

---

## Step 3 — Create the Local Database

```bash
createdb payout_db
```

Or use an existing PostgreSQL instance — just update `DATABASE_URL` accordingly.

---

## Step 4 — Run Migrations

```bash
npm run db:migrate
```

This runs `prisma migrate dev`, creates the migration files, and applies all 6 tables to the database.

---

## Step 5 — Seed Internal Users

```bash
npm run db:seed
```

Creates two internal users (safe to re-run — uses upsert):

| Email | Password |
|-------|----------|
| `admin@payout.internal` | `Admin1234!` |
| `operator@payout.internal` | `Operator1234!` |

---

## Step 6 — Start the Server

```bash
npm run dev
```

```
Server running on port 3000 [development]
```

---

## Step 7 — Verify

```bash
# Health check
curl http://localhost:3000/health
# → {"status":"ok"}

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@payout.internal","password":"Admin1234!"}'
# → {"token":"eyJ...","user":{"id":"...","email":"admin@payout.internal","fullName":"Admin"}}
```

---

## Step 8 — Run Tests

```bash
npm test
# 3 tests: health, root 404, unknown route 404
```

---

## Step 9 — Run the Linter

```bash
npm run lint
# Zero warnings = ready to commit
```

---

## Activating Real Fincra Calls

When you have Fincra credentials:

1. Set real values in `.env`: `FINCRA_API_KEY`, `FINCRA_BUSINESS_ID`, `FINCRA_WEBHOOK_SECRET`
2. Open `src/services/fincraService.js`
3. For each method (`submitPayout`, `getPayoutStatus`, `getBusinessBalance`):
   - Uncomment the `// TODO: uncomment when credentials available` block
   - Remove the `// STUB:` mock return below it

That's all — no other changes needed.

---

## Reconciliation Worker

The cron worker (`src/workers/reconciliation.js`) runs every 5 minutes and calls Fincra to sync status for any payouts stuck in `submitted` or `pending` for more than 10 minutes.

It is automatically disabled when `NODE_ENV=test` so it does not interfere with Jest.

---

## Webhook Testing

To simulate a Fincra webhook locally:

```bash
curl -X POST http://localhost:3000/webhooks/fincra \
  -H "Content-Type: application/json" \
  -H "x-fincra-signature: <HMAC-SHA256 of body with your FINCRA_WEBHOOK_SECRET>" \
  -d '{"event":"payout.successful","data":{"customerReference":"<client_reference>","status":"successful"}}'
```

The webhook route uses `express.raw()` (not `express.json()`) — the raw body is required for HMAC verification.
