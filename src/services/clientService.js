'use strict';

const bcrypt = require('bcrypt');
const prisma = require('../db/client');

const SALT_ROUNDS = 12;

const listClients = async () => {
  return prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      businessName: true,
      email: true,
      clientCode: true,
      mobileNumber: true,
      mobileOperator: true,
      countryCode: true,
      currency: true,
      feeRate: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

const getClientById = async (id) => {
  const client = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      businessName: true,
      email: true,
      clientCode: true,
      mobileNumber: true,
      mobileOperator: true,
      countryCode: true,
      currency: true,
      feeRate: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!client) {
    const err = new Error('Client not found');
    err.status = 404;
    throw err;
  }
  return client;
};

const createClient = async (data) => {
  const { businessName, email, password, clientCode, mobileNumber, mobileOperator, countryCode, currency, feeRate } =
    data;

  const existing = await prisma.client.findFirst({
    where: { OR: [{ email }, { clientCode }] },
  });
  if (existing) {
    const field = existing.email === email ? 'email' : 'clientCode';
    const err = new Error(`Client with this ${field} already exists`);
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  return prisma.client.create({
    data: {
      businessName,
      email,
      passwordHash,
      clientCode,
      mobileNumber,
      mobileOperator,
      countryCode,
      currency,
      feeRate: feeRate ?? 0.02,
      isActive: true,
    },
    select: {
      id: true,
      businessName: true,
      email: true,
      clientCode: true,
      mobileNumber: true,
      mobileOperator: true,
      countryCode: true,
      currency: true,
      feeRate: true,
      isActive: true,
      createdAt: true,
    },
  });
};

const updateClient = async (id, patch) => {
  await getClientById(id);
  const { businessName, mobileNumber, mobileOperator, countryCode, currency, feeRate, isActive } = patch;
  return prisma.client.update({
    where: { id },
    data: {
      ...(businessName !== undefined && { businessName }),
      ...(mobileNumber !== undefined && { mobileNumber }),
      ...(mobileOperator !== undefined && { mobileOperator }),
      ...(countryCode !== undefined && { countryCode }),
      ...(currency !== undefined && { currency }),
      ...(feeRate !== undefined && { feeRate }),
      ...(isActive !== undefined && { isActive }),
    },
    select: {
      id: true,
      businessName: true,
      email: true,
      clientCode: true,
      mobileNumber: true,
      mobileOperator: true,
      countryCode: true,
      currency: true,
      feeRate: true,
      isActive: true,
      updatedAt: true,
    },
  });
};

const getClientBalance = async (clientId) => {
  const entries = await prisma.ledgerEntry.groupBy({
    by: ['type'],
    where: { clientId },
    _sum: { amount: true },
  });

  const balanceMap = { payin: 0, fee: 0, settlement: 0 };
  for (const entry of entries) {
    balanceMap[entry.type] = Number(entry._sum.amount ?? 0);
  }

  return {
    grossReceived: balanceMap.payin,
    totalFees: balanceMap.fee,
    totalSettled: balanceMap.settlement,
    availableBalance: balanceMap.payin - balanceMap.fee - balanceMap.settlement,
  };
};

const getClientTransactions = async (clientId, filters = {}) => {
  const { status, limit = 50, offset = 0 } = filters;
  return prisma.payinTransaction.findMany({
    where: {
      clientId,
      ...(status && { status }),
    },
    orderBy: { createdAt: 'desc' },
    take: Number(limit),
    skip: Number(offset),
  });
};

const getClientSettlements = async (clientId, filters = {}) => {
  const { status, limit = 50, offset = 0 } = filters;
  return prisma.settlement.findMany({
    where: {
      clientId,
      ...(status && { status }),
    },
    include: { payoutRequest: { select: { id: true, clientReference: true, status: true } } },
    orderBy: { createdAt: 'desc' },
    take: Number(limit),
    skip: Number(offset),
  });
};

module.exports = {
  listClients,
  getClientById,
  createClient,
  updateClient,
  getClientBalance,
  getClientTransactions,
  getClientSettlements,
};
