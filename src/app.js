'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const authRouter = require('./routes/auth');
const recipientsRouter = require('./routes/recipients');
const payoutsRouter = require('./routes/payouts');
const webhooksRouter = require('./routes/webhooks');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ── Body parsing (applied globally, except webhooks router overrides with raw) ─
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ── Root ──────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.status(200).json({ message: 'API is running' });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/recipients', recipientsRouter);
app.use('/payouts', payoutsRouter);
app.use('/webhooks', webhooksRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Background workers (not in test mode) ────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  const reconciliation = require('./workers/reconciliation');
  reconciliation.start();
}

module.exports = app;
