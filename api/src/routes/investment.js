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

      // Process referral income for all levels when user makes any investment
      const user = await tx.users.findUnique({ 
        where: { id: userId }, 
        select: { sponsor_id: true, full_name: true, email: true } 
      });
      
      if (user?.sponsor_id) {
        // Define referral percentages for each level
        const referralPercentages = [
          10,  // Level 1 (Direct sponsor) - 10%
          5,   // Level 2 - 5% 
          3,   // Level 3 - 3%
        ];

        let currentUserId = userId;
        for (let level = 0; level < referralPercentages.length; level++) {
          const currentUser = await tx.users.findUnique({ 
            where: { id: currentUserId }, 
            select: { sponsor_id: true, full_name: true } 
          });
          
          const sponsorId = currentUser?.sponsor_id;
          if (!sponsorId) break; // No more sponsors in the chain

          const referralAmount = Number((amount * referralPercentages[level] / 100).toFixed(2));
          
          if (referralAmount > 0) {
            // Ensure sponsor has a wallet
            await tx.wallets.upsert({
              where: { user_id: sponsorId },
              create: { user_id: sponsorId, balance: referralAmount },
              update: { balance: { increment: referralAmount } }
            });
            
            // Create referral income transaction
            const incomeSource = level === 0 ? 'direct_income' : 'referral_income';
            const description = level === 0 
              ? `Direct income (${referralPercentages[level]}%) from ${user.full_name || user.email}'s investment`
              : `Level ${level + 1} referral income (${referralPercentages[level]}%) from ${user.full_name || user.email}'s investment`;
              
            await tx.transactions.create({
              data: {
                user_id: sponsorId,
                amount: referralAmount,
                type: 'credit',
                income_source: incomeSource,
                description: description,
                status: 'COMPLETED'
              },
            });
          }
          
          currentUserId = sponsorId; // Move up the chain
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
