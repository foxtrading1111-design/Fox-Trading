# Daily Profit System - Setup Instructions

## Current Status

✅ **Code Changes Complete:**
1. Daily profit calculation service created
2. Dashboard API updated to include daily profit in daily_income
3. Dashboard UI updated with prominent Daily Investment Profit card
4. Salary income updated to require balanced legs (both left and right)
5. Migration script created for backfilling historical profits

❌ **Requires Action:**
1. Restart backend server
2. Run migration script to backfill historical data
3. Verify changes on frontend

---

## Step 1: Restart Backend Server

The backend code has been modified but needs to be restarted for changes to take effect.

### Option A: If server is running in terminal
1. Press `Ctrl+C` to stop the server
2. Run: `cd C:\Users\Kunal\OneDrive\Desktop\trade\trade\api`
3. Run: `npm run dev`

### Option B: If using PM2 or other process manager
```powershell
pm2 restart trade-api
# or
pm2 restart all
```

### Expected Logs:
When the server starts, you should see:
```
📅 Daily profit cron job scheduled (runs daily at midnight)
🚀 Running initial daily profit distribution...
✅ Initial daily profit distribution completed
   📊 Users processed: X/X
   💰 Total distributed: $X.XX
```

---

## Step 2: Backfill Historical Daily Profits

This creates daily profit transactions for past days (up to 30 days by default).

### Run Migration Script:
```powershell
cd C:\Users\Kunal\OneDrive\Desktop\trade\trade\api
node src/scripts/backfillDailyProfits.js
```

### Custom Days (Optional):
To backfill for a different number of days:
```powershell
node src/scripts/backfillDailyProfits.js 60  # Backfill 60 days
```

### Expected Output:
```
🔄 Starting daily profit backfill...
📅 Backfilling for the last 30 days

👥 Found X users with deposits

✅ User Name: Created 30 transactions ($18.00/day)
✅ Another User: Created 25 transactions ($12.50/day)
...

============================================================
📊 Backfill Complete!
============================================================
Total users processed: X
Total transactions created: XXX
Total amount distributed: $X,XXX.XX
============================================================

✅ Backfill completed successfully!
```

---

## Step 3: Verify Dashboard

### Open Dashboard and Check:

1. **Daily Investment Profit Card** (Large amber card at top)
   - Should show: $18.00
   - Should say: "0.333% per day (10% monthly)"
   - Should have "Auto-credited" badge
   
2. **Daily Income Card** (Green card in grid)
   - Should now show: $18.00 (not $0.00)
   - Should say: "Includes daily profit"

3. **Total Income Card**
   - Should include all backfilled daily profits

---

## Step 4: Verify My Income Tab

Navigate to "My Income" and check:

1. **Today's Income** - Should show $18.00
2. **Income History Chart** - Should show increased income
3. **Income Breakdown** - Should include "Daily Investment Profit" with red color
4. **Recent Transactions** - Should show daily profit entries

---

## Step 5: Verify Salary Income

Navigate to "Salary Income" and check:

1. Each rank card should show:
   - **Required Per Leg**: $5,000 (for Rank 1)
   - **Left Leg**: Current volume with green/gray background
   - **Right Leg**: Current volume with green/gray background
   - **Need**: Amount needed if requirement not met

2. Progress bar should be based on the **weaker leg**

3. Rank is only achieved when **BOTH legs** meet the threshold

---

## What's Automated Now

### Daily at Midnight:
- ✅ Daily profit automatically calculated and distributed
- ✅ Transactions created with `income_source: 'daily_profit'`
- ✅ Profits immediately available for withdrawal
- ✅ No duplicate profits (system checks before creating)

### Real-time Calculations:
- ✅ Daily Income includes expected profit even before transaction created
- ✅ Dashboard always shows accurate daily profit
- ✅ Salary ranks check both left and right leg volumes

---

## Troubleshooting

### Issue: Daily Income still shows $0
**Solution:** Backend server needs to be restarted. Follow Step 1.

### Issue: No historical profits in My Income
**Solution:** Run the migration script from Step 2.

### Issue: Salary rank not achieved despite having volume
**Solution:** Check that BOTH left and right legs meet the requirement. For Rank 1, you need $5,000 on LEFT leg AND $5,000 on RIGHT leg (not just $5,000 total).

### Issue: Daily profit not appearing in transactions
**Solution:** 
1. Check server logs for errors
2. Verify cron job is running (look for "Daily profit cron job scheduled")
3. Manually trigger: `POST /api/user/admin/distribute-daily-profits` (admin only)

---

## Summary of Changes

### Backend Files Modified:
- `api/src/routes/user.js` - Updated dashboard and salary-status endpoints
- `api/src/jobs/scheduler.js` - Added daily profit cron job

### Backend Files Created:
- `api/src/services/dailyProfitDistribution.js` - Core profit distribution logic
- `api/src/jobs/dailyProfitCron.js` - Automated daily scheduler
- `api/src/scripts/backfillDailyProfits.js` - Migration script

### Frontend Files Modified:
- `frontend/src/pages/app/Dashboard.tsx` - Added Daily Investment Profit card, fixed hooks
- `frontend/src/pages/app/SalaryIncome.tsx` - Added left/right leg requirements display

### Database Changes:
- New transactions with `income_source: 'daily_profit'` will be created
- Existing data remains unchanged
- Migration script creates historical transactions

---

## Next Steps After Setup

1. Monitor server logs for 24 hours to ensure cron runs successfully
2. Verify daily profits are being distributed at midnight
3. Check that users can see and withdraw their daily profits
4. Monitor database for any issues with transaction creation

---

## Support

If you encounter any issues:
1. Check server logs for errors
2. Verify database connectivity
3. Ensure Prisma schema is up to date
4. Contact support with specific error messages
