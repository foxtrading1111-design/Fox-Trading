import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWalletBalance() {
  console.log('🧪 Testing Wallet Balance Overview Fix...\n');
  
  try {
    // Get a user with deposits
    const recentDeposit = await prisma.transactions.findFirst({
      where: {
        type: 'credit',
        income_source: { endsWith: '_deposit' }
      },
      orderBy: { timestamp: 'desc' },
      select: { user_id: true }
    });
    
    if (!recentDeposit) {
      console.log('No deposits found');
      return;
    }
    
    const userId = recentDeposit.user_id;
    console.log(`Testing for User ID: ${userId}\n`);
    
    // NEW CALCULATION (matching the fixed endpoint)
    
    // 1. Total Balance = Total Deposits
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
    
    // 2. Locked = Locked Deposits (6-month lock)
    const lockedDeposits = await prisma.transactions.aggregate({
      _sum: { amount: true },
      where: {
        user_id: userId,
        type: 'credit',
        income_source: { endsWith: '_deposit' },
        unlock_date: { gt: new Date() },
        status: 'COMPLETED'
      }
    });
    
    // 3. Withdrawable = Unlocked Income - Withdrawn
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
    
    const totalWithdrawn = await prisma.transactions.aggregate({
      _sum: { amount: true },
      where: {
        user_id: userId,
        type: 'debit',
        income_source: { in: ['withdrawal', 'income_withdrawal'] },
        status: { in: ['COMPLETED', 'PENDING'] }
      }
    });
    
    const totalBalance = Number(totalDeposits._sum.amount || 0);
    const lockedBalance = Number(lockedDeposits._sum.amount || 0);
    const totalWithdrawableIncome = Number(withdrawableIncome._sum.amount || 0);
    const totalWithdrawnAmount = Number(totalWithdrawn._sum.amount || 0);
    const withdrawableBalance = Math.max(0, totalWithdrawableIncome - totalWithdrawnAmount);
    const withdrawalFee = 1.00;
    const netWithdrawable = Math.max(0, withdrawableBalance - withdrawalFee);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('           WALLET BALANCE OVERVIEW (FIXED)                 ');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('📊 Total Balance (Deposits):     $' + totalBalance.toFixed(2));
    console.log('   └─ What it shows: Total amount deposited through website\n');
    
    console.log('🔓 Withdrawable (Income):        $' + withdrawableBalance.toFixed(2));
    console.log('   └─ Total Income Earned:       $' + totalWithdrawableIncome.toFixed(2));
    console.log('   └─ Already Withdrawn:         $' + totalWithdrawnAmount.toFixed(2));
    console.log('   └─ Available to Withdraw:     $' + withdrawableBalance.toFixed(2) + '\n');
    
    console.log('🔒 Locked (Deposits):            $' + lockedBalance.toFixed(2));
    console.log('   └─ What it shows: Deposits locked for 6 months\n');
    
    console.log('💵 Net Withdrawable:             $' + netWithdrawable.toFixed(2));
    console.log('   └─ Withdrawable - Fee ($1):   $' + netWithdrawable.toFixed(2) + '\n');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    VERIFICATION                            ');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Get old wallet balance for comparison
    const wallet = await prisma.wallets.findUnique({
      where: { user_id: userId }
    });
    
    console.log('OLD Total Balance (wallet.balance): $' + Number(wallet?.balance || 0).toFixed(2));
    console.log('  ❌ This included deposits + income\n');
    
    console.log('NEW Total Balance (deposits only):  $' + totalBalance.toFixed(2));
    console.log('  ✅ This shows only deposits\n');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Page should show:');
    console.log('  Total Balance:      $' + totalBalance.toFixed(2));
    console.log('  Withdrawable:       $' + withdrawableBalance.toFixed(2));
    console.log('  Locked:             $' + lockedBalance.toFixed(2));
    console.log('  Net Withdrawable:   $' + netWithdrawable.toFixed(2));
    console.log('═══════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWalletBalance();
