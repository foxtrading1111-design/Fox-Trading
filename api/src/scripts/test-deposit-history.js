import prisma from '../lib/prisma.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../..', '.env');
dotenv.config({ path: envPath });

async function testDepositHistory() {
  console.log('🔍 Testing Deposit History Functionality');
  console.log('=====================================\n');

  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connected successfully\n');

    // Get all users (limited for testing)
    console.log('2. Getting test users...');
    const users = await prisma.users.findMany({
      select: { id: true, email: true, full_name: true },
      take: 3
    });
    console.log(`📋 Found ${users.length} users:`, users.map(u => `${u.full_name} (${u.email})`));
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    const testUserId = users[0].id;
    console.log(`\n3. Testing deposit history for user: ${users[0].email} (ID: ${testUserId})`);

    // Check for deposits using the corrected query from the fix
    console.log('\n4. Checking for deposit transactions...');
    
    const whereClause = {
      user_id: testUserId,
      type: 'credit',
      income_source: { endsWith: '_deposit' }
    };
    
    const deposits = await prisma.transactions.findMany({
      where: whereClause,
      select: {
        id: true,
        amount: true,
        status: true,
        description: true,
        timestamp: true,
        income_source: true,
        type: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    console.log(`📊 Found ${deposits.length} deposit transactions for this user:`);
    
    if (deposits.length === 0) {
      console.log('   No deposit transactions found with the current filter');
      
      // Check all transactions for this user to see what exists
      console.log('\n5. Checking ALL transactions for this user...');
      const allTransactions = await prisma.transactions.findMany({
        where: { user_id: testUserId },
        select: {
          id: true,
          amount: true,
          type: true,
          income_source: true,
          status: true,
          timestamp: true
        },
        take: 10,
        orderBy: { timestamp: 'desc' }
      });
      
      console.log(`📄 All transactions (${allTransactions.length}):`);
      allTransactions.forEach(tx => {
        console.log(`   - ${tx.type} | ${tx.income_source} | $${tx.amount} | ${tx.status}`);
      });
    } else {
      deposits.forEach(deposit => {
        console.log(`   - ID: ${deposit.id}`);
        console.log(`     Amount: $${deposit.amount}`);
        console.log(`     Type: ${deposit.type}`);
        console.log(`     Income Source: ${deposit.income_source}`);
        console.log(`     Status: ${deposit.status}`);
        console.log(`     Time: ${deposit.timestamp}`);
        console.log(`     Description: ${deposit.description || 'N/A'}`);
        console.log('');
      });
    }

    // Test the formatted output
    console.log('\n6. Testing formatted deposit history response...');
    const formattedDeposits = deposits.map((deposit) => {
      let blockchain = 'BEP20';
      let txHash = null;
      
      if (deposit.income_source) {
        const blockchainFromSource = deposit.income_source.replace('_deposit', '').toUpperCase();
        if (['BEP20', 'TRC20'].includes(blockchainFromSource)) {
          blockchain = blockchainFromSource;
        }
      }
      
      if (deposit.description) {
        const blockchainMatch = deposit.description.match(/\b(BEP20|TRC20)\b/i);
        if (blockchainMatch) {
          blockchain = blockchainMatch[1].toUpperCase();
        }
        
        const txHashMatch = deposit.description.match(/(?:tx|hash|txid):\s*([a-fA-F0-9]{40,})/i);
        if (txHashMatch) {
          txHash = txHashMatch[1];
        }
      }

      return {
        id: deposit.id,
        amount: parseFloat(deposit.amount.toString()),
        blockchain,
        status: deposit.status,
        description: deposit.description,
        timestamp: deposit.timestamp.toISOString(),
        txHash,
      };
    });

    console.log('📦 Formatted deposits response:');
    console.log(JSON.stringify({ 
      success: true, 
      deposits: formattedDeposits,
      total: formattedDeposits.length 
    }, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔒 Database connection closed');
  }
}

testDepositHistory();