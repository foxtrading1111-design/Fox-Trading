# Monthly Profit & Referral Income Distribution Guide

## 📋 Overview

This system distributes **10% monthly profit** to users and **referral income** to their uplines based on each deposit's monthly cycle.

### Key Concept
- Each deposit is tracked individually
- Profit is distributed every month from the deposit date
- Example: $100 deposited on Oct 10th
  - **Nov 10th**: User gets $10, uplines get referral income (Month 1)
  - **Dec 10th**: User gets $10, uplines get referral income (Month 2)
  - **Jan 10th**: User gets $10, uplines get referral income (Month 3)
  - Continues until `unlock_date`

---

## 💰 Referral Income Structure

From each user's monthly profit, uplines receive:

| Level | Percentage | Example (from $10 profit) |
|-------|-----------|---------------------------|
| 1 (Direct) | 10% | $1.00 |
| 2 | 5% | $0.50 |
| 3 | 3% | $0.30 |
| 4 | 2% | $0.20 |
| 5 | 1% | $0.10 |
| 6-20 | 0.5% each | $0.05 each |

**Total distributed to uplines**: $2.85 per $10 profit (28.5%)
**User keeps**: $10.00 (100% - this is separate from referral income)

---

## 🔄 How It Works

### 1. Eligibility Check
A deposit is eligible for distribution if:
- ✅ At least 1 month old from deposit date
- ✅ Still locked (before `unlock_date`)
- ✅ Hasn't been processed for the current month yet

### 2. Monthly Tracking
The system tracks each month using the description field:
```
"Month 1 profit from deposit clm123abc..."
"Month 2 profit from deposit clm123abc..."
```

This prevents duplicate distributions.

### 3. Distribution Process
For each eligible deposit:
1. Calculate 10% monthly profit
2. Credit profit to user's wallet
3. Find upline chain (up to 20 levels)
4. Distribute referral income to each upline
5. Create transaction records

---

## 🚀 Running the Distribution

### Automatic (Production)
The system runs automatically **every day at 2:00 AM** via cron job:
```javascript
// In scheduler.js
cron.schedule('0 2 * * *', async () => {
  await processMonthlyProfitDistribution();
});
```

### Manual Testing
Run the test script:
```bash
cd api
node src/scripts/testMonthlyDistribution.js
```

This will:
1. Show all eligible deposits
2. Display month numbers and amounts
3. Wait 5 seconds for confirmation
4. Process the distribution
5. Show detailed results

---

## 📊 Example Scenario

### Setup
- **User A** (no sponsor)
- **User B** (sponsored by A)
- **User C** (sponsored by B)
- **User D** (sponsored by C)

User D deposits **$1,000** on **October 10, 2024**

### Month 1 (November 10, 2024)
```
User D receives: $100 (10% of $1,000)

Referral Income:
├─ User C (Level 1): $10.00 (10% of $100)
├─ User B (Level 2): $5.00 (5% of $100)
└─ User A (Level 3): $3.00 (3% of $100)

Total distributed: $18.00 to uplines
```

### Month 2 (December 10, 2024)
```
User D receives: $100 (10% of $1,000)

Referral Income:
├─ User C (Level 1): $10.00 (10% of $100)
├─ User B (Level 2): $5.00 (5% of $100)
└─ User A (Level 3): $3.00 (3% of $100)

Total distributed: $18.00 to uplines
```

This continues every month until the unlock date.

---

## 🗄️ Database Records

### User's Monthly Profit
```javascript
{
  user_id: "user_d_id",
  amount: 100.00,
  type: "credit",
  income_source: "monthly_profit",
  description: "Month 1 profit from deposit clm123... - $1,000.00 × 10% = $100.00",
  status: "COMPLETED"
}
```

### Referral Income (for each upline)
```javascript
{
  user_id: "user_c_id",
  amount: 10.00,
  type: "credit",
  income_source: "referral_income",
  description: "Level 1 referral income (10%) from User D's Month 1 profit of $100.00",
  status: "COMPLETED",
  referral_level: 1,
  monthly_income_source_user_id: "user_d_id"
}
```

---

## 🔍 Verification

### Check Eligible Deposits
```javascript
import { getEligibleDepositsForDistribution } from './services/monthlyProfitDistribution.js';

const eligible = await getEligibleDepositsForDistribution();
console.log(eligible);
```

### Check Month Number
```javascript
import { calculateMonthNumber } from './services/monthlyProfitDistribution.js';

const depositDate = new Date('2024-10-10');
const monthNum = calculateMonthNumber(depositDate);
console.log(`Month ${monthNum}`); // e.g., "Month 2" if current date is Dec 10+
```

### View Transactions
```sql
-- User's monthly profits
SELECT * FROM transactions 
WHERE user_id = 'user_id_here' 
AND income_source = 'monthly_profit'
ORDER BY timestamp DESC;

-- Referral income received
SELECT * FROM transactions 
WHERE user_id = 'user_id_here' 
AND income_source = 'referral_income'
ORDER BY timestamp DESC;
```

---

## ⚙️ Configuration

### Files
- **Service**: `api/src/services/monthlyProfitDistribution.js`
- **Scheduler**: `api/src/jobs/scheduler.js`
- **Test Script**: `api/src/scripts/testMonthlyDistribution.js`

### Key Functions
- `getEligibleDepositsForDistribution()` - Find deposits ready for distribution
- `distributeMonthlyProfitForDeposit(deposit)` - Process single deposit
- `processMonthlyProfitDistribution()` - Process all eligible deposits
- `calculateMonthNumber(depositDate)` - Calculate which month it is

### Referral Percentages
Located in `monthlyProfitDistribution.js`:
```javascript
const REFERRAL_PERCENTAGES = [
  10,   // Level 1
  5,    // Level 2
  3,    // Level 3
  2,    // Level 4
  1,    // Level 5
  0.5, 0.5, 0.5, 0.5, 0.5,  // Levels 6-10
  0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5  // Levels 11-20
];
```

---

## 🐛 Troubleshooting

### No Deposits Being Processed
**Check:**
1. Are deposits at least 1 month old?
2. Are they still locked (before unlock_date)?
3. Have they already been processed this month?

### Duplicate Distributions
The system prevents this by checking the description field for:
```
"Month X profit from deposit {deposit_id}"
```

### Missing Referral Income
**Check:**
1. Does the user have a sponsor_id?
2. Is the sponsor chain complete?
3. Check the `getSponsorChain()` function in `teamIncome.js`

---

## 📝 Important Notes

1. **Daily Check**: The cron runs daily to catch deposits that complete their monthly cycle
2. **No Duplicates**: Each month is tracked per deposit to prevent double-distribution
3. **Automatic**: No manual intervention needed once set up
4. **Transparent**: All transactions are recorded with detailed descriptions
5. **Scalable**: Works for unlimited users and deposits

---

## 🔗 Related Systems

- **Daily Profit**: Runs at midnight (0.333% daily)
- **Monthly Salary**: Runs 1st of month at 3:00 AM (based on team volume)
- **Direct Income**: Distributed immediately on deposit approval (one-time 10%)

---

## 📞 Support

For issues or questions:
1. Check the console logs during distribution
2. Review transaction records in database
3. Run the test script to see detailed output
4. Verify deposit dates and unlock dates

---

**Last Updated**: November 23, 2025
**Version**: 2.0 - Monthly cycle tracking system
