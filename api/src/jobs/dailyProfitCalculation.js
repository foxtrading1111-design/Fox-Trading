#!/usr/bin/env node

import { calculateDailyInvestmentProfits } from '../utils/investmentProfit.js';

/**
 * Daily cron job to calculate investment profits for all users
 * This script should be run once per day, preferably at midnight
 * 
 * To set up as a cron job:
 * 1. Make this file executable: chmod +x dailyProfitCalculation.js
 * 2. Add to crontab: crontab -e
 * 3. Add line: 0 0 * * * /path/to/node /path/to/this/file
 */

async function runDailyProfitCalculation() {
    try {
        console.log(`[${new Date().toISOString()}] Starting daily investment profit calculation...`);
        
        const result = await calculateDailyInvestmentProfits();
        
        console.log(`[${new Date().toISOString()}] Daily profit calculation completed successfully:`);
        console.log(`  - Users processed: ${result.processed}`);
        console.log(`  - Total profit distributed: $${result.totalProfitDistributed?.toFixed(2) || '0.00'}`);
        console.log(`  - Message: ${result.message}`);
        
        process.exit(0);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Daily profit calculation failed:`, error);
        process.exit(1);
    }
}

// Run the calculation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runDailyProfitCalculation();
}

export { runDailyProfitCalculation };