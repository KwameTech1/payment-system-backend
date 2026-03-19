'use strict';

const express = require('express');
const webhookService = require('../services/webhookService');
const prisma = require('../db/client');

const router = express.Router();

// IMPORTANT: Use express.raw() here — NOT express.json()
// The raw body buffer is required for HMAC-SHA256 signature verification.
// If express.json() runs first, the body is parsed and HMAC will not verify correctly.
router.use(express.raw({ type: 'application/json' }));

// POST /webhooks/fincra
router.post('/fincra', async (req, res, next) => {
  const rawBody = req.body;
  const signature =
    req.headers['x-fincra-signature'] ||
    req.headers['x-webhook-signature'] ||
    req.headers['webhook-secret'] ||
    null;

  // 1. Verify signature — reject early if invalid
  try {
    webhookService.verifySignature(rawBody, signature);
  } catch (err) {
    return res.status(err.status || 403).json({ error: err.message });
  }

  // 2. Parse payload
  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (_err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  // 3. Store raw webhook event BEFORE processing
  let webhookEvent;
  try {
    webhookEvent = await prisma.webhookEvent.create({
      data: {
        rawPayload: payload,
        signature: signature || null,
        isVerified: true,
        source: 'fincra',
      },
    });
  } catch (err) {
    return next(err);
  }

  // 4. Respond 200 immediately — Fincra expects fast acknowledgment
  res.status(200).json({ received: true });

  // 5. Process asynchronously (do not await)
  webhookService.processWebhookEvent(webhookEvent.id).catch((err) => {
    console.error('[webhooks] Async processing error:', err.message);
  });

  return undefined;
});

module.exports = router;
