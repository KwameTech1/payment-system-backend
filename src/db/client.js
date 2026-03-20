'use strict';

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Singleton pattern — prevents multiple PrismaClient instances in dev with nodemon hot reload
const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;
