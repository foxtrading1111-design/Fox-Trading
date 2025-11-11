# Testing Daily Profit Distribution

## Quick Test Steps

### 1. Check if cron job is creating transactions
Run this in your database or via API:
```sql
SELECT * FROM transactions 
WHERE income_source = 'daily_profit' 
ORDER BY timestamp DESC 
LIMIT 10;
```

Expected: You should see daily profit transactions with `income_source = 'daily_profit'`

### 2. Manually trigger profit distribution (for testing)
If you're an admin, you can manually trigger the distribution:

**Using curl/Postman:**
```bash
POST http://localhost:4000/api/user/admin/distribute-daily-profits
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "usersProcessed": 5,
  "totalUsers": 5,
  "alreadyDistributedCount": 0,
  "totalProfitDistributed": 33.30
}
```

### 3. Check Dashboard API Response
```bash
GET http://localhost:4000/api/user/dashboard
Authorization: Bearer YOUR_TOKEN
```

**Look for these fields:**
```json
{
  "today_investment_profit": 3.33,  // Should show today's daily profit
  "total_investment_profit": 99.99,  // Should show total accumulated profit
  "daily_income": 3.33                // Should include today's profit
}
```

### 4. Verify Frontend Display

Visit dashboard at `http://localhost:8080/app`

**Check these cards:**

1. **Daily Investment Profit Card** (highlighted amber card)
   - Should show: `$3.33` (or your actual daily profit)
   - Total Earned: `$99.99` (or your actual total)
   - Badge: "Auto-credited"

2. **Daily Income Card** (green card)
   - Should show: `$3.33` (or more if there's other income today)
   - Text: "Includes daily profit"

3. **Total Income Card** (blue card)
   - Should show: `$996` (or your total with daily profits included)

## Expected Calculations

### Daily Profit Formula:
```
Daily Profit = Total Deposits × 0.00333
             = Total Deposits × (10% / 30 days)
```

### Examples:
- $1,000 deposit → $3.33 per day
- $5,000 deposit → $16.67 per day
- $10,000 deposit → $33.33 per day

## Common Issues and Solutions

### Issue: Dashboard shows $0.00
**Solution:** The fix has been applied. Restart the backend server:
```bash
cd api
npm start
```

### Issue: Still showing $0.00 after fix
**Possible causes:**
1. No deposits in the system yet
2. Cron hasn't run yet today
3. Server needs restart

**To verify:**
```bash
# Check if you have deposits
SELECT user_id, SUM(amount) as total 
FROM transactions 
WHERE type IN ('DEPOSIT', 'credit') 
  AND income_source LIKE '%deposit%'
  AND status = 'COMPLETED'
GROUP BY user_id;

# Check if daily profit was distributed today
SELECT user_id, amount, timestamp 
FROM transactions 
WHERE income_source = 'daily_profit' 
  AND timestamp >= CURRENT_DATE;
```

### Issue: Cron job not running
**To manually trigger:**
1. Make sure you're an admin user
2. Call the admin endpoint: `POST /api/user/admin/distribute-daily-profits`
3. Check server logs for errors

## Server Logs to Watch

When the cron job runs, you should see:
```
🔄 Starting daily profit distribution...
📊 Found 5 users with deposits
✅ Daily profit distribution complete:
   - Users processed: 5/5
   - Already distributed today: 0
   - Total profit distributed: $33.30
```

## Verification Checklist

- [ ] Backend server restarted after fix
- [ ] Cron job runs at midnight IST (or manually triggered)
- [ ] Transactions with `income_source='daily_profit'` exist in database
- [ ] Dashboard API returns `today_investment_profit > 0`
- [ ] Dashboard API returns `total_investment_profit > 0`
- [ ] Frontend displays values in Daily Investment Profit card
- [ ] Frontend displays values in Daily Income card
- [ ] Values match the calculation (deposits × 0.00333)

## Need More Help?

Check these files for debugging:
- `api/src/services/dailyProfitDistribution.js` - Main distribution logic
- `api/src/routes/user.js` - Dashboard API (lines 188-202)
- `api/src/utils/investmentProfit.js` - Profit calculation utilities
- `frontend/src/pages/app/Dashboard.tsx` - UI display (lines 222-240)
