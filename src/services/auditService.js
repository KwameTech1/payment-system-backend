'use strict';

const prisma = require('../db/client');

/**
 * Write an entry to the audit log.
 *
 * @param {object} opts
 * @param {string|null} opts.userId
 * @param {string} opts.action  e.g. 'payout.created', 'recipient.approved'
 * @param {string|null} opts.entityType  e.g. 'payout_request', 'recipient'
 * @param {string|null} opts.entityId
 * @param {object|null} opts.oldValues
 * @param {object|null} opts.newValues
 * @param {import('express').Request|null} opts.req
 */
const writeAuditLog = async ({ userId, action, entityType, entityId, oldValues, newValues, req }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        oldValues: oldValues || undefined,
        newValues: newValues || undefined,
        ipAddress: req ? req.ip : null,
        userAgent: req ? req.headers['user-agent'] : null,
      },
    });
  } catch (err) {
    // Audit log failures must never crash the main flow
    console.error('Audit log write failed:', err.message);
  }
};

module.exports = { writeAuditLog };
