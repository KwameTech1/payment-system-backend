'use strict';

const crypto = require('crypto');
const prisma = require('../db/client');
const { writeAuditLog } = require('./auditService');

/**
 * Verify Fincra webhook signature using HMAC-SHA256.
 * IMPORTANT: rawBody must be the raw Buffer — never re-serialise JSON.
 *
 * @param {Buffer} rawBody
 * @param {string} signature  Value of the webhook signature header
 * @throws {Error} 403 if signature is invalid or missing
 */
const verifySignature = (rawBody, signature) => {
  if (!signature) {
    const err = new Error('Missing webhook signature');
    err.status = 403;
    throw err;
  }

  const secret = process.env.FINCRA_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[webhookService] FINCRA_WEBHOOK_SECRET not set — skipping signature verification');
    return;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    const err = new Error('Invalid webhook signature');
    err.status = 403;
    throw err;
  }
};

// Map Fincra status strings to our internal statuses
const FINCRA_STATUS_MAP = {
  successful: 'successful',
  success: 'successful',
  failed: 'failed',
  failure: 'failed',
  pending: 'pending',
  processing: 'pending',
};

/**
 * Apply a Fincra status update to a payout record.
 * Called from both processWebhookEvent and the reconciliation worker.
 */
const applyWebhookStatusUpdate = async (clientReference, fincraStatus, _rawPayload) => {
  const payout = await prisma.payoutRequest.findUnique({
    where: { clientReference },
  });

  if (!payout) {
    console.warn('[webhookService] No payout found for clientReference:', clientReference);
    return null;
  }

  const internalStatus = FINCRA_STATUS_MAP[fincraStatus?.toLowerCase()];
  if (!internalStatus) {
    console.warn('[webhookService] Unknown Fincra status:', fincraStatus);
    return null;
  }

  if (payout.status === internalStatus) {
    return payout;
  }

  // Only update if it's a valid forward transition
  const terminalStatuses = ['successful', 'failed'];
  if (terminalStatuses.includes(payout.status)) {
    return payout;
  }

  const updated = await prisma.payoutRequest.update({
    where: { id: payout.id },
    data: {
      status: internalStatus,
      fincraStatus,
      settledAt: internalStatus === 'successful' ? new Date() : undefined,
    },
  });

  await writeAuditLog({
    userId: null,
    action: 'payout.webhook_received',
    entityType: 'payout_request',
    entityId: payout.id,
    oldValues: { status: payout.status },
    newValues: { status: internalStatus, fincraStatus },
  });

  return updated;
};

/**
 * Process a stored webhook event.
 * Called asynchronously after the event is stored and 200 is returned to Fincra.
 *
 * @param {string} webhookEventId
 */
const processWebhookEvent = async (webhookEventId) => {
  const event = await prisma.webhookEvent.findUnique({ where: { id: webhookEventId } });
  if (!event || event.processed) { return; }

  try {
    const payload = event.rawPayload;
    const eventType = payload.event || payload.type || null;
    const data = payload.data || payload;
    const fincraStatus = data.status;
    const clientReference = data.customerReference || data.reference;

    // Handle disbursement (payout) events
    if (eventType && eventType.toLowerCase().includes('disbursement')) {
      if (clientReference) {
        await applyWebhookStatusUpdate(clientReference, fincraStatus, payload);
      }
    }

    // Handle pay-in (collection) events
    if (eventType && (eventType.toLowerCase().includes('collection') || eventType.toLowerCase().includes('payin'))) {
      await prisma.payinTransaction.upsert({
        where: { fincraReference: data.reference || `unknown-${webhookEventId}` },
        update: { status: fincraStatus || 'unknown', fincraRawPayload: payload },
        create: {
          fincraReference: data.reference || `unknown-${webhookEventId}`,
          customerName: data.customer?.name || null,
          customerEmail: data.customer?.email || null,
          amount: data.amount || 0,
          currency: data.currency || 'UNKNOWN',
          status: fincraStatus || 'unknown',
          fincraRawPayload: payload,
          receivedAt: new Date(),
        },
      });
    }

    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { processed: true, processedAt: new Date(), eventType },
    });
  } catch (err) {
    console.error('[webhookService] Failed to process webhook event:', webhookEventId, err.message);
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { processingError: err.message },
    });
  }
};

module.exports = { verifySignature, processWebhookEvent, applyWebhookStatusUpdate };
