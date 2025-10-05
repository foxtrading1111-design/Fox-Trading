import prisma from '../lib/prisma.js';
import { runMonthlyTradingBonus, runMonthlyReferralIncome } from '../jobs/workers.js';

async function testReferralIncome() {
  console.log('🚀 Testing Referral Income Calculation');
  console.log('=====================================\n');

  try {
    // First, let's check the current state
    console.log('📊 Current System State:');
    
    const userCount = await prisma.users.count();
    const investmentCount = await prisma.investments.count();
    const tradingBonusCount = await prisma.transactions.count({
      where: { income_source: 'trading_bonus' }
    });
    const referralIncomeCount = await prisma.transactions.count({
      where: { income_source: 'referral_income' }
    });

    console.log(`   Users: ${userCount}`);
    console.log(`   Investments: ${investmentCount}`);
    console.log(`   Trading Bonuses: ${tradingBonusCount}`);
    console.log(`   Referral Income Records: ${referralIncomeCount}\n`);

    // Show some sample data
    console.log('👥 User Network Structure:');
    const usersWithSponsor = await prisma.users.findMany({
      select: {
        id: true,
        full_name: true,
        email: true,
        sponsor_id: true,
        referral_code: true
      },
      orderBy: { created_at: 'asc' }
    });

    for (const user of usersWithSponsor) {
      if (user.sponsor_id) {
        const sponsor = await prisma.users.findUnique({
          where: { id: user.sponsor_id },
          select: { full_name: true, email: true }
        });
        console.log(`   ${user.full_name} (${user.email}) -> sponsored by ${sponsor?.full_name} (${sponsor?.email})`);
      } else {
        console.log(`   ${user.full_name} (${user.email}) -> ROOT USER`);
      }
    }

    console.log('\n💰 Recent Trading Bonuses:');
    const recentBonuses = await prisma.transactions.findMany({
      where: { income_source: 'trading_bonus' },
      orderBy: { timestamp: 'desc' },
      take: 5,
      include: {
        users: {
          select: { full_name: true, email: true }
        }
      }
    });

    if (recentBonuses.length === 0) {
      console.log('   No trading bonuses found. Running trading bonus calculation first...\n');
      
      await runMonthlyTradingBonus();
      
      console.log('   Checking for trading bonuses again...');
      const newBonuses = await prisma.transactions.findMany({
        where: { income_source: 'trading_bonus' },
        orderBy: { timestamp: 'desc' },
        take: 3,
        include: {
          users: {
            select: { full_name: true, email: true }
          }
        }
      });
      
      newBonuses.forEach(bonus => {
        console.log(`   $${bonus.amount} -> ${bonus.users.full_name} (${bonus.users.email}) at ${bonus.timestamp}`);
      });
    } else {
      recentBonuses.forEach(bonus => {
        console.log(`   $${bonus.amount} -> ${bonus.users.full_name} (${bonus.users.email}) at ${bonus.timestamp}`);
      });
    }

    console.log('\n🎯 Running Referral Income Calculation...');
    await runMonthlyReferralIncome();

    console.log('\n📈 Results After Referral Income Calculation:');
    const newReferralIncomeCount = await prisma.transactions.count({
      where: { income_source: 'referral_income' }
    });
    
    console.log(`   Referral Income Records: ${referralIncomeCount} -> ${newReferralIncomeCount} (${newReferralIncomeCount - referralIncomeCount} new)`);

    // Show recent referral income
    console.log('\n💸 Recent Referral Income:');
    const recentReferralIncome = await prisma.transactions.findMany({
      where: { income_source: 'referral_income' },
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: {
        users: {
          select: { full_name: true, email: true }
        }
      }
    });

    if (recentReferralIncome.length === 0) {
      console.log('   No referral income found. This might indicate:');
      console.log('   - No trading bonuses exist to calculate referral income from');
      console.log('   - No users have sponsors (referral relationships)');
      console.log('   - An error in the referral income calculation');
    } else {
      recentReferralIncome.forEach(income => {
        console.log(`   $${income.amount} -> ${income.users.full_name} (${income.users.email})`);
        console.log(`      Description: ${income.description}`);
        console.log(`      Time: ${income.timestamp}\n`);
      });
    }

    // Show wallet balances
    console.log('💳 Current Wallet Balances:');
    const wallets = await prisma.wallets.findMany({
      include: {
        users: {
          select: { full_name: true, email: true }
        }
      },
      orderBy: { balance: 'desc' }
    });

    wallets.forEach(wallet => {
      console.log(`   ${wallet.users.full_name}: $${wallet.balance}`);
    });

    console.log('\n✅ Referral Income Test Completed Successfully!');

  } catch (error) {
    console.error('❌ Error during referral income test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testReferralIncome();