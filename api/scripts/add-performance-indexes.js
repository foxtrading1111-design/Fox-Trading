import prisma from '../src/lib/prisma.js';

async function addPerformanceIndexes() {
  try {
    console.log('🔧 Adding performance indexes...');
    
    // Add indexes for withdrawal eligibility queries
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_unlock_date" 
      ON "transactions"("user_id", "unlock_date") 
      WHERE "unlock_date" IS NOT NULL;
    `;
    console.log('✅ Added unlock_date index');
    
    // Add indexes for referral level queries  
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_referral_level" 
      ON "transactions"("user_id", "referral_level") 
      WHERE "referral_level" IS NOT NULL;
    `;
    console.log('✅ Added referral_level index');
    
    // Add index for team income tracking
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_monthly_source" 
      ON "transactions"("monthly_income_source_user_id") 
      WHERE "monthly_income_source_user_id" IS NOT NULL;
    `;
    console.log('✅ Added monthly_income_source_user_id index');
    
    // Add composite index for income source queries
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_income_source_status" 
      ON "transactions"("user_id", "income_source", "status", "timestamp" DESC);
    `;
    console.log('✅ Added income_source_status composite index');
    
    // Update existing deposits to have 6-month unlock date
    const result = await prisma.$executeRaw`
      UPDATE "transactions" 
      SET "unlock_date" = "timestamp" + INTERVAL '6 months'
      WHERE ("type" = 'DEPOSIT' AND "status" = 'COMPLETED') 
         OR ("type" = 'credit' AND "income_source" LIKE '%_deposit')
         AND "unlock_date" IS NULL;
    `;
    console.log(`✅ Updated ${result} existing deposit records with unlock dates`);
    
    console.log('🎉 Performance indexes added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding performance indexes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addPerformanceIndexes();
}

export { addPerformanceIndexes };