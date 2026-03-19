'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');
const payoutService = require('../services/payoutService');

const router = express.Router();

router.use(authMiddleware);

// GET /payouts
router.get(
  '/',
  [query('status').optional().isString()],
  validate,
  async (req, res, next) => {
    try {
      const payouts = await payoutService.listPayouts({ status: req.query.status });
      return res.status(200).json(payouts);
    } catch (err) {
      return next(err);
    }
  }
);

// GET /payouts/:id
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid payout ID')],
  validate,
  async (req, res, next) => {
    try {
      const payout = await payoutService.getPayoutById(req.params.id, true);
      return res.status(200).json(payout);
    } catch (err) {
      return next(err);
    }
  }
);

// POST /payouts
const createValidation = [
  body('recipientId').isUUID().withMessage('Valid recipient ID is required'),
  body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 5 })
    .toUpperCase(),
  body('reason').optional().isString().isLength({ max: 255 }),
];

router.post('/', createValidation, validate, async (req, res, next) => {
  try {
    const payout = await payoutService.createPayout(req.body, req.user.id, req);
    return res.status(201).json(payout);
  } catch (err) {
    return next(err);
  }
});

// POST /payouts/:id/retry
router.post(
  '/:id/retry',
  [param('id').isUUID().withMessage('Invalid payout ID')],
  validate,
  async (req, res, next) => {
    try {
      const payout = await payoutService.retryPayout(req.params.id, req.user.id, req);
      return res.status(201).json(payout);
    } catch (err) {
      return next(err);
    }
  }
);

// GET /payouts/:id/status-sync
router.get(
  '/:id/status-sync',
  [param('id').isUUID().withMessage('Invalid payout ID')],
  validate,
  async (req, res, next) => {
    try {
      const payout = await payoutService.syncPayoutStatus(req.params.id, req.user.id, req);
      return res.status(200).json(payout);
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
