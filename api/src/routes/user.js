import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import prisma from '../lib/prisma.js';
import { calculateDailyInvestmentProfits, getTotalInvestmentProfit } from '../utils/investmentProfit.js';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/screenshots');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Import shared OTP store
import otpStore from '../lib/otpStore.js';

export const userRouter = Router();
userRouter.use(requireAuth);

/**
 * Recursively fetches all user IDs in a downline starting from a given set of users.
 * @param {string[]} startUserIds - An array of user IDs to start the traversal from.
 * @returns {Promise<string[]>} A flat array of all unique user IDs in the downline.
 */
async function getDownlineIds(startUserIds) {
    if (startUserIds.length === 0) return [];
    const allDescendants = new Set();
    let queue = [...startUserIds];
    const visited = new Set();

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        allDescendants.add(currentId);
        
        const children = await prisma.users.findMany({
            where: { sponsor_id: currentId },
            select: { id: true },
        });
        queue.push(...children.map(c => c.id));
    }
    return Array.from(allDescendants);
}

userRouter.get('/dashboard', async (req, res) => {
    const userId = req.user.id;
    try {
        // Get user profile info
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { full_name: true, email: true, referral_code: true, created_at: true }
        });

        // Get total deposited amount (for investment tracking)
        const depositedAmountAgg = await prisma.transactions.aggregate({
            _sum: { amount: true }, 
            where: { 
                user_id: userId, 
                OR: [
                    { type: 'DEPOSIT', status: 'COMPLETED' },
                    { type: 'credit', income_source: { endsWith: '_deposit' } }
                ],
                status: 'COMPLETED'
            },
        });

        // Get wallet data with upsert to ensure it exists
        const wallet = await prisma.wallets.upsert({
            where: { user_id: userId },
            update: {},
            create: { user_id: userId, balance: 0 }
        });

        // Get recent transactions (including pending referral income)
        const recentTransactions = await prisma.transactions.findMany({
            where: { user_id: userId }, 
            orderBy: { timestamp: 'desc' }, 
            take: 20, // Increased to show more recent activity
        });

        // Calculate income breakdown (including completed transactions only for totals)
        const incomeBreakdown = await prisma.transactions.groupBy({
            by: ['income_source'],
            _sum: { amount: true },
            where: { user_id: userId, type: 'credit', status: 'COMPLETED' },
        });

        // Daily income - only income earned today (exclude deposits)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const dailyIncomeAgg = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: {
                user_id: userId,
                type: 'credit',
                timestamp: { gte: today, lt: tomorrow },
                income_source: { 
                    in: ['direct_income', 'team_income', 'salary_income', 'daily_profit', 'monthly_profit']
                },
                status: 'COMPLETED'
            }
        });

        // Total income from all sources (referral, team, salary, monthly profit) - exclude deposits
        const totalIncomeAgg = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: { 
                user_id: userId, 
                type: 'credit',
                income_source: { 
                    in: ['direct_income', 'team_income', 'salary_income', 'daily_profit', 'monthly_profit']
                }
            }
        });

        // Total withdrawals (only completed withdrawals)
        const totalWithdrawalAgg = await prisma.transactions.aggregate({
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

        // Calculate today's investment profit
        const investmentDeposits = await prisma.transactions.findMany({
            where: { 
                user_id: userId,
                OR: [
                    { type: 'DEPOSIT', status: 'COMPLETED' },
                    { type: 'credit', income_source: { endsWith: '_deposit' } }
                ]
            },
            select: { amount: true, timestamp: true }
        });
        
        const dailyProfitRate = 0.10 / 30; // 10% monthly / 30 days
        const todayInvestmentProfit = investmentDeposits.reduce((total, deposit) => {
            return total + (Number(deposit.amount) * dailyProfitRate);
        }, 0);
        
        // Get total investment profit earned (from actual transactions)
        const totalInvestmentProfit = await getTotalInvestmentProfit(userId);

        // Get team data
        const directChildren = await prisma.users.findMany({ 
            where: { sponsor_id: userId }, 
            select: { id: true } 
        });
        
        const downlineIds = await getDownlineIds(directChildren.map(c => c.id));
        
        // Calculate business volumes
        const leftLegUsers = await prisma.users.findMany({
            where: { sponsor_id: userId, position: 'LEFT' },
            select: { id: true }
        });
        
        const rightLegUsers = await prisma.users.findMany({
            where: { sponsor_id: userId, position: 'RIGHT' },
            select: { id: true }
        });
        
        const leftLegIds = await getDownlineIds(leftLegUsers.map(u => u.id));
        const rightLegIds = await getDownlineIds(rightLegUsers.map(u => u.id));
        
        const leftLegBusinessAgg = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: { 
                user_id: { in: leftLegIds },
                OR: [
                    { type: 'DEPOSIT', status: 'COMPLETED' },
                    { type: 'credit', income_source: { endsWith: '_deposit' } }
                ]
            }
        });
        
        const rightLegBusinessAgg = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: { 
                user_id: { in: rightLegIds },
                OR: [
                    { type: 'DEPOSIT', status: 'COMPLETED' },
                    { type: 'credit', income_source: { endsWith: '_deposit' } }
                ]
            }
        });
        
        const totalBusinessAgg = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: { 
                user_id: { in: downlineIds },
                OR: [
                    { type: 'DEPOSIT', status: 'COMPLETED' },
                    { type: 'credit', income_source: { endsWith: '_deposit' } }
                ]
            }
        });

        // Calculate daily income including today's expected investment profit
        const dailyIncomeFromTransactions = Number(dailyIncomeAgg._sum.amount || 0);
        const totalDailyIncome = dailyIncomeFromTransactions + todayInvestmentProfit;
        
        return res.json({
            // User info
            user_name: user?.full_name ?? 'N/A',
            user_email: user?.email ?? 'N/A',
            referral_code: user?.referral_code ?? 'N/A',
            join_date: user?.created_at ?? null,
            
            // Financial data
            total_investment: depositedAmountAgg._sum.amount ?? 0, // Total deposited amount (for tracking)
            wallet_balance: depositedAmountAgg._sum.amount ?? 0, // Total Balance = Amount deposited through website
            daily_income: totalDailyIncome, // Today's income including daily profit (both from transactions and expected profit)
            total_income: totalIncomeAgg._sum.amount ?? 0, // Total lifetime income from all sources (referral, team, salary)
            total_withdrawal: totalWithdrawalAgg._sum.amount ?? 0,
            today_investment_profit: todayInvestmentProfit,
            total_investment_profit: totalInvestmentProfit,
            
            // Business data
            left_leg_business: leftLegBusinessAgg._sum.amount ?? 0,
            right_leg_business: rightLegBusinessAgg._sum.amount ?? 0,
            total_business: totalBusinessAgg._sum.amount ?? 0,
            direct_team: directChildren.length,
            total_team: downlineIds.length - 1, // Subtract 1 to not include user themselves
            
            // Income breakdown
            income_breakdown: incomeBreakdown.map(item => ({
                source: item.income_source,
                amount: item._sum.amount ?? 0
            })),
            
            // Recent transactions
            recent_transactions: recentTransactions,
        });
    } catch(err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

userRouter.get('/profile', async (req, res) => {
    const userId = req.user.id;
    try {
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { full_name: true, email: true, referral_code: true, sponsor_id: true, created_at: true },
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log('Profile data:', user); // Debug log
        return res.json(user);
    } catch (error) {
        console.error('Profile error:', error);
        return res.status(500).json({ error: 'Failed to load profile' });
    }
});

userRouter.get('/profit-history', async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await prisma.$queryRaw`
            SELECT to_char(timestamp, 'YYYY-MM') as month, SUM(amount::float) as profit
            FROM "transactions"
            WHERE user_id = ${userId} AND type = 'credit'
            GROUP BY month
            ORDER BY month ASC;
        `;
        // Convert BigInt profit values to numbers for JSON compatibility
        const formattedResult = result.map(r => ({ ...r, profit: Number(r.profit) }));
        return res.json(formattedResult);
    } catch(e) {
        console.error(e);
        return res.status(500).json({ error: 'Failed to load history' });
    }
});

userRouter.get('/income-breakdown', async (req, res) => {
    const userId = req.user.id;
    try {
        const agg = await prisma.transactions.groupBy({
            by: ['income_source'],
            _sum: { amount: true },
            where: { user_id: userId, type: 'credit', status: { not: 'PENDING' } },
        });
        
        const result = agg.map(a => ({
            source: a.income_source,
            amount: a._sum.amount ?? 0,
        }));
        return res.json(result);
    } catch(e) {
        return res.status(500).json({ error: 'Failed to load income breakdown' });
    }
});

// New endpoint for referral income data with real-time updates
userRouter.get('/referral-income', async (req, res) => {
    const userId = req.user.id;
    try {
        // Get all referral income transactions (including pending)
        const referralTransactions = await prisma.transactions.findMany({
            where: { 
                user_id: userId, 
                type: 'credit',
                income_source: 'referral_income'
            },
            orderBy: { timestamp: 'desc' },
        });

        // Calculate totals by status
        const completedTotal = referralTransactions
            .filter(tx => tx.status === 'COMPLETED')
            .reduce((sum, tx) => sum + Number(tx.amount), 0);

        const pendingTotal = referralTransactions
            .filter(tx => tx.status === 'PENDING')
            .reduce((sum, tx) => sum + Number(tx.amount), 0);

        // Group by level for breakdown
        const levelBreakdown = referralTransactions.reduce((acc, tx) => {
            const levelMatch = tx.description?.match(/level\s*(\d+)|L(\d+)/i);
            const level = levelMatch ? parseInt(levelMatch[1] || levelMatch[2]) : 1;
            
            if (!acc[level]) {
                acc[level] = { completed: 0, pending: 0, count: 0 };
            }
            
            if (tx.status === 'COMPLETED') {
                acc[level].completed += Number(tx.amount);
            } else if (tx.status === 'PENDING') {
                acc[level].pending += Number(tx.amount);
            }
            acc[level].count++;
            
            return acc;
        }, {});

        return res.json({
            total_completed: completedTotal,
            total_pending: pendingTotal,
            total_transactions: referralTransactions.length,
            level_breakdown: levelBreakdown,
            recent_transactions: referralTransactions.slice(0, 20),
            last_updated: new Date().toISOString()
        });
    } catch(e) {
        console.log('Referral income error:', e);
        return res.status(500).json({ error: 'Failed to load referral income' });
    }
});

// Investment endpoints
userRouter.get('/investments/my', async (req, res) => {
    const userId = req.user.id;
    try {
        // Get all completed deposits (these are our "investments")
        const deposits = await prisma.transactions.findMany({
            where: { 
                user_id: userId,
                OR: [
                    { type: 'DEPOSIT', status: 'COMPLETED' },
                    { type: 'credit', income_source: { endsWith: '_deposit' } }
                ]
            },
            select: {
                id: true,
                amount: true,
                timestamp: true,
                description: true,
                income_source: true,
                type: true
            },
            orderBy: { timestamp: 'desc' }
        });

        // Calculate daily profit (10% monthly = ~0.333% daily)
        const dailyProfitRate = 0.10 / 30; // 10% monthly / 30 days
        const now = new Date();
        
        const investments = deposits.map(deposit => {
            const investmentDate = new Date(deposit.timestamp);
            const daysSinceInvestment = Math.floor((now - investmentDate) / (1000 * 60 * 60 * 24));
            const totalProfitEarned = Number(deposit.amount) * dailyProfitRate * daysSinceInvestment;
            const todayProfit = Number(deposit.amount) * dailyProfitRate;
            
            return {
                id: deposit.id,
                amount: Number(deposit.amount),
                investmentDate: deposit.timestamp,
                daysSinceInvestment,
                dailyProfitRate: (dailyProfitRate * 100).toFixed(3), // as percentage
                monthlyProfitRate: '10.00', // 10% monthly
                totalProfitEarned: totalProfitEarned.toFixed(2),
                todayProfit: todayProfit.toFixed(2),
                status: 'active',
                description: deposit.description,
                blockchain: deposit.income_source?.replace('_deposit', '').toUpperCase() || 'DEPOSIT'
            };
        });

        // Calculate totals
        const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
        const totalProfitEarned = investments.reduce((sum, inv) => sum + Number(inv.totalProfitEarned), 0);
        const totalTodayProfit = investments.reduce((sum, inv) => sum + Number(inv.todayProfit), 0);

        return res.json({
            investments,
            summary: {
                totalInvested,
                totalProfitEarned: totalProfitEarned.toFixed(2),
                totalTodayProfit: totalTodayProfit.toFixed(2),
                totalInvestments: investments.length,
                averageInvestment: investments.length > 0 ? (totalInvested / investments.length).toFixed(2) : '0'
            }
        });
    } catch (error) {
        console.error('My investments error:', error);
        return res.status(500).json({ error: 'Failed to load investments' });
    }
});

userRouter.get('/investments/team', async (req, res) => {
    const userId = req.user.id;
    try {
        // Get direct children
        const directChildren = await prisma.users.findMany({ 
            where: { sponsor_id: userId }, 
            select: { id: true, email: true, full_name: true } 
        });
        
        if (directChildren.length === 0) {
            return res.json({ teamInvestments: [], summary: { totalTeamInvested: '0', totalTeamInvestments: 0 } });
        }
        
        // Get downline IDs
        const downlineIds = await getDownlineIds(directChildren.map(c => c.id));
        
        // Get all team investments (completed deposits)
        const teamDeposits = await prisma.transactions.findMany({
            where: { 
                user_id: { in: downlineIds },
                OR: [
                    { type: 'DEPOSIT', status: 'COMPLETED' },
                    { type: 'credit', income_source: { endsWith: '_deposit' } }
                ]
            },
            include: {
                users: {
                    select: {
                        email: true,
                        full_name: true
                    }
                }
            },
            orderBy: { timestamp: 'desc' }
        });

        // Calculate daily profit for team investments
        const dailyProfitRate = 0.10 / 30; // 10% monthly / 30 days
        const now = new Date();
        
        const teamInvestments = teamDeposits.map(deposit => {
            const investmentDate = new Date(deposit.timestamp);
            const daysSinceInvestment = Math.floor((now - investmentDate) / (1000 * 60 * 60 * 24));
            const totalProfitEarned = Number(deposit.amount) * dailyProfitRate * daysSinceInvestment;
            const todayProfit = Number(deposit.amount) * dailyProfitRate;
            
            return {
                id: deposit.id,
                amount: Number(deposit.amount),
                investmentDate: deposit.timestamp,
                daysSinceInvestment,
                totalProfitEarned: totalProfitEarned.toFixed(2),
                todayProfit: todayProfit.toFixed(2),
                investor: {
                    name: deposit.users?.full_name || 'N/A',
                    email: deposit.users?.email || 'N/A'
                },
                blockchain: deposit.income_source?.replace('_deposit', '').toUpperCase() || 'DEPOSIT'
            };
        });

        // Calculate team summary
        const totalTeamInvested = teamInvestments.reduce((sum, inv) => sum + inv.amount, 0);
        const totalTeamProfitEarned = teamInvestments.reduce((sum, inv) => sum + Number(inv.totalProfitEarned), 0);

        return res.json({
            teamInvestments,
            summary: {
                totalTeamInvested: totalTeamInvested.toFixed(2),
                totalTeamProfitEarned: totalTeamProfitEarned.toFixed(2),
                totalTeamInvestments: teamInvestments.length,
                teamMembers: downlineIds.length
            }
        });
    } catch (error) {
        console.error('Team investments error:', error);
        return res.status(500).json({ error: 'Failed to load team investments' });
    }
});

userRouter.get('/salary-status', async (req, res) => {
    const userId = req.user.id;
    try {
        // Get all direct downline users
        const directChildren = await prisma.users.findMany({ 
            where: { sponsor_id: userId }, 
            select: { id: true } 
        });

        // Get all downline IDs (direct and indirect)
        const downlineIds = await getDownlineIds(directChildren.map(c => c.id));
        
        // Get left and right leg users separately
        const leftLegUsers = await prisma.users.findMany({
            where: { sponsor_id: userId, position: 'LEFT' },
            select: { id: true }
        });
        
        const rightLegUsers = await prisma.users.findMany({
            where: { sponsor_id: userId, position: 'RIGHT' },
            select: { id: true }
        });
        
        const leftLegIds = await getDownlineIds(leftLegUsers.map(u => u.id));
        const rightLegIds = await getDownlineIds(rightLegUsers.map(u => u.id));
        
        // Calculate left leg volume
        const leftLegVolumeAgg = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: { 
                user_id: { in: leftLegIds },
                OR: [
                    { type: 'DEPOSIT', status: 'COMPLETED' },
                    { type: 'credit', income_source: { endsWith: '_deposit' } }
                ]
            }
        });
        
        // Calculate right leg volume
        const rightLegVolumeAgg = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: { 
                user_id: { in: rightLegIds },
                OR: [
                    { type: 'DEPOSIT', status: 'COMPLETED' },
                    { type: 'credit', income_source: { endsWith: '_deposit' } }
                ]
            }
        });
        
        // Calculate total downline volume (use completed deposits)
        const volumeAgg = await prisma.transactions.aggregate({ 
            _sum: { amount: true }, 
            where: { 
                user_id: { in: downlineIds },
                OR: [
                    { type: 'DEPOSIT', status: 'COMPLETED' },
                    { type: 'credit', income_source: { endsWith: '_deposit' } }
                ]
            } 
        });

        const totalVolume = Number(volumeAgg._sum.amount || 0);
        const leftLegVolume = Number(leftLegVolumeAgg._sum.amount || 0);
        const rightLegVolume = Number(rightLegVolumeAgg._sum.amount || 0);
        
        // Ranks require BOTH legs to meet minimum threshold
        // To qualify for a rank, both left and right legs must have the required volume
        const ranks = [
            { name: 'Rank 1', threshold: 5000, salary: 100 },      // Each leg needs $5,000
            { name: 'Rank 2', threshold: 15000, salary: 250 },     // Each leg needs $15,000
            { name: 'Rank 3', threshold: 50000, salary: 500 },     // Each leg needs $50,000
            { name: 'Rank 4', threshold: 80000, salary: 750 },     // Each leg needs $80,000
            { name: 'Rank 5', threshold: 100000, salary: 1000 },   // Each leg needs $100,000
        ];
        
        // Calculate progress for each rank based on BOTH legs meeting requirement
        const progress = ranks.map(r => {
            const leftMeetsRequirement = leftLegVolume >= r.threshold;
            const rightMeetsRequirement = rightLegVolume >= r.threshold;
            const isAchieved = leftMeetsRequirement && rightMeetsRequirement;
            
            // Progress is based on the weaker leg
            const weakerLeg = Math.min(leftLegVolume, rightLegVolume);
            const progressValue = Math.min(1, weakerLeg / r.threshold);
            
            // Volume needed is for the weaker leg
            const leftNeeded = Math.max(0, r.threshold - leftLegVolume);
            const rightNeeded = Math.max(0, r.threshold - rightLegVolume);
            
            return {
                rankName: r.name,
                threshold: r.threshold,
                salary: r.salary,
                isAchieved,
                progress: progressValue,
                volumeNeeded: Math.max(leftNeeded, rightNeeded),
                leftLegVolume,
                rightLegVolume,
                leftNeeded,
                rightNeeded,
                requirementMet: {
                    left: leftMeetsRequirement,
                    right: rightMeetsRequirement
                }
            };
        });
        
        const current = progress.slice().reverse().find(p => p.isAchieved) ?? null;
        
        return res.json({ 
            totalVolume, 
            leftLegVolume,
            rightLegVolume,
            directReferrals: directChildren.length,
            totalDownline: downlineIds.length,
            ranks: progress, 
            currentRank: current?.rankName ?? null 
        });
    } catch(e) {
        console.error('Salary status error:', e);
        return res.status(500).json({ error: 'Failed to load salary status' });
    }
});

// Wallet addresses endpoints - Fixed BEP20 and TRC20 addresses
userRouter.get('/wallet-addresses', async (req, res) => {
    try {
        // Fixed wallet addresses for BEP20 and TRC20 networks
        const walletAddresses = [
            {
                blockchain: 'BEP20',
                address: '0x770a2927028bBfC8b2586A1C7b2C367fe4692Ae2'
            },
            {
                blockchain: 'TRC20',
                address: 'TBbekVinSV2HLX5B8YyX6ruqTj3qc2WvPE'
            }
        ];

        res.json({
            success: true,
            walletAddresses,
        });
    } catch (error) {
        console.error('Error fetching wallet addresses:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch wallet addresses',
        });
    }
});

// Deposit history endpoints
userRouter.get('/deposit-history', async (req, res) => {
    const userId = req.user.id;
    const { status, limit = '50', offset = '0' } = req.query;
    
    console.log(`📋 Deposit history request - User ID: ${userId}, Status: ${status || 'ALL'}, Limit: ${limit}, Offset: ${offset}`);
    
    try {
        // Build where clause for deposits (type: 'credit' with income_source ending with '_deposit')
        const whereClause = {
            user_id: userId,
            type: 'credit',
            income_source: { endsWith: '_deposit' }
        };

        if (status && status !== 'ALL') {
            whereClause.status = status;
        }
        
        console.log('🔍 Query where clause:', JSON.stringify(whereClause, null, 2));

        // Fetch deposit transactions from the database
        const deposits = await prisma.transactions.findMany({
            where: whereClause,
            select: {
                id: true,
                amount: true,
                status: true,
                description: true,
                timestamp: true,
                income_source: true,
            },
            orderBy: {
                timestamp: 'desc',
            },
            take: parseInt(limit),
            skip: parseInt(offset),
        });
        
        console.log(`📊 Found ${deposits.length} deposit transactions`);
        if (deposits.length > 0) {
            console.log('Sample deposits:', deposits.slice(0, 2).map(d => ({ 
                id: d.id, 
                amount: d.amount, 
                income_source: d.income_source, 
                status: d.status 
            })));
        }

        // Transform the data to include blockchain information
        const formattedDeposits = deposits.map((deposit) => {
            // Extract blockchain info from income_source - only BEP20/TRC20 supported
            let blockchain = 'BEP20'; // Default to BEP20
            let txHash = null;
            
            if (deposit.income_source) {
                // Extract blockchain from income_source (remove '_deposit' suffix)
                const blockchainFromSource = deposit.income_source.replace('_deposit', '').toUpperCase();
                if (['BEP20', 'TRC20'].includes(blockchainFromSource)) {
                    blockchain = blockchainFromSource;
                }
            }
            
            if (deposit.description) {
                // Try to extract blockchain from description - only BEP20/TRC20 supported
                const blockchainMatch = deposit.description.match(/\b(BEP20|TRC20)\b/i);
                if (blockchainMatch) {
                    blockchain = blockchainMatch[1].toUpperCase();
                }
                
                // Try to extract transaction hash from description
                const txHashMatch = deposit.description.match(/(?:tx|hash|txid):\s*([a-fA-F0-9]{40,})/i);
                if (txHashMatch) {
                    txHash = txHashMatch[1];
                }
            }

            return {
                id: deposit.id,
                amount: parseFloat(deposit.amount.toString()),
                blockchain,
                status: deposit.status,
                description: deposit.description,
                timestamp: deposit.timestamp.toISOString(),
                txHash,
            };
        });

        // Get total count for pagination
        const totalCount = await prisma.transactions.count({
            where: whereClause,
        });

        res.json({
            success: true,
            deposits: formattedDeposits,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + formattedDeposits.length < totalCount,
            },
        });
    } catch (error) {
        console.error('Error fetching deposit history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch deposit history',
        });
    }
});

// Password management endpoints
const changePasswordSchema = z.object({
    currentPassword: z.string().optional(), // Optional for first-time setup
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

userRouter.post('/change-password', async (req, res) => {
    const userId = req.user.id;
    console.log('Password change request body:', req.body);
    const parse = changePasswordSchema.safeParse(req.body);
    
    if (!parse.success) {
        console.log('Validation error:', parse.error.flatten());
        return res.status(400).json({ error: parse.error.flatten() });
    }
    
    const { currentPassword, newPassword } = parse.data;
    
    try {
        // Get user's current password info
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { 
                id: true, 
                password_hash: true, 
                password_updated_at: true,
                email: true,
                full_name: true
            }
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if user already has a password and validate current password
        if (user.password_hash) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Current password is required' });
            }
            
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
            
            // Check 7-day restriction
            if (user.password_updated_at) {
                const daysSinceLastUpdate = (new Date() - user.password_updated_at) / (1000 * 60 * 60 * 24);
                if (daysSinceLastUpdate < 7) {
                    const daysRemaining = Math.ceil(7 - daysSinceLastUpdate);
                    return res.status(400).json({ 
                        error: `Password can only be changed once every 7 days. Please wait ${daysRemaining} more day(s).` 
                    });
                }
            }
        }
        
        // Hash the new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Update user's password and timestamp
        await prisma.users.update({
            where: { id: userId },
            data: {
                password_hash: newPasswordHash,
                password_updated_at: new Date()
            }
        });
        
        return res.json({ 
            success: true, 
            message: user.password_hash 
                ? 'Password updated successfully' 
                : 'Password created successfully. You can now login with email and password.' 
        });
        
    } catch (error) {
        console.error('Password change error:', error);
        return res.status(500).json({ error: 'Failed to change password' });
    }
});

// Get password status (whether user has password set)
userRouter.get('/password-status', async (req, res) => {
    const userId = req.user.id;
    
    try {
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { 
                password_hash: true, 
                password_updated_at: true 
            }
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const hasPassword = !!user.password_hash;
        let canChangePassword = true;
        let daysUntilCanChange = 0;
        
        if (hasPassword && user.password_updated_at) {
            const daysSinceLastUpdate = (new Date() - user.password_updated_at) / (1000 * 60 * 60 * 24);
            canChangePassword = daysSinceLastUpdate >= 7;
            if (!canChangePassword) {
                daysUntilCanChange = Math.ceil(7 - daysSinceLastUpdate);
            }
        }
        
        return res.json({
            hasPassword,
            canChangePassword,
            daysUntilCanChange,
            lastUpdated: user.password_updated_at
        });
        
    } catch (error) {
        console.error('Password status error:', error);
        return res.status(500).json({ error: 'Failed to get password status' });
    }
});

// Withdrawal address management endpoints
const withdrawalAddressSchema = z.object({
    blockchain: z.string().min(3).max(20),
    address: z.string().min(10).max(200),
    label: z.string().min(1).max(100).optional()
});

// Get all withdrawal addresses for user
userRouter.get('/withdrawal-addresses', async (req, res) => {
    const userId = req.user.id;
    
    try {
        const addresses = await prisma.wallet_addresses.findMany({
            where: { user_id: userId, is_active: true },
            select: {
                id: true,
                blockchain: true,
                address: true,
                label: true,
                is_selected: true,
                created_at: true
            },
            orderBy: [{ blockchain: 'asc' }, { created_at: 'desc' }]
        });
        
        // Group addresses by blockchain
        const groupedAddresses = addresses.reduce((acc, addr) => {
            const blockchain = addr.blockchain;
            if (!acc[blockchain]) {
                acc[blockchain] = [];
            }
            acc[blockchain].push({
                id: addr.id,
                address: addr.address,
                label: addr.label || 'Unnamed Address',
                isSelected: addr.is_selected,
                createdAt: addr.created_at.toISOString()
            });
            return acc;
        }, {});
        
        return res.json({
            success: true,
            addresses: groupedAddresses
        });
        
    } catch (error) {
        console.error('Error fetching withdrawal addresses:', error);
        return res.status(500).json({ error: 'Failed to fetch withdrawal addresses' });
    }
});

// Add new withdrawal address
userRouter.post('/withdrawal-addresses', async (req, res) => {
    const userId = req.user.id;
    const parse = withdrawalAddressSchema.safeParse(req.body);
    
    if (!parse.success) {
        return res.status(400).json({ error: parse.error.flatten() });
    }
    
    const { blockchain, address, label } = parse.data;
    
    try {
        // Check if address already exists
        const existingAddress = await prisma.wallet_addresses.findUnique({
            where: {
                user_id_blockchain_address: {
                    user_id: userId,
                    blockchain: blockchain.toUpperCase(),
                    address: address
                }
            }
        });
        
        if (existingAddress) {
            return res.status(400).json({ error: 'This address already exists for this blockchain' });
        }
        
        // Check if user has any addresses for this blockchain
        const existingBlockchainAddresses = await prisma.wallet_addresses.findMany({
            where: {
                user_id: userId,
                blockchain: blockchain.toUpperCase(),
                is_active: true
            }
        });
        
        // If this is the first address for this blockchain, make it selected
        const isSelected = existingBlockchainAddresses.length === 0;
        
        const newAddress = await prisma.wallet_addresses.create({
            data: {
                user_id: userId,
                blockchain: blockchain.toUpperCase(),
                address: address,
                label: label || null,
                is_selected: isSelected
            }
        });
        
        return res.json({
            success: true,
            message: 'Withdrawal address added successfully',
            address: {
                id: newAddress.id,
                blockchain: newAddress.blockchain,
                address: newAddress.address,
                label: newAddress.label,
                isSelected: newAddress.is_selected
            }
        });
        
    } catch (error) {
        console.error('Error adding withdrawal address:', error);
        return res.status(500).json({ error: 'Failed to add withdrawal address' });
    }
});

// Select withdrawal address (make it active for the blockchain)
userRouter.put('/withdrawal-addresses/:id/select', async (req, res) => {
    const userId = req.user.id;
    const addressId = req.params.id;
    
    try {
        // Get the address to select
        const address = await prisma.wallet_addresses.findFirst({
            where: {
                id: addressId,
                user_id: userId,
                is_active: true
            }
        });
        
        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }
        
        // Start a transaction to update all addresses for this blockchain
        await prisma.$transaction(async (tx) => {
            // Deselect all addresses for this blockchain
            await tx.wallet_addresses.updateMany({
                where: {
                    user_id: userId,
                    blockchain: address.blockchain,
                    is_active: true
                },
                data: { is_selected: false }
            });
            
            // Select the chosen address
            await tx.wallet_addresses.update({
                where: { id: addressId },
                data: { is_selected: true }
            });
        });
        
        return res.json({
            success: true,
            message: 'Withdrawal address selected successfully'
        });
        
    } catch (error) {
        console.error('Error selecting withdrawal address:', error);
        return res.status(500).json({ error: 'Failed to select withdrawal address' });
    }
});

// Delete withdrawal address
userRouter.delete('/withdrawal-addresses/:id', async (req, res) => {
    const userId = req.user.id;
    const addressId = req.params.id;
    
    try {
        // Get the address to delete
        const address = await prisma.wallet_addresses.findFirst({
            where: {
                id: addressId,
                user_id: userId,
                is_active: true
            }
        });
        
        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }
        
        // Soft delete the address
        await prisma.wallet_addresses.update({
            where: { id: addressId },
            data: { is_active: false, is_selected: false }
        });
        
        // If this was the selected address, select another one if available
        if (address.is_selected) {
            const otherAddress = await prisma.wallet_addresses.findFirst({
                where: {
                    user_id: userId,
                    blockchain: address.blockchain,
                    is_active: true,
                    id: { not: addressId }
                },
                orderBy: { created_at: 'desc' }
            });
            
            if (otherAddress) {
                await prisma.wallet_addresses.update({
                    where: { id: otherAddress.id },
                    data: { is_selected: true }
                });
            }
        }
        
        return res.json({
            success: true,
            message: 'Withdrawal address deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting withdrawal address:', error);
        return res.status(500).json({ error: 'Failed to delete withdrawal address' });
    }
});

// Get user wallet balance information
userRouter.get('/wallet-balance', async (req, res) => {
    const userId = req.user.id;
    
    try {
        // Get total deposits (for Total Balance)
        const totalDeposits = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: {
                user_id: userId,
                OR: [
                    { type: 'DEPOSIT', status: 'COMPLETED' },
                    { type: 'credit', income_source: { endsWith: '_deposit' } }
                ],
                status: 'COMPLETED'
            }
        });
        
        // Get locked deposits (6-month lock)
        const lockedDeposits = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: {
                user_id: userId,
                type: 'credit',
                income_source: { endsWith: '_deposit' },
                unlock_date: { gt: new Date() }, // Still locked
                status: 'COMPLETED'
            }
        });
        
        // Get withdrawable income (unlocked)
        const withdrawableIncome = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: {
                user_id: userId,
                type: 'credit',
                unlock_date: { lte: new Date() }, // Unlocked
                OR: [
                    { income_source: 'direct_income' },
                    { income_source: 'team_income' },
                    { income_source: 'salary_income' },
                    { income_source: 'monthly_profit' },
                    { income_source: { contains: 'income' } }
                ],
                status: 'COMPLETED'
            }
        });
        
        // Get already withdrawn amounts
        const totalWithdrawn = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: {
                user_id: userId,
                type: 'debit',
                income_source: { in: ['withdrawal', 'income_withdrawal'] },
                status: { in: ['COMPLETED', 'PENDING'] }
            }
        });
        
        const totalBalance = parseFloat(totalDeposits._sum.amount?.toString() || '0');
        const lockedBalance = parseFloat(lockedDeposits._sum.amount?.toString() || '0');
        const totalWithdrawableIncome = parseFloat(withdrawableIncome._sum.amount?.toString() || '0');
        const totalWithdrawnAmount = parseFloat(totalWithdrawn._sum.amount?.toString() || '0');
        const withdrawableBalance = Math.max(0, totalWithdrawableIncome - totalWithdrawnAmount);
        
        const withdrawalFee = 1.00; // $1 per transaction
        const minWithdrawal = 10.00; // Minimum withdrawal amount
        
        return res.json({
            success: true,
            balance: {
                total: totalBalance, // Total deposits
                withdrawable: withdrawableBalance, // Withdrawable income (after withdrawals)
                locked: lockedBalance, // Locked deposits (6-month lock)
                withdrawalFee: withdrawalFee,
                minWithdrawal: minWithdrawal,
                netWithdrawable: Math.max(0, withdrawableBalance - withdrawalFee)
            }
        });
        
    } catch (error) {
        console.error('Error fetching wallet balance:', error);
        return res.status(500).json({ error: 'Failed to fetch wallet balance' });
    }
});

// Deposit submission endpoint with OTP verification and file upload
userRouter.post('/submit-deposit', upload.single('screenshot'), async (req, res) => {
    const userId = req.user.id;
    const { amount, blockchain, otpCode, walletAddress } = req.body;
    const screenshotFile = req.file;

    try {
        // Validate input
        const depositAmount = parseFloat(amount);
        if (!depositAmount || depositAmount < 100 || depositAmount % 10 !== 0) {
            return res.status(400).json({ error: 'Invalid deposit amount. Must be minimum $100 and multiple of $10.' });
        }

        if (!blockchain || !['BEP20', 'TRC20'].includes(blockchain)) {
            return res.status(400).json({ error: 'Invalid blockchain. Only BEP20 and TRC20 supported.' });
        }

        if (!otpCode || otpCode.length !== 6) {
            return res.status(400).json({ error: 'Invalid OTP code.' });
        }

        if (!screenshotFile) {
            return res.status(400).json({ error: 'Transaction screenshot is required.' });
        }

        // Verify OTP
        const otpData = otpStore.get(userId);
        if (!otpData) {
            return res.status(400).json({ error: 'OTP not found. Please request a new OTP.' });
        }

        if (otpData.otp !== otpCode) {
            return res.status(400).json({ error: 'Invalid OTP code.' });
        }

        if (new Date() > otpData.expiresAt) {
            otpStore.delete(userId);
            return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
        }

        if (otpData.amount !== depositAmount || otpData.blockchain !== blockchain) {
            return res.status(400).json({ error: 'Deposit details do not match OTP request.' });
        }

        // Get user information
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { email: true, full_name: true, referral_code: true }
        });

        // Create deposit transaction record
        const transaction = await prisma.transactions.create({
            data: {
                user_id: userId,
                amount: depositAmount,
                type: 'DEPOSIT',
                income_source: blockchain,
                status: 'PENDING',
                description: `${blockchain} deposit request - $${depositAmount} - Screenshot: ${screenshotFile.filename} - Wallet: ${walletAddress}`,
            },
        });

        // Clear OTP after successful submission
        otpStore.delete(userId);

        // Log deposit request for admin (in production, send email notification to admin)
        console.log('=== NEW DEPOSIT REQUEST ===');
        console.log(`User: ${user?.full_name} (${user?.email})`);
        console.log(`Referral Code: ${user?.referral_code}`);
        console.log(`Amount: $${depositAmount}`);
        console.log(`Network: ${blockchain}`);
        console.log(`Wallet Address: ${walletAddress}`);
        console.log(`Screenshot: ${screenshotFile.filename}`);
        console.log(`Transaction ID: ${transaction.id}`);
        console.log(`Screenshot Path: ${screenshotFile.path}`);
        console.log('========================');

        res.json({
            success: true,
            message: 'Deposit request submitted successfully',
            transactionId: transaction.id,
            status: 'PENDING'
        });

    } catch (error) {
        console.error('Deposit submission error:', error);
        
        // Clean up uploaded file if there was an error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting uploaded file:', unlinkError);
            }
        }
        
        res.status(500).json({ error: 'Failed to submit deposit request' });
    }
});

// New Dashboard Tabs Endpoints

// Direct Income Tab - One-time 10% income from direct referrals
userRouter.get('/dashboard/direct-income', async (req, res) => {
    const userId = req.user.id;
    try {
        const directIncomeTransactions = await prisma.transactions.findMany({
            where: {
                user_id: userId,
                type: 'credit',
                income_source: 'direct_income',
                status: 'COMPLETED'
            },
            orderBy: { timestamp: 'desc' }
        });
        
        const totalDirectIncome = directIncomeTransactions.reduce(
            (sum, tx) => sum + Number(tx.amount), 0
        );
        
        const todaysDirectIncome = directIncomeTransactions
            .filter(tx => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return tx.timestamp >= today && tx.timestamp < tomorrow;
            })
            .reduce((sum, tx) => sum + Number(tx.amount), 0);
        
        return res.json({
            totalDirectIncome,
            todaysDirectIncome,
            transactions: directIncomeTransactions,
            transactionCount: directIncomeTransactions.length
        });
    } catch (error) {
        console.error('Direct income error:', error);
        return res.status(500).json({ error: 'Failed to load direct income' });
    }
});

// Team Income Tab - Multi-level income from team's monthly earnings
userRouter.get('/dashboard/team-income', async (req, res) => {
    const userId = req.user.id;
    try {
        const teamIncomeTransactions = await prisma.transactions.findMany({
            where: {
                user_id: userId,
                type: 'credit',
                income_source: 'team_income',
                status: 'COMPLETED'
            },
            orderBy: { timestamp: 'desc' }
        });
        
        // Group by level
        const levelBreakdown = teamIncomeTransactions.reduce((acc, tx) => {
            const level = tx.referral_level || 1;
            if (!acc[level]) {
                acc[level] = { count: 0, amount: 0, transactions: [] };
            }
            acc[level].count++;
            acc[level].amount += Number(tx.amount);
            acc[level].transactions.push(tx);
            return acc;
        }, {});
        
        const totalTeamIncome = teamIncomeTransactions.reduce(
            (sum, tx) => sum + Number(tx.amount), 0
        );
        
        const todaysTeamIncome = teamIncomeTransactions
            .filter(tx => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return tx.timestamp >= today && tx.timestamp < tomorrow;
            })
            .reduce((sum, tx) => sum + Number(tx.amount), 0);
        
        return res.json({
            totalTeamIncome,
            todaysTeamIncome,
            levelBreakdown,
            transactions: teamIncomeTransactions,
            transactionCount: teamIncomeTransactions.length
        });
    } catch (error) {
        console.error('Team income error:', error);
        return res.status(500).json({ error: 'Failed to load team income' });
    }
});

// Monthly Profit Tab - Shows user's monthly investment profits
userRouter.get('/dashboard/monthly-profit', async (req, res) => {
    const userId = req.user.id;
    try {
        const monthlyProfitTransactions = await prisma.transactions.findMany({
            where: {
                user_id: userId,
                type: 'credit',
                income_source: 'monthly_profit',
                status: 'COMPLETED'
            },
            orderBy: { timestamp: 'desc' }
        });
        
        const totalMonthlyProfit = monthlyProfitTransactions.reduce(
            (sum, tx) => sum + Number(tx.amount), 0
        );
        
        const todaysMonthlyProfit = monthlyProfitTransactions
            .filter(tx => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return tx.timestamp >= today && tx.timestamp < tomorrow;
            })
            .reduce((sum, tx) => sum + Number(tx.amount), 0);
        
        // Get user's current deposits to calculate expected monthly profit
        const activeDeposits = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: {
                user_id: userId,
                type: 'credit',
                income_source: 'investment_deposit',
                status: 'COMPLETED',
                unlock_date: { not: null }
            }
        });
        
        const totalActiveDeposits = Number(activeDeposits._sum.amount || 0);
        const expectedMonthlyProfit = totalActiveDeposits * 0.10; // 10% monthly
        
        return res.json({
            totalMonthlyProfit,
            todaysMonthlyProfit,
            totalActiveDeposits,
            expectedMonthlyProfit,
            transactions: monthlyProfitTransactions,
            transactionCount: monthlyProfitTransactions.length
        });
    } catch (error) {
        console.error('Monthly profit error:', error);
        return res.status(500).json({ error: 'Failed to load monthly profit' });
    }
});

// Today's Withdrawal Tab
userRouter.get('/dashboard/today-withdrawal', async (req, res) => {
    const userId = req.user.id;
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayWithdrawals = await prisma.transactions.findMany({
            where: {
                user_id: userId,
                type: 'debit',
                income_source: 'WITHDRAWAL',
                timestamp: { gte: today, lt: tomorrow }
            },
            orderBy: { timestamp: 'desc' }
        });
        
        const totalTodayWithdrawal = todayWithdrawals.reduce(
            (sum, tx) => sum + Number(tx.amount), 0
        );
        
        return res.json({
            totalTodayWithdrawal,
            withdrawals: todayWithdrawals,
            withdrawalCount: todayWithdrawals.length
        });
    } catch (error) {
        console.error("Today's withdrawal error:", error);
        return res.status(500).json({ error: "Failed to load today's withdrawals" });
    }
});

// Total Withdrawal Tab
userRouter.get('/dashboard/total-withdrawal', async (req, res) => {
    const userId = req.user.id;
    try {
        const allWithdrawals = await prisma.transactions.findMany({
            where: {
                user_id: userId,
                type: 'debit',
                income_source: 'WITHDRAWAL'
            },
            orderBy: { timestamp: 'desc' }
        });
        
        const totalWithdrawals = allWithdrawals.reduce(
            (sum, tx) => sum + Number(tx.amount), 0
        );
        
        const completedWithdrawals = allWithdrawals.filter(tx => tx.status === 'COMPLETED');
        const pendingWithdrawals = allWithdrawals.filter(tx => tx.status === 'PENDING');
        
        const totalCompleted = completedWithdrawals.reduce(
            (sum, tx) => sum + Number(tx.amount), 0
        );
        const totalPending = pendingWithdrawals.reduce(
            (sum, tx) => sum + Number(tx.amount), 0
        );
        
        return res.json({
            totalWithdrawals,
            totalCompleted,
            totalPending,
            withdrawals: allWithdrawals,
            withdrawalCount: allWithdrawals.length,
            completedCount: completedWithdrawals.length,
            pendingCount: pendingWithdrawals.length
        });
    } catch (error) {
        console.error('Total withdrawal error:', error);
        return res.status(500).json({ error: 'Failed to load total withdrawals' });
    }
});

// Withdrawal eligibility check - implements 6-month lock for deposits
userRouter.get('/withdrawal/eligibility', async (req, res) => {
    const userId = req.user.id;
    try {
        // Get wallet balance (this contains all withdrawable income)
        const wallet = await prisma.wallets.findUnique({
            where: { user_id: userId }
        });
        
        const totalWalletBalance = Number(wallet?.balance || 0);
        
        // Get locked deposits (investment deposits with unlock_date in future)
        const lockedDeposits = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: {
                user_id: userId,
                type: 'credit',
                income_source: 'investment_deposit',
                status: 'COMPLETED',
                unlock_date: { gt: new Date() } // Future unlock date
            }
        });
        
        const lockedDepositAmount = Number(lockedDeposits._sum.amount || 0);
        
        // Get unlocked deposits (investment deposits that can now be withdrawn)
        const unlockedDeposits = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: {
                user_id: userId,
                type: 'credit',
                income_source: 'investment_deposit',
                status: 'COMPLETED',
                unlock_date: { lte: new Date() } // Past unlock date
            }
        });
        
        const unlockedDepositAmount = Number(unlockedDeposits._sum.amount || 0);
        
        // Get pending withdrawals
        const pendingWithdrawals = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: {
                user_id: userId,
                type: 'debit',
                status: 'PENDING'
            }
        });
        
        const pendingAmount = Number(pendingWithdrawals._sum.amount || 0);
        
        // Withdrawable balance = wallet balance (income) + unlocked deposits - pending withdrawals
        const withdrawableBalance = Math.max(0, totalWalletBalance + unlockedDepositAmount - pendingAmount);
        
        const withdrawalFee = 1.00;
        const minWithdrawal = 10.00;
        const maxWithdrawalPerDay = withdrawableBalance; // No daily limit
        
        return res.json({
            totalWalletBalance,        // Income balance (always withdrawable)
            lockedDepositAmount,       // Locked deposits (6-month lock)
            unlockedDepositAmount,     // Unlocked deposits (can be withdrawn)
            pendingAmount,             // Pending withdrawals
            withdrawableBalance,       // Total available for withdrawal
            netWithdrawable: Math.max(0, withdrawableBalance - withdrawalFee),
            withdrawalFee,
            minWithdrawal,
            maxWithdrawalPerDay,
            canWithdraw: withdrawableBalance >= (minWithdrawal + withdrawalFee)
        });
    } catch (error) {
        console.error('Withdrawal eligibility error:', error);
        return res.status(500).json({ error: 'Failed to check withdrawal eligibility' });
    }
});

// Admin endpoint to manually trigger daily investment profit calculation
userRouter.post('/admin/calculate-profits', async (req, res) => {
    try {
        // Check if user is admin (you might want to add proper admin middleware)
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const result = await calculateDailyInvestmentProfits();
        return res.json(result);
    } catch (error) {
        console.error('Manual profit calculation error:', error);
        return res.status(500).json({ error: 'Failed to calculate profits' });
    }
});

// Admin endpoint to manually trigger monthly profit distribution
userRouter.post('/admin/distribute-monthly-profits', async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const { processMonthlyProfitDistribution } = await import('../services/monthlyProfitDistribution.js');
        const result = await processMonthlyProfitDistribution();
        return res.json(result);
    } catch (error) {
        console.error('Manual monthly profit distribution error:', error);
        return res.status(500).json({ error: 'Failed to distribute monthly profits' });
    }
});

// Admin endpoint to manually trigger daily profit distribution
userRouter.post('/admin/distribute-daily-profits', async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const { processDailyProfitDistribution } = await import('../services/dailyProfitDistribution.js');
        const result = await processDailyProfitDistribution();
        return res.json(result);
    } catch (error) {
        console.error('Manual daily profit distribution error:', error);
        return res.status(500).json({ error: 'Failed to distribute daily profits' });
    }
});

// Admin endpoint to manually trigger team income distribution (legacy)
userRouter.post('/admin/distribute-team-income', async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const { processMonthlyTeamIncome } = await import('../services/teamIncome.js');
        const result = await processMonthlyTeamIncome();
        return res.json(result);
    } catch (error) {
        console.error('Manual team income distribution error:', error);
        return res.status(500).json({ error: 'Failed to distribute team income' });
    }
});
