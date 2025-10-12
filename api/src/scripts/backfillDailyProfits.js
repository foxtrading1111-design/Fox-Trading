import prisma from '../lib/prisma.js';

/**
 * Backfill Daily Profit Transactions
 * 
 * This script creates daily profit transactions for past days where they're missing.
 * Run this once to migrate existing users to the new daily profit system.
 * 
 * Usage: node src/scripts/backfillDailyProfits.js
 */

const DAILY_PROFIT_RATE = 0.10 / 30; // 0.333% per day

async function backfillDailyProfits(daysToBackfill = 30) {
  console.log('🔄 Starting daily profit backfill...');
  console.log(`📅 Backfilling for the last ${daysToBackfill} days\n`);
  
  try {
    // Get all users with deposits
    const usersWithDeposits = await prisma.transactions.groupBy({
      by: ['user_id'],
      where: {
        OR: [
          { type: 'DEPOSIT', status: 'COMPLETED' },
          { type: 'credit', income_source: { endsWith: '_deposit' } }
        ],
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    });
    
    console.log(`👥 Found ${usersWithDeposits.length} users with deposits\n`);
    
    let totalTransactionsCreated = 0;
    let totalAmountDistributed = 0;
    const results = [];
    
    for (const userGroup of usersWithDeposits) {
      const userId = userGroup.user_id;
      
      // Get user info
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { full_name: true, email: true, created_at: true }
      });
      
      if (!user) continue;
      
      // Get user's deposits
      const deposits = await prisma.transactions.findMany({
        where: {
          user_id: userId,
          OR: [
            { type: 'DEPOSIT', status: 'COMPLETED' },
            { type: 'credit', income_source: { endsWith: '_deposit' } }
          ],
          status: 'COMPLETED'
        },
        select: { amount: true, timestamp: true }
      });
      
      const totalDeposits = deposits.reduce((sum, d) => sum + Number(d.amount), 0);
      const dailyProfit = Number((totalDeposits * DAILY_PROFIT_RATE).toFixed(2));
      
      if (dailyProfit <= 0) continue;
      
      // Find the earliest deposit date
      const earliestDeposit = deposits.reduce((earliest, deposit) => {
        return !earliest || deposit.timestamp < earliest ? deposit.timestamp : earliest;
      }, null);
      
      // Calculate how many days to backfill (from earliest deposit or daysToBackfill, whichever is less)
      const daysSinceFirstDeposit = Math.floor((Date.now() - earliestDeposit.getTime()) / (1000 * 60 * 60 * 24));
      const actualDaysToBackfill = Math.min(daysSinceFirstDeposit, daysToBackfill);
      
      let userTransactionsCreated = 0;
      
      // Create transactions for each day
      for (let daysAgo = actualDaysToBackfill; daysAgo >= 1; daysAgo--) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        date.setHours(0, 0, 0, 0);
        
        // Check if transaction already exists for this day
        const existingTransaction = await prisma.transactions.findFirst({
          where: {
            user_id: userId,
            income_source: 'daily_profit',
            timestamp: {
              gte: date,
              lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
            }
          }
        });
        
        if (existingTransaction) {
          continue; // Skip if already exists
        }
        
        // Create the transaction
        await prisma.transactions.create({
          data: {
            user_id: userId,
            amount: dailyProfit,
            type: 'credit',
            income_source: 'daily_profit',
            description: `Daily investment profit (${(DAILY_PROFIT_RATE * 100).toFixed(3)}% per day) - $${dailyProfit.toFixed(2)}`,
            status: 'COMPLETED',
            unlock_date: date, // Immediately available
            timestamp: date
          }
        });
        
        userTransactionsCreated++;
        totalTransactionsCreated++;
        totalAmountDistributed += dailyProfit;
      }
      
      results.push({
        userId,
        userName: user.full_name || user.email,
        totalDeposits,
        dailyProfit,
        daysBackfilled: userTransactionsCreated,
        totalAmount: dailyProfit * userTransactionsCreated
      });
      
      console.log(`✅ ${user.full_name || user.email}: Created ${userTransactionsCreated} transactions ($${dailyProfit.toFixed(2)}/day)`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Backfill Complete!');
    console.log('='.repeat(60));
    console.log(`Total users processed: ${results.length}`);
    console.log(`Total transactions created: ${totalTransactionsCreated}`);
    console.log(`Total amount distributed: $${totalAmountDistributed.toFixed(2)}`);
    console.log('='.repeat(60) + '\n');
    
    return {
      success: true,
      usersProcessed: results.length,
      transactionsCreated: totalTransactionsCreated,
      totalAmountDistributed: totalAmountDistributed,
      results: results
    };
    
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    return { success: false, error: error.message };
  }
}

// Run the backfill
const daysToBackfill = process.argv[2] ? parseInt(process.argv[2]) : 30;
backfillDailyProfits(daysToBackfill)
  .then(result => {
    if (result.success) {
      console.log('✅ Backfill completed successfully!');
      process.exit(0);
    } else {
      console.error('❌ Backfill failed:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

export { backfillDailyProfits };
