import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkWithdrawals() {
  console.log('🔍 Checking withdrawal transactions...\n');
  
  try {
    // Get all debit transactions
    const allDebits = await prisma.transactions.findMany({
      where: {
        type: 'debit'
      },
      select: {
        id: true,
        user_id: true,
        amount: true,
        type: true,
        income_source: true,
        status: true,
        description: true,
        timestamp: true
      },
      orderBy: { timestamp: 'desc' }
    });
    
    console.log('📊 All DEBIT Transactions:');
    console.log('═══════════════════════════════════════════════════════════');
    for (const tx of allDebits) {
      console.log(`ID: ${tx.id}`);
      console.log(`  User: ${tx.user_id}`);
      console.log(`  Amount: $${Number(tx.amount).toFixed(2)}`);
      console.log(`  Type: ${tx.type}`);
      console.log(`  Income Source: ${tx.income_source}`);
      console.log(`  Status: ${tx.status}`);
      console.log(`  Date: ${tx.timestamp.toISOString().split('T')[0]}`);
      console.log(`  Description: ${tx.description?.substring(0, 80)}...`);
      console.log('');
    }
    
    // Get all WITHDRAWAL type transactions
    const allWithdrawals = await prisma.transactions.findMany({
      where: {
        type: 'WITHDRAWAL'
      },
      select: {
        id: true,
        user_id: true,
        amount: true,
        type: true,
        income_source: true,
        status: true,
        description: true,
        timestamp: true
      },
      orderBy: { timestamp: 'desc' }
    });
    
    console.log('📊 All WITHDRAWAL Type Transactions:');
    console.log('═══════════════════════════════════════════════════════════');
    for (const tx of allWithdrawals) {
      console.log(`ID: ${tx.id}`);
      console.log(`  User: ${tx.user_id}`);
      console.log(`  Amount: $${Number(tx.amount).toFixed(2)}`);
      console.log(`  Type: ${tx.type}`);
      console.log(`  Income Source: ${tx.income_source}`);
      console.log(`  Status: ${tx.status}`);
      console.log(`  Date: ${tx.timestamp.toISOString().split('T')[0]}`);
      console.log(`  Description: ${tx.description?.substring(0, 80)}...`);
      console.log('');
    }
    
    // Calculate totals
    const totalDebits = allDebits.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const totalWithdrawals = allWithdrawals.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const completedDebits = allDebits.filter(tx => tx.status === 'COMPLETED');
    const completedDebitTotal = completedDebits.reduce((sum, tx) => sum + Number(tx.amount), 0);
    
    console.log('📊 Summary:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total DEBIT transactions: ${allDebits.length}`);
    console.log(`Total DEBIT amount: $${totalDebits.toFixed(2)}`);
    console.log(`Completed DEBIT transactions: ${completedDebits.length}`);
    console.log(`Completed DEBIT amount: $${completedDebitTotal.toFixed(2)}`);
    console.log(``);
    console.log(`Total WITHDRAWAL transactions: ${allWithdrawals.length}`);
    console.log(`Total WITHDRAWAL amount: $${totalWithdrawals.toFixed(2)}`);
    console.log(``);
    console.log(`TOTAL WITHDRAWALS (should show on dashboard): $${(completedDebitTotal + totalWithdrawals).toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWithdrawals();
