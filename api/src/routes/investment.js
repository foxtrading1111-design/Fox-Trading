import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
export const investmentRouter = Router();

// This middleware ensures that for all subsequent routes on this router,
// req.user will be defined.
investmentRouter.use(requireAuth);

const depositSchema = z.object({
  amount: z.number().positive(),
  package_name: z.string().min(1),
});

investmentRouter.post('/deposit', async (req, res) => {
  const parse = depositSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

  const { amount, package_name } = parse.data;
  // In JS, we can directly access req.user after requireAuth has run.
  const userId = req.user.id;

  try {
    const startDate = new Date();
    const unlockDate = new Date(startDate);
    unlockDate.setMonth(unlockDate.getMonth() + 6);

    let profitRate = 0;
    if (amount >= 100 && amount <= 999) {
      profitRate = 12;
    } else if (amount >= 1000) {
      profitRate = 15;
    }

    if (profitRate === 0) {
      return res.status(400).json({ error: 'Investment amount does not fit any package.' });
    }

    const newInvestment = await prisma.$transaction(async (tx) => {
      const investmentCount = await tx.investments.count({ where: { user_id: userId } });
      
      const createdInvestment = await tx.investments.create({
        data: {
          user_id: userId,
          amount,
          package_name,
          monthly_profit_rate: profitRate,
          status: 'active',
          start_date: startDate,
          unlock_date: unlockDate,
        },
      });

      // Get user info for referral processing
      const user = await tx.users.findUnique({ 
        where: { id: userId }, 
        select: { sponsor_id: true, full_name: true, email: true } 
      });
      
      // Store deposit with 6-month unlock period (this is the locked investment)
      const depositTransaction = await tx.transactions.create({
        data: {
          user_id: userId,
          amount: amount,
          type: 'credit',
          income_source: 'investment_deposit',
          description: `Investment deposit - $${amount} - locked for 6 months`,
          status: 'COMPLETED',
          unlock_date: new Date(Date.now() + (6 * 30 * 24 * 60 * 60 * 1000)) // 6 months from now
        },
      });
      
      // Process DIRECT INCOME for direct referrer on FIRST deposit only
      if (user?.sponsor_id) {
        // Check if this is user's first deposit/investment
        const existingDeposits = await tx.transactions.count({
          where: {
            user_id: userId,
            type: 'credit',
            income_source: 'investment_deposit',
            status: 'COMPLETED',
            id: { not: depositTransaction.id } // Exclude current deposit
          }
        });
        
        // Only give direct income for the very first deposit
        if (existingDeposits === 0) {
          const directIncomeAmount = Number((amount * 10 / 100).toFixed(2)); // 10% one-time
          
          if (directIncomeAmount > 0) {
            // Ensure sponsor has a wallet
            await tx.wallets.upsert({
              where: { user_id: user.sponsor_id },
              create: { user_id: user.sponsor_id, balance: directIncomeAmount },
              update: { balance: { increment: directIncomeAmount } }
            });
            
            // Create one-time direct income transaction
            await tx.transactions.create({
              data: {
                user_id: user.sponsor_id,
                amount: directIncomeAmount,
                type: 'credit',
                income_source: 'direct_income',
                description: `Direct income (10%) from ${user.full_name || user.email}'s first deposit of $${amount}`,
                status: 'COMPLETED',
                referral_level: 1
              },
            });
          }
        }
      }
      return createdInvestment;
    });

    return res.status(201).json(newInvestment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Deposit failed' });
  }
});

investmentRouter.get('/history', async (req, res) => {
  const userId = req.user.id;
  try {
    const history = await prisma.investments.findMany({
      where: { user_id: userId },
      orderBy: { start_date: 'desc' },
    });
    return res.json(history);
  } catch {
    return res.status(500).json({ error: 'Failed to load investments' });
  }
});
