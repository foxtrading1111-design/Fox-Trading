import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWithdrawalLogic() {
  console.log('🧪 Testing Withdrawal Logic (Deposit vs Income)...\n');
  
  try {
    // Get a user with recent activity
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
    
    // 1. Calculate Total Deposits (for Total Balance on dashboard)
    const totalDeposits = await prisma.transactions.aggregate({
      _sum: { amount: true },
      where: {
        user_id: userId,
        OR: [
          { type: 'DEPOSIT', status: 'COMPLETED' },
          { type: 'credit', income_source: { endsWith: '_deposit' } }
        ],
        status: 'COMPLETED'
      }
    });
    
    // 2. Calculate Withdrawable Income (for Withdrawal Income page)
    const withdrawableIncome = await prisma.transactions.aggregate({
      _sum: { amount: true },
      where: {
        user_id: userId,
        type: 'credit',
        unlock_date: { lte: new Date() },
        OR: [
          { income_source: 'direct_income' },
          { income_source: 'team_income' },
          { income_source: 'salary_income' },
          { income_source: 'monthly_profit' },
          { income_source: { contains: 'income' } }
        ],
        status: 'COMPLETED'
      }
    });
    
    // 3. Calculate already withdrawn income
    const withdrawnIncome = await prisma.transactions.aggregate({
      _sum: { amount: true },
      where: {
        user_id: userId,
        type: 'debit',
        income_source: { in: ['withdrawal', 'income_withdrawal'] },
        status: { in: ['COMPLETED', 'PENDING'] }
      }
    });
    
    // 4. Calculate locked deposits (with unlock_date in future)
    const lockedDeposits = await prisma.transactions.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: {
        user_id: userId,
        type: 'credit',
        income_source: { endsWith: '_deposit' },
        unlock_date: { gt: new Date() },
        status: 'COMPLETED'
      }
    });
    
    // 5. Calculate unlocked deposits (eligible for withdrawal after 6 months)
    const unlockedDeposits = await prisma.transactions.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: {
        user_id: userId,
        type: 'credit',
        income_source: { endsWith: '_deposit' },
        unlock_date: { lte: new Date() },
        status: 'COMPLETED'
      }
    });
    
    const totalDepositsAmount = Number(totalDeposits._sum.amount || 0);
    const totalWithdrawableIncome = Number(withdrawableIncome._sum.amount || 0);
    const totalWithdrawnIncome = Number(withdrawnIncome._sum.amount || 0);
    const availableIncomeBalance = Math.max(0, totalWithdrawableIncome - totalWithdrawnIncome);
    const lockedDepositsAmount = Number(lockedDeposits._sum.amount || 0);
    const unlockedDepositsAmount = Number(unlockedDeposits._sum.amount || 0);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    DASHBOARD VIEW                          ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Total Balance (Main Dashboard):        $${totalDepositsAmount.toFixed(2)}`);
    console.log(`   └─ What it shows: Total amount deposited through website`);
    console.log(`   └─ Purpose: Show user's total investment\n`);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('              WITHDRAWAL INCOME PAGE                        ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`💰 Available Balance (Withdrawal Income):  $${availableIncomeBalance.toFixed(2)}`);
    console.log(`   └─ What it shows: Withdrawable profits (income - withdrawn)`);
    console.log(`   └─ Sources: Referral, Team, Salary, Monthly Profits`);
    console.log(`   └─ Lock: None (immediate withdrawal)`);
    console.log(`   └─ Calculation:`);
    console.log(`      • Total Income Earned:              $${totalWithdrawableIncome.toFixed(2)}`);
    console.log(`      • Already Withdrawn:                $${totalWithdrawnIncome.toFixed(2)}`);
    console.log(`      • Available:                        $${availableIncomeBalance.toFixed(2)}\n`);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('           WITHDRAWAL INVESTMENT PAGE                       ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`🔒 Locked Deposits (6-month lock):        $${lockedDepositsAmount.toFixed(2)}`);
    console.log(`   └─ Transactions: ${lockedDeposits._count.id}`);
    console.log(`   └─ Status: Cannot withdraw yet\n`);
    
    console.log(`🔓 Unlocked Deposits (eligible):          $${unlockedDepositsAmount.toFixed(2)}`);
    console.log(`   └─ Transactions: ${unlockedDeposits._count.id}`);
    console.log(`   └─ Status: Can withdraw after 6 months\n`);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                      SUMMARY                               ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Dashboard "Total Balance":             $${totalDepositsAmount.toFixed(2)}`);
    console.log(`   (Shows total deposited investment)`);
    console.log(``);
    console.log(`✅ Withdrawal Income "Available Balance": $${availableIncomeBalance.toFixed(2)}`);
    console.log(`   (Shows withdrawable profits - no lock)`);
    console.log(``);
    console.log(`✅ Withdrawal Investment "Locked":        $${lockedDepositsAmount.toFixed(2)}`);
    console.log(`   (Deposits locked for 6 months)`);
    console.log(``);
    console.log(`✅ Withdrawal Investment "Eligible":      $${unlockedDepositsAmount.toFixed(2)}`);
    console.log(`   (Deposits past 6-month lock period)`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Show income breakdown
    const incomeBreakdown = await prisma.transactions.groupBy({
      by: ['income_source'],
      _sum: { amount: true },
      where: {
        user_id: userId,
        type: 'credit',
        income_source: { 
          in: ['direct_income', 'team_income', 'salary_income', 'monthly_profit', 'daily_profit']
        },
        status: 'COMPLETED'
      }
    });
    
    if (incomeBreakdown.length > 0) {
      console.log('💵 Income Breakdown (Withdrawable Sources):');
      console.log('═══════════════════════════════════════════════════════════');
      for (const item of incomeBreakdown) {
        const amount = Number(item._sum.amount || 0);
        console.log(`   ${item.income_source.padEnd(20)} $${amount.toFixed(2)}`);
      }
      console.log(`   ${'TOTAL'.padEnd(20)} $${totalWithdrawableIncome.toFixed(2)}`);
      console.log('═══════════════════════════════════════════════════════════\n');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWithdrawalLogic();
