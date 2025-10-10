import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

/**
 * Migration script to update existing data to match new income structure
 */

async function migrateExistingData() {
  try {
    console.log('🔄 Starting data migration for new income structure...');
    
    // Step 1: Convert existing deposits to proper investment_deposit format
    console.log('\n📊 Step 1: Converting existing deposits...');
    
    // Find all existing deposits that need conversion
    const existingDeposits = await prisma.transactions.findMany({
      where: {
        OR: [
          { type: 'DEPOSIT', status: 'COMPLETED' },
          { 
            type: 'credit', 
            income_source: { 
              in: ['bep20_deposit', 'trc20_deposit', 'btc_deposit', 'eth_deposit'] 
            } 
          }
        ]
      },
      orderBy: { timestamp: 'asc' }
    });
    
    console.log(`   Found ${existingDeposits.length} existing deposits to convert`);
    
    let convertedDeposits = 0;
    for (const deposit of existingDeposits) {
      // Convert to investment_deposit with 6-month lock
      const unlockDate = new Date(deposit.timestamp);
      unlockDate.setMonth(unlockDate.getMonth() + 6);
      
      await prisma.transactions.update({
        where: { id: deposit.id },
        data: {
          type: 'credit',
          income_source: 'investment_deposit',
          description: `Investment deposit - $${deposit.amount} - locked for 6 months (migrated)`,
          unlock_date: unlockDate
        }
      });
      
      convertedDeposits++;
    }
    
    console.log(`   ✅ Converted ${convertedDeposits} deposits to investment_deposit format`);
    
    // Step 2: Clean up duplicate/incorrect referral income
    console.log('\n🧹 Step 2: Cleaning up existing referral income...');
    
    // Find users who have received multiple direct income payments (should be one-time only)
    const duplicateDirectIncome = await prisma.transactions.groupBy({
      by: ['user_id'],
      where: {
        income_source: 'direct_income',
        type: 'credit'
      },
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } }
    });
    
    console.log(`   Found ${duplicateDirectIncome.length} users with duplicate direct income`);
    
    // For each user with duplicates, keep only the first (oldest) direct income
    for (const user of duplicateDirectIncome) {
      const directIncomeTransactions = await prisma.transactions.findMany({
        where: {
          user_id: user.user_id,
          income_source: 'direct_income',
          type: 'credit'
        },
        orderBy: { timestamp: 'asc' }
      });
      
      // Keep the first, remove the rest
      const toRemove = directIncomeTransactions.slice(1);
      for (const tx of toRemove) {
        await prisma.transactions.delete({
          where: { id: tx.id }
        });
        
        // Also remove from wallet balance
        await prisma.wallets.update({
          where: { user_id: user.user_id },
          data: { balance: { decrement: tx.amount } }
        });
      }
      
      console.log(`   ✅ Removed ${toRemove.length} duplicate direct income transactions for user ${user.user_id}`);
    }
    
    // Step 3: Convert old referral_income to proper direct_income format
    console.log('\n🔄 Step 3: Converting old referral income...');
    
    const oldReferralIncome = await prisma.transactions.findMany({
      where: {
        income_source: 'referral_income',
        type: 'credit'
      }
    });
    
    console.log(`   Found ${oldReferralIncome.length} old referral income transactions`);
    
    // Group by user and convert only first-level referrals to direct_income
    const userReferralGroups = oldReferralIncome.reduce((acc, tx) => {
      if (!acc[tx.user_id]) {
        acc[tx.user_id] = [];
      }
      acc[tx.user_id].push(tx);
      return acc;
    }, {});
    
    for (const [userId, transactions] of Object.entries(userReferralGroups)) {
      // Convert first transaction to direct_income, remove others
      const [firstTx, ...otherTx] = transactions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      if (firstTx) {
        await prisma.transactions.update({
          where: { id: firstTx.id },
          data: {
            income_source: 'direct_income',
            referral_level: 1,
            description: `One-time direct income (10%) - migrated from old referral system`
          }
        });
        console.log(`   ✅ Converted first referral income to direct_income for user ${userId}`);
      }
      
      // Remove other referral transactions
      for (const tx of otherTx) {
        await prisma.transactions.delete({
          where: { id: tx.id }
        });
        
        // Remove from wallet balance
        await prisma.wallets.update({
          where: { user_id: userId },
          data: { balance: { decrement: tx.amount } }
        }).catch(() => {}); // Ignore if wallet doesn't exist
      }
      
      if (otherTx.length > 0) {
        console.log(`   ✅ Removed ${otherTx.length} duplicate referral transactions for user ${userId}`);
      }
    }
    
    // Step 4: Create initial monthly profit for existing deposits
    console.log('\n💰 Step 4: Creating initial monthly profit for existing deposits...');
    
    // Get all users with investment deposits
    const usersWithDeposits = await prisma.transactions.groupBy({
      by: ['user_id'],
      where: {
        type: 'credit',
        income_source: 'investment_deposit',
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    });
    
    console.log(`   Found ${usersWithDeposits.length} users with investment deposits`);
    
    let monthlyProfitsCreated = 0;
    for (const userGroup of usersWithDeposits) {
      const totalDeposits = Number(userGroup._sum.amount);
      const monthlyProfit = totalDeposits * 0.10; // 10% monthly profit
      
      if (monthlyProfit > 0) {
        // Add to wallet balance
        await prisma.wallets.upsert({
          where: { user_id: userGroup.user_id },
          create: { user_id: userGroup.user_id, balance: monthlyProfit },
          update: { balance: { increment: monthlyProfit } }
        });
        
        // Create monthly profit transaction
        await prisma.transactions.create({
          data: {
            user_id: userGroup.user_id,
            amount: monthlyProfit,
            type: 'credit',
            income_source: 'monthly_profit',
            description: `Initial monthly investment profit (10%) - $${monthlyProfit.toFixed(2)} from $${totalDeposits} deposits`,
            status: 'COMPLETED'
          }
        });
        
        monthlyProfitsCreated++;
        console.log(`   ✅ Created monthly profit of $${monthlyProfit.toFixed(2)} for user ${userGroup.user_id}`);
      }
    }
    
    console.log(`   ✅ Created ${monthlyProfitsCreated} monthly profit entries`);
    
    // Step 5: Update existing team income to be sourced from monthly profits
    console.log('\n🏗️ Step 5: Updating team income structure...');
    
    // Remove old team income that doesn't match new structure
    const oldTeamIncome = await prisma.transactions.deleteMany({
      where: {
        income_source: 'team_income',
        monthly_income_source_user_id: null // Old team income without source tracking
      }
    });
    
    console.log(`   ✅ Removed ${oldTeamIncome.count} old team income entries`);
    
    // Step 6: Update indexes and constraints
    console.log('\n📈 Step 6: Adding performance indexes...');
    
    try {
      // Add indexes for better performance (ignore if already exist)
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_unlock_date_new" 
        ON "transactions"("user_id", "unlock_date") 
        WHERE "unlock_date" IS NOT NULL;
      `;
      console.log('   ✅ Added unlock_date index');
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_referral_level_new" 
        ON "transactions"("user_id", "referral_level") 
        WHERE "referral_level" IS NOT NULL;
      `;
      console.log('   ✅ Added referral_level index');
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_monthly_source_new" 
        ON "transactions"("monthly_income_source_user_id") 
        WHERE "monthly_income_source_user_id" IS NOT NULL;
      `;
      console.log('   ✅ Added monthly_income_source_user_id index');
      
    } catch (error) {
      console.log('   ⚠️ Some indexes may already exist, continuing...');
    }
    
    // Step 7: Data validation
    console.log('\n✅ Step 7: Validating migrated data...');
    
    const stats = await Promise.all([
      prisma.transactions.count({ where: { income_source: 'investment_deposit' } }),
      prisma.transactions.count({ where: { income_source: 'direct_income' } }),
      prisma.transactions.count({ where: { income_source: 'monthly_profit' } }),
      prisma.transactions.count({ where: { income_source: 'team_income' } }),
      prisma.transactions.count({ where: { unlock_date: { not: null } } })
    ]);
    
    console.log('\n📊 Migration Summary:');
    console.log(`   - Investment deposits: ${stats[0]}`);
    console.log(`   - Direct income entries: ${stats[1]}`);
    console.log(`   - Monthly profit entries: ${stats[2]}`);
    console.log(`   - Team income entries: ${stats[3]}`);
    console.log(`   - Transactions with unlock dates: ${stats[4]}`);
    
    console.log('\n🎉 Data migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Test the new dashboard');
    console.log('   3. Run monthly profit distribution: POST /api/user/admin/distribute-monthly-profits');
    console.log('   4. Verify withdrawal eligibility with new lock system');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateExistingData()
    .then(() => {
      console.log('\n✅ Migration script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateExistingData };