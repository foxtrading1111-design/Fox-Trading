# Daily Profit Distribution System

## Overview

The Daily Profit Distribution System automatically calculates and distributes investment profits to users on a daily basis.

### Profit Calculation

- **Monthly Rate**: 10% per month
- **Daily Rate**: 0.333% per day (10% ÷ 30 days)
- **Formula**: `Daily Profit = Total Deposits × 0.00333`

## Features

### 1. Automatic Daily Distribution
- Runs automatically every day at midnight (00:00)
- Distributes profit to all users with active deposits
- Creates transaction records for tracking
- Prevents duplicate distributions on the same day

### 2. Dashboard Display
- **Daily Investment Profit Card**: Prominently displays today's profit
- Shows 0.333% daily rate and 10% monthly rate
- Displays total profit earned to date
- "Auto-credited" badge to indicate automatic distribution

### 3. My Income Integration
- Daily profit transactions appear in the My Income tab
- Listed as "Daily Investment Profit" with red color (#ef4444)
- Included in income breakdown charts and graphs
- Visible in recent transactions list

## API Endpoints

### Manual Distribution (Admin Only)
```
POST /api/user/admin/distribute-daily-profits
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "usersProcessed": 50,
  "totalUsers": 50,
  "alreadyDistributedCount": 0,
  "totalProfitDistributed": 1234.56,
  "results": [...]
}
```

## Files Added/Modified

### New Files
1. `api/src/services/dailyProfitDistribution.js` - Core service for calculating and distributing profits
2. `api/src/jobs/dailyProfitCron.js` - Cron job scheduler for daily automation
3. `api/DAILY_PROFIT_README.md` - This documentation file

### Modified Files
1. `api/src/routes/user.js` - Added admin endpoint for manual triggering
2. `api/src/jobs/scheduler.js` - Integrated daily profit cron job
3. `frontend/src/pages/app/Dashboard.tsx` - Added Daily Investment Profit card
4. `frontend/src/pages/app/MyIncome.tsx` - Already supports daily_profit (no changes needed)

## How It Works

### Daily Process
1. **Midnight Trigger**: Cron job runs at 00:00 every day
2. **User Query**: Fetches all users with deposits
3. **Profit Calculation**: For each user:
   - Sum all completed deposits
   - Multiply by daily rate (0.00333)
   - Round to 2 decimal places
4. **Transaction Creation**: Creates a credit transaction with:
   - Type: `credit`
   - Income Source: `daily_profit`
   - Status: `COMPLETED`
   - Unlock Date: Immediately available
5. **Duplicate Prevention**: Checks if profit already distributed today
6. **Logging**: Records success/failure for each user

### Transaction Record
```javascript
{
  user_id: "user_123",
  amount: 33.30,
  type: "credit",
  income_source: "daily_profit",
  description: "Daily investment profit (0.333% per day) - $33.30",
  status: "COMPLETED",
  unlock_date: new Date(), // Immediately withdrawable
  timestamp: new Date()
}
```

## Testing

### Manual Trigger (Admin)
To manually trigger the daily profit distribution:

1. Login as admin
2. Send POST request:
   ```bash
   curl -X POST http://localhost:4000/api/user/admin/distribute-daily-profits \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

### Verification
1. Check Dashboard - Daily Investment Profit card should show profit
2. Check My Income - Look for "Daily Investment Profit" transactions
3. Check database - Query transactions table for `income_source = 'daily_profit'`

## Example Calculation

### User with $10,000 deposit:
- **Daily Profit**: $10,000 × 0.00333 = $33.30 per day
- **Monthly Profit**: $33.30 × 30 = $999.00 per month (~10%)
- **Yearly Profit**: $33.30 × 365 = $12,154.50 (~121.5% annually)

### User with $100 deposit:
- **Daily Profit**: $100 × 0.00333 = $0.33 per day
- **Monthly Profit**: $0.33 × 30 = $9.90 per month (~10%)
- **Yearly Profit**: $0.33 × 365 = $120.45 (~120.5% annually)

## Cron Schedule
- **Expression**: `0 0 * * *`
- **Meaning**: At 00:00 (midnight) every day
- **Timezone**: America/New_York (configurable)

## Monitoring

### Logs to Watch
```
🕐 Daily profit cron job triggered at: [timestamp]
✅ Daily profit distribution completed successfully
   📊 Users processed: 50/50
   💰 Total distributed: $1234.56
```

### Error Logs
```
❌ Failed to process daily profit for user [user_id]: [error]
❌ Daily profit distribution failed: [error]
```

## Important Notes

1. **No Duplication**: System prevents distributing profit twice on the same day
2. **Immediate Availability**: Daily profits are immediately withdrawable (no lock period)
3. **Automatic**: Runs without manual intervention
4. **Database Transactions**: Uses Prisma transactions to ensure consistency
5. **Admin Override**: Admins can manually trigger distribution if needed

## Troubleshooting

### Issue: Profits not showing on Dashboard
- Check if cron job is running (look for log messages)
- Verify user has deposits in database
- Check transaction records for `daily_profit` entries

### Issue: Duplicate profits
- System has built-in duplicate prevention
- Check `unlock_date` and `timestamp` fields
- Verify cron is not running multiple instances

### Issue: Incorrect amounts
- Verify deposit amounts in transactions table
- Check calculation: `deposits × 0.00333`
- Review transaction creation logs

## Future Enhancements

Potential improvements for consideration:
1. Email notifications when daily profit is credited
2. Admin dashboard to view distribution history
3. Configurable profit rates per user tier
4. Profit accumulation reports
5. Tax reporting features
