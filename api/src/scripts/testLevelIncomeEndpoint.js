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

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set!');
  process.exit(1);
}

import prisma from '../lib/prisma.js';

async function testLevelIncomeEndpoint() {
  // Get user email from command line (3rd argument)
  const userEmail = process.argv[3] || 'zahidali211@gmail.com';
  
  console.log(`🔍 Testing Level Income endpoint for: ${userEmail}\n`);
  console.log('='.repeat(80));
  
  try {
    // Find user
    const user = await prisma.users.findFirst({
      where: { email: userEmail }
    });
    
    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      return;
    }
    
    console.log(`\n✅ Found user: ${user.full_name} (${user.email})`);
    console.log(`   User ID: ${user.id}\n`);
    
    // Simulate the endpoint query
    const referralIncomeTransactions = await prisma.transactions.findMany({
      where: {
        user_id: user.id,
        type: 'credit',
        income_source: 'referral_income',
        status: 'COMPLETED',
        description: {
          not: { contains: '[OLD SYSTEM' } // Exclude old incorrect transactions
        }
      },
      orderBy: { timestamp: 'desc' }
    });
    
    const totalLevelIncome = referralIncomeTransactions.reduce(
      (sum, tx) => sum + Number(tx.amount), 0
    );
    
    console.log('📊 Level Income Endpoint Result:');
    console.log('-'.repeat(80));
    console.log(`Total Level Income: $${totalLevelIncome.toFixed(2)}`);
    console.log(`Number of Transactions: ${referralIncomeTransactions.length}\n`);
    
    console.log('Transactions included:');
    referralIncomeTransactions.forEach((tx, index) => {
      console.log(`${index + 1}. $${Number(tx.amount).toFixed(2)} - ${tx.description?.substring(0, 80)}`);
    });
    
    // Also check what would be excluded
    console.log('\n\n🚫 OLD SYSTEM Transactions (EXCLUDED):');
    console.log('-'.repeat(80));
    
    const oldSystemTransactions = await prisma.transactions.findMany({
      where: {
        user_id: user.id,
        type: 'credit',
        income_source: 'referral_income',
        status: 'COMPLETED',
        description: {
          contains: '[OLD SYSTEM'
        }
      },
      orderBy: { timestamp: 'desc' }
    });
    
    const oldSystemTotal = oldSystemTransactions.reduce(
      (sum, tx) => sum + Number(tx.amount), 0
    );
    
    console.log(`Total OLD SYSTEM Income (excluded): $${oldSystemTotal.toFixed(2)}`);
    console.log(`Number of OLD Transactions: ${oldSystemTransactions.length}\n`);
    
    oldSystemTransactions.forEach((tx, index) => {
      console.log(`${index + 1}. $${Number(tx.amount).toFixed(2)} - ${tx.description?.substring(0, 80)}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ NEW SYSTEM Total: $${totalLevelIncome.toFixed(2)}`);
    console.log(`❌ OLD SYSTEM Total: $${oldSystemTotal.toFixed(2)}`);
    console.log(`📊 GRAND TOTAL (if no filter): $${(totalLevelIncome + oldSystemTotal).toFixed(2)}`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\nTest completed.\n');
  }
}

testLevelIncomeEndpoint();
