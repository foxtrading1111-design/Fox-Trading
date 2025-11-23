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

async function checkUserIncome() {
  // Get user email from command line (3rd argument)
  const userEmail = process.argv[3];
  
  if (!userEmail) {
    console.error('❌ Please provide user email as 3rd argument');
    console.error('Usage: node src/scripts/checkUserIncome.js "DATABASE_URL" "user@email.com"');
    process.exit(1);
  }
  
  console.log(`🔍 Checking income for user: ${userEmail}\n`);
  console.log('='.repeat(80));
  
  try {
    // Find user
    const user = await prisma.users.findFirst({
      where: {
        email: userEmail
      }
    });
    
    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      return;
    }
    
    console.log(`\n✅ Found user: ${user.full_name} (${user.email})`);
    console.log(`   User ID: ${user.id}\n`);
    
    // Get all income transactions
    const allIncome = await prisma.transactions.findMany({
      where: {
        user_id: user.id,
        type: 'credit',
        income_source: {
          not: { endsWith: '_deposit' }
        },
        status: 'COMPLETED'
      },
      orderBy: {
        timestamp: 'desc'
      }
    });
    
    console.log(`📊 Total Income Transactions: ${allIncome.length}\n`);
    
    // Group by income_source
    const bySource = {};
    allIncome.forEach(tx => {
      const source = tx.income_source;
      if (!bySource[source]) {
        bySource[source] = { count: 0, total: 0, transactions: [] };
      }
      bySource[source].count++;
      bySource[source].total += Number(tx.amount);
      bySource[source].transactions.push(tx);
    });
    
    console.log('💰 Income Breakdown by Source:');
    console.log('-'.repeat(80));
    
    let grandTotal = 0;
    Object.keys(bySource).sort().forEach(source => {
      const data = bySource[source];
      grandTotal += data.total;
      console.log(`\n${source}:`);
      console.log(`   Count: ${data.count} transactions`);
      console.log(`   Total: $${data.total.toFixed(2)}`);
      
      // Show first 3 transactions
      data.transactions.slice(0, 3).forEach((tx, index) => {
        console.log(`   ${index + 1}. $${Number(tx.amount).toFixed(2)} - ${new Date(tx.timestamp).toISOString()} - ${tx.description || 'No description'}`);
      });
      
      if (data.transactions.length > 3) {
        console.log(`   ... and ${data.transactions.length - 3} more`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`📈 GRAND TOTAL: $${grandTotal.toFixed(2)}`);
    console.log('='.repeat(80));
    
    // Specifically check referral_income
    console.log('\n\n🎯 REFERRAL INCOME DETAILS:');
    console.log('-'.repeat(80));
    
    const referralIncome = bySource['referral_income'];
    if (referralIncome) {
      console.log(`Total Referral Income: $${referralIncome.total.toFixed(2)}`);
      console.log(`Number of Transactions: ${referralIncome.count}\n`);
      
      console.log('All Referral Income Transactions:');
      referralIncome.transactions.forEach((tx, index) => {
        console.log(`\n${index + 1}. Amount: $${Number(tx.amount).toFixed(2)}`);
        console.log(`   Date: ${new Date(tx.timestamp).toISOString()}`);
        console.log(`   Level: ${tx.referral_level || 'N/A'}`);
        console.log(`   Description: ${tx.description || 'No description'}`);
      });
    } else {
      console.log('⚠️  No referral income found for this user.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n' + '='.repeat(80));
    console.log('Check completed.\n');
  }
}

checkUserIncome();
