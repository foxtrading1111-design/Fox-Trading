import prisma from '../lib/prisma.js';

async function approvePendingDeposit() {
  console.log('🔄 Approving Pending Deposit and Triggering Referral Income');
  console.log('=========================================================\n');

  try {
    // Find the pending deposit
    const pendingDeposit = await prisma.transactions.findFirst({
      where: { 
        status: 'PENDING',
        user_id: { not: undefined } // Make sure it has a user
      },
      include: {
        users: {
          select: { full_name: true, email: true }
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (!pendingDeposit) {
      console.log('❌ No pending deposits found.');
      return;
    }

    console.log('💰 Found Pending Deposit:');
    console.log(`   Amount: $${pendingDeposit.amount}`);
    console.log(`   User: ${pendingDeposit.users.full_name} (${pendingDeposit.users.email})`);
    console.log(`   Status: ${pendingDeposit.status}`);
    console.log(`   Transaction ID: ${pendingDeposit.id}\n`);

    // Get user's sponsor chain to show expected referral income
    const user = await prisma.users.findUnique({
      where: { id: pendingDeposit.user_id },
      select: { sponsor_id: true, full_name: true, email: true }
    });

    if (!user?.sponsor_id) {
      console.log('❌ User has no sponsor - no referral income will be generated.');
    } else {
      console.log('👥 Referral Chain:');
      let currentUserId = pendingDeposit.user_id;
      const referralPercentages = [10, 5, 3]; // Level 1: 10%, Level 2: 5%, Level 3: 3%

      for (let level = 0; level < referralPercentages.length; level++) {
        const currentUser = await prisma.users.findUnique({
          where: { id: currentUserId },
          select: { sponsor_id: true, full_name: true, email: true }
        });

        if (!currentUser?.sponsor_id) break;

        const sponsor = await prisma.users.findUnique({
          where: { id: currentUser.sponsor_id },
          select: { full_name: true, email: true }
        });

        const referralAmount = Number((pendingDeposit.amount * referralPercentages[level] / 100).toFixed(2));
        console.log(`   Level ${level + 1}: ${sponsor.full_name} will get $${referralAmount} (${referralPercentages[level]}%)`);

        currentUserId = currentUser.sponsor_id;
      }
    }

    console.log('\n🚀 Approving deposit and processing referral income...\n');

    // Process the approval in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Update transaction status to COMPLETED
      await prisma.transactions.update({
        where: { id: pendingDeposit.id },
        data: { status: 'COMPLETED' },
      });

      // Update wallet balance
      await prisma.wallets.upsert({
        where: { user_id: pendingDeposit.user_id },
        create: { 
          user_id: pendingDeposit.user_id, 
          balance: Number(pendingDeposit.amount) 
        },
        update: { 
          balance: { increment: Number(pendingDeposit.amount) } 
        }
      });

      // Process referral income
      let referralIncomeCreated = 0;
      
      if (user?.sponsor_id) {
        const referralPercentages = [10, 5, 3];
        let currentUserId = pendingDeposit.user_id;

        for (let level = 0; level < referralPercentages.length; level++) {
          const currentUser = await prisma.users.findUnique({ 
            where: { id: currentUserId }, 
            select: { sponsor_id: true, full_name: true } 
          });
          
          const sponsorId = currentUser?.sponsor_id;
          if (!sponsorId) break;

          const referralAmount = Number((pendingDeposit.amount * referralPercentages[level] / 100).toFixed(2));
          
          if (referralAmount > 0) {
            // Update sponsor's wallet
            await prisma.wallets.upsert({
              where: { user_id: sponsorId },
              create: { user_id: sponsorId, balance: referralAmount },
              update: { balance: { increment: referralAmount } }
            });
            
            // Create referral income transaction
            const incomeSource = level === 0 ? 'direct_income' : 'referral_income';
            const description = level === 0 
              ? `Direct income (${referralPercentages[level]}%) from ${user.full_name || user.email}'s deposit`
              : `Level ${level + 1} referral income (${referralPercentages[level]}%) from ${user.full_name || user.email}'s deposit`;
              
            await prisma.transactions.create({
              data: {
                user_id: sponsorId,
                amount: referralAmount,
                type: 'credit',
                income_source: incomeSource,
                description: description,
                status: 'COMPLETED'
              },
            });
            
            referralIncomeCreated++;
            console.log(`✅ Created ${incomeSource}: $${referralAmount} for Level ${level + 1} sponsor`);
          }
          
          currentUserId = sponsorId;
        }
      }

      return { referralIncomeCreated };
    });

    console.log(`\n🎉 SUCCESS!`);
    console.log(`✅ Deposit approved: $${pendingDeposit.amount} for ${pendingDeposit.users.full_name}`);
    console.log(`✅ Referral income transactions created: ${result.referralIncomeCreated}`);
    console.log(`\n💡 Check wallet balances now - sponsors should see their referral income!`);

    // Show updated wallet balances
    console.log('\n💳 Updated Wallet Balances:');
    const wallets = await prisma.wallets.findMany({
      where: { balance: { gt: 0 } },
      include: {
        users: {
          select: { full_name: true, email: true }
        }
      },
      orderBy: { balance: 'desc' }
    });

    wallets.forEach(wallet => {
      console.log(`   ${wallet.users.full_name}: $${wallet.balance}`);
    });

  } catch (error) {
    console.error('❌ Error during deposit approval:', error);
  } finally {
    await prisma.$disconnect();
  }
}

approvePendingDeposit();