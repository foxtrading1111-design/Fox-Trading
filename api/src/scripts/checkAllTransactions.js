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

async function checkAllTransactions() {
  console.log('🔍 Checking ALL transactions in database...\n');
  console.log('='.repeat(80));
  
  try {
    // Check all transactions
    const allTransactions = await prisma.transactions.findMany({
      where: {
        type: 'credit',
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
      },
      take: 50 // Limit to 50 most recent
    });
    
    console.log(`\n📊 Total Credit Transactions Found: ${allTransactions.length}\n`);
    
    if (allTransactions.length === 0) {
      console.log('⚠️  No credit transactions found!');
      return;
    }
    
    // Group by income_source
    const bySource = {};
    allTransactions.forEach(tx => {
      const source = tx.income_source || 'NULL';
      if (!bySource[source]) {
        bySource[source] = [];
      }
      bySource[source].push(tx);
    });
    
    console.log('📋 Transactions by Income Source:');
    console.log('-'.repeat(80));
    
    Object.keys(bySource).forEach(source => {
      const txs = bySource[source];
      console.log(`\n${source}: ${txs.length} transactions`);
      
      // Show first 3 examples
      txs.slice(0, 3).forEach((tx, index) => {
        const depositDate = new Date(tx.timestamp);
        const now = new Date();
        const daysSince = Math.floor((now - depositDate) / (1000 * 60 * 60 * 24));
        
        console.log(`  ${index + 1}. ID: ${tx.id}`);
        console.log(`     User: ${tx.users.full_name}`);
        console.log(`     Amount: $${Number(tx.amount).toFixed(2)}`);
        console.log(`     Type: ${tx.type}`);
        console.log(`     Date: ${depositDate.toISOString()} (${daysSince} days ago)`);
        console.log(`     Unlock Date: ${tx.unlock_date ? new Date(tx.unlock_date).toISOString() : 'None'}`);
        console.log(`     Description: ${tx.description || 'None'}`);
      });
      
      if (txs.length > 3) {
        console.log(`  ... and ${txs.length - 3} more`);
      }
    });
    
    // Check for deposits specifically
    console.log('\n\n🔍 Looking for DEPOSIT-like transactions:');
    console.log('-'.repeat(80));
    
    const possibleDeposits = allTransactions.filter(tx => 
      tx.description?.toLowerCase().includes('deposit') ||
      tx.description?.toLowerCase().includes('investment') ||
      tx.income_source?.toLowerCase().includes('deposit') ||
      tx.income_source?.toLowerCase().includes('investment') ||
      tx.unlock_date !== null
    );
    
    if (possibleDeposits.length > 0) {
      console.log(`\nFound ${possibleDeposits.length} possible deposit transactions:\n`);
      possibleDeposits.forEach((tx, index) => {
        const depositDate = new Date(tx.timestamp);
        const now = new Date();
        const daysSince = Math.floor((now - depositDate) / (1000 * 60 * 60 * 24));
        const completedCycles = Math.floor(daysSince / 30);
        
        console.log(`${index + 1}. User: ${tx.users.full_name}`);
        console.log(`   Amount: $${Number(tx.amount).toFixed(2)}`);
        console.log(`   Income Source: ${tx.income_source}`);
        console.log(`   Type: ${tx.type}`);
        console.log(`   Days Since: ${daysSince} (${completedCycles} complete 30-day cycles)`);
        console.log(`   Unlock Date: ${tx.unlock_date ? new Date(tx.unlock_date).toISOString() : 'None'}`);
        console.log(`   Has Sponsor: ${tx.users.sponsor_id ? 'Yes' : 'No'}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️  No deposit-like transactions found.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n' + '='.repeat(80));
    console.log('Check completed.\n');
  }
}

checkAllTransactions();
