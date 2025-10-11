import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDailyIncome() {
  console.log('🧪 Testing Daily Income Calculation...\n');
  
  try {
    // Get a user with recent deposits
    const recentDeposits = await prisma.transactions.findFirst({
      where: {
        type: 'credit',
        income_source: { endsWith: '_deposit' }
      },
      orderBy: { timestamp: 'desc' },
      select: { user_id: true }
    });
    
    if (!recentDeposits) {
      console.log('No deposits found in database');
      return;
    }
    
    const userId = recentDeposits.user_id;
    console.log(`Testing for User ID: ${userId}\n`);
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get ALL credit transactions today (OLD WRONG WAY)
    const allCreditsToday = await prisma.transactions.findMany({
      where: {
        user_id: userId,
        type: 'credit',
        timestamp: { gte: today, lt: tomorrow }
      },
      select: {
        id: true,
        amount: true,
        income_source: true,
        timestamp: true
      }
    });
    
    // Get ONLY income transactions today (NEW CORRECT WAY)
    const incomeOnlyToday = await prisma.transactions.findMany({
      where: {
        user_id: userId,
        type: 'credit',
        timestamp: { gte: today, lt: tomorrow },
        income_source: { 
          in: ['direct_income', 'team_income', 'salary_income', 'daily_profit', 'monthly_profit']
        },
        status: 'COMPLETED'
      },
      select: {
        id: true,
        amount: true,
        income_source: true,
        timestamp: true
      }
    });
    
    console.log('📊 ALL Credit Transactions Today (OLD - WRONG):');
    console.log('================================================');
    let totalAllCredits = 0;
    for (const tx of allCreditsToday) {
      const amount = Number(tx.amount);
      totalAllCredits += amount;
      console.log(`  ${tx.income_source.padEnd(20)} | $${amount.toFixed(2)}`);
    }
    console.log(`  ${'TOTAL'.padEnd(20)} | $${totalAllCredits.toFixed(2)}`);
    console.log('  ⚠️  This includes deposits (WRONG)!\n');
    
    console.log('💰 ONLY Income Transactions Today (NEW - CORRECT):');
    console.log('===================================================');
    let totalIncomeOnly = 0;
    for (const tx of incomeOnlyToday) {
      const amount = Number(tx.amount);
      totalIncomeOnly += amount;
      console.log(`  ${tx.income_source.padEnd(20)} | $${amount.toFixed(2)}`);
    }
    console.log(`  ${'TOTAL'.padEnd(20)} | $${totalIncomeOnly.toFixed(2)}`);
    console.log('  ✅ This excludes deposits (CORRECT)!\n');
    
    // Get wallet balance
    const wallet = await prisma.wallets.findUnique({
      where: { user_id: userId }
    });
    
    console.log('💼 Total Wallet Balance:');
    console.log('========================');
    console.log(`  $${Number(wallet?.balance || 0).toFixed(2)}`);
    console.log('  ℹ️  This includes deposits + income - withdrawals\n');
    
    console.log('✅ Summary:');
    console.log('===========');
    console.log(`  Daily Income (should show): $${totalIncomeOnly.toFixed(2)}`);
    console.log(`  Total Balance (should show): $${Number(wallet?.balance || 0).toFixed(2)}`);
    console.log(`  \n  Daily Income should NOT include deposits!`);
    console.log(`  Total Balance SHOULD include deposits + income!`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDailyIncome();
