'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const prisma = require('../db/client');
const validate = require('../middleware/validate');
const { writeAuditLog } = require('../services/auditService');

const router = express.Router();

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/login', loginRateLimit, loginValidation, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findFirst({
      where: { email, isActive: true },
    });

    // Use constant-time comparison to prevent timing attacks
    const INVALID_CREDS = { error: 'Invalid credentials' };
    const dummyHash = '$2b$12$invalidhashfortimingreasonsonlyxxxxxxxxxxxxxxxxxxxxxxx';

    const passwordToCheck = user ? user.passwordHash : dummyHash;
    const isMatch = await bcrypt.compare(password, passwordToCheck);

    if (!user || !isMatch) {
      return res.status(401).json(INVALID_CREDS);
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    await writeAuditLog({
      userId: user.id,
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      req,
    });

    return res.status(200).json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
