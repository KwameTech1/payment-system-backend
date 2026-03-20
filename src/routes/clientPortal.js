'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const clientService = require('../services/clientService');
const fincraService = require('../services/fincraService');
const prisma = require('../db/client');

const router = express.Router();

// GET /client/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const clientId = req.client.id;
    const [balance, recentTransactions, recentSettlements] = await Promise.all([
      clientService.getClientBalance(clientId),
      clientService.getClientTransactions(clientId, { limit: 5 }),
      clientService.getClientSettlements(clientId, { limit: 5 }),
    ]);
    return res.json({ balance, recentTransactions, recentSettlements });
  } catch (err) {
    return next(err);
  }
});

// GET /client/transactions
router.get('/transactions', async (req, res, next) => {
  try {
    const transactions = await clientService.getClientTransactions(req.client.id, req.query);
    return res.json(transactions);
  } catch (err) {
    return next(err);
  }
});

// GET /client/transactions/:id
router.get('/transactions/:id', async (req, res, next) => {
  try {
    const transaction = await prisma.payinTransaction.findFirst({
      where: { id: req.params.id, clientId: req.client.id },
    });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    return res.json(transaction);
  } catch (err) {
    return next(err);
  }
});

// GET /client/settlements
router.get('/settlements', async (req, res, next) => {
  try {
    const settlements = await clientService.getClientSettlements(req.client.id, req.query);
    return res.json(settlements);
  } catch (err) {
    return next(err);
  }
});

// GET /client/settlements/:id
router.get('/settlements/:id', async (req, res, next) => {
  try {
    const settlement = await prisma.settlement.findFirst({
      where: { id: req.params.id, clientId: req.client.id },
      include: { payoutRequest: { select: { id: true, clientReference: true, status: true, fincraReference: true } } },
    });
    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found' });
    }
    return res.json(settlement);
  } catch (err) {
    return next(err);
  }
});

// POST /client/withdrawal — request a manual withdrawal from available balance
router.post('/withdrawal', async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({ where: { id: req.client.id } });
    if (!client) { return res.status(404).json({ error: 'Client not found' }); }

    const amount = parseFloat(req.body.amount);
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'A valid positive amount is required' });
    }
    const withdrawAmount = Number(amount.toFixed(2));

    // Check available balance
    const balance = await clientService.getClientBalance(client.id);
    if (withdrawAmount > balance.availableBalance) {
      return res.status(400).json({
        error: `Insufficient balance. Available: ${balance.availableBalance} ${client.currency}`,
      });
    }

    const clientReference = uuidv4();
    const recipientInfo = {
      fullName: client.businessName,
      phoneNumber: client.mobileNumber,
      mobileOperator: client.mobileOperator,
      countryCode: client.countryCode,
      currency: client.currency,
    };
    const payoutRecord = {
      clientReference,
      amount: withdrawAmount,
      currency: client.currency,
      reason: `Withdrawal request by client ${client.id}`,
    };

    const fincraResult = await fincraService.submitPayout(payoutRecord, recipientInfo);

    const withdrawal = await prisma.payoutRequest.create({
      data: {
        clientReference,
        fincraReference: fincraResult.data?.reference || null,
        recipientId: null,
        initiatedById: null,
        amount: withdrawAmount,
        currency: client.currency,
        reason: payoutRecord.reason,
        status: 'submitted',
        fincraResponse: fincraResult,
        submittedAt: new Date(),
      },
    });

    // Debit the client's ledger so availableBalance reflects the withdrawal
    await prisma.ledgerEntry.create({
      data: {
        clientId: client.id,
        type: 'settlement',
        amount: withdrawAmount,
        currency: client.currency,
        reference: withdrawal.id,
        description: `Manual withdrawal: ${clientReference}`,
      },
    });

    return res.status(201).json(withdrawal);
  } catch (err) {
    return next(err);
  }
});

// GET /client/withdrawals — list this client's manual withdrawal requests
router.get('/withdrawals', async (req, res, next) => {
  try {
    const withdrawals = await prisma.payoutRequest.findMany({
      where: {
        reason: { contains: `client ${req.client.id}` },
        settlement: { is: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json(withdrawals);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
