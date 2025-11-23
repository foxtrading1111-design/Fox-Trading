# Referral Income Page - How It Works

## 📊 What the Page Shows

The **Referral Income (Multi-Level)** page displays:

1. **Completed Income**: Total referral income you've received (status: COMPLETED)
2. **Pending Income**: Referral income awaiting approval (status: PENDING)
3. **Period Total**: Total for the selected time filter
4. **Total Transactions**: Number of referral income transactions
5. **Income by Level**: Breakdown showing how much you earned from each level (1-20)

---

## 🔄 How Referral Income is Generated

### Daily Profits (Every Day at Midnight)
```
User deposits → Daily profit (0.333%) → Added to wallet
```

### Monthly Referral Distribution (1st of Each Month at 2:00 AM)
```
1. System looks at previous month's daily profits
2. Calculates total monthly profit per user
3. Distributes referral income to uplines:
   - Level 1: 10%
   - Level 2: 5%
   - Level 3: 3%
   - Level 4: 2%
   - Level 5: 1%
   - Levels 6-20: 0.5% each
```

---

## 💡 Why the Page Shows $0.00

The page will show $0.00 if:

### 1. No Monthly Distribution Has Run Yet
- Monthly distributions run on the **1st of each month at 2:00 AM**
- If it's not yet the 1st of the month, no referral income has been distributed
- **Solution**: Wait for the 1st of the month, or manually trigger distribution (see below)

### 2. No Users Earned Daily Profits Last Month
- Referral income is based on downline's **actual daily profits** from previous month
- If your downline didn't have active deposits last month, there's no profit to distribute
- **Solution**: Ensure downline users have active deposits earning daily profits

### 3. You Have No Downline
- You need downline users (people you referred) to earn referral income
- **Solution**: Refer users using your referral code

---

## 🧪 How to Test the System

### Method 1: Manual Distribution (Testing)

Run the test script:
```bash
cd api
node src/scripts/testMonthlyDistribution.js
```

This will:
- Show all users who earned daily profits last month
- Calculate their total monthly profit
- Distribute referral income to uplines
- Display detailed results

### Method 2: Check Database Directly

```sql
-- Check if there are any referral income transactions
SELECT * FROM transactions 
WHERE income_source = 'referral_income'
ORDER BY timestamp DESC
LIMIT 10;

-- Check daily profits from last month
SELECT user_id, SUM(amount) as total_profit, COUNT(*) as days
FROM transactions 
WHERE income_source = 'daily_profit'
AND timestamp >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
AND timestamp < DATE_TRUNC('month', CURRENT_DATE)
GROUP BY user_id;
```

### Method 3: Create Test Data

If you want to test with sample data:

1. **Create a test user with deposits**:
   - User A deposits $1,000
   - Wait for daily profits to accumulate

2. **Create downline users**:
   - User B (sponsored by A) deposits $500
   - User C (sponsored by B) deposits $300

3. **Wait for daily profits**:
   - Daily profits will be distributed every day at midnight
   - After a month, run the monthly distribution

4. **Check results**:
   - User A should receive referral income from User B's profits (10%)
   - User A should also receive from User C's profits (5%)

---

## 📋 Example Calculation

### Scenario:
- **User C** (your downline) deposited $1,000 on Oct 1st
- Daily profits for October: ~$10 per day × 30 days = $300
- You are User C's **direct sponsor (Level 1)**

### On November 1st:
```
User C's monthly profit: $300
Your referral income (10%): $30
```

This $30 will appear on the Referral Income page as:
- **Completed Income**: $30
- **Level 1 Income**: $30
- **Total Transactions**: 1

---

## 🔍 Troubleshooting

### Page Shows $0.00 But You Have Downline

**Check 1: Do they have active deposits?**
```sql
SELECT u.full_name, COUNT(t.id) as deposits, SUM(t.amount) as total
FROM users u
JOIN transactions t ON u.id = t.user_id
WHERE u.sponsor_id = 'YOUR_USER_ID'
AND t.income_source = 'investment_deposit'
AND t.status = 'COMPLETED'
GROUP BY u.id, u.full_name;
```

**Check 2: Did they earn daily profits last month?**
```sql
SELECT u.full_name, SUM(t.amount) as daily_profits
FROM users u
JOIN transactions t ON u.id = t.user_id
WHERE u.sponsor_id = 'YOUR_USER_ID'
AND t.income_source = 'daily_profit'
AND t.timestamp >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
AND t.timestamp < DATE_TRUNC('month', CURRENT_DATE)
GROUP BY u.id, u.full_name;
```

**Check 3: Has monthly distribution run?**
```sql
SELECT * FROM transactions
WHERE income_source = 'referral_income'
AND description LIKE '%month 2024-11%'  -- Replace with current month
ORDER BY timestamp DESC;
```

### Transactions Not Showing

**Verify endpoint is working:**
```bash
# Test the API endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/user/referral-income
```

**Check browser console:**
- Open Developer Tools (F12)
- Go to Network tab
- Refresh the Referral Income page
- Check if `/api/user/referral-income` returns data

---

## 📅 Timeline Example

### October 2024
- **Oct 1**: User C deposits $1,000
- **Oct 2-31**: User C earns daily profits (~$10/day)
- **Total October profits**: ~$300

### November 2024
- **Nov 1 at 2:00 AM**: Monthly distribution runs
  - System calculates User C's October profits: $300
  - Distributes 10% to you (Level 1): $30
  - Creates transaction in database
- **Nov 1 onwards**: You can see $30 on Referral Income page

### December 2024
- **Dec 1 at 2:00 AM**: Next monthly distribution
  - System calculates User C's November profits
  - Distributes referral income again
  - And so on...

---

## ✅ Summary

**The page is working correctly if:**
- ✅ It shows $0.00 when no monthly distribution has run yet
- ✅ It shows $0.00 when downline has no daily profits from last month
- ✅ It updates after monthly distribution runs (1st of month)
- ✅ It shows breakdown by level when you have referral income

**To see data on the page:**
1. Ensure downline users have active deposits
2. Wait for them to earn daily profits for at least one month
3. Wait for the 1st of next month (or manually run distribution)
4. Refresh the Referral Income page

---

**Last Updated**: November 23, 2025
**System Status**: Fully functional - waiting for monthly cycle to complete
