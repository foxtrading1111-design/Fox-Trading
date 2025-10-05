import prisma from '../lib/prisma.js';

async function checkAllTransactions() {
  console.log('🔍 All Recent Transactions:');
  console.log('============================\n');
  
  try {
    const allTransactions = await prisma.transactions.findMany({
      include: {
        users: { select: { full_name: true, email: true } }
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    });
    
    if (allTransactions.length === 0) {
      console.log('No transactions found.');
      return;
    }
    
    allTransactions.forEach((tx, i) => {
      console.log(`${i+1}. $${tx.amount} - ${tx.users.full_name} (${tx.users.email})`);
      console.log(`   Type: ${tx.type} | Source: ${tx.income_source} | Status: ${tx.status}`);
      console.log(`   Description: ${tx.description}`);
      console.log(`   Time: ${tx.timestamp}\n`);
    });

    // Check for deposits specifically
    console.log('💰 Deposit Transactions Only:');
    const deposits = allTransactions.filter(tx => 
      tx.income_source.includes('_deposit') || tx.income_source === 'manual_deposit'
    );
    
    if (deposits.length === 0) {
      console.log('No deposit transactions found.');
    } else {
      deposits.forEach(deposit => {
        console.log(`- $${deposit.amount} by ${deposit.users.full_name} - Status: ${deposit.status}`);
      });
    }

    // Check pending transactions
    console.log('\n⏳ Pending Transactions:');
    const pending = allTransactions.filter(tx => tx.status === 'PENDING');
    
    if (pending.length === 0) {
      console.log('No pending transactions.');
    } else {
      pending.forEach(tx => {
        console.log(`- $${tx.amount} by ${tx.users.full_name} - ${tx.income_source}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllTransactions();