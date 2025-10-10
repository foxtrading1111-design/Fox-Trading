import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateSimple() {
  console.log('🔄 Starting simplified data migration...');
  
  try {
    // Step 1: Set unlock dates for existing deposits (BEP20_deposit, etc.)
    console.log('\n🔒 Step 1: Setting unlock dates for deposits...');
    
    const depositUpdate = await prisma.transactions.updateMany({
      where: {
        AND: [
          { type: 'credit' },
          { 
            OR: [
              { income_source: 'BEP20_deposit' },
              { income_source: 'TRC20_deposit' },
              { income_source: 'BTC_deposit' },
              { income_source: 'ETH_deposit' },
              { income_source: { contains: 'deposit' } }
            ]
          },
          { unlock_date: null }
        ]
      },
      data: {
        unlock_date: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) // 6 months from now
      }
    });
    
    console.log(`✅ Updated ${depositUpdate.count} deposits with 6-month unlock dates`);
    
    // Step 2: Set immediate withdrawal for existing income
    console.log('\n💰 Step 2: Setting immediate withdrawal for income...');
    
    const incomeUpdate = await prisma.transactions.updateMany({
      where: {
        AND: [
          { type: 'credit' },
          { 
            OR: [
              { income_source: 'direct_income' },
              { income_source: 'team_income' },
              { income_source: 'salary_income' },
              { income_source: 'monthly_profit' },
              { income_source: { contains: 'income' } }
            ]
          },
          { unlock_date: null }
        ]
      },
      data: {
        unlock_date: new Date() // Immediately withdrawable
      }
    });
    
    console.log(`✅ Updated ${incomeUpdate.count} income transactions for immediate withdrawal`);
    
    // Step 3: Update direct income to have referral_level = 1
    console.log('\n📊 Step 3: Setting referral levels for direct income...');
    
    const directIncomeUpdate = await prisma.transactions.updateMany({
      where: {
        AND: [
          { income_source: 'direct_income' },
          { referral_level: null }
        ]
      },
      data: {
        referral_level: 1
      }
    });
    
    console.log(`✅ Updated ${directIncomeUpdate.count} direct income transactions with referral_level = 1`);
    
    // Step 4: Create performance indexes
    console.log('\n📈 Step 4: Adding performance indexes...');
    
    try {
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_unlock_date_user" 
        ON "transactions"("user_id", "unlock_date") 
        WHERE "unlock_date" IS NOT NULL;
      `;
      console.log('   ✅ Added unlock_date index');
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_income_source" 
        ON "transactions"("income_source", "type", "user_id");
      `;
      console.log('   ✅ Added income_source index');
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_referral_level" 
        ON "transactions"("referral_level", "user_id") 
        WHERE "referral_level" IS NOT NULL;
      `;
      console.log('   ✅ Added referral_level index');
      
    } catch (error) {
      console.log('   ⚠️ Some indexes may already exist, continuing...');
    }
    
    // Step 5: Validation
    console.log('\n✅ Step 5: Validating migrated data...');
    
    const validation = await prisma.$queryRaw`
      SELECT 
        "income_source",
        COUNT(*) as count,
        COUNT(CASE WHEN "unlock_date" IS NOT NULL THEN 1 END) as with_unlock_date,
        COUNT(CASE WHEN "unlock_date" > NOW() THEN 1 END) as currently_locked,
        SUM("amount") as total_amount
      FROM "transactions" 
      WHERE "type" = 'credit'
      GROUP BY "income_source" 
      ORDER BY count DESC;
    `;
    
    console.log('\n📊 Migration Results:');
    console.log('Income Source\t\tCount\tWith Unlock\tLocked\tTotal Amount');
    console.log('---------------------------------------------------------------');
    
    for (const row of validation) {
      console.log(`${row.income_source}\t${row.count}\t${row.with_unlock_date}\t${row.currently_locked}\t$${Number(row.total_amount).toFixed(2)}`);
    }
    
    console.log('\n🎉 Simple migration completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Deposits are now locked for 6 months from today');
    console.log('   - All income is immediately withdrawable');
    console.log('   - Direct income has referral_level = 1');
    console.log('   - Performance indexes added');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateSimple()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });