import prisma from '../lib/prisma.js';
import { processMonthlyProfitDistribution, getEligibleUsersForDistribution, getPreviousMonthKey } from '../services/monthlyProfitDistribution.js';

/**
 * Test script to manually trigger monthly referral income distribution
 * 
 * Usage: node src/scripts/testMonthlyDistribution.js
 * 
 * This will:
 * 1. Find all users who earned daily profits in the previous month
 * 2. Calculate their ACTUAL monthly profit from daily profit transactions
 * 3. Distribute referral income (10%, 5%, 3%, 2%, 1%, 0.5%...) to uplines
 * 
 * Example: User deposits $100 on Oct 10, then $100 more on Oct 20
 * - Oct 10-19: Daily profit = $0.333 × 10 days = $3.33
 * - Oct 20-31: Daily profit = $0.666 × 12 days = $7.99
 * - Total October profit = $11.32
 * - On Nov 1st: Uplines get referral income based on $11.32
 */

async function testDistribution() {
  console.log('🧪 Testing Monthly Profit and Referral Income Distribution\n');
  console.log('='.repeat(60));
  
  try {
    const now = new Date();
    const previousMonthKey = getPreviousMonthKey();
    
    console.log('\n📅 Checking for eligible users...');
    console.log(`   Current date: ${now.toISOString()}`);
    console.log(`   Processing month: ${previousMonthKey}\n`);
    
    // Use the service function to get eligible users
    const eligibleUsers = await getEligibleUsersForDistribution();
    
    console.log(`✅ Found ${eligibleUsers.length} users eligible for referral income distribution\n`);
    
    if (eligibleUsers.length === 0) {
      console.log('⚠️  No users eligible for distribution.');
      console.log('   Either no users earned daily profits last month, or all have been processed.\n');
      return;
    }
    
    // Show user details
    console.log('📊 Eligible User Details:');
    console.log('-'.repeat(80));
    eligibleUsers.forEach((userInfo, index) => {
      console.log(`${index + 1}. User: ${userInfo.user.full_name}`);
      console.log(`   User ID: ${userInfo.userId}`);
      console.log(`   Total Monthly Profit (from daily): $${userInfo.totalMonthlyProfit.toFixed(2)}`);
      console.log(`   Has Sponsor: ${userInfo.user.sponsor_id ? 'Yes' : 'No'}`);
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
      console.log(`   Users processed: ${result.usersProcessed}/${result.totalUsers}`);
      console.log(`   Total monthly profit (from daily): $${result.totalProfitDistributed.toFixed(2)}`);
      console.log(`   Total referral income: $${result.totalReferralDistributed.toFixed(2)}`);
      console.log('');
      
      // Show detailed results
      if (result.results && result.results.length > 0) {
        console.log('\n📋 Detailed Results:');
        console.log('-'.repeat(80));
        
        result.results.forEach((userResult, index) => {
          if (userResult.monthlyProfit > 0) {
            console.log(`\n${index + 1}. User ID: ${userResult.userId}`);
            console.log(`   Month: ${userResult.monthKey}`);
            console.log(`   Monthly Profit (from daily): $${userResult.monthlyProfit.toFixed(2)}`);
            console.log(`   Referral Distributions: ${userResult.referralDistributions.length} levels`);
            
            if (userResult.referralDistributions.length > 0) {
              userResult.referralDistributions.forEach(dist => {
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
