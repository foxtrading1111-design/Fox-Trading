import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runMigration() {
  console.log('🔄 Starting data migration...');
  
  try {
    // Step 1: Update existing deposits
    console.log('📊 Converting existing deposits...');
    
    const result1 = await prisma.$executeRaw`
      UPDATE "transactions" 
      SET 
        "type" = 'credit',
        "income_source" = 'investment_deposit',
        "unlock_date" = "timestamp" + INTERVAL '6 months',
        "description" = CONCAT('Investment deposit - $', "amount", ' - locked for 6 months (migrated)')
      WHERE ("type" = 'DEPOSIT' AND "status" = 'COMPLETED') 
         OR ("type" = 'credit' AND "income_source" IN ('bep20_deposit', 'trc20_deposit', 'btc_deposit', 'eth_deposit'));
    `;
    
    console.log(`✅ Updated ${result1} deposit transactions`);
    
    // Step 2: Convert referral_income to direct_income for first entries per user
    console.log('🔄 Converting referral income to direct income...');
    
    // First, identify the earliest referral_income for each user
    const result2 = await prisma.$executeRaw`
      UPDATE "transactions" 
      SET "income_source" = 'direct_income', "referral_level" = 1
      WHERE "id" IN (
        SELECT DISTINCT ON ("user_id") "id"
        FROM "transactions" 
        WHERE "income_source" = 'referral_income' 
          AND "type" = 'credit'
        ORDER BY "user_id", "timestamp" ASC
      );
    `;
    
    console.log(`✅ Converted ${result2} referral income to direct income`);
    
    // Step 3: Remove duplicate referral income
    console.log('🧹 Removing duplicate referral income...');
    
    const result3 = await prisma.$executeRaw`
      DELETE FROM "transactions" 
      WHERE "income_source" = 'referral_income' 
        AND "type" = 'credit';
    `;
    
    console.log(`✅ Removed ${result3} duplicate referral transactions`);
    
    // Step 4: Add initial monthly profits for users with deposits
    console.log('💰 Creating initial monthly profits...');
    
    // Get users with investment deposits
    const usersWithDeposits = await prisma.$queryRaw`
      SELECT "user_id", SUM("amount") as total_deposits
      FROM "transactions" 
      WHERE "income_source" = 'investment_deposit' 
        AND "type" = 'credit' 
        AND "status" = 'COMPLETED'
      GROUP BY "user_id"
    `;
    
    console.log(`Found ${usersWithDeposits.length} users with deposits`);
    
    for (const user of usersWithDeposits) {
      const monthlyProfit = Number(user.total_deposits) * 0.10;
      
      if (monthlyProfit > 0) {
        // Add to wallet
        await prisma.wallets.upsert({
          where: { user_id: user.user_id },
          create: { user_id: user.user_id, balance: monthlyProfit },
          update: { balance: { increment: monthlyProfit } }
        });
        
        // Create transaction
        await prisma.transactions.create({
          data: {
            user_id: user.user_id,
            amount: monthlyProfit,
            type: 'credit',
            income_source: 'monthly_profit',
            description: `Initial monthly profit (10%) - $${monthlyProfit.toFixed(2)}`,
            status: 'COMPLETED'
          }
        });
        
        console.log(`   Created $${monthlyProfit.toFixed(2)} monthly profit for user ${user.user_id}`);
      }
    }
    
    // Step 5: Validation
    console.log('✅ Validating results...');
    
    const counts = await Promise.all([
      prisma.transactions.count({ where: { income_source: 'investment_deposit' } }),
      prisma.transactions.count({ where: { income_source: 'direct_income' } }),
      prisma.transactions.count({ where: { income_source: 'monthly_profit' } })
    ]);
    
    console.log('📊 Final counts:');
    console.log(`   - Investment deposits: ${counts[0]}`);
    console.log(`   - Direct income: ${counts[1]}`);
    console.log(`   - Monthly profits: ${counts[2]}`);
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
runMigration();