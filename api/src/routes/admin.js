import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
export const adminRouter = Router();

// Protect all routes in this file so only logged-in admins can access them
adminRouter.use(requireAuth, requireAdmin);

/**
 * Route to get all transactions with a 'PENDING' status.
 * This is for the admin's "Manage Deposits" page.
 */
adminRouter.get('/deposits/pending', async (req, res) => {
  try {
    const pendingRequests = await prisma.transactions.findMany({
      where: { 
        status: 'PENDING',
        type: 'credit',
        OR: [
          { income_source: 'manual_deposit' },
          { income_source: { contains: '_deposit' } } // BTC_deposit, ETH_deposit, etc.
        ]
      },
      include: {
        users: {
          select: {
            full_name: true,
            email: true,
          },
        },
        deposit_metadata: {
          select: {
            blockchain: true,
            screenshot: true,
            transaction_hash: true,
            wallet_address: true,
            created_at: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc', // Show newest first
      },
    });
    res.json(pendingRequests);
  } catch (error) {
    console.error('Failed to fetch pending deposits:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests.', details: error.message });
  }
});

/**
 * Route to get transaction history (approved deposits and withdrawals)
 */
adminRouter.get('/transactions/history', async (req, res) => {
  try {
    const { limit = 50, offset = 0, type } = req.query;
    
    const whereConditions = {
      status: { in: ['COMPLETED', 'REJECTED'] },
      OR: [
        // Deposits
        {
          type: 'credit',
          OR: [
            { income_source: 'manual_deposit' },
            { income_source: { contains: '_deposit' } }
          ]
        },
        // Withdrawals  
        {
          type: 'debit',
          OR: [
            { income_source: 'income_withdrawal' },
            { income_source: 'investment_withdrawal' }
          ]
        }
      ]
    };

    // Filter by type if specified
    if (type === 'deposits') {
      whereConditions.OR = [whereConditions.OR[0]]; // Only deposits
    } else if (type === 'withdrawals') {
      whereConditions.OR = [whereConditions.OR[1]]; // Only withdrawals
    }

    const transactions = await prisma.transactions.findMany({
      where: whereConditions,
      include: {
        users: {
          select: {
            full_name: true,
            email: true,
          },
        }
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    // Get total count for pagination
    const totalCount = await prisma.transactions.count({
      where: whereConditions,
    });

    // Extract withdrawal address and blockchain from description for withdrawal transactions
    const enrichedTransactions = transactions.map(transaction => {
      if (transaction.type === 'debit' && 
          (transaction.income_source === 'income_withdrawal' || transaction.income_source === 'investment_withdrawal')) {
        // Extract blockchain and address from description
        const blockchainMatch = transaction.description?.match(/to (\w+) address/i);
        const blockchain = blockchainMatch?.[1] || 'Unknown';
        
        // Try to get full address from FULL_ADDRESS tag first
        const fullAddressMatch = transaction.description?.match(/\[FULL_ADDRESS:([^\]]+)\]/i);
        let withdrawalAddress = fullAddressMatch?.[1] || '';
        
        // Fallback to old extraction method if no FULL_ADDRESS tag
        if (!withdrawalAddress) {
          const descMatch = transaction.description?.match(/to \w+ address ([\w\d]+)/i);
          withdrawalAddress = descMatch?.[1] || '';
        }
        
        return {
          ...transaction,
          withdrawal_details: {
            blockchain,
            address: withdrawalAddress,
            full_description: transaction.description
          }
        };
      }
      return transaction;
    });

    res.json({
      transactions: enrichedTransactions,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + transactions.length < totalCount,
      },
    });
  } catch (error) {
    console.error('Failed to load transaction history:', error);
    res.status(500).json({ error: 'Failed to load transaction history' });
  }
});

/**
 * Route to get all pending withdrawal requests
 */
adminRouter.get('/withdrawals/pending', async (req, res) => {
  try {
    const pendingWithdrawals = await prisma.transactions.findMany({
      where: {
        type: 'debit',
        status: 'PENDING',
        OR: [
          { income_source: 'income_withdrawal' },
          { income_source: 'investment_withdrawal' }
        ],
      },
      include: {
        users: {
          select: {
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Extract withdrawal address and blockchain from description
    const enrichedWithdrawals = pendingWithdrawals.map(withdrawal => {
      // Extract blockchain and address from description
      // New format: "Income withdrawal of $100 to BEP20 address 0x123... [FULL_ADDRESS:0x123...]"
      const blockchainMatch = withdrawal.description?.match(/to (\w+) address/i);
      const blockchain = blockchainMatch?.[1] || 'Unknown';
      
      // Try to get full address from FULL_ADDRESS tag first
      const fullAddressMatch = withdrawal.description?.match(/\[FULL_ADDRESS:([^\]]+)\]/i);
      let withdrawalAddress = fullAddressMatch?.[1] || '';
      
      // Fallback to old extraction method if no FULL_ADDRESS tag
      if (!withdrawalAddress) {
        const descMatch = withdrawal.description?.match(/to \w+ address ([\w\d]+)/i);
        withdrawalAddress = descMatch?.[1] || '';
      }
      
      return {
        ...withdrawal,
        withdrawal_details: {
          blockchain,
          address: withdrawalAddress,
          full_description: withdrawal.description
        }
      };
    });

    res.json(enrichedWithdrawals);
  } catch (error) {
    console.error('Failed to load pending withdrawals:', error);
    res.status(500).json({ error: 'Failed to load pending withdrawals' });
  }
});

/**
 * Route to approve a pending deposit.
 * It updates the transaction status and increments the user's wallet balance.
 */
adminRouter.post('/deposits/approve/:transactionId', async (req, res) => {
  const { transactionId } = req.params;
  try {
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Get and lock the transaction
      const transaction = await prisma.transactions.findUnique({
        where: { id: transactionId },
        select: { 
          id: true,
          user_id: true,
          amount: true,
          status: true 
        }
      });

      if (!transaction || transaction.status !== 'PENDING') {
        throw new Error('Pending transaction not found');
      }

      // 2. Update transaction status to COMPLETED and set 6-month unlock date for deposits
      const unlockDate = new Date();
      unlockDate.setMonth(unlockDate.getMonth() + 6); // 6 months lock for deposits
      
      await prisma.transactions.update({
        where: { id: transactionId },
        data: { 
          status: 'COMPLETED',
          unlock_date: unlockDate // Deposits are locked for 6 months
        },
      });

      // 3. Get or create user's wallet
      let wallet = await prisma.wallets.findUnique({
        where: { user_id: transaction.user_id },
      });

      if (!wallet) {
        wallet = await prisma.wallets.create({
          data: {
            user_id: transaction.user_id,
            balance: 0,
          },
        });
      }

      // 4. Update wallet balance
      await prisma.wallets.update({
        where: { user_id: transaction.user_id },
        data: { 
          balance: { 
            increment: Number(transaction.amount) 
          } 
        },
      });

      // 5. Process referral income for the deposit
      const user = await prisma.users.findUnique({ 
        where: { id: transaction.user_id }, 
        select: { sponsor_id: true, full_name: true, email: true } 
      });
      
      if (user?.sponsor_id) {
        // Define referral percentages for each level
        const referralPercentages = [
          10,  // Level 1 (Direct sponsor) - 10%
          5,   // Level 2 - 5% 
          3,   // Level 3 - 3%
        ];

        let currentUserId = transaction.user_id;
        for (let level = 0; level < referralPercentages.length; level++) {
          const currentUser = await prisma.users.findUnique({ 
            where: { id: currentUserId }, 
            select: { sponsor_id: true, full_name: true } 
          });
          
          const sponsorId = currentUser?.sponsor_id;
          if (!sponsorId) break; // No more sponsors in the chain

          const referralAmount = Number((transaction.amount * referralPercentages[level] / 100).toFixed(2));
          
          if (referralAmount > 0) {
            // Ensure sponsor has a wallet
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
                status: 'COMPLETED',
                unlock_date: new Date(), // Income is immediately withdrawable
                referral_level: level + 1 // Track referral level
              },
            });
            
            console.log(`💰 ${incomeSource} of $${referralAmount} added for sponsor at level ${level + 1}`);
          }
          
          currentUserId = sponsorId; // Move up the chain
        }
        
        console.log(`✅ Processed referral income for deposit approval: ${user.full_name || user.email} - $${transaction.amount}`);
      }

      return { success: true };
    });

    res.json({ message: 'Deposit approved successfully' });
  } catch (error) {
    console.error('Failed to approve deposit:', error);
    res.status(500).json({ 
      error: 'Failed to approve deposit.',
      details: error.message 
    });
  }
});

/**
 * Route to decline a pending deposit.
 * It updates the transaction status to 'FAILED'.
 */
adminRouter.post('/deposits/reject/:transactionId', async (req, res) => {
  const { transactionId } = req.params;
  const { reason } = req.body;

  try {
    const transaction = await prisma.transactions.findUnique({ 
      where: { id: transactionId } 
    });

    if (!transaction || transaction.status !== 'PENDING') {
      return res.status(404).json({ error: 'Pending transaction not found.' });
    }

    await prisma.transactions.update({
      where: { id: transactionId },
      data: { 
        status: 'REJECTED',
        description: `${transaction.description} (Rejected: ${reason || 'No reason provided'})`
      },
    });

    res.json({ message: 'Deposit rejected successfully' });
  } catch (error) {
    console.error('Failed to reject deposit:', error);
    res.status(500).json({ 
      error: 'Failed to reject deposit.',
      details: error.message 
    });
  }  
});

/**
 * Route to approve a pending withdrawal.
 * It updates the transaction status and deducts the user's wallet balance.
 */
adminRouter.post('/withdrawals/approve/:transactionId', async (req, res) => {
  const { transactionId } = req.params;
  try {
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Get and lock the withdrawal transaction
      const transaction = await prisma.transactions.findUnique({
        where: { id: transactionId },
        select: { 
          id: true,
          user_id: true,
          amount: true,
          status: true,
          type: true
        }
      });

      if (!transaction || transaction.status !== 'PENDING' || transaction.type !== 'debit') {
        throw new Error('Pending withdrawal transaction not found');
      }

      // 2. Get user's current wallet balance
      let wallet = await prisma.wallets.findUnique({
        where: { user_id: transaction.user_id },
      });

      if (!wallet) {
        wallet = await prisma.wallets.create({
          data: {
            user_id: transaction.user_id,
            balance: 0,
          },
        });
      }

      // 3. Update transaction status to COMPLETED
      // Note: Balance was already deducted when the withdrawal request was created
      await prisma.transactions.update({
        where: { id: transactionId },
        data: { 
          status: 'COMPLETED',
          description: `${transaction.description || 'Withdrawal request'} - Approved by admin`
        },
      });

      return { success: true };
    });

    res.json({ message: 'Withdrawal approved successfully' });
  } catch (error) {
    console.error('Failed to approve withdrawal:', error);
    res.status(500).json({ 
      error: 'Failed to approve withdrawal.',
      details: error.message 
    });
  }
});

/**
 * Route to decline a pending withdrawal.
 * It updates the transaction status to 'REJECTED'.
 */
adminRouter.post('/withdrawals/reject/:transactionId', async (req, res) => {
  const { transactionId } = req.params;
  const { reason } = req.body;

  try {
    const transaction = await prisma.transactions.findUnique({ 
      where: { id: transactionId } 
    });

    if (!transaction || transaction.status !== 'PENDING' || transaction.type !== 'debit') {
      return res.status(404).json({ error: 'Pending withdrawal transaction not found.' });
    }

    // Use transaction to restore balance and update status atomically
    await prisma.$transaction(async (prisma) => {
      // Update transaction status to REJECTED
      await prisma.transactions.update({
        where: { id: transactionId },
        data: { 
          status: 'REJECTED',
          description: `${transaction.description} (Rejected: ${reason || 'No reason provided'})`
        },
      });
      
      // Restore the balance that was deducted when withdrawal was requested
      await prisma.wallets.upsert({
        where: { user_id: transaction.user_id },
        create: { 
          user_id: transaction.user_id, 
          balance: Number(transaction.amount) 
        },
        update: { 
          balance: { 
            increment: Number(transaction.amount) 
          } 
        },
      });
    });

    res.json({ message: 'Withdrawal rejected successfully' });
  } catch (error) {
    console.error('Failed to reject withdrawal:', error);
    res.status(500).json({ 
      error: 'Failed to reject withdrawal.',
      details: error.message 
    });
  }  
});
