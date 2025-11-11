# Daily Investment Profit Display Fix

## Issue
The dashboard was showing $0.00 for both "Daily Investment Profit" and "Daily Income" even though the daily cron job was running successfully and creating profit transactions.

## Root Cause
There was a mismatch in the `income_source` field being used:

### What Was Happening:
1. **Cron Job** (`api/src/services/dailyProfitDistribution.js`)
   - ✅ Correctly creating transactions with `income_source: 'daily_profit'`
   - Running daily at midnight IST
   - Calculating 0.333% daily profit (10% monthly / 30 days)

2. **Dashboard API** (`api/src/routes/user.js` lines 188-199)
   - ✅ Correctly querying today's profit with `income_source: 'daily_profit'`
   - Working as expected

3. **Total Profit Utility** (`api/src/utils/investmentProfit.js`)
   - ❌ Using `income_source: 'investment_profit'` (OLD SYSTEM)
   - This was causing the total investment profit to show as $0.00

## Solution
Updated `api/src/utils/investmentProfit.js` to use the correct income source:

### Changed Functions:
1. `getTotalInvestmentProfit(userId)` - line 134
   - Changed from: `income_source: 'investment_profit'`
   - Changed to: `income_source: 'daily_profit'`

2. `getInvestmentProfitForPeriod(userId, startDate, endDate)` - line 158
   - Changed from: `income_source: 'investment_profit'`
   - Changed to: `income_source: 'daily_profit'`

## How It Works Now

### Daily Profit Flow:
1. **Cron Job Runs** (midnight IST)
   ```javascript
   income_source: 'daily_profit'
   amount: totalDeposits * 0.00333  // 0.333% per day
   status: 'COMPLETED'
   ```

2. **Dashboard Queries** (`/api/user/dashboard`)
   ```javascript
   // Today's profit
   today_investment_profit: (transactions where income_source='daily_profit' AND today)
   
   // Total profit earned
   total_investment_profit: getTotalInvestmentProfit() // Now uses 'daily_profit'
   
   // Daily income (includes all income today)
   daily_income: (all income transactions today including daily_profit)
   ```

3. **Frontend Display**
   - Daily Investment Profit card shows today's amount
   - Total Earned shows cumulative amount
   - Daily Income card includes daily profit in the total

## Income Sources Reference

### Correct Income Sources:
- `'daily_profit'` - Daily investment profit (0.333% per day)
- `'direct_income'` - One-time 10% from direct referrals
- `'team_income'` - Multi-level referral income (5%, 3%)
- `'salary_income'` - Rank-based monthly salary
- `'monthly_profit'` - Monthly profit distribution
- `'referral_income'` - General referral income

### Deprecated/Old:
- `'investment_profit'` - OLD system, no longer used

## Testing
After this fix:
1. Wait for the next cron run (midnight IST) OR manually trigger:
   ```bash
   POST /api/user/admin/distribute-daily-profits
   ```
2. Check dashboard - should now show:
   - Today's daily profit in the highlighted card
   - Total earned profit accumulated
   - Daily income including today's profit

## Files Modified
- `api/src/utils/investmentProfit.js` - Fixed income_source in 2 functions

## Files Working Correctly (No Changes Needed)
- `api/src/services/dailyProfitDistribution.js` - Cron service ✅
- `api/src/jobs/dailyProfitCron.js` - Scheduler ✅
- `api/src/routes/user.js` - Dashboard API ✅
- `frontend/src/pages/app/Dashboard.tsx` - Dashboard UI ✅
