'use strict';

const cron = require('node-cron');
const prisma = require('../db/client');
const fincraService = require('../services/fincraService');
const webhookService = require('../services/webhookService');

const TEN_MINUTES_AGO = () => new Date(Date.now() - 10 * 60 * 1000);

const runReconciliation = async () => {
  let checked = 0;
  let updated = 0;

  try {
    // Also include payouts tied to settlements that are still in-flight
    const stuckPayouts = await prisma.payoutRequest.findMany({
      where: {
        status: { in: ['submitted', 'pending'] },
        updatedAt: { lt: TEN_MINUTES_AGO() },
      },
      include: { settlement: true },
      take: 50,
    });

    checked = stuckPayouts.length;

    for (const payout of stuckPayouts) {
      try {
        const result = await fincraService.getPayoutStatus(payout.clientReference);
        const fincraStatus = result.data?.status;

        if (fincraStatus) {
          const before = payout.status;
          const reconciled = await webhookService.applyWebhookStatusUpdate(
            payout.clientReference,
            fincraStatus,
            result
          );
          if (reconciled && reconciled.status !== before) {
            updated++;
          }
        }
      } catch (err) {
        console.error(
          `[reconciliation] Failed to check payout ${payout.id}:`,
          err.message
        );
      }
    }

    if (checked > 0) {
      console.log(`[reconciliation] Checked: ${checked}, Updated: ${updated}`);
    }
  } catch (err) {
    console.error('[reconciliation] Worker error:', err.message);
  }
};

const start = () => {
  cron.schedule('*/5 * * * *', runReconciliation);
  console.log('[reconciliation] Worker started — runs every 5 minutes');
};

module.exports = { start, runReconciliation };
