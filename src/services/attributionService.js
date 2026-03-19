'use strict';

const prisma = require('../db/client');

/**
 * Attribute a PayinTransaction to a Client by parsing clientCode from customerReference.
 * customerReference format: "<clientCode>-<rest>"  e.g. "BIZ001-order123"
 *
 * @param {string} payinTransactionId
 * @param {string} customerReference  Raw reference string from Fincra webhook
 * @returns {{ attributed: boolean, client: object|null }}
 */
const attributePayin = async (payinTransactionId, customerReference) => {
  if (!customerReference) {
    return { attributed: false, client: null };
  }

  const dashIndex = customerReference.indexOf('-');
  const clientCode = dashIndex !== -1 ? customerReference.substring(0, dashIndex) : customerReference;

  const client = await prisma.client.findUnique({ where: { clientCode } });

  if (!client) {
    console.warn(`[attributionService] No client found for clientCode: ${clientCode}`);
    await prisma.payinTransaction.update({
      where: { id: payinTransactionId },
      data: { customerReference, clientCode, isAttributed: false },
    });
    return { attributed: false, client: null };
  }

  await prisma.payinTransaction.update({
    where: { id: payinTransactionId },
    data: { customerReference, clientCode, clientId: client.id, isAttributed: true },
  });

  return { attributed: true, client };
};

module.exports = { attributePayin };
