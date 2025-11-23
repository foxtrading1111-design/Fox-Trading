import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Set DATABASE_URL if passed as command line argument
if (process.argv[2]) {
  process.env.DATABASE_URL = process.argv[2];
}

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('\nUsage:');
  console.error('  node src/scripts/testMonthlyDistribution.js');
  console.error('  OR');
  console.error('  node src/scripts/testMonthlyDistribution.js "postgresql://..."');
  process.exit(1);
}

import prisma from '../lib/prisma.js';
import { processMonthlyProfitDistribution, getEligibleDepositsForDistribution, calculateCycleNumber } from '../services/monthlyProfitDistribution.js';

/**
 * Test script to manually trigger 30-day cycle referral income distribution
 * 
 * Usage: 
 *   node src/scripts/testMonthlyDistribution.js
 *   OR
 *   node src/scripts/testMonthlyDistribution.js "postgresql://user:pass@host/db"
 * 
 * This will:
 * 1. Find all deposits that have completed 30-day cycles (30, 60, 90 days, etc.)
 * 2. Calculate their 30-day profit (10% of deposit amount)
 * 3. Distribute referral income (10%, 5%, 3%, 2%, 1%, 0.5%...) to uplines
 * 
 * Example: User deposits $1,000 on Oct 10
 * - On Nov 9 (30 days): Cycle 1 complete, distribute referral income on $100
 * - On Dec 9 (60 days): Cycle 2 complete, distribute referral income on $100
 * - And so on until unlock_date
 */

async function testDistribution() {
  console.log('🧪 Testing Monthly Profit and Referral Income Distribution\n');
  console.log('='.repeat(60));
  
  try {
    const now = new Date();
    
    console.log('\n📅 Checking for eligible deposits...');
    console.log(`   Current date: ${now.toISOString()}\n`);
    
    // Use the service function to get eligible deposits
    const eligibleDeposits = await getEligibleDepositsForDistribution();
    
    console.log(`✅ Found ${eligibleDeposits.length} deposits eligible for 30-day cycle distribution\n`);
    
    if (eligibleDeposits.length === 0) {
      console.log('⚠️  No deposits eligible for distribution.');
      console.log('   No deposits have completed a 30-day cycle today.\n');
      return;
    }
    
    // Show deposit details
    console.log('📊 Eligible Deposit Details:');
    console.log('-'.repeat(80));
    eligibleDeposits.forEach((depositInfo, index) => {
      const cycleNum = calculateCycleNumber(depositInfo.timestamp, now);
      const daysSince = Math.floor((now - new Date(depositInfo.timestamp)) / (1000 * 60 * 60 * 24));
      console.log(`${index + 1}. User: ${depositInfo.users.full_name}`);
      console.log(`   Deposit ID: ${depositInfo.id}`);
      console.log(`   Amount: $${Number(depositInfo.amount).toFixed(2)}`);
      console.log(`   Deposit Date: ${new Date(depositInfo.timestamp).toISOString()}`);
      console.log(`   Days Since Deposit: ${daysSince}`);
      console.log(`   Cycle Number: ${cycleNum}`);
      console.log(`   30-Day Profit: $${depositInfo.monthlyProfit.toFixed(2)}`);
      console.log(`   Has Sponsor: ${depositInfo.users.sponsor_id ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // Ask for confirmation
    console.log('\n⚠️  This will distribute monthly profit and referral income.');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Run the distribution
    console.log('🚀 Starting distribution process...\n');
    const result = await processMonthlyProfitDistribution();
    
    if (result.success) {
      console.log('\n✅ Distribution completed successfully!\n');
      console.log('📈 Summary:');
      console.log('-'.repeat(80));
      console.log(`   Deposits processed: ${result.depositsProcessed}/${result.totalDeposits}`);
      console.log(`   Total 30-day profit: $${result.totalProfitDistributed.toFixed(2)}`);
      console.log(`   Total referral income: $${result.totalReferralDistributed.toFixed(2)}`);
      console.log('');
      
      // Show detailed results
      if (result.results && result.results.length > 0) {
        console.log('\n📋 Detailed Results:');
        console.log('-'.repeat(80));
        
        result.results.forEach((depositResult, index) => {
          if (depositResult.monthlyProfit > 0) {
            console.log(`\n${index + 1}. Deposit ID: ${depositResult.depositId}`);
            console.log(`   User ID: ${depositResult.userId}`);
            console.log(`   Cycle: ${depositResult.cycleNumber}`);
            console.log(`   30-Day Profit: $${depositResult.monthlyProfit.toFixed(2)}`);
            console.log(`   Referral Distributions: ${depositResult.referralDistributions.length} levels`);
            
            if (depositResult.referralDistributions.length > 0) {
              depositResult.referralDistributions.forEach(dist => {
                console.log(`      Level ${dist.level}: $${dist.amount.toFixed(2)} (${dist.percentage}%) → ${dist.name || 'Unknown'}`);
              });
            }
          }
        });
      }
    } else {
      console.log('\n❌ Distribution failed!');
      console.log(`   Error: ${result.error}\n`);
    }
    
  } catch (error) {
    console.error('\n❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n' + '='.repeat(60));
    console.log('Test completed.\n');
  }
}

// Run the test
testDistribution();
