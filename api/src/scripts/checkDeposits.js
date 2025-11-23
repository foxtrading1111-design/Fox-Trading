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

async function checkDeposits() {
  console.log('🔍 Checking database for deposits...\n');
  console.log('='.repeat(80));
  
  try {
    const now = new Date();
    
    // Check all deposits
    const allDeposits = await prisma.transactions.findMany({
      where: {
        type: 'credit',
        income_source: 'investment_deposit',
        status: 'COMPLETED'
      },
      include: {
        users: {
          select: {
            full_name: true,
            email: true,
            sponsor_id: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });
    
    console.log(`\n📊 Total Deposits Found: ${allDeposits.length}\n`);
    
    if (allDeposits.length === 0) {
      console.log('⚠️  No deposits found in database!');
      console.log('   Please create some test deposits first.\n');
      return;
    }
    
    // Analyze each deposit
    console.log('📋 Deposit Analysis:');
    console.log('-'.repeat(80));
    
    allDeposits.forEach((deposit, index) => {
      const depositDate = new Date(deposit.timestamp);
      const daysSince = Math.floor((now - depositDate) / (1000 * 60 * 60 * 24));
      const completedCycles = Math.floor(daysSince / 30);
      const isLocked = deposit.unlock_date && new Date(deposit.unlock_date) > now;
      
      console.log(`\n${index + 1}. Deposit ID: ${deposit.id}`);
      console.log(`   User: ${deposit.users.full_name} (${deposit.users.email})`);
      console.log(`   Amount: $${Number(deposit.amount).toFixed(2)}`);
      console.log(`   Deposit Date: ${depositDate.toISOString()}`);
      console.log(`   Days Since Deposit: ${daysSince}`);
      console.log(`   Completed 30-Day Cycles: ${completedCycles}`);
      console.log(`   Unlock Date: ${deposit.unlock_date ? new Date(deposit.unlock_date).toISOString() : 'None'}`);
      console.log(`   Is Locked: ${isLocked ? 'Yes ✅' : 'No ❌'}`);
      console.log(`   Has Sponsor: ${deposit.users.sponsor_id ? 'Yes ✅' : 'No ❌'}`);
      
      if (completedCycles >= 1 && isLocked) {
        console.log(`   ⭐ ELIGIBLE for ${completedCycles} cycle(s) of referral distribution!`);
      } else if (completedCycles < 1) {
        console.log(`   ⏳ Needs ${30 - daysSince} more days to complete first cycle`);
      } else if (!isLocked) {
        console.log(`   🔓 Deposit is unlocked - not eligible`);
      }
    });
    
    // Check for existing referral income transactions
    console.log('\n\n📊 Existing Referral Income Transactions:');
    console.log('-'.repeat(80));
    
    const referralTransactions = await prisma.transactions.findMany({
      where: {
        income_source: 'referral_income',
        status: 'COMPLETED'
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    });
    
    if (referralTransactions.length === 0) {
      console.log('⚠️  No referral income transactions found.');
      console.log('   This means no distributions have been run yet.\n');
    } else {
      console.log(`\nFound ${referralTransactions.length} referral income transactions:\n`);
      referralTransactions.forEach((tx, index) => {
        console.log(`${index + 1}. Amount: $${Number(tx.amount).toFixed(2)}`);
        console.log(`   Description: ${tx.description}`);
        console.log(`   Date: ${new Date(tx.timestamp).toISOString()}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n' + '='.repeat(80));
    console.log('Check completed.\n');
  }
}

checkDeposits();
