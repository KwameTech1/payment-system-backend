'use strict';

/**
 * Fincra API integration service.
 *
 * All calls to Fincra go through this file only — never call Fincra directly from routes.
 *
 * STATUS: Stub mode — real API calls are structured and ready.
 * To activate: set FINCRA_API_KEY, FINCRA_BUSINESS_ID, and FINCRA_API_BASE_URL in .env,
 * then uncomment the fetch blocks and remove the mock return statements.
 */

const BUSINESS_ID = process.env.FINCRA_BUSINESS_ID;

// Used once FINCRA_API_KEY / FINCRA_API_BASE_URL are configured — see TODO blocks below
/* eslint-disable no-unused-vars */
const _getBaseUrl = () => process.env.FINCRA_API_BASE_URL || 'https://sandboxapi.fincra.com';
const _fincraHeaders = () => ({
  'api-key': process.env.FINCRA_API_KEY,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});
/* eslint-enable no-unused-vars */

/**
 * Submit a payout to Fincra.
 *
 * @param {object} payout  PayoutRequest record from DB
 * @param {object} recipient  Recipient record from DB
 * @returns {Promise<object>} Fincra API response
 */
const submitPayout = async (payout, recipient) => {
  const body = {
    sourceCurrency: payout.currency,
    destinationCurrency: payout.currency,
    amount: Number(payout.amount),
    description: payout.reason || 'Payout',
    customerReference: payout.clientReference,
    businessId: BUSINESS_ID,
    beneficiary: {
      accountType: 'mobile_money',
      mobileMoneyCode: recipient.mobileOperator,
      phoneNumber: recipient.phoneNumber,
      lastName: recipient.fullName.split(' ').slice(-1)[0] || recipient.fullName,
      firstName: recipient.fullName.split(' ')[0],
      country: recipient.countryCode,
    },
  };

  // TODO: uncomment when Fincra credentials are available
  // const response = await fetch(`${_getBaseUrl()}/disbursements/payouts`, {
  //   method: 'POST',
  //   headers: _fincraHeaders(),
  //   body: JSON.stringify(body),
  // });
  // if (!response.ok) {
  //   const errData = await response.json().catch(() => ({}));
  //   const err = new Error(errData.message || `Fincra API error: ${response.status}`);
  //   err.status = response.status;
  //   throw err;
  // }
  // return response.json();

  // STUB: mock successful submission
  console.warn('[fincraService] STUB MODE — submitPayout called with reference:', payout.clientReference);
  return {
    success: true,
    data: {
      reference: `MOCK-${payout.clientReference}`,
      customerReference: payout.clientReference,
      status: 'pending',
      amount: Number(payout.amount),
      currency: payout.currency,
      beneficiary: body.beneficiary,
    },
  };
};

/**
 * Check the status of a payout by our client reference.
 *
 * @param {string} clientReference  The UUID we generated and sent to Fincra
 * @returns {Promise<object>} Fincra status object
 */
const getPayoutStatus = async (clientReference) => {
  // TODO: uncomment when Fincra credentials are available
  // const response = await fetch(
  //   `${_getBaseUrl()}/disbursements/payouts?customerReference=${encodeURIComponent(clientReference)}`,
  //   { headers: _fincraHeaders() }
  // );
  // if (!response.ok) {
  //   const errData = await response.json().catch(() => ({}));
  //   const err = new Error(errData.message || `Fincra API error: ${response.status}`);
  //   err.status = response.status;
  //   throw err;
  // }
  // return response.json();

  // STUB: mock pending status
  console.warn('[fincraService] STUB MODE — getPayoutStatus called for reference:', clientReference);
  return {
    success: true,
    data: {
      customerReference: clientReference,
      status: 'pending',
    },
  };
};

/**
 * Get current Fincra business balance.
 *
 * @returns {Promise<object>} Balance object
 */
const getBusinessBalance = async () => {
  // TODO: uncomment when Fincra credentials are available
  // const response = await fetch(`${_getBaseUrl()}/wallets?businessId=${BUSINESS_ID}`, {
  //   headers: _fincraHeaders(),
  // });
  // if (!response.ok) {
  //   const errData = await response.json().catch(() => ({}));
  //   const err = new Error(errData.message || `Fincra API error: ${response.status}`);
  //   err.status = response.status;
  //   throw err;
  // }
  // return response.json();

  // STUB: mock balance
  console.warn('[fincraService] STUB MODE — getBusinessBalance called');
  return { success: true, data: { balance: 0, currency: 'N/A', note: 'Stub mode active' } };
};

module.exports = { submitPayout, getPayoutStatus, getBusinessBalance };
