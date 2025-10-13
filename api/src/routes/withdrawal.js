import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import otpStore from '../lib/otpStore.js';

export const withdrawalRouter = Router();
withdrawalRouter.use(requireAuth);

// Validation schemas
const withdrawIncomeSchema = z.object({
  amount: z.number()
    .min(10, 'Minimum withdrawal amount is $10')
    .refine((val) => val % 10 === 0, 'Amount must be in multiples of $10'),
  withdrawal_address: z.string().min(1, 'Withdrawal address is required'),
  blockchain: z.string().min(1, 'Blockchain selection is required'),
  otp_code: z.string().min(6, 'OTP code is required').max(6, 'OTP code must be 6 digits')
});

const withdrawInvestmentSchema = z.object({
  investment_id: z.string().min(1, 'Investment ID is required'),
  withdrawal_address: z.string().min(1, 'Withdrawal address is required'),
  blockchain: z.string().min(1, 'Blockchain selection is required'),
  otp_code: z.string().min(6, 'OTP code is required').max(6, 'OTP code must be 6 digits')
});

/**
 * POST /api/withdrawal/income
 * Withdraw earned income from wallet balance
 */
withdrawalRouter.post('/income', async (req, res) => {
  const userId = req.user.id;
  const parse = withdrawIncomeSchema.safeParse(req.body);

  if (!parse.success) {
    return res.status(400).json({ 
      success: false, 
      error: parse.error.flatten() 
    });
  }

  const { amount, withdrawal_address, blockchain, otp_code } = parse.data;

  try {
    // Verify OTP first
    const otpData = otpStore.get(`withdrawal_${userId}`);
    
    if (!otpData) {
      return res.status(400).json({ 
        success: false, 
        error: 'OTP not found or expired. Please request a new OTP.' 
      });
    }

    if (otpData.otp !== otp_code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid OTP code' 
      });
    }

    if (new Date() > otpData.expiresAt) {
      otpStore.delete(`withdrawal_${userId}`);
      return res.status(400).json({ 
        success: false, 
        error: 'OTP has expired. Please request a new OTP.' 
      });
    }

    // Verify OTP data matches request
    if (otpData.type !== 'income_withdrawal' || 
        otpData.amount !== amount ||
        otpData.blockchain !== blockchain ||
        otpData.withdrawal_address !== withdrawal_address) {
      return res.status(400).json({ 
        success: false, 
        error: 'OTP data does not match withdrawal request' 
      });
    }
    const result = await prisma.$transaction(async (prisma) => {
      // Calculate total income from all transactions (excluding deposits)
      const totalIncomeAgg = await prisma.transactions.aggregate({
        _sum: { amount: true },
        where: { 
          user_id: userId, 
          type: 'credit',
          income_source: { 
            not: { endsWith: '_deposit' }
          },
          status: 'COMPLETED'
        }
      });
      
      const totalIncome = Number(totalIncomeAgg._sum.amount || 0);

      // Get already withdrawn amounts (completed and pending)
      const totalWithdrawnAgg = await prisma.transactions.aggregate({
        _sum: { amount: true },
        where: {
          user_id: userId,
          OR: [
            { type: 'debit', income_source: { in: ['withdrawal', 'income_withdrawal', 'investment_withdrawal'] } },
            { type: 'WITHDRAWAL' }
          ],
          status: { in: ['COMPLETED', 'PENDING'] }
        }
      });
      
      const totalWithdrawn = Number(totalWithdrawnAgg._sum.amount || 0);

      // Calculate available withdrawable balance
      const availableWithdrawableBalance = Math.max(0, totalIncome - totalWithdrawn);

      // Check if user has enough withdrawable income balance
      if (availableWithdrawableBalance < amount) {
        throw new Error(`Insufficient withdrawable income. Available: $${availableWithdrawableBalance.toFixed(2)}, Requested: $${amount}. Note: Deposited amounts are locked for 6 months.`);
      }

      // Get or create wallet for balance tracking
      let wallet = await prisma.wallets.findUnique({
        where: { user_id: userId },
      });

      if (!wallet) {
        wallet = await prisma.wallets.create({
          data: {
            user_id: userId,
            balance: 0,
          },
        });
      }

      // Create withdrawal transaction
      const transaction = await prisma.transactions.create({
        data: {
          user_id: userId,
          amount,
          type: 'debit',
          income_source: 'income_withdrawal',
          status: 'PENDING',
          description: `Income withdrawal of $${amount} to ${blockchain} address ${withdrawal_address} [FULL_ADDRESS:${withdrawal_address}]`,
        },
      });

      // Update wallet balance (deduct immediately for pending withdrawal)
      await prisma.wallets.update({
        where: { user_id: userId },
        data: { balance: { decrement: amount } },
      });

      return transaction;
    });

    // Clear OTP after successful submission
    otpStore.delete(`withdrawal_${userId}`);

    res.status(201).json({
      success: true,
      message: 'Income withdrawal request submitted successfully. Processing may take 24-48 hours.',
      transaction: {
        id: result.id,
        amount: Number(result.amount),
        status: result.status,
        timestamp: result.timestamp,
      },
    });
  } catch (error) {
    console.error('Income withdrawal failed:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/withdrawal/investment
 * Withdraw investment principal (with 6-month lock period)
 */
withdrawalRouter.post('/investment', async (req, res) => {
  const userId = req.user.id;
  const parse = withdrawInvestmentSchema.safeParse(req.body);

  if (!parse.success) {
    return res.status(400).json({ 
      success: false, 
      error: parse.error.flatten() 
    });
  }

  const { investment_id, withdrawal_address, blockchain, otp_code } = parse.data;

  try {
    // Verify OTP first
    const otpData = otpStore.get(`withdrawal_${userId}`);
    
    if (!otpData) {
      return res.status(400).json({ 
        success: false, 
        error: 'OTP not found or expired. Please request a new OTP.' 
      });
    }

    if (otpData.otp !== otp_code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid OTP code' 
      });
    }

    if (new Date() > otpData.expiresAt) {
      otpStore.delete(`withdrawal_${userId}`);
      return res.status(400).json({ 
        success: false, 
        error: 'OTP has expired. Please request a new OTP.' 
      });
    }

    // Verify OTP data matches request
    if (otpData.type !== 'investment_withdrawal' || 
        otpData.investment_id !== investment_id ||
        otpData.blockchain !== blockchain ||
        otpData.withdrawal_address !== withdrawal_address) {
      return res.status(400).json({ 
        success: false, 
        error: 'OTP data does not match withdrawal request' 
      });
    }

    const result = await prisma.$transaction(async (prisma) => {
      // Get the investment with lock
      const investment = await prisma.investments.findUnique({
        where: { 
          id: investment_id,
          user_id: userId // Ensure user owns the investment
        },
      });

      if (!investment) {
        throw new Error('Investment not found or access denied');
      }

      // Check if investment is active
      if (investment.status !== 'active') {
        throw new Error(`Cannot withdraw from ${investment.status} investment`);
      }

      // Check 6-month lock period
      const currentDate = new Date();
      const investmentDate = new Date(investment.start_date);
      const monthsDifference = (currentDate.getFullYear() - investmentDate.getFullYear()) * 12 + 
                              (currentDate.getMonth() - investmentDate.getMonth());
      
      if (monthsDifference < 6) {
        const unlockDate = new Date(investmentDate);
        unlockDate.setMonth(unlockDate.getMonth() + 6);
        throw new Error(`Investment locked until ${unlockDate.toLocaleDateString()}. Lock period: 6 months from investment date.`);
      }

      // Check if there's already a pending withdrawal for this investment
      const existingWithdrawal = await prisma.transactions.findFirst({
        where: {
          user_id: userId,
          description: { contains: investment_id },
          income_source: 'investment_withdrawal',
          status: 'PENDING'
        }
      });

      if (existingWithdrawal) {
        throw new Error('There is already a pending withdrawal request for this investment');
      }

      // Create withdrawal transaction
      const transaction = await prisma.transactions.create({
        data: {
          user_id: userId,
          amount: investment.amount,
          type: 'debit',
          income_source: 'investment_withdrawal',
          status: 'PENDING',
          description: `Investment withdrawal of $${investment.amount} from ${investment.package_name} (ID: ${investment_id}) to ${blockchain} address ${withdrawal_address} [FULL_ADDRESS:${withdrawal_address}]`,
        },
      });

      // Mark investment as withdrawn (pending)
      await prisma.investments.update({
        where: { id: investment_id },
        data: { status: 'withdrawing' },
      });

      return { transaction, investment };
    });

    // Clear OTP after successful submission
    otpStore.delete(`withdrawal_${userId}`);

    res.status(201).json({
      success: true,
      message: 'Investment withdrawal request submitted successfully. Processing may take 3-5 business days.',
      transaction: {
        id: result.transaction.id,
        amount: Number(result.transaction.amount),
        status: result.transaction.status,
        timestamp: result.transaction.timestamp,
        investment: {
          id: result.investment.id,
          package_name: result.investment.package_name,
          start_date: result.investment.start_date,
        }
      },
    });
  } catch (error) {
    console.error('Investment withdrawal failed:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/withdrawal/history
 * Get withdrawal transaction history
 */
withdrawalRouter.get('/history', async (req, res) => {
  const userId = req.user.id;
  const { type, status, limit = '50', offset = '0' } = req.query;

  try {
    // Build where clause
    const whereClause = {
      user_id: userId,
      type: 'debit',
      income_source: { 
        in: ['withdrawal', 'income_withdrawal', 'investment_withdrawal'] 
      },
    };

    if (type && type !== 'ALL') {
      if (type === 'income') {
        whereClause.income_source = { in: ['withdrawal', 'income_withdrawal'] };
      } else if (type === 'investment') {
        whereClause.income_source = 'investment_withdrawal';
      }
    }

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    // Fetch withdrawal transactions
    const withdrawals = await prisma.transactions.findMany({
      where: whereClause,
      select: {
        id: true,
        amount: true,
        income_source: true,
        status: true,
        description: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    // Transform data
    const formattedWithdrawals = withdrawals.map((withdrawal) => {
      // Extract blockchain and address info from description
      let blockchain = 'N/A';
      let address = null;
      let investmentId = null;
      let packageName = null;
      
      if (withdrawal.description) {
        const blockchainMatch = withdrawal.description.match(/to (\w+) address/);
        if (blockchainMatch) {
          blockchain = blockchainMatch[1];
        }
        
        const addressMatch = withdrawal.description.match(/address ([a-zA-Z0-9]{10})\.\.\./);
        if (addressMatch) {
          address = addressMatch[1] + '...';
        }
        
        const investmentIdMatch = withdrawal.description.match(/ID: ([a-zA-Z0-9]+)\)/);
        if (investmentIdMatch) {
          investmentId = investmentIdMatch[1];
        }
        
        const packageMatch = withdrawal.description.match(/from (.+?) \(ID:/);
        if (packageMatch) {
          packageName = packageMatch[1];
        }
      }

      return {
        id: withdrawal.id,
        amount: parseFloat(withdrawal.amount.toString()),
        type: withdrawal.income_source === 'investment_withdrawal' ? 'investment' : 'income',
        status: withdrawal.status,
        blockchain,
        address,
        investmentId,
        packageName,
        description: withdrawal.description,
        timestamp: withdrawal.timestamp.toISOString(),
      };
    });

    // Get total count for pagination
    const totalCount = await prisma.transactions.count({
      where: whereClause,
    });

    res.json({
      success: true,
      withdrawals: formattedWithdrawals,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + formattedWithdrawals.length < totalCount,
      },
    });
  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch withdrawal history',
    });
  }
});

/**
 * GET /api/withdrawal/investments
 * Get user's deposits (investments) with withdrawal eligibility from transactions table
 */
withdrawalRouter.get('/investments', async (req, res) => {
  const userId = req.user.id;

  try {
    // Fetch all deposit transactions for the user
    const depositTransactions = await prisma.transactions.findMany({
      where: {
        user_id: userId,
        type: 'credit',
        income_source: { endsWith: '_deposit' }, // BEP20_deposit, TRC20_deposit, etc.
        status: 'COMPLETED'
      },
      select: {
        id: true,
        amount: true,
        income_source: true,
        timestamp: true,
        unlock_date: true,
        description: true
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    const currentDate = new Date();
    
    const investmentsWithEligibility = depositTransactions.map((deposit) => {
      const depositDate = new Date(deposit.timestamp);
      const unlockDate = deposit.unlock_date ? new Date(deposit.unlock_date) : new Date(depositDate.setMonth(depositDate.getMonth() + 6));
      
      // Calculate if deposit is eligible for withdrawal (past 6 months)
      const isEligible = currentDate >= unlockDate;
      
      // Calculate days until eligible
      const daysUntilEligible = isEligible ? 0 : Math.max(0, Math.ceil((unlockDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Extract blockchain type from income_source (e.g., "BEP20_deposit" -> "BEP20")
      const blockchainType = deposit.income_source.replace('_deposit', '').toUpperCase();
      
      // Extract amount from description or use transaction amount
      const packageName = `${blockchainType} Deposit`;
      
      return {
        id: deposit.id,
        amount: parseFloat(deposit.amount.toString()),
        package_name: packageName,
        start_date: deposit.timestamp.toISOString(),
        unlock_date: unlockDate.toISOString(),
        status: isEligible ? 'active' : 'active', // All completed deposits are active
        monthly_profit_rate: 10, // 10% monthly profit rate
        withdrawal_eligible: isEligible,
        eligible_date: unlockDate.toISOString(),
        days_until_eligible: daysUntilEligible,
        lock_period_months: 6,
      };
    });

    res.json({
      success: true,
      investments: investmentsWithEligibility,
    });
  } catch (error) {
    console.error('Error fetching investments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch investments',
    });
  }
});

/**
 * GET /api/withdrawal/stats
 * Get withdrawal statistics for the user
 */
withdrawalRouter.get('/stats', async (req, res) => {
  const userId = req.user.id;

  try {
    // Calculate total income from all transactions (excluding deposits)
    const totalIncomeAgg = await prisma.transactions.aggregate({
      _sum: { amount: true },
      where: { 
        user_id: userId, 
        type: 'credit',
        income_source: { 
          not: { endsWith: '_deposit' }
        },
        status: 'COMPLETED'
      }
    });

    const totalIncome = Number(totalIncomeAgg._sum.amount || 0);
    
    // Get completed withdrawals
    const completedWithdrawalsAgg = await prisma.transactions.aggregate({
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
    
    const completedWithdrawals = Number(completedWithdrawalsAgg._sum.amount || 0);
    
    // Get pending withdrawals
    const pendingWithdrawalsAgg = await prisma.transactions.aggregate({
      _sum: { amount: true },
      where: {
        user_id: userId,
        type: 'debit',
        status: 'PENDING'
      }
    });
    
    const pendingAmount = Number(pendingWithdrawalsAgg._sum.amount || 0);
    
    // Calculate available withdrawable balance
    const availableIncomeBalance = totalIncome - completedWithdrawals;
    const availableWithdrawableBalance = Math.max(0, availableIncomeBalance - pendingAmount);

    // Get total withdrawal count (completed only)
    const totalWithdrawalsCount = await prisma.transactions.count({
      where: {
        user_id: userId,
        type: 'debit',
        income_source: { in: ['withdrawal', 'income_withdrawal', 'investment_withdrawal'] },
        status: 'COMPLETED',
      },
    });

    // Get pending withdrawal count
    const pendingWithdrawalsCount = await prisma.transactions.count({
      where: {
        user_id: userId,
        type: 'debit',
        status: 'PENDING',
      },
    });

    // Get eligible investments count from deposit transactions
    const depositTransactions = await prisma.transactions.findMany({
      where: {
        user_id: userId,
        type: 'credit',
        income_source: { endsWith: '_deposit' },
        status: 'COMPLETED'
      },
      select: {
        timestamp: true,
        unlock_date: true,
      },
    });

    const currentDate = new Date();
    const eligibleInvestments = depositTransactions.filter(deposit => {
      const unlockDate = deposit.unlock_date ? new Date(deposit.unlock_date) : new Date(deposit.timestamp);
      return currentDate >= unlockDate;
    });

    res.json({
      success: true,
      stats: {
        available_balance: availableWithdrawableBalance, // Available income after completed withdrawals and pending
        total_income: totalIncome, // Total income earned (matches dashboard)
        available_income_balance: availableIncomeBalance, // Income - completed withdrawals
        total_withdrawn: completedWithdrawals,
        total_withdrawal_count: totalWithdrawalsCount,
        pending_amount: pendingAmount,
        pending_count: pendingWithdrawalsCount,
        eligible_investments_count: eligibleInvestments.length,
        total_investments_count: depositTransactions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching withdrawal stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch withdrawal stats',
    });
  }
});

export default withdrawalRouter;