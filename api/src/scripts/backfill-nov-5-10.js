import 'dotenv/config';
import prisma from '../lib/prisma.js';

/**
 * Backfill Daily Profits for November 5-10, 2025
 * 
 * This script distributes daily investment profits for the days when the database was down.
 * It calculates 0.333% daily profit for each user's deposits for each missing day.
 */

const MONTHLY_PROFIT_RATE = 0.10; // 10% monthly
const DAYS_IN_MONTH = 30;
const DAILY_PROFIT_RATE = MONTHLY_PROFIT_RATE / DAYS_IN_MONTH; // ~0.00333 per day

// Missing days (in IST timezone)
const MISSING_DAYS = [
  { date: '2025-11-05', label: 'Nov 5' },
  { date: '2025-11-06', label: 'Nov 6' },
  { date: '2025-11-07', label: 'Nov 7' },
  { date: '2025-11-08', label: 'Nov 8' },
  { date: '2025-11-09', label: 'Nov 9' },
  { date: '2025-11-10', label: 'Nov 10' },
];

/**
 * Calculate total deposits for a user
 */
async function getUserDeposits(userId) {
  const deposits = await prisma.transactions.findMany({
    where: {
      user_id: userId,
      OR: [
        { type: 'DEPOSIT', status: 'COMPLETED' },
        { type: 'credit', income_source: { endsWith: '_deposit' } }
      ],
      status: 'COMPLETED'
    },
    select: { amount: true }
  });
  
  return deposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0);
}

/**
 * Check if profit already exists for a user on a specific date
 */
async function profitExistsForDate(userId, date) {
  // Convert date string to UTC timestamp range
  // IST is UTC+5:30, so Nov 5 00:00 IST = Nov 4 18:30 UTC
  const istOffset = 5.5 * 60 * 60 * 1000;
  const dateIST = new Date(date + 'T00:00:00.000+05:30');
  const startUTC = new Date(dateIST.getTime() - istOffset);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
  
  const existing = await prisma.transactions.findFirst({
    where: {
      user_id: userId,
      income_source: 'daily_profit',
      timestamp: {
        gte: startUTC,
        lt: endUTC
      },
      status: 'COMPLETED'
    }
  });
  
  return !!existing;
}

/**
 * Create daily profit transaction for a specific date
 */
async function createProfitForDate(userId, userName, totalDeposits, date, dateLabel) {
  const dailyProfit = Number((totalDeposits * DAILY_PROFIT_RATE).toFixed(2));
  
  if (dailyProfit <= 0) {
    return { success: false, reason: 'No deposits' };
  }
  
  // Check if already distributed
  const exists = await profitExistsForDate(userId, date);
  if (exists) {
    return { success: false, reason: 'Already exists', amount: dailyProfit };
  }
  
  // Create timestamp for the date (12:01 AM IST)
  const timestamp = new Date(date + 'T00:01:00.000+05:30');
  
  try {
    await prisma.transactions.create({
      data: {
        user_id: userId,
        amount: dailyProfit,
        type: 'credit',
        income_source: 'daily_profit',
        description: `Daily investment profit (${(DAILY_PROFIT_RATE * 100).toFixed(3)}% per day) - $${dailyProfit.toFixed(2)} [BACKFILLED for ${dateLabel}]`,
        status: 'COMPLETED',
        timestamp: timestamp,
        unlock_date: timestamp // Immediately available
      }
    });
    
    return { success: true, amount: dailyProfit };
  } catch (error) {
    console.error(`❌ Error creating profit for user ${userId} on ${dateLabel}:`, error.message);
    return { success: false, reason: error.message };
  }
}

/**
 * Main backfill function
 */
async function backfillMissingProfits() {
  console.log('🔄 Starting backfill for November 5-10, 2025...\n');
  
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
    
    console.log(`📊 Found ${usersWithDeposits.length} users with deposits\n`);
    
    const results = {
      totalUsers: usersWithDeposits.length,
      totalDays: MISSING_DAYS.length,
      transactionsCreated: 0,
      transactionsSkipped: 0,
      totalProfitDistributed: 0,
      details: []
    };
    
    // Process each user
    for (const userGroup of usersWithDeposits) {
      const userId = userGroup.user_id;
      
      // Get user info
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { full_name: true, email: true }
      });
      
      const userName = user?.full_name || user?.email || userId;
      
      // Calculate total deposits
      const totalDeposits = await getUserDeposits(userId);
      const expectedDailyProfit = Number((totalDeposits * DAILY_PROFIT_RATE).toFixed(2));
      
      console.log(`\n👤 User: ${userName}`);
      console.log(`   Deposits: $${totalDeposits.toFixed(2)}`);
      console.log(`   Daily Profit: $${expectedDailyProfit.toFixed(2)}`);
      
      const userResults = {
        userId,
        userName,
        totalDeposits,
        daysProcessed: 0,
        daysSkipped: 0,
        totalProfit: 0
      };
      
      // Process each missing day
      for (const day of MISSING_DAYS) {
        const result = await createProfitForDate(
          userId, 
          userName, 
          totalDeposits, 
          day.date, 
          day.label
        );
        
        if (result.success) {
          userResults.daysProcessed++;
          userResults.totalProfit += result.amount;
          results.transactionsCreated++;
          results.totalProfitDistributed += result.amount;
          console.log(`   ✅ ${day.label}: $${result.amount.toFixed(2)}`);
        } else {
          userResults.daysSkipped++;
          results.transactionsSkipped++;
          console.log(`   ⏭️  ${day.label}: ${result.reason}`);
        }
      }
      
      results.details.push(userResults);
      console.log(`   📊 Total for user: $${userResults.totalProfit.toFixed(2)} (${userResults.daysProcessed} days)`);
    }
    
    // Print summary
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('📋 BACKFILL SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Users processed:          ${results.totalUsers}`);
    console.log(`Days backfilled:          ${results.totalDays}`);
    console.log(`Transactions created:     ${results.transactionsCreated}`);
    console.log(`Transactions skipped:     ${results.transactionsSkipped}`);
    console.log(`Total profit distributed: $${results.totalProfitDistributed.toFixed(2)}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    return results;
    
  } catch (error) {
    console.error('❌ Error in backfill process:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillMissingProfits()
  .then(() => {
    console.log('✅ Backfill completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  });
