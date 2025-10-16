import cron from 'node-cron';
import { processDailyProfitDistribution } from '../services/dailyProfitDistribution.js';

/**
 * Daily Profit Distribution Cron Job
 * 
 * Runs every day at midnight (00:00) to distribute daily investment profits
 * to all users with active deposits.
 * 
 * Schedule: 0 0 * * * (At 00:00 every day)
 */

export function startDailyProfitCron(options = {}) {
  const { runOnStartup = false } = options;
  
  // Run immediately on startup if enabled (for testing/development)
  if (runOnStartup) {
    console.log('🚀 Running initial daily profit distribution...');
    processDailyProfitDistribution()
      .then(result => {
        if (result.success) {
          console.log('✅ Initial daily profit distribution completed');
          console.log(`   📊 Users processed: ${result.usersProcessed}/${result.totalUsers}`);
          console.log(`   💰 Total distributed: $${result.totalProfitDistributed?.toFixed(2) || '0.00'}`);
        }
      })
      .catch(error => console.error('❌ Initial distribution error:', error));
  }
  
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('🕐 Daily profit cron job triggered at:', new Date().toISOString());
    
    try {
      const result = await processDailyProfitDistribution();
      
      if (result.success) {
        console.log('✅ Daily profit distribution completed successfully');
        console.log(`   📊 Users processed: ${result.usersProcessed}/${result.totalUsers}`);
        console.log(`   💰 Total distributed: $${result.totalProfitDistributed?.toFixed(2) || '0.00'}`);
      } else {
        console.error('❌ Daily profit distribution failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Error in daily profit cron job:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Indian Standard Time (IST)
  });
  
  console.log('📅 Daily profit cron job scheduled (runs daily at midnight)');
}

/**
 * Run daily profit distribution immediately (for testing)
 */
export async function runDailyProfitNow() {
  console.log('🚀 Running daily profit distribution manually...');
  
  try {
    const result = await processDailyProfitDistribution();
    
    if (result.success) {
      console.log('✅ Manual daily profit distribution completed');
      console.log(result);
    } else {
      console.error('❌ Manual daily profit distribution failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error in manual daily profit run:', error);
    return { success: false, error: error.message };
  }
}
