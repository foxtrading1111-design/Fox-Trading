# Complete Profit Distribution System - Summary

## 🎯 System Overview

### Main Wallet Balance
**Contains ONLY deposited amounts** - No profits are added to main wallet balance.

### Two Types of Profit Distribution

1. **Daily Profit (0.333% per day)**
   - Runs every day at midnight
   - Calculated on ALL active deposits
   - Added to withdrawable wallet balance
   - Automatically adjusts when new deposits are made

2. **Monthly Referral Income (10%, 5%, 3%, 2%, 1%, 0.5%...)**
   - Runs on 1st of each month at 2:00 AM
   - Based on ACTUAL daily profits earned in previous month
   - Distributed to uplines (up to 20 levels)

---

## 💰 Example: Multiple Deposits

### User D's Deposits
- **October 10**: Deposits $1,000
- **October 20**: Deposits $1,000 more (total now $2,000)

### Daily Profit Calculation

#### October 10-19 (10 days)
- Active deposits: $1,000
- Daily profit: $1,000 × 0.333% = $3.33 per day
- **10 days total**: $3.33 × 10 = **$33.30**

#### October 20-31 (12 days)
- Active deposits: $2,000 (both deposits)
- Daily profit: $2,000 × 0.333% = $6.66 per day
- **12 days total**: $6.66 × 12 = **$79.92**

#### October Total
**Total daily profits for October**: $33.30 + $79.92 = **$113.22**

### Monthly Referral Income (November 1st)

On November 1st, the system:
1. Looks at User D's daily profit transactions from October
2. Sums them up: $113.22
3. Distributes referral income to uplines based on $113.22

**Upline Chain**: User D → User C (L1) → User B (L2) → User A (L3)

| Upline | Level | Percentage | Amount |
|--------|-------|------------|--------|
| User C | 1 | 10% | $11.32 |
| User B | 2 | 5% | $5.66 |
| User A | 3 | 3% | $3.40 |

**Total distributed to uplines**: $20.38

---

## 📊 Wallet Balance Breakdown

### User D's Wallet
```
Main Balance (deposits only): $2,000
  ├─ Oct 10 deposit: $1,000
  └─ Oct 20 deposit: $1,000

Withdrawable Balance: $113.22
  ├─ Daily profits (Oct 10-19): $33.30
  └─ Daily profits (Oct 20-31): $79.92
```

### User C's Wallet (Direct Sponsor)
```
Withdrawable Balance: +$11.32
  └─ Level 1 referral income from User D's October profits
```

---

## 🔄 How It Works

### Daily (Every Day at Midnight)
```javascript
// For each user with active deposits:
1. Calculate total active deposits
2. Calculate daily profit (total × 0.333%)
3. Add to user's withdrawable wallet balance
4. Create transaction record
5. Mark as distributed for today
```

### Monthly (1st of Each Month at 2:00 AM)
```javascript
// For each user who earned daily profits last month:
1. Sum up all daily profit transactions from previous month
2. Find their upline chain (up to 20 levels)
3. Calculate referral income for each upline
4. Add to each upline's withdrawable wallet balance
5. Create transaction records
6. Mark as distributed for that month
```

---

## 🗄️ Database Records

### Daily Profit Transaction
```javascript
{
  user_id: "user_d_id",
  amount: 6.66,
  type: "credit",
  income_source: "daily_profit",
  description: "Daily investment profit (0.333% per day) - $6.66",
  status: "COMPLETED",
  timestamp: "2024-10-20T00:00:00Z"
}
```

### Monthly Referral Income Transaction
```javascript
{
  user_id: "user_c_id",
  amount: 11.32,
  type: "credit",
  income_source: "referral_income",
  description: "Level 1 referral income (10%) from User D's month 2024-10 profit of $113.22",
  status: "COMPLETED",
  referral_level: 1,
  monthly_income_source_user_id: "user_d_id",
  timestamp: "2024-11-01T02:00:00Z"
}
```

---

## 🎯 Key Features

### ✅ Accurate Calculations
- Daily profits adjust automatically when new deposits are made
- Monthly referral income based on ACTUAL profits earned
- No flat 10% assumption - uses real daily profit data

### ✅ No Duplicate Distributions
- Daily: Checks if profit already distributed today
- Monthly: Checks if referral income already distributed for that month

### ✅ Transparent Tracking
- Every transaction has detailed description
- Month keys (e.g., "2024-10") for easy tracking
- Links referral income to source user

### ✅ Scalable
- Works with unlimited deposits per user
- Handles deposits made at any time
- Automatically adjusts calculations

---

## 📝 Important Notes

1. **Main Wallet Balance** = Deposits only (never changes except for new deposits)
2. **Withdrawable Balance** = Daily profits + Referral income + Other income
3. **Daily Profit** = Calculated on ALL active deposits at that time
4. **Monthly Referral** = Based on sum of actual daily profits from previous month
5. **No Double Counting** = Each profit type is separate and tracked

---

## 🚀 Cron Schedule

```
Daily Profit:           Every day at 00:00 (midnight)
Monthly Referral:       1st of month at 02:00 AM
Monthly Salary:         1st of month at 03:00 AM
```

---

## 🧪 Testing

### Test Daily Profit
```bash
# Check if daily profits are being distributed
SELECT * FROM transactions 
WHERE income_source = 'daily_profit' 
AND DATE(timestamp) = CURRENT_DATE
ORDER BY timestamp DESC;
```

### Test Monthly Referral
```bash
# Run the test script
cd api
node src/scripts/testMonthlyDistribution.js
```

### Verify User Balance
```sql
-- Check user's withdrawable balance
SELECT u.full_name, w.balance 
FROM users u 
JOIN wallets w ON u.id = w.user_id 
WHERE u.id = 'user_id_here';

-- Check user's daily profits for a month
SELECT DATE(timestamp) as date, amount 
FROM transactions 
WHERE user_id = 'user_id_here' 
AND income_source = 'daily_profit'
AND timestamp >= '2024-10-01' 
AND timestamp < '2024-11-01'
ORDER BY timestamp;
```

---

## 📞 Files Modified

1. **`api/src/services/dailyProfitDistribution.js`**
   - Calculates daily profit on ALL active deposits
   - Adds profit to wallet balance
   - Prevents duplicate distributions

2. **`api/src/services/monthlyProfitDistribution.js`**
   - Calculates actual monthly profit from daily transactions
   - Distributes referral income to uplines
   - Tracks by month key

3. **`api/src/jobs/scheduler.js`**
   - Daily profit: Every day at midnight
   - Monthly referral: 1st of month at 2:00 AM

4. **`api/src/scripts/testMonthlyDistribution.js`**
   - Test script for manual distribution

---

## ✨ Benefits

1. **Accurate**: Uses actual daily profits, not estimates
2. **Fair**: Adjusts automatically for mid-month deposits
3. **Transparent**: Clear transaction records
4. **Reliable**: Prevents duplicates
5. **Scalable**: Handles any number of deposits

---

**Last Updated**: November 23, 2025
**Version**: 3.0 - Actual daily profit tracking system
