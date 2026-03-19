'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');
const recipientService = require('../services/recipientService');
const { writeAuditLog } = require('../services/auditService');

const router = express.Router();

router.use(authMiddleware);

// GET /recipients
router.get('/', async (req, res, next) => {
  try {
    const recipients = await recipientService.listRecipients({ status: req.query.status });
    return res.status(200).json(recipients);
  } catch (err) {
    return next(err);
  }
});

// POST /recipients
const createValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phoneNumber')
    .matches(/^\+?[0-9]{7,15}$/)
    .withMessage('Phone number must be 7–15 digits, optionally prefixed with +'),
  body('mobileOperator').trim().notEmpty().withMessage('Mobile operator is required'),
  body('countryCode')
    .trim()
    .isLength({ min: 2, max: 5 })
    .toUpperCase()
    .withMessage('Country code is required (e.g. GH, NG)'),
  body('currency')
    .trim()
    .isLength({ min: 3, max: 5 })
    .toUpperCase()
    .withMessage('Currency is required (e.g. GHS, NGN)'),
];

router.post('/', createValidation, validate, async (req, res, next) => {
  try {
    const recipient = await recipientService.createRecipient(req.body, req.user.id);

    await writeAuditLog({
      userId: req.user.id,
      action: 'recipient.created',
      entityType: 'recipient',
      entityId: recipient.id,
      newValues: { fullName: recipient.fullName, phoneNumber: recipient.phoneNumber },
      req,
    });

    return res.status(201).json(recipient);
  } catch (err) {
    return next(err);
  }
});

// PATCH /recipients/:id
const updateValidation = [
  param('id').isUUID().withMessage('Invalid recipient ID'),
  body('status')
    .optional()
    .isIn(['approved', 'rejected', 'suspended'])
    .withMessage('Status must be one of: approved, rejected, suspended'),
  body('notes').optional().isString(),
  body('fullName').optional().trim().notEmpty(),
  body('phoneNumber')
    .optional()
    .matches(/^\+?[0-9]{7,15}$/),
  body('mobileOperator').optional().trim().notEmpty(),
  body('countryCode').optional().trim().isLength({ min: 2, max: 5 }),
  body('currency').optional().trim().isLength({ min: 3, max: 5 }),
];

router.patch('/:id', updateValidation, validate, async (req, res, next) => {
  try {
    const before = await recipientService.getRecipientById(req.params.id);
    const updated = await recipientService.updateRecipient(req.params.id, req.body, req.user.id);

    await writeAuditLog({
      userId: req.user.id,
      action: req.body.status ? `recipient.${req.body.status}` : 'recipient.updated',
      entityType: 'recipient',
      entityId: updated.id,
      oldValues: { status: before.status },
      newValues: { status: updated.status },
      req,
    });

    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
