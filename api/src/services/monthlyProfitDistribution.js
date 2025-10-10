import prisma from '../lib/prisma.js';
import { getSponsorChain } from './teamIncome.js';

/**
 * Monthly Investment Profit Distribution Service
 * 
 * Logic:
 * 1. For each user with active deposits, calculate 10% monthly profit
 * 2. Add the profit to user's withdrawable balance
 * 3. Distribute percentages of this profit to team members up the chain
 * 
 * Team Income Distribution from Monthly Profit:
 * - Level 1 (Direct): 10% of monthly profit
 * - Level 2: 5% of monthly profit
 * - Level 3: 3% of monthly profit
 * - Level 4: 2% of monthly profit
 * - Level 5: 1% of monthly profit
 * - Levels 6-20: 0.5% each of monthly profit
 */

const TEAM_INCOME_PERCENTAGES = {
  1: 10,   // Level 1 (direct) - 10%
  2: 5,    // Level 2 - 5%
  3: 3,    // Level 3 - 3%
  4: 2,    // Level 4 - 2%
  5: 1,    // Level 5 - 1%
  // Levels 6-20 get 0.5% each
};

function getTeamIncomePercentage(level) {
  if (level <= 5) {
    return TEAM_INCOME_PERCENTAGES[level] || 0;
  } else if (level >= 6 && level <= 20) {
    return 0.5; // 0.5% for levels 6-20
  }
  return 0; // No income beyond level 20
}

/**
 * Calculate monthly profit for a specific user
 */
async function calculateUserMonthlyProfit(userId) {
  // Get all user's active deposits (locked investments)
  const deposits = await prisma.transactions.findMany({
    where: {
      user_id: userId,
      type: 'credit',
      income_source: 'investment_deposit',
      status: 'COMPLETED',
      unlock_date: { not: null }
    },
    select: { amount: true, timestamp: true }
  });
  
  // Calculate total deposit amount
  const totalDeposits = deposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0);
  
  // Monthly profit is 10% of total deposits
  return totalDeposits * 0.10; // 10% monthly profit
}

/**
 * Distribute monthly profit to user and team
 */
async function distributeMonthlyProfit(userId) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Calculate user's monthly profit
      const monthlyProfit = await calculateUserMonthlyProfit(userId);
      
      if (monthlyProfit <= 0) {
        return { success: true, message: 'No profit to distribute', monthlyProfit: 0, teamDistributions: [] };
      }
      
      // Get user info
      const user = await tx.users.findUnique({
        where: { id: userId },
        select: { full_name: true, email: true }
      });
      
      // Add monthly profit to user's withdrawable balance
      await tx.wallets.upsert({
        where: { user_id: userId },
        create: { user_id: userId, balance: monthlyProfit },
        update: { balance: { increment: monthlyProfit } }
      });
      
      // Create monthly profit transaction for user
      await tx.transactions.create({
        data: {
          user_id: userId,
          amount: monthlyProfit,
          type: 'credit',
          income_source: 'monthly_profit',
          description: `Monthly investment profit (10%) - $${monthlyProfit.toFixed(2)}`,
          status: 'COMPLETED'
        }
      });
      
      // Distribute team income from this user's monthly profit
      const sponsorChain = await getSponsorChain(userId);
      const teamDistributions = [];
      
      for (const sponsor of sponsorChain) {
        const percentage = getTeamIncomePercentage(sponsor.level);
        if (percentage === 0) continue;
        
        const teamIncomeAmount = Number((monthlyProfit * percentage / 100).toFixed(2));
        
        if (teamIncomeAmount > 0) {
          // Add team income to sponsor's withdrawable balance
          await tx.wallets.upsert({
            where: { user_id: sponsor.userId },
            create: { user_id: sponsor.userId, balance: teamIncomeAmount },
            update: { balance: { increment: teamIncomeAmount } }
          });
          
          // Create team income transaction
          await tx.transactions.create({
            data: {
              user_id: sponsor.userId,
              amount: teamIncomeAmount,
              type: 'credit',
              income_source: 'team_income',
              description: `Level ${sponsor.level} team income (${percentage}%) from ${user?.full_name || user?.email}'s monthly profit of $${monthlyProfit.toFixed(2)}`,
              status: 'COMPLETED',
              referral_level: sponsor.level,
              monthly_income_source_user_id: userId
            }
          });
          
          teamDistributions.push({
            sponsorId: sponsor.userId,
            level: sponsor.level,
            percentage: percentage,
            amount: teamIncomeAmount,
            name: sponsor.name
          });
        }
      }
      
      return {
        success: true,
        userId: userId,
        monthlyProfit: monthlyProfit,
        teamDistributions: teamDistributions,
        totalTeamDistributed: teamDistributions.reduce((sum, d) => sum + d.amount, 0)
      };
    });
    
    return result;
    
  } catch (error) {
    console.error('Error distributing monthly profit:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process monthly profit distribution for all users with active deposits
 * This should be called monthly via a cron job
 */
async function processMonthlyProfitDistribution() {
  try {
    console.log('🔄 Starting monthly profit distribution...');
    
    // Get all users with active deposits
    const usersWithDeposits = await prisma.transactions.groupBy({
      by: ['user_id'],
      where: {
        type: 'credit',
        income_source: 'investment_deposit',
        status: 'COMPLETED',
        unlock_date: { not: null }
      },
      _sum: { amount: true }
    });
    
    console.log(`📊 Found ${usersWithDeposits.length} users with active deposits`);
    
    const results = [];
    let totalProcessed = 0;
    let totalProfitDistributed = 0;
    let totalTeamDistributed = 0;
    
    for (const userGroup of usersWithDeposits) {
      const userId = userGroup.user_id;
      const result = await distributeMonthlyProfit(userId);
      
      if (result.success) {
        totalProcessed++;
        totalProfitDistributed += result.monthlyProfit || 0;
        totalTeamDistributed += result.totalTeamDistributed || 0;
        results.push(result);
      } else {
        console.error(`❌ Failed to process monthly profit for user ${userId}:`, result.error);
      }
    }
    
    console.log(`✅ Monthly profit distribution complete:`);
    console.log(`   - Users processed: ${totalProcessed}/${usersWithDeposits.length}`);
    console.log(`   - Total profit distributed: $${totalProfitDistributed.toFixed(2)}`);
    console.log(`   - Total team income distributed: $${totalTeamDistributed.toFixed(2)}`);
    
    return {
      success: true,
      usersProcessed: totalProcessed,
      totalUsers: usersWithDeposits.length,
      totalProfitDistributed: totalProfitDistributed,
      totalTeamDistributed: totalTeamDistributed,
      results: results
    };
    
  } catch (error) {
    console.error('Error in monthly profit distribution:', error);
    return { success: false, error: error.message };
  }
}

export {
  distributeMonthlyProfit,
  processMonthlyProfitDistribution,
  calculateUserMonthlyProfit
};