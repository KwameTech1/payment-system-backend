'use strict';

const { v4: uuidv4 } = require('uuid');
const prisma = require('../db/client');
const fincraService = require('./fincraService');
const { writeAuditLog } = require('./auditService');

const VALID_STATUS_TRANSITIONS = {
  draft: ['queued'],
  queued: ['submitted', 'failed'],
  submitted: ['pending', 'successful', 'failed'],
  pending: ['successful', 'failed'],
  successful: [],
  failed: [],
};

const getPayoutById = async (id, includeRecipient = false) => {
  const payout = await prisma.payoutRequest.findUnique({
    where: { id },
    include: includeRecipient ? { recipient: true } : undefined,
  });
  if (!payout) {
    const err = new Error('Payout not found');
    err.status = 404;
    throw err;
  }
  return payout;
};

const listPayouts = async (filters = {}) => {
  const where = {};
  if (filters.status) { where.status = filters.status; }
  return prisma.payoutRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { recipient: { select: { id: true, fullName: true, phoneNumber: true, mobileOperator: true } } },
  });
};

const applyStatusTransition = async (payoutId, newStatus, extra = {}) => {
  const payout = await getPayoutById(payoutId);
  const allowed = VALID_STATUS_TRANSITIONS[payout.status] || [];

  if (!allowed.includes(newStatus)) {
    const err = new Error(
      `Cannot transition payout from '${payout.status}' to '${newStatus}'`
    );
    err.status = 400;
    throw err;
  }

  return prisma.payoutRequest.update({
    where: { id: payoutId },
    data: { status: newStatus, ...extra },
  });
};

const createPayout = async (data, userId, req) => {
  // 1. Verify recipient exists and is approved
  const recipient = await prisma.recipient.findUnique({ where: { id: data.recipientId } });
  if (!recipient) {
    const err = new Error('Recipient not found');
    err.status = 404;
    throw err;
  }
  if (recipient.status !== 'approved') {
    const err = new Error('Recipient must be approved before receiving a payout');
    err.status = 400;
    throw err;
  }

  // 2. Generate unique client reference — saved to DB before calling Fincra (idempotency)
  const clientReference = uuidv4();

  // 3. Insert row with status 'queued'
  const payout = await prisma.payoutRequest.create({
    data: {
      clientReference,
      recipientId: recipient.id,
      initiatedById: userId,
      amount: data.amount,
      currency: data.currency || recipient.currency,
      reason: data.reason || null,
      status: 'queued',
    },
  });

  await writeAuditLog({
    userId,
    action: 'payout.created',
    entityType: 'payout_request',
    entityId: payout.id,
    newValues: { clientReference, amount: payout.amount, currency: payout.currency, status: 'queued' },
    req,
  });

  // 4. Submit to Fincra
  try {
    const fincraResponse = await fincraService.submitPayout(payout, recipient);

    const updated = await prisma.payoutRequest.update({
      where: { id: payout.id },
      data: {
        status: 'submitted',
        fincraReference: fincraResponse.data?.reference || null,
        fincraStatus: fincraResponse.data?.status || null,
        fincraResponse,
        submittedAt: new Date(),
      },
    });

    await writeAuditLog({
      userId,
      action: 'payout.submitted',
      entityType: 'payout_request',
      entityId: payout.id,
      newValues: { status: 'submitted', fincraReference: updated.fincraReference },
      req,
    });

    return updated;
  } catch (fincraErr) {
    const updated = await prisma.payoutRequest.update({
      where: { id: payout.id },
      data: {
        status: 'failed',
        failureReason: fincraErr.message,
      },
    });

    await writeAuditLog({
      userId,
      action: 'payout.submission_failed',
      entityType: 'payout_request',
      entityId: payout.id,
      newValues: { status: 'failed', failureReason: fincraErr.message },
      req,
    });

    return updated;
  }
};

const retryPayout = async (payoutId, userId, req) => {
  const original = await getPayoutById(payoutId, true);

  if (original.status !== 'failed') {
    const err = new Error('Only failed payouts can be retried');
    err.status = 400;
    throw err;
  }

  return createPayout(
    {
      recipientId: original.recipientId,
      amount: original.amount,
      currency: original.currency,
      reason: original.reason,
      _parentPayoutId: original.id,
      _retryCount: original.retryCount + 1,
    },
    userId,
    req
  );
};

const syncPayoutStatus = async (payoutId, userId, req) => {
  const payout = await getPayoutById(payoutId);

  if (!['submitted', 'pending'].includes(payout.status)) {
    const err = new Error('Status sync is only available for submitted or pending payouts');
    err.status = 400;
    throw err;
  }

  const fincraResult = await fincraService.getPayoutStatus(payout.clientReference);
  const fincraStatus = fincraResult.data?.status;

  const statusMap = { successful: 'successful', failed: 'failed', pending: 'pending' };
  const internalStatus = statusMap[fincraStatus];

  if (internalStatus && internalStatus !== payout.status) {
    const updated = await prisma.payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: internalStatus,
        fincraStatus,
        settledAt: internalStatus === 'successful' ? new Date() : undefined,
      },
    });

    await writeAuditLog({
      userId,
      action: 'payout.status_synced',
      entityType: 'payout_request',
      entityId: payoutId,
      oldValues: { status: payout.status },
      newValues: { status: internalStatus },
      req,
    });

    return updated;
  }

  return payout;
};

module.exports = { listPayouts, getPayoutById, createPayout, retryPayout, syncPayoutStatus, applyStatusTransition };
