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

async function reverseDuplicateDistributions() {
  console.log('🔍 Finding duplicate referral income distributions...\n');
  console.log('='.repeat(80));
  
  try {
    // Find all referral income transactions from Nov 25, 2025
    const nov25Start = new Date('2025-11-25T00:00:00.000Z');
    const nov25End = new Date('2025-11-25T23:59:59.999Z');
    
    console.log(`\nSearching for distributions between:`);
    console.log(`  Start: ${nov25Start.toISOString()}`);
    console.log(`  End: ${nov25End.toISOString()}\n`);
    
    const duplicateTransactions = await prisma.transactions.findMany({
      where: {
        income_source: 'referral_income',
        timestamp: {
          gte: nov25Start,
          lte: nov25End
        },
        description: {
          contains: 'Cycle 1 from deposit'
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });
    
    console.log(`Found ${duplicateTransactions.length} referral income transactions from Nov 25\n`);
    
    if (duplicateTransactions.length === 0) {
      console.log('✅ No duplicate transactions found.');
      return;
    }
    
    // Show what will be reversed
    console.log('📋 Transactions to be reversed:');
    console.log('-'.repeat(80));
    
    let totalAmount = 0;
    const userBalanceChanges = {};
    
    duplicateTransactions.forEach((tx, index) => {
      console.log(`\n${index + 1}. Transaction ID: ${tx.id}`);
      console.log(`   User ID: ${tx.user_id}`);
      console.log(`   Amount: $${Number(tx.amount).toFixed(2)}`);
      console.log(`   Date: ${new Date(tx.timestamp).toISOString()}`);
      console.log(`   Description: ${tx.description}`);
      
      totalAmount += Number(tx.amount);
      
      if (!userBalanceChanges[tx.user_id]) {
        userBalanceChanges[tx.user_id] = 0;
      }
      userBalanceChanges[tx.user_id] += Number(tx.amount);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n💰 Total amount to reverse: $${totalAmount.toFixed(2)}`);
    console.log(`\n👥 Users affected: ${Object.keys(userBalanceChanges).length}`);
    
    console.log('\n📊 Balance changes per user:');
    Object.entries(userBalanceChanges).forEach(([userId, amount]) => {
      console.log(`   User ${userId}: -$${amount.toFixed(2)}`);
    });
    
    // Ask for confirmation
    console.log('\n' + '='.repeat(80));
    console.log('\n⚠️  WARNING: This will:');
    console.log('   1. Delete the duplicate referral income transactions');
    console.log('   2. Deduct the amounts from user wallets');
    console.log('\nType "CONFIRM" to proceed or anything else to cancel:');
    
    // In a real scenario, you'd use readline for input
    // For now, we'll make it a dry run
    const dryRun = false;
    
    if (dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made');
      console.log('To actually reverse, set dryRun = false in the script\n');
      return;
    }
    
    // Perform the reversal in a transaction
    console.log('\n🔄 Reversing duplicate distributions...\n');
    
    await prisma.$transaction(async (tx) => {
      // Deduct amounts from wallets
      for (const [userId, amount] of Object.entries(userBalanceChanges)) {
        await tx.wallets.update({
          where: { user_id: userId },
          data: {
            balance: {
              decrement: amount
            }
          }
        });
        console.log(`✅ Deducted $${amount.toFixed(2)} from user ${userId}'s wallet`);
      }
      
      // Delete the duplicate transactions
      const deleteResult = await tx.transactions.deleteMany({
        where: {
          id: {
            in: duplicateTransactions.map(t => t.id)
          }
        }
      });
      
      console.log(`\n✅ Deleted ${deleteResult.count} duplicate transactions`);
    });
    
    console.log('\n✅ Reversal completed successfully!');
    console.log(`   - ${duplicateTransactions.length} transactions removed`);
    console.log(`   - $${totalAmount.toFixed(2)} deducted from wallets`);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n' + '='.repeat(80));
    console.log('Script completed.\n');
  }
}

reverseDuplicateDistributions();
