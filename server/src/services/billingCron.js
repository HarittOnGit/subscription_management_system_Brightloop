import cron from 'node-cron';
import { runBilling } from './billing.js';

export function startBillingCron() {
  // every day at 01:00 server time
  cron.schedule('0 1 * * *', async () => {
    try {
      console.log('[billing cron]', await runBilling());
    } catch (e) {
      console.error('[billing cron] failed:', e.message);
    }
  });
}
