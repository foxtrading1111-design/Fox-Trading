# Income System Documentation

## Overview
This document explains how the income distribution system works in the trading platform.

## Income Types

### 1. Direct Income (Recurring on Every Deposit)
**What it is:** A 10% commission on **EVERY deposit** made using your referral code.

**Key Points:**
- ✅ Triggered on **EVERY deposit** using your referral code
- ✅ Only the **direct sponsor** (Level 1) receives this
- ✅ Amount: **10% of each deposit amount**
- ✅ Paid every time the referred user deposits
- ❌ NOT distributed to multiple levels

**Example:**
- User A refers User B using referral code
- User B makes first deposit of $1,000
- User A (direct sponsor) receives: $100 (10% × $1,000) as **direct_income**
- User B makes second deposit of $500
- User A receives: $50 (10% × $500) as **direct_income**
- User B makes third deposit of $2,000
- User A receives: $200 (10% × $2,000) as **direct_income**

**Implementation:** `api/src/routes/investment.js` (lines 74-113)

---

### 2. Referral Income (Monthly Recurring)
**What it is:** A portion of your **DOWNLINE'S monthly investment profit** that gets distributed UP through the sponsor chain.

**Key Points:**
- ✅ Based on **downline members' monthly profit** (their 10% profit from deposits)
- ✅ Distributed to **upline sponsors** (up to 20 levels)
- ✅ Calculated **monthly** when downline members receive their profits
- ❌ NOT based on downline's deposits (that's direct income)
- ✅ Based on the monthly profit that downline members generate

**Distribution Percentages:**
| Level | Percentage of YOUR monthly profit |
|-------|-----------------------------------|
| 1     | 10%                               |
| 2     | 5%                                |
| 3     | 3%                                |
| 4     | 2%                                |
| 5     | 1%                                |
| 6-20  | 0.5% each                         |

**Example:**
- User C (in your downline) has $10,000 in deposits
- User C's monthly profit: $1,000 (10% of their $10,000 deposits)
- User C receives: $1,000 as **monthly_profit** (this is their own earnings)
- That $1,000 profit is then distributed UP to sponsors:
  - Level 1 above User C gets: $100 (10% × $1,000) as **referral_income**
  - Level 2 above User C gets: $50 (5% × $1,000) as **referral_income**
  - Level 3 above User C gets: $30 (3% × $1,000) as **referral_income**
  - Level 4 above User C gets: $20 (2% × $1,000) as **referral_income**
  - Level 5 above User C gets: $10 (1% × $1,000) as **referral_income**
  - Levels 6-20 above User C each get: $5 (0.5% × $1,000) as **referral_income**

**Implementation:** 
- `api/src/jobs/workers.js` - `runMonthlyReferralIncome()` function
- `api/src/services/monthlyProfitDistribution.js` - Alternative implementation

---

### 3. Monthly Profit (User's Own Earnings)
**What it is:** The 10% monthly return on your own investments/deposits.

**Key Points:**
- ✅ Calculated on **your own deposits**
- ✅ 10% monthly return
- ✅ Added to your withdrawable balance

**Example:**
- User D has $5,000 in deposits
- Monthly profit: $500 (10% × $5,000)
- User D receives: $500 as **monthly_profit** in their wallet

---

### 4. Trading Bonus (Alternative Monthly Profit)
**What it is:** Same as monthly profit but calculated from active investments table.

**Key Points:**
- ✅ Based on `monthly_profit_rate` in investments table
- ✅ Typically 10-15% depending on investment amount
- ✅ Processed by `runMonthlyTradingBonus()` in workers.js

---

## Important Clarifications

### What Referral Income is NOT
❌ **NOT** a commission from your downline's deposits (that's direct income)  
❌ **NOT** earned when downline deposits money  

### What Referral Income IS
✅ **A distribution of DOWNLINE'S monthly profit** to uplines  
✅ **Percentage of team member's monthly earnings** distributed upward  
✅ **Calculated from monthly profit** (10% profit on deposits), not deposits themselves

---

## Transaction Income Sources

The `income_source` field in the transactions table identifies the type of income:

| income_source      | Description                                           |
|--------------------|-------------------------------------------------------|
| `direct_income`    | 10% from EVERY deposit using your referral code      |
| `referral_income`  | Monthly % of downline's own profit (you as receiver) |
| `monthly_profit`   | Your own 10% monthly investment return                |
| `trading_bonus`    | Alternative term for monthly_profit                   |
| `salary_income`    | Rank-based bonuses (separate system)                  |
| `team_income`      | ⚠️ DEPRECATED - Old incorrect calculation             |

---

## Code Files Reference

### Core Income Logic
1. **Direct Income:** `api/src/routes/investment.js` (lines 74-113)
2. **Referral Income:** 
   - `api/src/jobs/workers.js` - `runMonthlyReferralIncome()`
   - `api/src/services/monthlyProfitDistribution.js` - Alternative
3. **Monthly Profit:** `api/src/jobs/workers.js` - `runMonthlyTradingBonus()`

### API Endpoints
- **Dashboard:** `api/src/routes/user.js` - `/dashboard`
- **Direct Income:** `api/src/routes/user.js` - `/dashboard/direct-income`
- **Referral Income:** `api/src/routes/user.js` - `/dashboard/team-income`
- **Monthly Profit:** `api/src/routes/user.js` - `/dashboard/monthly-profit`

### Deprecated/Incorrect Files
- ⚠️ `api/src/services/teamIncome.js` - DO NOT USE (incorrect logic)

---

## Migration from Old System

### What Was Wrong
The old system (`teamIncome.js`) was calculating "team income" based on:
- ❌ Total deposits of all downline members
- ❌ Business volume from entire team tree
- ❌ Incorrectly attributing income from deep downline levels

### What Is Correct Now
The new system calculates referral income based on:
- ✅ Each user's OWN monthly profit only
- ✅ Distribution goes UP to sponsors (not down to team)
- ✅ Clear separation: Direct Income (one-time) vs Referral Income (recurring)

### Database Cleanup
Run the cleanup script to mark old incorrect transactions:
```bash
node api/src/scripts/fix-income-data.js --dry-run
```

To apply changes:
```bash
node api/src/scripts/fix-income-data.js
```

---

## Monthly Job Schedule

The monthly jobs should be scheduled to run at the beginning of each month:

1. **Calculate and distribute monthly profits**
   ```javascript
   runMonthlyTradingBonus() // Gives users their 10% profit
   ```

2. **Distribute referral income to uplines**
   ```javascript
   runMonthlyReferralIncome() // Distributes portions to sponsors
   ```

3. **Calculate salary bonuses** (separate system)
   ```javascript
   runMonthlySalary() // Rank-based bonuses
   ```

---

## Testing

To test the income calculations:
1. Create test users with sponsor relationships
2. Make deposits for users
3. Run monthly jobs manually
4. Verify transactions in database
5. Check wallet balances

---

## FAQ

**Q: If my referral makes a $10,000 deposit, how much do I get?**  
A: You get $1,000 (10%) as direct_income immediately, EVERY time they deposit using your code. Then each month when they receive their $1,000 monthly profit (10% of deposits), you get $100 (10% of their profit) as referral_income.

**Q: Do I get income from my level 5 downline's deposits?**  
A: No. You only get direct_income (one-time 10%) from YOUR DIRECT referrals (level 1 only). However, you DO get referral_income (monthly recurring) from up to 20 levels when they receive their monthly profits.

**Q: Why am I seeing "team_income" in my old transactions?**  
A: That was the old incorrect system. Those transactions are marked as [OLD SYSTEM]. New transactions use "referral_income" with correct calculations.

**Q: How is referral_income different from direct_income?**  
A: 
- **Direct Income:** 10% of EVERY deposit made using your referral code (instant, recurring)
- **Referral Income:** Monthly % of downline's monthly profits (10%, 5%, 3%, 2%, 1%, 0.5% up to 20 levels)

---

## Summary

| Income Type       | Frequency  | Based On                    | Amount                | Levels    |
|-------------------|------------|-----------------------------|------------------------|-----------|
| Direct Income     | Every deposit | Any deposit with your code | 10% of each deposit    | Level 1 only |
| Referral Income   | Monthly    | Downline's monthly profit   | 10%, 5%, 3%, 2%, 1%, 0.5% | Up to 20 |
| Monthly Profit    | Monthly    | Your own deposits           | 10% of your deposits   | Self only |
| Salary Income     | Monthly    | Total team volume & rank    | $100-$1000 based on rank | Self only |

---

Last Updated: January 2025
