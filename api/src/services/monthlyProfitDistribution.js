import prisma from '../lib/prisma.js';
import { getSponsorChain } from './teamIncome.js';

/**
 * Monthly Investment Profit Distribution Service
 * 
 * Logic:
 * 1. Calculate ACTUAL daily profits earned by user in the past month
 * 2. Distribute REFERRAL INCOME based on actual profits to uplines
 * 3. Track monthly distributions to avoid duplicates
 * 
 * REFERRAL INCOME Distribution (from user's ACTUAL monthly profit):
 * - Level 1: 10% of user's monthly profit
 * - Level 2: 5% of user's monthly profit
 * - Level 3: 3% of user's monthly profit
 * - Level 4: 2% of user's monthly profit
 * - Level 5: 1% of user's monthly profit
 * - Levels 6-20: 0.5% each of user's monthly profit
 * 
 * Example: User deposits $100 on Oct 10, then $100 more on Oct 20
 * - Oct 10-19: Daily profit = $0.333 (from $100) × 10 days = $3.33
 * - Oct 20-Nov 9: Daily profit = $0.666 (from $200) × 21 days = $13.99
 * - Total monthly profit = $17.32
 * - On Nov 10th: Uplines get referral income based on $17.32
 */

const REFERRAL_PERCENTAGES = [
  10, // Level 1
  5,  // Level 2
  3,  // Level 3
  2,  // Level 4
  1,  // Level 5
  0.5, 0.5, 0.5, 0.5, 0.5, // Levels 6-10
  0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5 // Levels 11-20
];

function getReferralIncomePercentage(level) {
  if (level >= 1 && level <= 20) {
    return REFERRAL_PERCENTAGES[level - 1] || 0;
  }
  return 0; // No income beyond level 20
}

/**
 * Get the current month-year key for tracking
 */
function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get the previous month-year key
 */
function getPreviousMonthKey() {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Calculate actual monthly profit for a user based on daily profits earned
 * This looks at the previous month's daily_profit transactions
 */
async function calculateActualMonthlyProfit(userId) {
  const now = new Date();
  const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  // Get all daily profit transactions from the previous month
  const dailyProfits = await prisma.transactions.findMany({
    where: {
      user_id: userId,
      income_source: 'daily_profit',
      status: 'COMPLETED',
      timestamp: {
        gte: firstDayOfPreviousMonth,
        lt: firstDayOfCurrentMonth
      }
    },
    select: {
      amount: true,
      timestamp: true
    }
  });
  
  // Sum up all daily profits
  const totalMonthlyProfit = dailyProfits.reduce((sum, profit) => sum + Number(profit.amount), 0);
  
  return {
    totalProfit: Number(totalMonthlyProfit.toFixed(2)),
    dailyProfitsCount: dailyProfits.length,
    monthKey: getPreviousMonthKey()
  };
}

/**
 * Get users eligible for monthly referral income distribution
 * A user is eligible if:
 * 1. They earned daily profits in the previous month
 * 2. Referral income hasn't been distributed for that month yet
 */
async function getEligibleUsersForDistribution() {
  const now = new Date();
  const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthKey = getPreviousMonthKey();
  
  // Get all users who earned daily profits in the previous month
  const usersWithProfits = await prisma.transactions.groupBy({
    by: ['user_id'],
    where: {
      income_source: 'daily_profit',
      status: 'COMPLETED',
      timestamp: {
        gte: firstDayOfPreviousMonth,
        lt: firstDayOfCurrentMonth
      }
    },
    _sum: {
      amount: true
    }
  });
  
  const eligibleUsers = [];
  
  for (const userGroup of usersWithProfits) {
    const userId = userGroup.user_id;
    
    // Check if referral income has already been distributed for this month
    const existingDistribution = await prisma.transactions.findFirst({
      where: {
        monthly_income_source_user_id: userId,
        income_source: 'referral_income',
        description: {
          contains: `month ${previousMonthKey}`
        }
      }
    });
    
    if (!existingDistribution) {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: {
          full_name: true,
          email: true,
          sponsor_id: true
        }
      });
      
      eligibleUsers.push({
        userId: userId,
        user: user,
        totalMonthlyProfit: Number(userGroup._sum.amount)
      });
    }
  }
  
  return eligibleUsers;
}

/**
 * Distribute referral income for a user's monthly profit to their uplines
 */
async function distributeMonthlyReferralIncome(userInfo) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const userId = userInfo.userId;
      const monthlyProfit = userInfo.totalMonthlyProfit;
      const monthKey = getPreviousMonthKey();
      
      if (monthlyProfit <= 0) {
        return { success: true, message: 'No profit to distribute', monthlyProfit: 0, referralDistributions: [] };
      }
      
      // Get user info
      const user = userInfo.user;
      
      // Note: Monthly profit is already added to wallet via daily profits
      // We only distribute referral income here
      
      // Distribute REFERRAL INCOME from this user's OWN monthly profit to uplines
      const sponsorChain = await getSponsorChain(userId);
      const referralDistributions = [];
      
      for (const sponsor of sponsorChain) {
        const percentage = getReferralIncomePercentage(sponsor.level);
        if (percentage === 0) continue;
        
        const referralIncomeAmount = Number((monthlyProfit * percentage / 100).toFixed(2));
        
        if (referralIncomeAmount > 0) {
          // Add referral income to sponsor's withdrawable balance
          await tx.wallets.upsert({
            where: { user_id: sponsor.userId },
            create: { user_id: sponsor.userId, balance: referralIncomeAmount },
            update: { balance: { increment: referralIncomeAmount } }
          });
          
          // Create referral income transaction
          await tx.transactions.create({
            data: {
              user_id: sponsor.userId,
              amount: referralIncomeAmount,
              type: 'credit',
              income_source: 'referral_income',
              description: `Level ${sponsor.level} referral income (${percentage}%) from ${user?.full_name || user?.email}'s month ${monthKey} profit of $${monthlyProfit.toFixed(2)}`,
              status: 'COMPLETED',
              referral_level: sponsor.level,
              monthly_income_source_user_id: userId
            }
          });
          
          referralDistributions.push({
            sponsorId: sponsor.userId,
            level: sponsor.level,
            percentage: percentage,
            amount: referralIncomeAmount,
            name: sponsor.name
          });
        }
      }
      
      return {
        success: true,
        userId: userId,
        monthKey: monthKey,
        monthlyProfit: monthlyProfit,
        referralDistributions: referralDistributions,
        totalReferralDistributed: referralDistributions.reduce((sum, d) => sum + d.amount, 0)
      };
    });
    
    return result;
    
  } catch (error) {
    console.error('Error distributing monthly profit for deposit:', error);
    return { success: false, error: error.message, userId: userInfo.userId };
  }
}

/**
 * Process monthly referral income distribution for all eligible users
 * This should be called monthly (e.g., on the 1st of each month)
 * 
 * It will:
 * 1. Find all users who earned daily profits in the previous month
 * 2. Calculate their total monthly profit from daily profits
 * 3. Distribute referral income to their uplines
 */
async function processMonthlyProfitDistribution() {
  try {
    const previousMonthKey = getPreviousMonthKey();
    console.log('🔄 Starting monthly referral income distribution...');
    console.log(`📅 Processing month: ${previousMonthKey}`);
    console.log(`📅 Current date: ${new Date().toISOString()}\n`);
    
    // Get all eligible users
    const eligibleUsers = await getEligibleUsersForDistribution();
    
    console.log(`📊 Found ${eligibleUsers.length} users eligible for referral income distribution\n`);
    
    if (eligibleUsers.length === 0) {
      console.log('✅ No users eligible for distribution at this time.');
      return {
        success: true,
        usersProcessed: 0,
        totalUsers: 0,
        totalProfitDistributed: 0,
        totalReferralDistributed: 0,
        results: []
      };
    }
    
    const results = [];
    let totalProcessed = 0;
    let totalProfitDistributed = 0;
    let totalReferralDistributed = 0;
    
    for (const userInfo of eligibleUsers) {
      console.log(`Processing user ${userInfo.user.full_name} (Monthly profit: $${userInfo.totalMonthlyProfit.toFixed(2)})...`);
      
      const result = await distributeMonthlyReferralIncome(userInfo);
      
      if (result.success) {
        totalProcessed++;
        totalProfitDistributed += result.monthlyProfit || 0;
        totalReferralDistributed += result.totalReferralDistributed || 0;
        results.push(result);
        console.log(`  ✅ Distributed $${result.totalReferralDistributed.toFixed(2)} referral income to uplines`);
      } else {
        console.error(`  ❌ Failed to process user ${userInfo.userId}:`, result.error);
      }
    }
    
    console.log(`\n✅ Monthly referral income distribution complete:`);
    console.log(`   - Users processed: ${totalProcessed}/${eligibleUsers.length}`);
    console.log(`   - Total monthly profit (from daily): $${totalProfitDistributed.toFixed(2)}`);
    console.log(`   - Total referral income distributed: $${totalReferralDistributed.toFixed(2)}`);
    
    return {
      success: true,
      usersProcessed: totalProcessed,
      totalUsers: eligibleUsers.length,
      totalProfitDistributed: totalProfitDistributed,
      totalReferralDistributed: totalReferralDistributed,
      results: results
    };
    
  } catch (error) {
    console.error('Error in monthly profit distribution:', error);
    return { success: false, error: error.message };
  }
}

export {
  distributeMonthlyReferralIncome,
  processMonthlyProfitDistribution,
  getEligibleUsersForDistribution,
  calculateActualMonthlyProfit,
  getCurrentMonthKey,
  getPreviousMonthKey
};