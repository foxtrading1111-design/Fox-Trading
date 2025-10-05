import prisma from '../lib/prisma.js';

async function testDepositReferralIncome() {
  console.log('🧪 Testing Deposit Referral Income');
  console.log('==================================\n');

  try {
    // 1. Check current system state
    console.log('📊 Current System State:');
    const stats = {
      users: await prisma.users.count(),
      pendingDeposits: await prisma.transactions.count({
        where: { 
          status: 'PENDING',
          income_source: { contains: '_deposit' }
        }
      }),
      completedDeposits: await prisma.transactions.count({
        where: { 
          status: 'COMPLETED',
          income_source: { contains: '_deposit' }
        }
      }),
      directIncome: await prisma.transactions.count({
        where: { income_source: 'direct_income' }
      }),
      referralIncome: await prisma.transactions.count({
        where: { income_source: 'referral_income' }
      })
    };
    
    console.log(`   Users: ${stats.users}`);
    console.log(`   Pending Deposits: ${stats.pendingDeposits}`);
    console.log(`   Completed Deposits: ${stats.completedDeposits}`);
    console.log(`   Direct Income: ${stats.directIncome}`);
    console.log(`   Referral Income: ${stats.referralIncome}\n`);

    // 2. Show user network structure
    console.log('👥 User Network Structure:');
    const users = await prisma.users.findMany({
      select: {
        id: true,
        full_name: true,
        email: true,
        sponsor_id: true,
        referral_code: true
      },
      orderBy: { created_at: 'asc' }
    });

    const userMap = new Map(users.map(u => [u.id, u]));
    
    for (const user of users) {
      const sponsor = user.sponsor_id ? userMap.get(user.sponsor_id) : null;
      const sponsorInfo = sponsor ? `${sponsor.full_name} (${sponsor.email})` : 'ROOT USER';
      console.log(`   ${user.full_name} (${user.email}) <- ${sponsorInfo}`);
    }

    // 3. Show pending deposits that could be approved
    console.log('\n💰 Pending Deposit Transactions:');
    const pendingDeposits = await prisma.transactions.findMany({
      where: { 
        status: 'PENDING',
        income_source: { contains: '_deposit' }
      },
      include: {
        users: {
          select: { full_name: true, email: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    if (pendingDeposits.length === 0) {
      console.log('   No pending deposits found.');
      console.log('   💡 To test: Create a deposit through the frontend or API.');
    } else {
      pendingDeposits.forEach((deposit, index) => {
        console.log(`   ${index + 1}. $${deposit.amount} from ${deposit.users.full_name} (${deposit.users.email})`);
        console.log(`      ID: ${deposit.id}, Blockchain: ${deposit.income_source}`);
        console.log(`      Created: ${deposit.timestamp}\n`);
      });
    }

    // 4. Show recent referral income
    console.log('💸 Recent Referral Income Transactions:');
    const recentReferralIncome = await prisma.transactions.findMany({
      where: { 
        OR: [
          { income_source: 'direct_income' },
          { income_source: 'referral_income' }
        ]
      },
      include: {
        users: {
          select: { full_name: true, email: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    });

    if (recentReferralIncome.length === 0) {
      console.log('   No referral income transactions found.');
      console.log('   💡 This will be populated when deposits are approved by admin.');
    } else {
      recentReferralIncome.forEach((income, index) => {
        console.log(`   ${index + 1}. $${income.amount} -> ${income.users.full_name} (${income.users.email})`);
        console.log(`      Type: ${income.income_source}`);
        console.log(`      Description: ${income.description}`);
        console.log(`      Time: ${income.timestamp}\n`);
      });
    }

    // 5. Show wallet balances
    console.log('💳 Current Wallet Balances:');
    const wallets = await prisma.wallets.findMany({
      include: {
        users: {
          select: { full_name: true, email: true }
        }
      },
      orderBy: { balance: 'desc' }
    });

    if (wallets.length === 0) {
      console.log('   No wallets found.');
    } else {
      wallets.forEach(wallet => {
        console.log(`   ${wallet.users.full_name}: $${wallet.balance}`);
      });
    }

    // 6. Simulate deposit approval if there are pending deposits
    if (pendingDeposits.length > 0) {
      console.log('\n🔧 Want to test deposit approval? Use these commands:');
      console.log('   API Endpoint: POST /api/admin/deposits/approve/:transactionId');
      console.log('   Example transactions you can approve:');
      
      pendingDeposits.slice(0, 3).forEach(deposit => {
        console.log(`   - Transaction ID: ${deposit.id} ($${deposit.amount} from ${deposit.users.full_name})`);
      });
    }

    console.log('\n✅ Deposit Referral Income Test Completed!');
    console.log('\n📋 How to test the full flow:');
    console.log('1. User makes a deposit (creates PENDING transaction)');
    console.log('2. Admin approves the deposit');
    console.log('3. Referral income is automatically distributed to sponsors');
    console.log('4. Check wallet balances and transaction history for referral income');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDepositReferralIncome();