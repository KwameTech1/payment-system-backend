'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const clientService = require('../services/clientService');
const settlementService = require('../services/settlementService');
const prisma = require('../db/client');

const router = express.Router();
router.use(auth);

// ── Special routes (must come before /:id) ────────────────────────────────────

// GET /clients/unattributed-transactions
router.get('/unattributed-transactions', async (req, res, next) => {
  try {
    const transactions = await prisma.payinTransaction.findMany({
      where: { isAttributed: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return res.json(transactions);
  } catch (err) {
    return next(err);
  }
});

// PATCH /clients/transactions/:id/attribute
router.patch('/transactions/:id/attribute', async (req, res, next) => {
  try {
    const { clientId } = req.body;
    if (!clientId) {
      return res.status(422).json({ error: 'clientId is required' });
    }
    const client = await clientService.getClientById(clientId);
    const payin = await prisma.payinTransaction.update({
      where: { id: req.params.id },
      data: { clientId: client.id, clientCode: client.clientCode, isAttributed: true },
    });
    return res.json(payin);
  } catch (err) {
    return next(err);
  }
});

// POST /clients/settlements/:id/retry
router.post('/settlements/:id/retry', async (req, res, next) => {
  try {
    const settlement = await settlementService.retrySettlement(req.params.id);
    return res.json(settlement);
  } catch (err) {
    return next(err);
  }
});

// ── Client CRUD ────────────────────────────────────────────────────────────────

// GET /clients
router.get('/', async (req, res, next) => {
  try {
    const clients = await clientService.listClients();
    return res.json(clients);
  } catch (err) {
    return next(err);
  }
});

// POST /clients
router.post(
  '/',
  [
    body('businessName').notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('clientCode').notEmpty(),
    body('mobileNumber').notEmpty(),
    body('mobileOperator').notEmpty(),
    body('countryCode').notEmpty(),
    body('currency').notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ error: 'Validation failed', details: errors.array() });
      }
      const client = await clientService.createClient(req.body);
      return res.status(201).json(client);
    } catch (err) {
      return next(err);
    }
  }
);

// GET /clients/:id
router.get('/:id', async (req, res, next) => {
  try {
    const client = await clientService.getClientById(req.params.id);
    return res.json(client);
  } catch (err) {
    return next(err);
  }
});

// PATCH /clients/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const client = await clientService.updateClient(req.params.id, req.body);
    return res.json(client);
  } catch (err) {
    return next(err);
  }
});

// GET /clients/:id/transactions
router.get('/:id/transactions', async (req, res, next) => {
  try {
    const transactions = await clientService.getClientTransactions(req.params.id, req.query);
    return res.json(transactions);
  } catch (err) {
    return next(err);
  }
});

// GET /clients/:id/settlements
router.get('/:id/settlements', async (req, res, next) => {
  try {
    const settlements = await clientService.getClientSettlements(req.params.id, req.query);
    return res.json(settlements);
  } catch (err) {
    return next(err);
  }
});

// GET /clients/:id/balance
router.get('/:id/balance', async (req, res, next) => {
  try {
    const balance = await clientService.getClientBalance(req.params.id);
    return res.json(balance);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
