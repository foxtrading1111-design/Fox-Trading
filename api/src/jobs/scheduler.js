import cron from 'node-cron';
import { runMonthlySalary } from './workers.js';
import { startDailyProfitCron } from './dailyProfitCron.js';
import { processMonthlyProfitDistribution } from '../services/monthlyProfitDistribution.js';

export function scheduleCommissionJobs() {
  // Daily profit distribution - runs every day at midnight
  // runOnStartup: true will run it immediately when server starts (for testing/development)
  const isDevelopment = process.env.NODE_ENV !== 'production';
  startDailyProfitCron({ runOnStartup: isDevelopment });
  
  // Monthly referral income distribution - runs DAILY at 2:00 AM
  // Checks for deposits that have completed 30-day cycles and distributes referral income
  cron.schedule('0 2 * * *', async () => {
    console.log('🔄 Running monthly referral income distribution (checking 30-day cycles)...');
    await processMonthlyProfitDistribution();
    console.log('✅ Monthly referral income distribution completed.');
  });
  
  // Monthly salary distribution - runs on the 1st of every month at 3:00 AM
  cron.schedule('0 3 1 * *', async () => {
    console.log('💰 Running monthly salary distribution...');
    await runMonthlySalary();
    console.log('✅ Monthly salary distribution completed.');
  });
  
  console.log('✅ Cron jobs scheduled:');
  console.log('   - Daily profit: Every day at midnight (0.333% per day)');
  console.log('   - Monthly referral income: Every day at 2:00 AM (checks 30-day cycles per deposit)');
  console.log('   - Monthly salary: 1st of month at 3:00 AM');
}
