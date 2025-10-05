import prisma from '../lib/prisma.js';

/**
 * Calculate and add daily investment profit for all users
 * This should be run daily via a cron job
 */
export async function calculateDailyInvestmentProfits() {
    try {
        console.log('Starting daily investment profit calculation...');
        
        // Get all users who have investments (completed deposits)
        const usersWithInvestments = await prisma.users.findMany({
            where: {
                transactions: {
                    some: {
                        OR: [
                            { type: 'DEPOSIT', status: 'COMPLETED' },
                            { type: 'credit', income_source: { endsWith: '_deposit' } }
                        ]
                    }
                }
            },
            select: {
                id: true,
                full_name: true,
                transactions: {
                    where: {
                        OR: [
                            { type: 'DEPOSIT', status: 'COMPLETED' },
                            { type: 'credit', income_source: { endsWith: '_deposit' } }
                        ]
                    },
                    select: {
                        amount: true,
                        timestamp: true
                    }
                }
            }
        });

        const dailyProfitRate = 0.10 / 30; // 10% monthly / 30 days = 0.333% daily
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if we already processed today's profits
        const existingProfitsToday = await prisma.transactions.findFirst({
            where: {
                income_source: 'investment_profit',
                timestamp: {
                    gte: today,
                    lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                }
            }
        });

        if (existingProfitsToday) {
            console.log('Investment profits already calculated for today');
            return { message: 'Profits already calculated for today', processed: 0 };
        }

        let processedCount = 0;
        const profitTransactions = [];

        // Calculate profit for each user
        for (const user of usersWithInvestments) {
            const totalInvestment = user.transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
            
            if (totalInvestment > 0) {
                const dailyProfit = totalInvestment * dailyProfitRate;
                
                profitTransactions.push({
                    id: `inv_profit_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    user_id: user.id,
                    amount: dailyProfit,
                    type: 'credit',
                    income_source: 'investment_profit',
                    status: 'COMPLETED',
                    description: `Daily investment profit (0.333% of $${totalInvestment.toFixed(2)})`,
                    timestamp: new Date()
                });
                
                processedCount++;
            }
        }

        // Batch insert all profit transactions
        if (profitTransactions.length > 0) {
            await prisma.transactions.createMany({
                data: profitTransactions
            });

            // Update wallet balances
            for (const tx of profitTransactions) {
                await prisma.wallets.upsert({
                    where: { user_id: tx.user_id },
                    update: {
                        balance: {
                            increment: tx.amount
                        }
                    },
                    create: {
                        user_id: tx.user_id,
                        balance: tx.amount
                    }
                });
            }
        }

        console.log(`Daily investment profit calculation completed. Processed ${processedCount} users, created ${profitTransactions.length} transactions.`);
        
        return {
            message: 'Daily investment profits calculated successfully',
            processed: processedCount,
            totalProfitDistributed: profitTransactions.reduce((sum, tx) => sum + tx.amount, 0)
        };
    } catch (error) {
        console.error('Error calculating daily investment profits:', error);
        throw error;
    }
}

/**
 * Get total profit earned from investments for a user
 */
export async function getTotalInvestmentProfit(userId) {
    try {
        const profitAgg = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: {
                user_id: userId,
                type: 'credit',
                income_source: 'investment_profit',
                status: 'COMPLETED'
            }
        });

        return Number(profitAgg._sum.amount || 0);
    } catch (error) {
        console.error('Error getting total investment profit:', error);
        return 0;
    }
}

/**
 * Calculate investment profit for a specific period
 */
export async function getInvestmentProfitForPeriod(userId, startDate, endDate) {
    try {
        const profitAgg = await prisma.transactions.aggregate({
            _sum: { amount: true },
            where: {
                user_id: userId,
                type: 'credit',
                income_source: 'investment_profit',
                status: 'COMPLETED',
                timestamp: {
                    gte: startDate,
                    lt: endDate
                }
            }
        });

        return Number(profitAgg._sum.amount || 0);
    } catch (error) {
        console.error('Error getting investment profit for period:', error);
        return 0;
    }
}