import cron from 'node-cron';
import { runMonthlyTradingBonus, runMonthlyReferralIncome, runMonthlySalary } from './workers.js';
import { startDailyProfitCron } from './dailyProfitCron.js';

export function scheduleCommissionJobs() {
  // Daily profit distribution - runs every day at midnight
  // runOnStartup: true will run it immediately when server starts (for testing/development)
  const isDevelopment = process.env.NODE_ENV !== 'production';
  startDailyProfitCron({ runOnStartup: isDevelopment });
  
  // At 02:00 on the 1st of every month
  cron.schedule('0 2 1 * *', async () => {
    console.log('Running monthly commission jobs...');
    await runMonthlyTradingBonus();
    await runMonthlyReferralIncome();
    await runMonthlySalary();
    console.log('Monthly commission jobs completed.');
  });
}
