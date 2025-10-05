# Investment System Documentation

## Overview

The Fox Trading platform includes a comprehensive investment system that automatically calculates and distributes daily profits to users based on their deposits. The system provides:

- **Daily Profit Calculation**: 10% monthly return (equivalent to 0.333% daily)
- **Real-time Dashboard Updates**: Investment profits updated every 30 seconds
- **Investment Tracking**: Personal and team investment monitoring
- **Automatic Profit Distribution**: Daily profit calculation and wallet crediting

## Features

### 1. Daily Profit System
- **Rate**: 10% monthly return (0.333% daily)
- **Calculation**: Profit = Total Investment Amount × 0.333% per day
- **Distribution**: Automatic daily profit crediting to user wallets
- **Tracking**: All profits recorded as transactions with detailed history

### 2. Real-time Dashboard
- **Investment Overview**: Shows total invested, today's profit, and total profits earned
- **Live Updates**: Dashboard refreshes every 30 seconds automatically
- **Investment Cards**: Dedicated cards showing investment performance
- **Visual Indicators**: Live status indicator and last update timestamp

### 3. Investment Pages
- **My Investments**: View all personal investments with profit calculations
- **Team Investments**: Monitor team members' investments and profits
- **Detailed Views**: Investment dates, days active, daily/monthly rates

## Technical Implementation

### Backend Components

1. **Daily Profit Calculation** (`src/utils/investmentProfit.js`)
   - Calculates daily profits for all users with investments
   - Prevents duplicate calculations for the same day
   - Creates profit transactions and updates wallet balances

2. **Dashboard API** (`src/routes/user.js`)
   - Returns real-time investment data including daily and total profits
   - Calculates investment metrics on-the-fly for accuracy

3. **Investment Endpoints**
   - `/api/user/investments/my` - Personal investments
   - `/api/user/investments/team` - Team investments
   - `/api/user/admin/calculate-profits` - Manual profit calculation (Admin only)

### Frontend Components

1. **Dashboard Updates** (`src/pages/app/Dashboard.tsx`)
   - Real-time display of investment profits
   - Auto-refresh every 30 seconds
   - Visual indicators for live updates

2. **Investment Pages**
   - `src/pages/app/MyInvestments.tsx` - Personal investment tracking
   - `src/pages/app/TeamInvestments.tsx` - Team investment monitoring

3. **API Integration** (`src/hooks/use-api.tsx`)
   - Real-time data fetching with automatic updates
   - Investment profit data integration

## Setup Instructions

### 1. Automatic Daily Profit Calculation

#### Option A: Cron Job (Recommended for Production)
```bash
# Make the script executable
chmod +x src/jobs/dailyProfitCalculation.js

# Add to crontab (run daily at midnight)
crontab -e

# Add this line:
0 0 * * * /path/to/node /path/to/your/api/src/jobs/dailyProfitCalculation.js
```

#### Option B: Manual Calculation (For Testing)
```bash
# Run manually
node src/jobs/dailyProfitCalculation.js

# Or via API (Admin only)
POST /api/user/admin/calculate-profits
```

### 2. Environment Variables
Ensure your database is properly configured in your environment variables:

```env
DATABASE_URL="your_database_connection_string"
```

### 3. Database Schema
The system uses existing tables:
- `transactions` - Stores all investment profit transactions
- `wallets` - Stores updated user balances
- `users` - User information and relationships

## Usage Guide

### For Users

1. **Make Deposits**: Use the deposit system to make investments
2. **View Dashboard**: Check real-time investment performance on dashboard
3. **Monitor Investments**: Use "My Investments" page to track individual investments
4. **Track Team**: Use "Team Investments" to monitor team performance

### For Admins

1. **Manual Calculation**: Use the admin endpoint to manually trigger profit calculations
2. **Monitor System**: Check logs for daily profit calculation status
3. **Verify Transactions**: Review investment profit transactions in the database

## Profit Calculation Logic

```javascript
const dailyProfitRate = 0.10 / 30; // 10% monthly / 30 days = 0.333% daily
const dailyProfit = totalInvestmentAmount × dailyProfitRate;
```

### Example:
- User invests $1,000
- Daily profit = $1,000 × 0.00333 = $3.33 per day
- Monthly profit = $3.33 × 30 = $100 (10% of $1,000)

## Transaction Types

The system creates the following transaction types:

1. **Deposits**: `type: 'DEPOSIT'` - User investments
2. **Investment Profits**: `type: 'credit', income_source: 'investment_profit'` - Daily profits

## Monitoring and Maintenance

### Daily Checks
1. Verify cron job execution
2. Check profit calculation logs
3. Monitor wallet balance updates
4. Review transaction records

### Troubleshooting
1. **Profits Not Calculating**: Check cron job setup and permissions
2. **Dashboard Not Updating**: Verify API endpoints are working
3. **Incorrect Amounts**: Review profit calculation logic and rate settings

## Security Considerations

1. **Admin Endpoints**: Protected by role-based access control
2. **Data Validation**: All profit calculations validated before database updates
3. **Duplicate Prevention**: Built-in checks prevent duplicate daily calculations
4. **Audit Trail**: All profit transactions recorded with full details

## Support

For technical issues or questions about the investment system, refer to:
- System logs in `/logs` directory
- Database transaction records
- API endpoint responses
- Frontend console for debugging

---

*This investment system is designed to provide reliable, automated profit distribution while maintaining full transparency and audit trails.*