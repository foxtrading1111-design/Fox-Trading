import prisma from '../lib/prisma.js';

/**
 * ⚠️ DEPRECATED - DO NOT USE THIS SERVICE ⚠️
 * 
 * This service was calculating team income based on DOWNLINE DEPOSITS which is INCORRECT.
 * 
 * The correct logic is:
 * - DIRECT INCOME: One-time 10% commission when someone uses your referral code (first deposit only)
 * - REFERRAL INCOME: Portion of YOUR OWN monthly profit distributed to your uplines
 *   (NOT from downline deposits or downline profits)
 * 
 * Use these services instead:
 * - For Direct Income: See routes/investment.js (already implemented correctly)
 * - For Referral Income: Use monthlyProfitDistribution.js or workers.js runMonthlyReferralIncome()
 * 
 * OLD INCORRECT LOGIC (DO NOT USE):
 * - This was calculating team income based on downline deposits
 * - Level 1 (direct): 10% of monthly income
 * - Level 2: 5% of monthly income
 * - Level 3: 3% of monthly income
 * - Level 4: 2% of monthly income
 * - Level 5: 1% of monthly income
 * - Levels 6-20: 0.5% of monthly income each
 */

const TEAM_INCOME_PERCENTAGES = {
  1: 10,   // Level 1 (direct) - 10%
  2: 5,    // Level 2 - 5%
  3: 3,    // Level 3 - 3%
  4: 2,    // Level 4 - 2%
  5: 1,    // Level 5 - 1%
  // Levels 6-20 get 0.5% each
};

// Function to get team income percentage for a specific level
function getTeamIncomePercentage(level) {
  if (level <= 5) {
    return TEAM_INCOME_PERCENTAGES[level] || 0;
  } else if (level >= 6 && level <= 20) {
    return 0.5; // 0.5% for levels 6-20
  }
  return 0; // No income beyond level 20
}

/**
 * Recursively finds all sponsors up to 20 levels
 */
async function getSponsorChain(userId, maxLevels = 20) {
  const chain = [];
  let currentUserId = userId;
  let level = 1;
  
  while (currentUserId && level <= maxLevels) {
    const user = await prisma.users.findUnique({
      where: { id: currentUserId },
      select: { sponsor_id: true, full_name: true, email: true }
    });
    
    if (!user?.sponsor_id) break;
    
    chain.push({
      userId: user.sponsor_id,
      level: level,
      name: user.full_name,
      email: user.email
    });
    
    currentUserId = user.sponsor_id;
    level++;
  }
  
  return chain;
}

/**
 * Calculate monthly income from user's deposits (10% monthly = ~0.333% daily)
 */
async function calculateUserMonthlyIncome(userId) {
  // Get all user's deposits (completed transactions with unlock_date)
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
  
  // Calculate monthly income (10% of total deposits)
  const totalDeposits = deposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0);
  return totalDeposits * 0.10; // 10% monthly income
}

/**
 * Distribute team income for a specific user's monthly earnings
 */
async function distributeTeamIncome(userId) {
  try {
    // Get the user's monthly income
    const monthlyIncome = await calculateUserMonthlyIncome(userId);
    
    if (monthlyIncome <= 0) {
      return { success: true, message: 'No monthly income to distribute', distributions: [] };
    }
    
    // Get the sponsor chain (up to 20 levels)
    const sponsorChain = await getSponsorChain(userId);
    
    if (sponsorChain.length === 0) {
      return { success: true, message: 'No sponsors found', distributions: [] };
    }
    
    const distributions = [];
    
    // Process each level in the sponsor chain
    for (const sponsor of sponsorChain) {
      const percentage = getTeamIncomePercentage(sponsor.level);
      if (percentage === 0) continue;
      
      const teamIncomeAmount = Number((monthlyIncome * percentage / 100).toFixed(2));
      
      if (teamIncomeAmount > 0) {
        // Use transaction to ensure consistency
        await prisma.$transaction(async (tx) => {
          // Ensure sponsor has a wallet
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
              description: `Level ${sponsor.level} team income (${percentage}%) from ${sponsor.name || sponsor.email}'s monthly earnings`,
              status: 'COMPLETED',
              referral_level: sponsor.level,
              monthly_income_source_user_id: userId
            }
          });
        });
        
        distributions.push({
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
      message: `Distributed team income for ${distributions.length} levels`,
      distributions: distributions,
      totalDistributed: distributions.reduce((sum, d) => sum + d.amount, 0)
    };
    
  } catch (error) {
    console.error('Error distributing team income:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process monthly team income for all users with active deposits
 * This should be called monthly via a cron job
 */
async function processMonthlyTeamIncome() {
  try {
    console.log('🔄 Starting monthly team income processing...');
    
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
    let totalDistributed = 0;
    
    for (const userGroup of usersWithDeposits) {
      const userId = userGroup.user_id;
      const result = await distributeTeamIncome(userId);
      
      if (result.success) {
        totalProcessed++;
        totalDistributed += result.totalDistributed || 0;
        results.push({
          userId: userId,
          distributionsCount: result.distributions?.length || 0,
          totalDistributed: result.totalDistributed || 0
        });
      } else {
        console.error(`❌ Failed to process team income for user ${userId}:`, result.error);
      }
    }
    
    console.log(`✅ Monthly team income processing complete:`);
    console.log(`   - Users processed: ${totalProcessed}/${usersWithDeposits.length}`);
    console.log(`   - Total distributed: $${totalDistributed.toFixed(2)}`);
    
    return {
      success: true,
      usersProcessed: totalProcessed,
      totalUsers: usersWithDeposits.length,
      totalDistributed: totalDistributed,
      results: results
    };
    
  } catch (error) {
    console.error('Error in monthly team income processing:', error);
    return { success: false, error: error.message };
  }
}

export {
  distributeTeamIncome,
  processMonthlyTeamIncome,
  calculateUserMonthlyIncome,
  getSponsorChain
};