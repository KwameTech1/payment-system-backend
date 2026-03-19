'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const prisma = require('../db/client');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

router.post(
  '/login',
  loginLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ error: 'Validation failed', details: errors.array() });
      }

      const { email, password } = req.body;

      const client = await prisma.client.findUnique({ where: { email } });
      if (!client || !client.isActive) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const match = await bcrypt.compare(password, client.passwordHash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { sub: client.id, email: client.email, role: 'client' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      return res.status(200).json({
        token,
        client: {
          id: client.id,
          email: client.email,
          businessName: client.businessName,
          clientCode: client.clientCode,
          currency: client.currency,
        },
      });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
