# payment-system-backend

> Express.js API for the Payout Operations Platform — JWT auth, Prisma/PostgreSQL, Fincra integration.

[![CI](https://github.com/kwametech/payment-system-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/kwametech/payment-system-backend/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Folder Structure](#folder-structure)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Deployment (Railway)](#deployment-railway)
- [API Reference](#api-reference)
- [License](#license)

---

## Overview

Private backend service for the Payout Operations Platform — a controlled internal tool used by 2 operators to:

1. Collect money via Fincra pay-in links
2. Disburse payouts to approved mobile money recipients across multiple countries

This is **not** a public-facing fintech app. There is no public signup, no wallet, and no batch payout in MVP. All recipients must be manually approved before receiving a payout.

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- PostgreSQL (local or Railway)
- Git

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/kwametech/payment-system-backend.git
cd payment-system-backend

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Fill in .env — see Environment Variables section

# 4. Generate Prisma client
npm run db:generate

# 5. Run migrations
npm run db:migrate

# 6. Seed the two internal users
npm run db:seed

# 7. Start the development server
npm run dev
```

Server starts at `http://localhost:3000`.

---

## Folder Structure

```
payment-system-backend/
├── prisma/
│   ├── schema.prisma         # All 6 Prisma models
│   └── seed.js               # Seeds 2 internal users (upsert, safe to re-run)
├── src/
│   ├── app.js                # Express factory (imported by tests)
│   ├── index.js              # Server entry point
│   ├── db/
│   │   └── client.js         # PrismaClient singleton
│   ├── middleware/
│   │   ├── auth.js           # JWT verify, attaches req.user
│   │   ├── errorHandler.js   # Centralised error handler
│   │   └── validate.js       # express-validator error wrapper
│   ├── routes/
│   │   ├── auth.js           # POST /auth/login
│   │   ├── recipients.js     # GET/POST/PATCH /recipients
│   │   ├── payouts.js        # GET/POST /payouts + retry + status-sync
│   │   └── webhooks.js       # POST /webhooks/fincra (express.raw!)
│   ├── services/
│   │   ├── auditService.js
│   │   ├── fincraService.js  # Stub mode — real calls commented with TODO
│   │   ├── payoutService.js
│   │   ├── recipientService.js
│   │   └── webhookService.js
│   └── workers/
│       └── reconciliation.js # Cron: every 5 min, syncs stuck payouts
├── tests/
│   └── index.test.js         # 3 tests: health, root, 404
├── .env.example
├── railway.json
└── package.json
```

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Start with nodemon (hot reload) |
| Start | `npm start` | Production start |
| Test | `npm test` | Run Jest test suite |
| Lint | `npm run lint` | ESLint (zero warnings) |
| Format | `npm run format` | Prettier write |
| DB migrate | `npm run db:migrate` | `prisma migrate dev` (local, creates migration files) |
| DB deploy | `npm run db:deploy` | `prisma migrate deploy` (production/Railway) |
| DB seed | `npm run db:seed` | `prisma db seed` (inserts 2 internal users) |
| DB generate | `npm run db:generate` | `prisma generate` (regenerate client) |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values.

| Variable | Description | Local example |
|----------|-------------|---------------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Runtime environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/payout_db` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3001` |
| `JWT_SECRET` | Secret for signing JWTs | any long random string |
| `JWT_EXPIRES_IN` | JWT expiry | `8h` |
| `FINCRA_API_BASE_URL` | Fincra API base URL | `https://sandboxapi.fincra.com` |
| `FINCRA_API_KEY` | Fincra API key | *(pending)* |
| `FINCRA_BUSINESS_ID` | Fincra business ID | *(pending)* |
| `FINCRA_WEBHOOK_SECRET` | Fincra webhook HMAC secret | *(pending)* |

> **Fincra stub mode:** `fincraService.js` returns mock responses until real credentials are set. The real API call code is written and commented with `// TODO: uncomment when credentials available`.

---

## Database Setup

### Local PostgreSQL

```bash
# Create database
createdb payout_db

# Add to .env
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/payout_db

# Run migrations and seed
npm run db:migrate
npm run db:seed
```

Seeded credentials:
- `admin@payout.internal` / `Admin1234!`
- `operator@payout.internal` / `Operator1234!`

### Railway PostgreSQL

See [`docs/deployment.md`](./docs/deployment.md) for full setup.

---

## Deployment (Railway)

Railway handles deployment via GitHub integration. See [`docs/deployment.md`](./docs/deployment.md) for:

- Provisioning PostgreSQL on Railway
- Setting environment variables
- Running `prisma migrate deploy` on deploy
- Health check configuration

---

## API Reference

All routes except `POST /auth/login` and `POST /webhooks/fincra` require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Email + password → JWT |

### Recipients
| Method | Path | Description |
|--------|------|-------------|
| GET | `/recipients` | List all (supports `?status=`) |
| POST | `/recipients` | Create new recipient |
| PATCH | `/recipients/:id` | Update status or notes |

### Payouts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/payouts` | List all (supports `?status=`) |
| GET | `/payouts/:id` | Single payout with recipient |
| POST | `/payouts` | Create + submit payout |
| POST | `/payouts/:id/retry` | Retry a failed payout |
| GET | `/payouts/:id/status-sync` | Force Fincra status check |

### Webhooks
| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhooks/fincra` | Fincra webhook receiver (HMAC verified) |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Returns `{"status":"ok"}` |

---

## License

[MIT](./LICENSE) © KwameTech
