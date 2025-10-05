import prisma from '../lib/prisma.js';

async function test3LevelReferralIncome() {
  console.log('🧪 Testing 3-Level Referral Income (10%, 5%, 3%)');
  console.log('===============================================\n');

  try {
    // Check current system state
    console.log('📊 System Overview:');
    const stats = {
      users: await prisma.users.count(),
      totalReferralIncome: await prisma.transactions.aggregate({
        where: { 
          OR: [
            { income_source: 'direct_income' },
            { income_source: 'referral_income' }
          ]
        },
        _sum: { amount: true },
        _count: true
      })
    };
    
    console.log(`   Users in system: ${stats.users}`);
    console.log(`   Total referral transactions: ${stats.totalReferralIncome._count || 0}`);
    console.log(`   Total referral amount: $${stats.totalReferralIncome._sum.amount || 0}\n`);

    // Show user hierarchy
    console.log('👥 User Referral Chain:');
    const users = await prisma.users.findMany({
      select: {
        id: true,
        full_name: true,
        email: true,
        sponsor_id: true
      },
      orderBy: { created_at: 'asc' }
    });

    // Build hierarchy map
    const userMap = new Map(users.map(u => [u.id, u]));
    
    // Find root users (no sponsor)
    const rootUsers = users.filter(u => !u.sponsor_id);
    
    function displayHierarchy(userId, level = 0) {
      const user = userMap.get(userId);
      if (!user) return;
      
      const indent = '  '.repeat(level);
      const levelLabel = level === 0 ? 'ROOT' : `L${level}`;
      console.log(`${indent}${levelLabel}: ${user.full_name} (${user.email})`);
      
      // Find children
      const children = users.filter(u => u.sponsor_id === userId);
      children.forEach(child => displayHierarchy(child.id, level + 1));
    }
    
    rootUsers.forEach(root => displayHierarchy(root.id));

    // Simulate a $1000 investment and show expected referral income
    console.log('\n💰 Expected Referral Income for $1000 Investment:');
    console.log('   Level 1 (Direct): $100 (10%)');
    console.log('   Level 2:          $50  (5%)');
    console.log('   Level 3:          $30  (3%)');
    console.log('   Total Referral:   $180 (18%)\n');

    // Show recent referral income transactions
    console.log('💸 Recent Referral Income Transactions:');
    const recentTransactions = await prisma.transactions.findMany({
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
      take: 10
    });

    if (recentTransactions.length === 0) {
      console.log('   No referral income transactions found yet.');
      console.log('   💡 Make an investment or approve a deposit to see referral income!');
    } else {
      recentTransactions.forEach((tx, index) => {
        const percentage = tx.income_source === 'direct_income' ? '10%' : 
                          tx.description.includes('Level 2') ? '5%' : 
                          tx.description.includes('Level 3') ? '3%' : 'Unknown%';
        
        console.log(`   ${index + 1}. $${tx.amount} (${percentage}) -> ${tx.users.full_name}`);
        console.log(`      Type: ${tx.income_source}`);
        console.log(`      Time: ${tx.timestamp}`);
        console.log(`      Description: ${tx.description}\n`);
      });
    }

    // Show current wallet balances
    console.log('💳 Current Wallet Balances:');
    const wallets = await prisma.wallets.findMany({
      where: { balance: { gt: 0 } },
      include: {
        users: {
          select: { full_name: true, email: true }
        }
      },
      orderBy: { balance: 'desc' }
    });

    if (wallets.length === 0) {
      console.log('   No wallets with balance found.');
    } else {
      wallets.forEach(wallet => {
        console.log(`   ${wallet.users.full_name}: $${wallet.balance}`);
      });
    }

    console.log('\n✅ 3-Level Referral Income Test Completed!');
    console.log('\n🔬 How to Test:');
    console.log('1. Make sure you have users with sponsor relationships');
    console.log('2. Make an investment through /app/invest/package');
    console.log('3. Or make a deposit and approve it via admin panel');
    console.log('4. Check wallet balances - should see 10%, 5%, 3% referral income');
    
    console.log('\n🎯 Testing APIs:');
    console.log('- GET  /api/testing/deposit-status');
    console.log('- POST /api/testing/approve-first-deposit');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test3LevelReferralIncome();