'use strict';

const prisma = require('../db/client');

const VALID_STATUSES = ['pending', 'approved', 'rejected', 'suspended'];

const ALLOWED_TRANSITIONS = {
  pending: ['approved', 'rejected'],
  approved: ['suspended'],
  suspended: ['approved'],
  rejected: [],
};

const getRecipientById = async (id) => {
  const recipient = await prisma.recipient.findUnique({ where: { id } });
  if (!recipient) {
    const err = new Error('Recipient not found');
    err.status = 404;
    throw err;
  }
  return recipient;
};

const listRecipients = async (filters = {}) => {
  const where = {};
  if (filters.status && VALID_STATUSES.includes(filters.status)) {
    where.status = filters.status;
  }
  return prisma.recipient.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { id: true, fullName: true } } },
  });
};

const createRecipient = async (data, userId) => {
  return prisma.recipient.create({
    data: {
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      mobileOperator: data.mobileOperator,
      countryCode: data.countryCode,
      currency: data.currency,
      notes: data.notes || null,
      createdById: userId,
      status: 'pending',
    },
  });
};

const updateRecipient = async (id, patch, userId) => {
  const recipient = await getRecipientById(id);

  if (patch.status) {
    const allowed = ALLOWED_TRANSITIONS[recipient.status] || [];
    if (!allowed.includes(patch.status)) {
      const err = new Error(
        `Cannot transition recipient from '${recipient.status}' to '${patch.status}'`
      );
      err.status = 400;
      throw err;
    }
  }

  const updateData = {};

  if (patch.notes !== undefined) {
    updateData.notes = patch.notes;
  }
  if (patch.status) {
    updateData.status = patch.status;
    if (patch.status === 'approved') {
      updateData.approvedById = userId;
      updateData.approvedAt = new Date();
    }
  }
  if (patch.fullName) { updateData.fullName = patch.fullName; }
  if (patch.phoneNumber) { updateData.phoneNumber = patch.phoneNumber; }
  if (patch.mobileOperator) { updateData.mobileOperator = patch.mobileOperator; }
  if (patch.countryCode) { updateData.countryCode = patch.countryCode; }
  if (patch.currency) { updateData.currency = patch.currency; }

  return prisma.recipient.update({ where: { id }, data: updateData });
};

module.exports = { listRecipients, getRecipientById, createRecipient, updateRecipient };
