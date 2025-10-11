import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixMissingUnlockDates() {
  console.log('🔧 Fixing deposits without unlock dates...\n');
  
  try {
    // Find deposits without unlock_date
    const depositsWithoutUnlock = await prisma.transactions.findMany({
      where: {
        type: 'credit',
        income_source: { endsWith: '_deposit' },
        unlock_date: null,
        status: 'COMPLETED'
      },
      select: {
        id: true,
        user_id: true,
        amount: true,
        income_source: true,
        timestamp: true
      }
    });
    
    console.log(`Found ${depositsWithoutUnlock.length} deposits without unlock dates\n`);
    
    if (depositsWithoutUnlock.length === 0) {
      console.log('✅ All deposits already have unlock dates!');
      return;
    }
    
    // Update each deposit with 6-month unlock from deposit date
    for (const deposit of depositsWithoutUnlock) {
      const unlockDate = new Date(deposit.timestamp);
      unlockDate.setMonth(unlockDate.getMonth() + 6);
      
      await prisma.transactions.update({
        where: { id: deposit.id },
        data: { unlock_date: unlockDate }
      });
      
      console.log(`✅ Updated deposit ${deposit.id}:`);
      console.log(`   Amount: $${Number(deposit.amount).toFixed(2)}`);
      console.log(`   Deposit Date: ${deposit.timestamp.toISOString().split('T')[0]}`);
      console.log(`   Unlock Date: ${unlockDate.toISOString().split('T')[0]}`);
      console.log(`   Status: ${unlockDate > new Date() ? '🔒 Locked' : '🔓 Unlocked'}\n`);
    }
    
    console.log(`\n✅ Successfully updated ${depositsWithoutUnlock.length} deposits!`);
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingUnlockDates();
