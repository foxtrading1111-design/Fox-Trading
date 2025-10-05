import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
export const walletRouter = Router();
walletRouter.use(requireAuth);

const depositRequestSchema = z.object({
  amount: z.number()
    .min(100, 'Minimum deposit amount is $100')
    .refine((val) => val % 10 === 0, 'Amount must be in multiples of $10'),
  blockchain: z.string().min(1, 'Blockchain is required'),
  transaction_hash: z.string().optional()
});

walletRouter.post('/deposit-request', async (req, res) => {
  const userId = req.user.id;
  const parse = depositRequestSchema.safeParse(req.body);

  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { amount, blockchain, transaction_hash } = parse.data;

  try {
    // Create a PENDING transaction. This does NOT update the wallet balance yet.
    const depositRequest = await prisma.transactions.create({
      data: {
        user_id: userId,
        amount,
        type: 'credit',
        income_source: `${blockchain}_deposit`,
        status: 'PENDING',
        description: `User deposit request of $${amount} via ${blockchain}${transaction_hash ? ` (Tx: ${transaction_hash})` : ''}.`,
      },
    });
    res.status(201).json({ 
      message: 'Deposit request submitted successfully. It will be reviewed by an admin.', 
      request: depositRequest 
    });
  } catch (error) {
    console.error('Deposit request failed:', error);
    res.status(500).json({ error: 'Failed to submit deposit request.' });
  }
});

walletRouter.get('/balance', async (req, res) => {
  const userId = req.user.id;
  try {
    let wallet = await prisma.wallets.findUnique({ where: { user_id: userId } });
    
    // If wallet doesn't exist, create one with 0 balance
    if (!wallet) {
      wallet = await prisma.wallets.create({
        data: {
          user_id: userId,
          balance: 0,
        },
      });
    }
    
    return res.json({ balance: wallet.balance });
  } catch (error) {
    console.error('Error in /balance:', error);
    return res.status(500).json({ error: 'Failed to load balance', details: error.message });
  }
});

walletRouter.get('/transactions', async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const offset = Number(req.query.offset ?? 0);
  
  try {
    // Show completed, rejected, and pending withdrawal transactions to users
    const items = await prisma.transactions.findMany({
      where: { 
        user_id: userId,
        OR: [
          { status: 'COMPLETED' },
          { status: 'REJECTED' },
          { type: 'WITHDRAWAL', status: 'PENDING' } // Show pending withdrawals
        ]
      },
      orderBy: { timestamp: 'desc' },
      skip: offset,
      take: limit,
      include: {
        // Include user details if needed
        users: {
          select: {
            full_name: true,
            email: true
          }
        }
      }
    });
    
    const total = await prisma.transactions.count({ 
      where: { 
        user_id: userId,
        OR: [
          { status: 'COMPLETED' },
          { status: 'REJECTED' },
          { type: 'WITHDRAWAL', status: 'PENDING' } // Count pending withdrawals
        ]
      } 
    });
    
    return res.json({ 
      items: items.map(tx => ({
        ...tx,
        amount: Number(tx.amount) // Convert Decimal to number for JSON
      })), 
      limit, 
      offset, 
      total 
    });
  } catch (error) {
    console.error('Failed to load transactions:', error);
    return res.status(500).json({ 
      error: 'Failed to load transactions',
      details: error.message 
    });
  }
});

const withdrawSchema = z.object({ 
  amount: z.number()
    .min(10, 'Minimum withdrawal amount is $10')
    .refine((val) => val % 10 === 0, 'Amount must be in multiples of $10')
});

walletRouter.post('/withdraw', async (req, res) => {
  const userId = req.user.id;
  const parse = withdrawSchema.safeParse(req.body);

  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { amount } = parse.data;

  try {
    // Get user's current wallet balance
    let wallet = await prisma.wallets.findUnique({
      where: { user_id: userId },
    });

    // If wallet doesn't exist, create one with 0 balance
    if (!wallet) {
      wallet = await prisma.wallets.create({
        data: {
          user_id: userId,
          balance: 0,
        },
      });
    }

    // Check if the user has enough balance
    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Create a PENDING withdrawal transaction (does NOT deduct balance yet)
    const withdrawalRequest = await prisma.transactions.create({
      data: {
        user_id: userId,
        amount,
        type: 'WITHDRAWAL',
        income_source: 'withdrawal_request',
        status: 'PENDING',
        description: `Withdrawal request of $${amount} - Awaiting admin approval`,
      },
    });

    res.status(201).json({
      message: 'Withdrawal request submitted successfully. It will be reviewed by an admin.',
      request: withdrawalRequest,
    });
  } catch (error) {
    console.error('Withdrawal request failed:', error);
    res.status(500).json({ error: 'Failed to submit withdrawal request.' });
  }
});

// Get wallet addresses for deposits
walletRouter.get('/addresses', async (req, res) => {
  const userId = req.user.id;
  try {
    const addresses = await prisma.wallet_addresses.findMany({
      where: { 
        user_id: userId,
        is_active: true 
      },
      select: {
        blockchain: true,
        address: true,
        created_at: true
      },
      orderBy: { blockchain: 'asc' }
    });
    
    return res.json({ addresses });
  } catch (error) {
    console.error('Failed to load wallet addresses:', error);
    return res.status(500).json({ 
      error: 'Failed to load wallet addresses',
      details: error.message 
    });
  }
});

// Get available blockchains
walletRouter.get('/blockchains', async (req, res) => {
  try {
    const blockchains = [
      { 
        name: 'Bitcoin', 
        symbol: 'BTC', 
        icon: '₿',
        minDeposit: 100,
        minWithdraw: 10
      },
      { 
        name: 'Ethereum', 
        symbol: 'ETH', 
        icon: 'Ξ',
        minDeposit: 100,
        minWithdraw: 10
      },
      { 
        name: 'Tether USD', 
        symbol: 'USDT', 
        icon: '₮',
        minDeposit: 100,
        minWithdraw: 10
      },
      { 
        name: 'USD Coin', 
        symbol: 'USDC', 
        icon: '$',
        minDeposit: 100,
        minWithdraw: 10
      },
      { 
        name: 'Binance Coin', 
        symbol: 'BNB', 
        icon: 'B',
        minDeposit: 100,
        minWithdraw: 10
      }
    ];
    
    return res.json({ blockchains });
  } catch (error) {
    console.error('Failed to load blockchains:', error);
    return res.status(500).json({ 
      error: 'Failed to load blockchains',
      details: error.message 
    });
  }
});