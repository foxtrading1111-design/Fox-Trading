import prisma from '../lib/prisma.js';

/**
 * Daily Investment Profit Distribution Service
 * 
 * Logic:
 * 1. For each user with active deposits, calculate daily profit
 * 2. Daily profit = 10% monthly / 30 days = 0.333% per day
 * 3. Add the profit to user's withdrawable balance
 * 4. Create transaction record for tracking
 */

const MONTHLY_PROFIT_RATE = 0.10; // 10% monthly
const DAYS_IN_MONTH = 30;
const DAILY_PROFIT_RATE = MONTHLY_PROFIT_RATE / DAYS_IN_MONTH; // ~0.00333 per day

/**
 * Calculate daily profit for a specific user
 * Includes ALL active deposits (locked investments)
 */
async function calculateUserDailyProfit(userId) {
  const now = new Date();
  
  // Get all user's active deposits that are still locked
  const deposits = await prisma.transactions.findMany({
    where: {
      user_id: userId,
      type: 'credit',
      income_source: { 
        in: ['investment_deposit', 'BEP20_deposit', 'TRC20_deposit'] // Support all deposit types
      },
      status: 'COMPLETED',
      unlock_date: { 
        not: null,
        gt: now // Still locked
      }
    },
    select: { amount: true, timestamp: true, unlock_date: true }
  });
  
  // Calculate total deposit amount
  const totalDeposits = deposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0);
  
  // Daily profit is 10% monthly / 30 days = 0.333% per day
  return Number((totalDeposits * DAILY_PROFIT_RATE).toFixed(2));
}

/**
 * Distribute daily profit to a specific user
 */
async function distributeDailyProfit(userId) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Check if profit was already distributed today (IST timezone)
      const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const today = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const existingProfit = await tx.transactions.findFirst({
        where: {
          user_id: userId,
          income_source: 'daily_profit',
          timestamp: { gte: today, lt: tomorrow },
          status: 'COMPLETED'
        }
      });
      
      if (existingProfit) {
        return { 
          success: true, 
          message: 'Daily profit already distributed today', 
          dailyProfit: 0,
          alreadyDistributed: true
        };
      }
      
      // Calculate user's daily profit
      const dailyProfit = await calculateUserDailyProfit(userId);
      
      if (dailyProfit <= 0) {
        return { success: true, message: 'No profit to distribute', dailyProfit: 0 };
      }
      
      // Get user info
      const user = await tx.users.findUnique({
        where: { id: userId },
        select: { full_name: true, email: true }
      });
      
      // Add daily profit to user's wallet balance
      await tx.wallets.upsert({
        where: { user_id: userId },
        create: { user_id: userId, balance: dailyProfit },
        update: { balance: { increment: dailyProfit } }
      });
      
      // Create daily profit transaction
      const profitTransaction = await tx.transactions.create({
        data: {
          user_id: userId,
          amount: dailyProfit,
          type: 'credit',
          income_source: 'daily_profit',
          description: `Daily investment profit (${(DAILY_PROFIT_RATE * 100).toFixed(3)}% per day) - $${dailyProfit.toFixed(2)}`,
          status: 'COMPLETED',
          unlock_date: new Date() // Immediately available for withdrawal
        }
      });
      
      return {
        success: true,
        userId: userId,
        dailyProfit: dailyProfit,
        transactionId: profitTransaction.id,
        userName: user?.full_name || user?.email
      };
    });
    
    return result;
    
  } catch (error) {
    console.error('Error distributing daily profit:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process daily profit distribution for all users with active deposits
 * This should be called daily via a cron job (e.g., at midnight)
 */
async function processDailyProfitDistribution() {
  try {
    console.log('🔄 Starting daily profit distribution...');
    
    const now = new Date();
    
    // Get all users with active deposits
    const usersWithDeposits = await prisma.transactions.groupBy({
      by: ['user_id'],
      where: {
        type: 'credit',
        income_source: { 
          in: ['investment_deposit', 'BEP20_deposit', 'TRC20_deposit'] // Support all deposit types
        },
        status: 'COMPLETED',
        unlock_date: { 
          not: null,
          gt: now // Still locked
        }
      },
      _sum: { amount: true }
    });
    
    console.log(`📊 Found ${usersWithDeposits.length} users with deposits`);
    
    const results = [];
    let totalProcessed = 0;
    let totalProfitDistributed = 0;
    let alreadyDistributedCount = 0;
    
    for (const userGroup of usersWithDeposits) {
      const userId = userGroup.user_id;
      const result = await distributeDailyProfit(userId);
      
      if (result.success) {
        if (result.alreadyDistributed) {
          alreadyDistributedCount++;
        } else {
          totalProcessed++;
          totalProfitDistributed += result.dailyProfit || 0;
        }
        results.push(result);
      } else {
        console.error(`❌ Failed to process daily profit for user ${userId}:`, result.error);
      }
    }
    
    console.log(`✅ Daily profit distribution complete:`);
    console.log(`   - Users processed: ${totalProcessed}/${usersWithDeposits.length}`);
    console.log(`   - Already distributed today: ${alreadyDistributedCount}`);
    console.log(`   - Total profit distributed: $${totalProfitDistributed.toFixed(2)}`);
    
    return {
      success: true,
      usersProcessed: totalProcessed,
      totalUsers: usersWithDeposits.length,
      alreadyDistributedCount: alreadyDistributedCount,
      totalProfitDistributed: totalProfitDistributed,
      results: results
    };
    
  } catch (error) {
    console.error('Error in daily profit distribution:', error);
    return { success: false, error: error.message };
  }
}

export {
  distributeDailyProfit,
  processDailyProfitDistribution,
  calculateUserDailyProfit
};
