import prisma from '../lib/prisma.js';

/**
 * Script to fix incorrect income data in the database
 * 
 * This script:
 * 1. Identifies all 'team_income' transactions that were incorrectly calculated
 * 2. Marks them as corrected (updates description to indicate they were from old system)
 * 3. Does NOT delete data (for audit trail)
 * 4. Optionally recalculates correct referral income
 * 
 * Usage: node api/src/scripts/fix-income-data.js [--dry-run] [--recalculate]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const RECALCULATE = process.argv.includes('--recalculate');

async function main() {
  console.log('🔍 Starting income data fix...');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Recalculate: ${RECALCULATE ? 'YES' : 'NO'}`);
  console.log('');
  
  try {
    // Step 1: Find all incorrect team_income transactions
    const incorrectTeamIncome = await prisma.transactions.findMany({
      where: {
        income_source: 'team_income',
        description: {
          not: { contains: '[CORRECTED]' } // Don't process already corrected ones
        }
      },
      orderBy: { timestamp: 'asc' }
    });
    
    console.log(`Found ${incorrectTeamIncome.length} team_income transactions to review`);
    
    // Calculate total amount that was incorrectly distributed
    const totalIncorrectAmount = incorrectTeamIncome.reduce(
      (sum, tx) => sum + Number(tx.amount), 
      0
    );
    
    console.log(`Total amount in old team_income system: $${totalIncorrectAmount.toFixed(2)}`);
    console.log('');
    
    // Group by user to see impact
    const userImpact = {};
    incorrectTeamIncome.forEach(tx => {
      if (!userImpact[tx.user_id]) {
        userImpact[tx.user_id] = { count: 0, total: 0 };
      }
      userImpact[tx.user_id].count++;
      userImpact[tx.user_id].total += Number(tx.amount);
    });
    
    console.log(`Impact across ${Object.keys(userImpact).length} users:`);
    Object.entries(userImpact)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 10)
      .forEach(([userId, data]) => {
        console.log(`  User ${userId}: ${data.count} transactions, $${data.total.toFixed(2)}`);
      });
    console.log('');
    
    if (!DRY_RUN) {
      console.log('📝 Updating transaction descriptions to mark as old system...');
      
      // Mark all old team_income transactions with [OLD SYSTEM] tag
      // We need to use raw SQL for this since Prisma doesn't support CONCAT in updateMany
      const teamIncomeResult = await prisma.$executeRaw`
        UPDATE "transactions"
        SET description = CONCAT('[OLD SYSTEM - INCORRECT CALCULATION] ', description)
        WHERE income_source = 'team_income'
        AND description NOT LIKE '%[OLD SYSTEM]%'
      `;
      
      console.log(`✅ Updated ${teamIncomeResult} team_income transaction descriptions`);
      
      // Mark all referral_income transactions that came from DEPOSITS (not monthly profits)
      // These have descriptions containing "deposit" which means they're wrong
      const referralFromDepositsResult = await prisma.$executeRaw`
        UPDATE "transactions"
        SET description = CONCAT('[OLD SYSTEM - FROM DEPOSIT, NOT PROFIT] ', description)
        WHERE income_source = 'referral_income'
        AND description LIKE '%deposit%'
        AND description NOT LIKE '%[OLD SYSTEM]%'
      `;
      
      console.log(`✅ Updated ${referralFromDepositsResult} referral_income (from deposits) transaction descriptions`);
      
      // Note: We do NOT deduct these amounts from wallets
      // The admin should decide whether to:
      // 1. Keep the old amounts as a "bonus"
      // 2. Manually adjust user balances
      // 3. Implement a gradual deduction system
      
      console.log('');
      console.log('⚠️  IMPORTANT NOTES:');
      console.log('   - Old team_income transactions have been marked but NOT removed');
      console.log('   - Old referral_income from deposits have been marked but NOT removed');
      console.log('   - User wallet balances have NOT been adjusted');
      console.log('   - Admin should review and decide on balance adjustments');
      console.log('   - New referral_income calculations will use correct logic going forward');
    }
    
    if (RECALCULATE) {
      console.log('');
      console.log('🔄 Recalculating correct referral income...');
      console.log('   This will create NEW referral_income transactions based on:');
      console.log('   - Users\' OWN monthly profits (not downline deposits)');
      console.log('   - Correct percentages: 10%, 5%, 3%, 2%, 1%, 0.5%... up to 20 levels');
      console.log('');
      console.log('   Note: This requires running the monthly profit distribution job');
      console.log('   Run: node api/src/scripts/run-monthly-jobs.js');
    }
    
    // Step 2: Verify direct_income transactions are correct
    console.log('');
    console.log('🔍 Checking direct_income transactions...');
    
    const directIncomeTransactions = await prisma.transactions.findMany({
      where: {
        income_source: 'direct_income'
      },
      orderBy: { timestamp: 'asc' }
    });
    
    console.log(`Found ${directIncomeTransactions.length} direct_income transactions`);
    
    // Check if any user received multiple direct_income from same person
    const directIncomeByPayer = {};
    
    for (const tx of directIncomeTransactions) {
      // Extract payer info from description
      const match = tx.description?.match(/from (.+?)'s first deposit/);
      if (match) {
        const payer = match[1];
        const key = `${tx.user_id}:${payer}`;
        
        if (!directIncomeByPayer[key]) {
          directIncomeByPayer[key] = [];
        }
        directIncomeByPayer[key].push(tx);
      }
    }
    
    // Find duplicates
    const duplicates = Object.entries(directIncomeByPayer)
      .filter(([, txs]) => txs.length > 1);
    
    if (duplicates.length > 0) {
      console.log('');
      console.log('⚠️  WARNING: Found potential duplicate direct_income transactions:');
      duplicates.forEach(([key, txs]) => {
        console.log(`  ${key}: ${txs.length} transactions`);
        txs.forEach(tx => {
          console.log(`    - ${tx.id}: $${tx.amount} on ${tx.timestamp}`);
        });
      });
      console.log('');
      console.log('   This may indicate users made multiple deposits when they should only');
      console.log('   get direct_income on FIRST deposit. Review manually.');
    } else {
      console.log('✅ Direct income transactions look correct (no duplicates found)');
    }
    
    console.log('');
    console.log('✅ Income data review complete!');
    console.log('');
    console.log('SUMMARY:');
    console.log(`  - Old team_income transactions: ${incorrectTeamIncome.length}`);
    console.log(`  - Total old team_income amount: $${totalIncorrectAmount.toFixed(2)}`);
    console.log(`  - Direct_income transactions: ${directIncomeTransactions.length}`);
    console.log(`  - Users affected: ${Object.keys(userImpact).length}`);
    console.log('');
    
    if (DRY_RUN) {
      console.log('This was a DRY RUN. No changes were made.');
      console.log('Run without --dry-run to apply changes.');
    } else {
      console.log('Changes have been applied.');
      console.log('Old team_income transactions are marked with [OLD SYSTEM] tag.');
      console.log('');
      console.log('NEXT STEPS:');
      console.log('1. Review the marked transactions in your database');
      console.log('2. Decide on balance adjustment strategy for affected users');
      console.log('3. Run monthly profit distribution to start generating correct referral_income');
      console.log('4. Monitor new referral_income transactions to ensure correctness');
    }
    
  } catch (error) {
    console.error('❌ Error during income data fix:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
