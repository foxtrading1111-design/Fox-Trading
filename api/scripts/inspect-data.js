import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function inspectData() {
  console.log('🔍 Inspecting current database data...');
  
  try {
    // Check transaction types and income sources
    const transactionTypes = await prisma.$queryRaw`
      SELECT 
        "type", 
        "income_source", 
        COUNT(*) as count, 
        SUM("amount") as total_amount
      FROM "transactions" 
      GROUP BY "type", "income_source" 
      ORDER BY count DESC;
    `;
    
    console.log('\n📊 Transaction Summary:');
    console.log('Type\t\tIncome Source\t\tCount\tTotal Amount');
    console.log('------------------------------------------------------------');
    
    for (const row of transactionTypes) {
      console.log(`${row.type}\t\t${row.income_source || 'NULL'}\t\t${row.count}\t$${Number(row.total_amount).toFixed(2)}`);
    }
    
    // Check users with wallets
    const walletInfo = await prisma.$queryRaw`
      SELECT COUNT(*) as wallet_count, SUM("balance") as total_balance
      FROM "wallets";
    `;
    
    console.log('\n💰 Wallet Summary:');
    console.log(`Total Wallets: ${walletInfo[0].wallet_count}`);
    console.log(`Total Balance: $${Number(walletInfo[0].total_balance || 0).toFixed(2)}`);
    
    // Check for unlock dates
    const unlockInfo = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_with_unlock,
        COUNT(CASE WHEN "unlock_date" > NOW() THEN 1 END) as locked,
        COUNT(CASE WHEN "unlock_date" <= NOW() THEN 1 END) as unlocked
      FROM "transactions" 
      WHERE "unlock_date" IS NOT NULL;
    `;
    
    console.log('\n🔒 Unlock Status:');
    console.log(`Transactions with unlock dates: ${unlockInfo[0].total_with_unlock}`);
    console.log(`Currently locked: ${unlockInfo[0].locked}`);
    console.log(`Already unlocked: ${unlockInfo[0].unlocked}`);
    
    // Check user count
    const userCount = await prisma.users.count();
    console.log(`\n👥 Total Users: ${userCount}`);
    
    // Sample recent transactions
    const recentTransactions = await prisma.transactions.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        user_id: true,
        amount: true,
        type: true,
        income_source: true,
        description: true,
        timestamp: true,
        unlock_date: true
      }
    });
    
    console.log('\n📋 Recent Transactions (last 10):');
    for (const tx of recentTransactions) {
      console.log(`${tx.timestamp.toISOString().split('T')[0]} | ${tx.type} | ${tx.income_source} | $${Number(tx.amount).toFixed(2)} | ${tx.description?.substring(0, 50)}...`);
    }
    
  } catch (error) {
    console.error('❌ Inspection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runInspection();

async function runInspection() {
  await inspectData();
}