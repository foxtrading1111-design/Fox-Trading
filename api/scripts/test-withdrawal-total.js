import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWithdrawalTotal() {
  console.log('🧪 Testing Total Withdrawal Calculation...\n');
  
  try {
    const userId = 'cmgkg5nk9001r9z1trkvq6min'; // User with withdrawal
    
    // OLD WAY (WRONG) - counts all debits including rejected
    const oldWay = await prisma.transactions.aggregate({
      _sum: { amount: true },
      where: { user_id: userId, type: 'debit' }
    });
    
    // NEW WAY (CORRECT) - only completed withdrawals
    const newWay = await prisma.transactions.aggregate({
      _sum: { amount: true },
      where: { 
        user_id: userId, 
        OR: [
          { type: 'debit', income_source: { in: ['withdrawal', 'income_withdrawal', 'investment_withdrawal'] } },
          { type: 'WITHDRAWAL' }
        ],
        status: 'COMPLETED'
      }
    });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                WITHDRAWAL CALCULATION TEST                 ');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('❌ OLD WAY (WRONG):');
    console.log(`   Query: All debit transactions (any status)`);
    console.log(`   Result: $${Number(oldWay._sum.amount || 0).toFixed(2)}`);
    console.log(`   Problem: Includes REJECTED withdrawals!\n`);
    
    console.log('✅ NEW WAY (CORRECT):');
    console.log(`   Query: Only COMPLETED withdrawal transactions`);
    console.log(`   Result: $${Number(newWay._sum.amount || 0).toFixed(2)}`);
    console.log(`   Correct: Only counts approved withdrawals\n`);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                      VERIFICATION                          ');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Get actual completed withdrawals
    const completedWithdrawals = await prisma.transactions.findMany({
      where: { 
        user_id: userId,
        OR: [
          { type: 'debit', status: 'COMPLETED' },
          { type: 'WITHDRAWAL', status: 'COMPLETED' }
        ]
      },
      select: {
        amount: true,
        type: true,
        income_source: true,
        status: true,
        description: true
      }
    });
    
    console.log(`Found ${completedWithdrawals.length} completed withdrawal(s):`);
    for (const w of completedWithdrawals) {
      console.log(`  • $${Number(w.amount).toFixed(2)} - ${w.type} - ${w.status}`);
      console.log(`    ${w.description?.substring(0, 60)}...`);
    }
    
    const manualTotal = completedWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
    console.log(`\nManual calculation total: $${manualTotal.toFixed(2)}`);
    console.log(`New way result: $${Number(newWay._sum.amount || 0).toFixed(2)}`);
    console.log(`Match: ${manualTotal === Number(newWay._sum.amount || 0) ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('Dashboard should show: $' + Number(newWay._sum.amount || 0).toFixed(2));
    console.log('═══════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWithdrawalTotal();
