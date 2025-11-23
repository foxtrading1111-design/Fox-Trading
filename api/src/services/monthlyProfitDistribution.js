import prisma from '../lib/prisma.js';
import { getSponsorChain } from './teamIncome.js';

/**
 * Monthly Investment Profit Distribution Service
 * 
 * Logic:
 * 1. Check each deposit for 30-day completion cycles
 * 2. Calculate daily profits earned in the past 30 days for that deposit
 * 3. Distribute REFERRAL INCOME based on those profits to uplines
 * 4. Track distributions per deposit to avoid duplicates
 * 
 * REFERRAL INCOME Distribution (from user's 30-day profit per deposit):
 * - Level 1: 10% of user's 30-day profit
 * - Level 2: 5% of user's 30-day profit
 * - Level 3: 3% of user's 30-day profit
 * - Level 4: 2% of user's 30-day profit
 * - Level 5: 1% of user's 30-day profit
 * - Levels 6-20: 0.5% each of user's 30-day profit
 * 
 * Example: User deposits $1,000 on Oct 10
 * - Oct 10 - Nov 9: Daily profit = $3.33 × 30 days = $99.90
 * - On Nov 10: Uplines get referral income based on $99.90
 * - Nov 10 - Dec 9: Daily profit = $3.33 × 30 days = $99.90
 * - On Dec 10: Uplines get referral income based on $99.90
 * - And so on until unlock_date
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
 * Calculate which 30-day cycle this is for a deposit
 * Returns the cycle number (1, 2, 3, etc.) based on deposit date
 */
function calculateCycleNumber(depositDate, currentDate = new Date()) {
  const deposit = new Date(depositDate);
  const current = new Date(currentDate);
  
  // Calculate days difference
  const daysDiff = Math.floor((current - deposit) / (1000 * 60 * 60 * 24));
  
  // Calculate cycle number (every 30 days)
  const cycleNumber = Math.floor(daysDiff / 30);
  
  return cycleNumber;
}

/**
 * Check if today is the distribution day for a deposit (30, 60, 90 days, etc.)
 */
function isDistributionDay(depositDate, currentDate = new Date()) {
  const deposit = new Date(depositDate);
  const current = new Date(currentDate);
  
  // Calculate days since deposit
  const daysSince = Math.floor((current - deposit) / (1000 * 60 * 60 * 24));
  
  // Check if it's exactly a multiple of 30 days
  return daysSince > 0 && daysSince % 30 === 0;
}

/**
 * Get all cycles that should be distributed for a deposit
 * Returns array of cycle numbers that haven't been distributed yet
 */
async function getPendingCycles(depositId, userId, depositDate, currentDate = new Date()) {
  const deposit = new Date(depositDate);
  const current = new Date(currentDate);
  
  // Calculate days since deposit
  const daysSince = Math.floor((current - deposit) / (1000 * 60 * 60 * 24));
  
  // Calculate how many complete 30-day cycles have passed
  const completedCycles = Math.floor(daysSince / 30);
  
  if (completedCycles < 1) return [];
  
  // Check which cycles have already been distributed
  const pendingCycles = [];
  
  for (let cycle = 1; cycle <= completedCycles; cycle++) {
    const existingDistribution = await prisma.transactions.findFirst({
      where: {
        user_id: userId,
        income_source: 'referral_income',
        description: {
          contains: `Cycle ${cycle} from deposit ${depositId}`
        }
      }
    });
    
    if (!existingDistribution) {
      pendingCycles.push(cycle);
    }
  }
  
  return pendingCycles;
}

/**
 * Calculate 30-day profit for a specific deposit
 * This looks at the daily profits earned from this deposit in the past 30 days
 */
async function calculate30DayProfit(depositId, depositAmount, depositDate) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Daily profit rate: 10% monthly / 30 days = 0.333% per day
  const dailyProfitRate = 0.10 / 30;
  const dailyProfit = Number(depositAmount) * dailyProfitRate;
  
  // Calculate profit for 30 days
  const profit30Days = dailyProfit * 30;
  
  return {
    totalProfit: Number(profit30Days.toFixed(2)),
    dailyProfit: Number(dailyProfit.toFixed(2)),
    days: 30
  };
}

/**
 * Get deposits eligible for 30-day cycle distribution
 * A deposit is eligible if:
 * 1. It has completed at least one 30-day cycle
 * 2. Referral income hasn't been distributed for ALL completed cycles yet
 * 3. It's still locked (before unlock_date)
 * 
 * This will catch up on ALL missed cycles, not just today's milestone
 */
async function getEligibleDepositsForDistribution() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Get all active deposits that are at least 30 days old
  const deposits = await prisma.transactions.findMany({
    where: {
      type: 'credit',
      income_source: { 
        in: ['investment_deposit', 'BEP20_deposit', 'TRC20_deposit'] // Support all deposit types
      },
      status: 'COMPLETED',
      unlock_date: { 
        not: null,
        gt: now // Still locked
      },
      timestamp: { lte: thirtyDaysAgo } // At least 30 days old
    },
    include: {
      users: {
        select: {
          full_name: true,
          email: true,
          sponsor_id: true
        }
      }
    },
    orderBy: {
      timestamp: 'asc'
    }
  });
  
  const eligibleDeposits = [];
  
  for (const deposit of deposits) {
    // Get all pending cycles for this deposit
    const pendingCycles = await getPendingCycles(
      deposit.id,
      deposit.user_id,
      deposit.timestamp,
      now
    );
    
    if (pendingCycles.length === 0) continue;
    
    // Add each pending cycle as a separate distribution task
    for (const cycleNumber of pendingCycles) {
      const profitData = await calculate30DayProfit(
        deposit.id,
        deposit.amount,
        deposit.timestamp
      );
      
      eligibleDeposits.push({
        ...deposit,
        cycleNumber: cycleNumber,
        monthlyProfit: profitData.totalProfit
      });
    }
  }
  
  return eligibleDeposits;
}

/**
 * Distribute referral income for a deposit's 30-day profit to uplines
 */
async function distributeMonthlyReferralIncome(depositInfo) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const userId = depositInfo.user_id;
      const monthlyProfit = depositInfo.monthlyProfit;
      const cycleNumber = depositInfo.cycleNumber;
      const depositId = depositInfo.id;
      
      if (monthlyProfit <= 0) {
        return { success: true, message: 'No profit to distribute', monthlyProfit: 0, referralDistributions: [] };
      }
      
      // Get user info
      const user = depositInfo.users;
      
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
              description: `Level ${sponsor.level} referral income (${percentage}%) from ${user?.full_name || user?.email}'s Cycle ${cycleNumber} from deposit ${depositId} - $${monthlyProfit.toFixed(2)}`,
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
        depositId: depositId,
        cycleNumber: cycleNumber,
        monthlyProfit: monthlyProfit,
        referralDistributions: referralDistributions,
        totalReferralDistributed: referralDistributions.reduce((sum, d) => sum + d.amount, 0)
      };
    });
    
    return result;
    
  } catch (error) {
    console.error('Error distributing monthly profit for deposit:', error);
    return { success: false, error: error.message, depositId: depositInfo.id };
  }
}

/**
 * Process monthly referral income distribution for all eligible deposits
 * This should be called DAILY to check for 30-day cycle completions
 * 
 * It will:
 * 1. Find all deposits that completed a 30-day cycle today
 * 2. Calculate their 30-day profit
 * 3. Distribute referral income to uplines
 */
async function processMonthlyProfitDistribution() {
  try {
    console.log('🔄 Starting 30-day cycle referral income distribution...');
    console.log(`📅 Current date: ${new Date().toISOString()}\n`);
    
    // Get all eligible deposits
    const eligibleDeposits = await getEligibleDepositsForDistribution();
    
    console.log(`📊 Found ${eligibleDeposits.length} deposits eligible for distribution\n`);
    
    if (eligibleDeposits.length === 0) {
      console.log('✅ No deposits eligible for distribution at this time.');
      return {
        success: true,
        depositsProcessed: 0,
        totalDeposits: 0,
        totalProfitDistributed: 0,
        totalReferralDistributed: 0,
        results: []
      };
    }
    
    const results = [];
    let totalProcessed = 0;
    let totalProfitDistributed = 0;
    let totalReferralDistributed = 0;
    
    for (const depositInfo of eligibleDeposits) {
      console.log(`Processing deposit ${depositInfo.id} (Cycle ${depositInfo.cycleNumber}) for ${depositInfo.users.full_name} - $${depositInfo.monthlyProfit.toFixed(2)}...`);
      
      const result = await distributeMonthlyReferralIncome(depositInfo);
      
      if (result.success) {
        totalProcessed++;
        totalProfitDistributed += result.monthlyProfit || 0;
        totalReferralDistributed += result.totalReferralDistributed || 0;
        results.push(result);
        console.log(`  ✅ Distributed $${result.totalReferralDistributed.toFixed(2)} referral income to uplines`);
      } else {
        console.error(`  ❌ Failed to process deposit ${depositInfo.id}:`, result.error);
      }
    }
    
    console.log(`\n✅ 30-day cycle referral income distribution complete:`);
    console.log(`   - Deposits processed: ${totalProcessed}/${eligibleDeposits.length}`);
    console.log(`   - Total 30-day profit: $${totalProfitDistributed.toFixed(2)}`);
    console.log(`   - Total referral income distributed: $${totalReferralDistributed.toFixed(2)}`);
    
    return {
      success: true,
      depositsProcessed: totalProcessed,
      totalDeposits: eligibleDeposits.length,
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
  getEligibleDepositsForDistribution,
  calculate30DayProfit,
  calculateCycleNumber,
  getPendingCycles
};