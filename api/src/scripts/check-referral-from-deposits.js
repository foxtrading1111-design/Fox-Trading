import prisma from '../lib/prisma.js';

async function checkReferralFromDeposits() {
  console.log('🔍 Checking for referral_income transactions from deposits...\n');
  
  try {
    const result = await prisma.transactions.findMany({
      where: {
        income_source: 'referral_income',
        description: {
          contains: 'deposit'
        }
      },
      select: {
        id: true,
        user_id: true,
        amount: true,
        description: true,
        timestamp: true,
        referral_level: true
      },
      orderBy: { timestamp: 'desc' }
    });
    
    console.log(`Found ${result.length} referral_income transactions from deposits:\n`);
    
    if (result.length > 0) {
      const totalAmount = result.reduce((sum, tx) => sum + Number(tx.amount), 0);
      
      console.log('Details:');
      result.forEach((tx, index) => {
        console.log(`${index + 1}. User: ${tx.user_id}`);
        console.log(`   Amount: $${tx.amount}`);
        console.log(`   Level: ${tx.referral_level || 'N/A'}`);
        console.log(`   Date: ${tx.timestamp}`);
        console.log(`   Description: ${tx.description}`);
        console.log('');
      });
      
      console.log(`Total incorrect referral_income amount: $${totalAmount.toFixed(2)}`);
      console.log('');
      console.log('⚠️  These transactions should NOT exist!');
      console.log('   Referral income should only come from monthly profits, not deposits.');
      console.log('');
      console.log('To mark these as incorrect, run:');
      console.log('   node api/src/scripts/fix-income-data.js');
    } else {
      console.log('✅ No incorrect referral_income from deposits found!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReferralFromDeposits();
