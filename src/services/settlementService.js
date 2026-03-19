'use strict';

const prisma = require('../db/client');
const fincraService = require('./fincraService');
const { writeAuditLog } = require('./auditService');

/**
 * Automatically settle a pay-in to the client's mobile money account.
 * Creates Settlement + LedgerEntries + PayoutRequest, then submits to Fincra.
 *
 * @param {string} payinTransactionId
 */
const autoSettle = async (payinTransactionId) => {
  const payin = await prisma.payinTransaction.findUnique({
    where: { id: payinTransactionId },
    include: { client: true },
  });

  if (!payin || !payin.client) {
    throw new Error(`PayinTransaction ${payinTransactionId} not attributed to a client`);
  }

  // Prevent double-settlement: check if settlement already exists
  const existingSettlement = await prisma.settlement.findUnique({ where: { payinId: payinTransactionId } });
  if (existingSettlement) {
    console.warn(`[settlementService] Settlement already exists for payin ${payinTransactionId}`);
    return existingSettlement;
  }

  const client = payin.client;
  const grossAmount = Number(payin.amount);
  const feeRate = Number(client.feeRate);
  const feeAmount = Number((grossAmount * feeRate).toFixed(2));
  const netAmount = Number((grossAmount - feeAmount).toFixed(2));

  // Create settlement record in queued state
  const settlement = await prisma.settlement.create({
    data: {
      clientId: client.id,
      payinId: payinTransactionId,
      grossAmount,
      feeAmount,
      netAmount,
      currency: payin.currency,
      status: 'queued',
    },
  });

  // Write payin + fee ledger entries
  await prisma.ledgerEntry.createMany({
    data: [
      {
        clientId: client.id,
        type: 'payin',
        amount: grossAmount,
        currency: payin.currency,
        reference: payinTransactionId,
        description: `Pay-in received: ${payin.fincraReference || payinTransactionId}`,
      },
      {
        clientId: client.id,
        type: 'fee',
        amount: feeAmount,
        currency: payin.currency,
        reference: settlement.id,
        description: `Fee (${(feeRate * 100).toFixed(1)}%) on payin ${payin.fincraReference || payinTransactionId}`,
      },
    ],
  });

  // Update payin with fee/net amounts
  await prisma.payinTransaction.update({
    where: { id: payinTransactionId },
    data: { feeAmount, netAmount },
  });

  // Submit payout to Fincra
  try {
    const { v4: uuidv4 } = require('uuid');
    const clientReference = uuidv4();

    // Build a synthetic recipient object from client mobile money details
    const recipientInfo = {
      fullName: client.businessName,
      phoneNumber: client.mobileNumber,
      mobileOperator: client.mobileOperator,
      countryCode: client.countryCode,
      currency: client.currency,
    };

    const payoutRecord = { clientReference, amount: netAmount, currency: payin.currency, reason: `Settlement for payin ${payin.fincraReference || payinTransactionId}` };
    const fincraResult = await fincraService.submitPayout(payoutRecord, recipientInfo);

    // Create the payout request row
    const payoutRequest = await prisma.payoutRequest.create({
      data: {
        clientReference,
        fincraReference: fincraResult.data?.reference || null,
        recipientId: null, // settlement payouts are not linked to a Recipient row
        initiatedById: null,
        amount: netAmount,
        currency: payin.currency,
        reason: payoutRecord.reason,
        status: 'submitted',
        fincraResponse: fincraResult,
        submittedAt: new Date(),
        settlement: { connect: { id: settlement.id } },
      },
    });

    // Update settlement to submitted
    await prisma.settlement.update({
      where: { id: settlement.id },
      data: { status: 'submitted', payoutRequestId: payoutRequest.id },
    });

    // Write settlement ledger entry
    await prisma.ledgerEntry.create({
      data: {
        clientId: client.id,
        type: 'settlement',
        amount: netAmount,
        currency: payin.currency,
        reference: settlement.id,
        description: `Settlement payout submitted: ${clientReference}`,
      },
    });

    await writeAuditLog({
      userId: null,
      action: 'settlement.submitted',
      entityType: 'settlement',
      entityId: settlement.id,
      newValues: { grossAmount, feeAmount, netAmount, payoutRequestId: payoutRequest.id },
    });

    return await prisma.settlement.findUnique({ where: { id: settlement.id } });
  } catch (err) {
    console.error(`[settlementService] Failed to submit payout for settlement ${settlement.id}:`, err.message);
    await prisma.settlement.update({
      where: { id: settlement.id },
      data: { status: 'failed', failureReason: err.message },
    });
    return await prisma.settlement.findUnique({ where: { id: settlement.id } });
  }
};

/**
 * Retry a failed settlement — creates a new PayoutRequest and resubmits.
 *
 * @param {string} settlementId
 */
const retrySettlement = async (settlementId) => {
  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    include: { client: true, payin: true },
  });

  if (!settlement) {
    const err = new Error('Settlement not found');
    err.status = 404;
    throw err;
  }
  if (settlement.status !== 'failed') {
    const err = new Error(`Cannot retry settlement with status: ${settlement.status}`);
    err.status = 400;
    throw err;
  }

  const { v4: uuidv4 } = require('uuid');
  const clientReference = uuidv4();
  const client = settlement.client;

  const recipientInfo = {
    fullName: client.businessName,
    phoneNumber: client.mobileNumber,
    mobileOperator: client.mobileOperator,
    countryCode: client.countryCode,
    currency: client.currency,
  };

  const payoutRecord = {
    clientReference,
    amount: Number(settlement.netAmount),
    currency: settlement.currency,
    reason: `Retry settlement ${settlementId}`,
  };

  const fincraResult = await fincraService.submitPayout(payoutRecord, recipientInfo);

  const payoutRequest = await prisma.payoutRequest.create({
    data: {
      clientReference,
      fincraReference: fincraResult.data?.reference || null,
      recipientId: null,
      initiatedById: null,
      amount: Number(settlement.netAmount),
      currency: settlement.currency,
      reason: payoutRecord.reason,
      status: 'submitted',
      fincraResponse: fincraResult,
      submittedAt: new Date(),
      settlement: { connect: { id: settlementId } },
    },
  });

  await prisma.settlement.update({
    where: { id: settlementId },
    data: { status: 'submitted', payoutRequestId: payoutRequest.id, failureReason: null },
  });

  await writeAuditLog({
    userId: null,
    action: 'settlement.retried',
    entityType: 'settlement',
    entityId: settlementId,
    newValues: { payoutRequestId: payoutRequest.id },
  });

  return prisma.settlement.findUnique({ where: { id: settlementId } });
};

module.exports = { autoSettle, retrySettlement };
