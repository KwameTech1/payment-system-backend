# How to Use This Template

This guide walks you through everything from creating a new project from this template to having it live on Railway with a PostgreSQL database.

---

## Prerequisites

Before you start, make sure you have:

- Git installed
- Node.js >= 18 installed
- A GitHub account
- A Railway account ([railway.app](https://railway.app))

---

## Part 1 — Create a New Project from the Template

### Step 1 — Use the template on GitHub

1. Go to this repository on GitHub.
2. Click the green **"Use this template"** button (top right).
3. Select **"Create a new repository"**.
4. Fill in:
   - **Repository name** — your new project name (e.g. `user-api`)
   - **Visibility** — Public or Private
5. Click **"Create repository"**.

GitHub creates a fresh copy of the template under your account with no git history carried over.

### Step 2 — Clone your new repo locally

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_PROJECT_NAME.git
cd YOUR_PROJECT_NAME
```

---

## Part 2 — First-Time Project Setup

### Step 3 — Run the setup script

```bash
bash scripts/setup.sh
```

This will:
- Check your Node.js version
- Install all dependencies
- Copy `.env.example` to `.env`

### Step 4 — Replace all placeholders

Open each file below and replace the placeholder text:

| File | What to replace |
|------|-----------------|
| `README.md` | `PROJECT_NAME`, `YOUR_GITHUB_USERNAME`, description, overview |
| `package.json` | `"name": "PROJECT_NAME"`, `"author": "YOUR_NAME"` |
| `LICENSE` | `YOUR_NAME`, update the year if needed |
| `CHANGELOG.md` | Replace `YYYY-MM-DD` with today's date |

### Step 5 — Configure your local environment

Open `.env` and fill in your values:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DB_NAME
FRONTEND_URL=http://localhost:5173
```

> Only `PORT` and `NODE_ENV` are needed to start the server locally without a database. Add `DATABASE_URL` once your database is ready.

---

## Part 3 — Verify Everything Works Locally

### Step 6 — Start the dev server

```bash
npm run dev
```

You should see:

```
Server running on port 3000 [development]
```

### Step 7 — Hit the health endpoint

```bash
curl http://localhost:3000/health
# → {"status":"ok"}
```

### Step 8 — Run the test suite

```bash
npm test
```

All three tests should pass.

### Step 9 — Run the linter

```bash
npm run lint
```

No errors means you are ready to push.

---

## Part 4 — Push Your Initial Commit

```bash
git add .
git commit -m "chore: initialize project from backend-starter-template"
git push origin main
```

Pushing to `main` will trigger the CI workflow automatically. Check the **Actions** tab on GitHub to confirm it passes.

---

## Part 5 — Deploy to Railway

### Step 10 — Create a Railway project

1. Go to [railway.app/dashboard](https://railway.app/dashboard).
2. Click **New Project**.
3. Select **Deploy from GitHub repo**.
4. Authorize Railway to access GitHub if prompted.
5. Select your new repository.

Railway detects the Node.js project via Nixpacks and starts the first deployment automatically.

### Step 11 — Set environment variables in Railway

In Railway → your service → **Variables** tab, add:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Your deployed frontend URL |

> Do not set `PORT` or `DATABASE_URL` here — Railway manages both automatically.

### Step 12 — Verify the deploy

Once the deploy finishes, Railway shows a generated URL under your service.

```bash
curl https://YOUR_SERVICE.railway.app/health
# → {"status":"ok"}
```

If you see this response, your backend is live.

---

## Part 6 — Add Railway PostgreSQL

### Step 13 — Provision a PostgreSQL database

1. Inside your Railway project, click the **+** (New) button.
2. Select **Database** → **PostgreSQL**.
3. Railway provisions a database instance in the same project within seconds.

### Step 14 — Link DATABASE_URL to your backend

1. Click on your backend service in the Railway dashboard.
2. Go to the **Variables** tab.
3. Click **Add Reference**.
4. Select your PostgreSQL service.
5. Select the `DATABASE_URL` variable.

Railway will now inject `DATABASE_URL` into your backend environment on every deploy. You do not need to copy or paste the connection string into Railway manually.

### Step 15 — Get the connection string for local development

1. Click on your PostgreSQL service in Railway.
2. Go to the **Connect** tab.
3. Copy the **Connection URL**.
4. Paste it into your local `.env` file:

```env
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:PORT/railway
```

### Step 16 — Verify the database connection

Redeploy your service in Railway (or push a new commit), then:

```bash
curl https://YOUR_SERVICE.railway.app/health
# → {"status":"ok"}
```

Check your Railway deploy logs to confirm no database connection errors appear.

---

## Part 7 — Ongoing Development Workflow

Every time you add a new feature:

```bash
# 1. Create a branch
git checkout -b feat/your-feature-name

# 2. Write your code

# 3. Run checks
npm run lint
npm test

# 4. Commit
git commit -m "feat: describe what you added"

# 5. Push and open a pull request
git push origin feat/your-feature-name
```

When your PR merges into `main`, Railway deploys it automatically. No manual deploy step needed.

---

## Quick Reference Checklist

Use this when starting every new project from this template.

```
[ ] Created new repo from template on GitHub
[ ] Cloned repo locally
[ ] Ran: bash scripts/setup.sh
[ ] Replaced PROJECT_NAME in README.md and package.json
[ ] Replaced YOUR_NAME in LICENSE
[ ] Updated CHANGELOG.md date
[ ] Filled in .env with local values
[ ] Ran: npm run dev  →  server starts on port 3000
[ ] Ran: curl localhost:3000/health  →  {"status":"ok"}
[ ] Ran: npm test  →  all tests pass
[ ] Ran: npm run lint  →  no errors
[ ] Pushed initial commit to main
[ ] CI passes on GitHub Actions
[ ] Connected repo to Railway
[ ] Set NODE_ENV=production and FRONTEND_URL in Railway variables
[ ] Verified Railway deploy health check passes
[ ] Provisioned PostgreSQL in Railway
[ ] Linked DATABASE_URL reference to backend service
[ ] Added Railway DATABASE_URL to local .env
[ ] Verified deployed service responds to /health
```

---

## Troubleshooting

**CI fails on lint**
Run `npm run lint:fix` locally to auto-fix issues, then commit the result.

**Railway deploy fails immediately**
Check the build logs in Railway. The most common cause is a missing `start` script or a syntax error in `src/index.js`.

**Railway health check fails**
Make sure `GET /health` returns HTTP `200`. The route exists in `src/index.js` — verify you have not accidentally removed or renamed it.

**DATABASE_URL is undefined locally**
Make sure your `.env` file exists (not just `.env.example`) and that `DATABASE_URL` is filled in with a real connection string.

**Port already in use**
Change `PORT` in your `.env` to another value such as `3001`.
