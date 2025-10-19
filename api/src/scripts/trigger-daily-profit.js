import { processDailyProfitDistribution } from '../services/dailyProfitDistribution.js';

/**
 * Manual script to trigger daily profit distribution
 * Run with: node src/scripts/trigger-daily-profit.js
 */

async function main() {
  console.log('🚀 Manually triggering daily profit distribution for October 16th...\n');
  
  try {
    const result = await processDailyProfitDistribution();
    
    if (result.success) {
      console.log('\n✅ SUCCESS! Daily profit distribution completed');
      console.log('═══════════════════════════════════════════════════');
      console.log(`📊 Users processed: ${result.usersProcessed}/${result.totalUsers}`);
      console.log(`⏭️  Already distributed: ${result.alreadyDistributedCount}`);
      console.log(`💰 Total profit distributed: $${result.totalProfitDistributed?.toFixed(2) || '0.00'}`);
      console.log('═══════════════════════════════════════════════════\n');
    } else {
      console.error('\n❌ FAILED! Daily profit distribution failed:', result.error);
    }
  } catch (error) {
    console.error('\n❌ ERROR! Failed to run daily profit distribution:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
