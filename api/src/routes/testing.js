import { Router } from 'express';
import {
  runMonthlyTradingBonus,
  runMonthlyReferralIncome,
  runMonthlySalary
} from '../jobs/workers.js';

export const testingRouter = Router();

// This endpoint will run the trading bonus calculation for all users.
testingRouter.post('/run-trading-bonus', async (_req, res) => {
  try {
    await runMonthlyTradingBonus();
    res.status(200).json({ message: 'Monthly trading bonus job executed successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to run trading bonus job.' });
  }
});

// This endpoint will run the referral income calculation.
testingRouter.post('/run-referral-income', async (_req, res) => {
  try {
    await runMonthlyReferralIncome();
    res.status(200).json({ message: 'Monthly referral income job executed successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to run referral income job.' });
  }
});

// This endpoint will run the salary calculation.
testingRouter.post('/run-salary', async (_req, res) => {
  try {
    await runMonthlySalary();
    res.status(200).json({ message: 'Monthly salary job executed successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to run salary job.' });
  }
});

// Comprehensive referral income test and debugging endpoint
testingRouter.get('/referral-income-status', async (_req, res) => {
  try {
    const prisma = (await import('../lib/prisma.js')).default;
    
    // Get current counts
    const stats = {
      users: await prisma.users.count(),
      investments: await prisma.investments.count(),
      tradingBonuses: await prisma.transactions.count({ where: { income_source: 'trading_bonus' } }),
      referralIncome: await prisma.transactions.count({ where: { income_source: 'referral_income' } })
    };
    
    // Get user network structure
    const userNetwork = await prisma.users.findMany({
      select: {
        id: true,
        full_name: true,
        email: true,
        sponsor_id: true,
        referral_code: true
      },
      orderBy: { created_at: 'asc' }
    });
    
    // Get recent trading bonuses
    const recentTradingBonuses = await prisma.transactions.findMany({
      where: { income_source: 'trading_bonus' },
      orderBy: { timestamp: 'desc' },
      take: 5,
      include: {
        users: {
          select: { full_name: true, email: true }
        }
      }
    });
    
    // Get recent referral income
    const recentReferralIncome = await prisma.transactions.findMany({
      where: { income_source: 'referral_income' },
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: {
        users: {
          select: { full_name: true, email: true }
        }
      }
    });
    
    // Get wallet balances
    const walletBalances = await prisma.wallets.findMany({
      include: {
        users: {
          select: { full_name: true, email: true }
        }
      },
      orderBy: { balance: 'desc' }
    });
    
    res.json({
      stats,
      userNetwork,
      recentTradingBonuses,
      recentReferralIncome,
      walletBalances
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get referral income status.' });
  }
});

// Force run all commission jobs for testing
testingRouter.post('/run-all-jobs', async (_req, res) => {
  try {
    console.log('Running all commission jobs...');
    
    await runMonthlyTradingBonus();
    console.log('Trading bonus job completed.');
    
    await runMonthlyReferralIncome();
    console.log('Referral income job completed.');
    
    await runMonthlySalary();
    console.log('Salary job completed.');
    
    res.status(200).json({ message: 'All commission jobs executed successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to run commission jobs.' });
  }
});

// Get deposit testing information
testingRouter.get('/deposit-status', async (_req, res) => {
  try {
    const prisma = (await import('../lib/prisma.js')).default;
    
    const stats = {
      users: await prisma.users.count(),
      pendingDeposits: await prisma.transactions.count({
        where: { 
          status: 'PENDING',
          income_source: { contains: '_deposit' }
        }
      }),
      completedDeposits: await prisma.transactions.count({
        where: { 
          status: 'COMPLETED',
          income_source: { contains: '_deposit' }
        }
      }),
      directIncome: await prisma.transactions.count({
        where: { income_source: 'direct_income' }
      }),
      referralIncome: await prisma.transactions.count({
        where: { income_source: 'referral_income' }
      })
    };
    
    // Get pending deposits
    const pendingDeposits = await prisma.transactions.findMany({
      where: { 
        status: 'PENDING',
        income_source: { contains: '_deposit' }
      },
      include: {
        users: {
          select: { full_name: true, email: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });
    
    // Get recent referral income
    const recentReferralIncome = await prisma.transactions.findMany({
      where: { 
        OR: [
          { income_source: 'direct_income' },
          { income_source: 'referral_income' }
        ]
      },
      include: {
        users: {
          select: { full_name: true, email: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    });
    
    res.json({
      stats,
      pendingDeposits,
      recentReferralIncome
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get deposit status.' });
  }
});

// Auto-approve the first pending deposit for testing
testingRouter.post('/approve-first-deposit', async (_req, res) => {
  try {
    const prisma = (await import('../lib/prisma.js')).default;
    
    const pendingDeposit = await prisma.transactions.findFirst({
      where: { 
        status: 'PENDING',
        income_source: { contains: '_deposit' }
      },
      include: {
        users: {
          select: { full_name: true, email: true }
        }
      },
      orderBy: { timestamp: 'asc' }
    });
    
    if (!pendingDeposit) {
      return res.status(404).json({ error: 'No pending deposits found.' });
    }
    
    // Simulate admin approval - call the same logic as admin route
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
      const user = await prisma.users.findUnique({ 
        where: { id: pendingDeposit.user_id }, 
        select: { sponsor_id: true, full_name: true, email: true } 
      });
      
      let referralIncomeCreated = 0;
      
      if (user?.sponsor_id) {
        const referralPercentages = [
          10,  // Level 1 - 10%
          5,   // Level 2 - 5% 
          3,   // Level 3 - 3%
        ];

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
            await prisma.wallets.upsert({
              where: { user_id: sponsorId },
              create: { user_id: sponsorId, balance: referralAmount },
              update: { balance: { increment: referralAmount } }
            });
            
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
          }
          
          currentUserId = sponsorId;
        }
      }
      
      return { 
        approvedDeposit: pendingDeposit,
        referralIncomeCreated
      };
    });
    
    res.json({ 
      success: true,
      message: `Deposit approved: $${pendingDeposit.amount} for ${pendingDeposit.users.full_name}`,
      approvedDeposit: result.approvedDeposit,
      referralIncomeCreated: result.referralIncomeCreated
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve deposit.' });
  }
});
