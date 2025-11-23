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

async function findActualDeposits() {
  console.log('🔍 Searching for ACTUAL deposit transactions...\n');
  console.log('='.repeat(80));
  
  try {
    const now = new Date();
    
    // Search with broader criteria
    console.log('\n1️⃣ Searching for transactions with income_source containing "deposit"...\n');
    const depositsWithSource = await prisma.transactions.findMany({
      where: {
        income_source: {
          contains: 'deposit'
        }
      },
      include: {
        users: {
          select: {
            full_name: true,
            email: true
          }
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });
    
    console.log(`Found ${depositsWithSource.length} transactions with "deposit" in income_source\n`);
    
    if (depositsWithSource.length > 0) {
      depositsWithSource.forEach((tx, index) => {
        const daysSince = Math.floor((now - new Date(tx.timestamp)) / (1000 * 60 * 60 * 24));
        const cycles = Math.floor(daysSince / 30);
        
        console.log(`${index + 1}. User: ${tx.users.full_name}`);
        console.log(`   ID: ${tx.id}`);
        console.log(`   Amount: $${Number(tx.amount).toFixed(2)}`);
        console.log(`   Income Source: ${tx.income_source}`);
        console.log(`   Type: ${tx.type}`);
        console.log(`   Status: ${tx.status}`);
        console.log(`   Date: ${new Date(tx.timestamp).toISOString()}`);
        console.log(`   Days Since: ${daysSince} (${cycles} complete 30-day cycles)`);
        console.log(`   Unlock Date: ${tx.unlock_date ? new Date(tx.unlock_date).toISOString() : 'None'}`);
        console.log('');
      });
    }
    
    // Check investments table
    console.log('\n2️⃣ Checking investments table...\n');
    const investments = await prisma.investments.findMany({
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
        start_date: 'asc'
      }
    });
    
    console.log(`Found ${investments.length} records in investments table\n`);
    
    if (investments.length > 0) {
      investments.forEach((inv, index) => {
        const daysSince = Math.floor((now - new Date(inv.start_date)) / (1000 * 60 * 60 * 24));
        const cycles = Math.floor(daysSince / 30);
        
        console.log(`${index + 1}. User: ${inv.users.full_name}`);
        console.log(`   ID: ${inv.id}`);
        console.log(`   Amount: $${Number(inv.amount).toFixed(2)}`);
        console.log(`   Start Date: ${new Date(inv.start_date).toISOString()}`);
        console.log(`   Unlock Date: ${new Date(inv.unlock_date).toISOString()}`);
        console.log(`   Days Since: ${daysSince} (${cycles} complete 30-day cycles)`);
        console.log(`   Has Sponsor: ${inv.users.sponsor_id ? 'Yes' : 'No'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n' + '='.repeat(80));
    console.log('Search completed.\n');
  }
}

findActualDeposits();
