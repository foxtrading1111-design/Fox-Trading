# Referral Income Issues and Fixes

## Issues Found

### 1. **Incorrect Prisma Table Names in workers.js**
The `runMonthlyTradingBonus` and `runMonthlyReferralIncome` functions had incorrect table names:

**Before:**
```javascript
// Wrong table names
await prisma.investment.findMany(...)     // Should be 'investments'
await tx.wallet.update(...)               // Should be 'wallets'  
await tx.transaction.create(...)          // Should be 'transactions'
```

**After:**
```javascript
// Correct table names
await prisma.investments.findMany(...)
await tx.wallets.update(...)
await tx.transactions.create(...)
```

### 2. **Missing Duplicate Prevention Logic**
The referral income calculation could process the same trading bonus multiple times, leading to duplicate referral income payments.

**Fixed by:**
- Added check for existing referral income transactions linked to specific bonus IDs
- Better transaction descriptions that include the source bonus ID
- Skip processing if referral income already exists for a trading bonus

### 3. **Limited Error Handling and Logging**
The original function had minimal error handling and logging, making debugging difficult.

**Improvements:**
- Added comprehensive error handling with try-catch blocks
- Better logging with counts and status updates
- More descriptive transaction descriptions
- Individual error tracking per bonus processed

### 4. **No Testing/Debugging Tools**
There were no easy ways to test or debug the referral income calculation.

**Added:**
- `test-referral-income.js` script for comprehensive testing
- `/api/testing/referral-income-status` endpoint to check system state
- `/api/testing/run-all-jobs` endpoint to trigger all commission jobs
- Enhanced existing testing endpoints

## Key Changes Made

### 1. Fixed `runMonthlyTradingBonus()` function:
```javascript
export async function runMonthlyTradingBonus() {
  const activeInvestments = await prisma.investments.findMany({
    where: { status: 'active' },
  });

  for (const inv of activeInvestments) {
    const bonus = inv.amount * inv.monthly_profit_rate / 100;
    await prisma.$transaction(async (tx) => {
      await tx.wallets.update({
        where: { user_id: inv.user_id },
        data: { balance: { increment: bonus } },
      });
      await tx.transactions.create({
        data: {
          user_id: inv.user_id, 
          amount: bonus, 
          type: 'credit', 
          income_source: 'trading_bonus',
          description: `Monthly trading bonus for investment ${inv.id}`,
        },
      });
    });
  }
  console.log(`Processed ${activeInvestments.length} monthly trading bonuses.`);
}
```

### 2. Enhanced `runMonthlyReferralIncome()` function:
```javascript
export async function runMonthlyReferralIncome() {
  // ... referral percentages setup ...
  
  const tradingBonuses = await prisma.transactions.findMany({
    where: { 
      income_source: 'trading_bonus', 
      timestamp: { gte: startOfMonth } 
    },
  });

  console.log(`Found ${tradingBonuses.length} trading bonuses to process for referral income.`);
  let processedCount = 0;
  let errorCount = 0;

  for (const bonus of tradingBonuses) {
    try {
      // Check if we've already processed referral income for this trading bonus
      const existingReferralIncome = await prisma.transactions.findFirst({
        where: {
          income_source: 'referral_income',
          description: { contains: `from bonus ${bonus.id}` }
        }
      });

      if (existingReferralIncome) {
        console.log(`Skipping bonus ${bonus.id} - referral income already processed`);
        continue;
      }

      let currentUserId = bonus.user_id;
      for (let level = 0; level < referralPercentages.length; level++) {
        const user = await prisma.users.findUnique({ 
          where: { id: currentUserId }, 
          select: { sponsor_id: true, full_name: true } 
        });
        const sponsorId = user?.sponsor_id;
        if (!sponsorId) break;

        const referralAmount = Number((bonus.amount * referralPercentages[level] / 100).toFixed(2));
        
        if (referralAmount > 0) {
          await prisma.$transaction(async (tx) => {
            await tx.wallets.update({ 
              where: { user_id: sponsorId }, 
              data: { balance: { increment: referralAmount } } 
            });
            
            await tx.transactions.create({
              data: {
                user_id: sponsorId, 
                amount: referralAmount, 
                type: 'credit', 
                income_source: 'referral_income',
                description: `Level ${level + 1} referral income from ${user?.full_name || 'user'} (from bonus ${bonus.id})`,
              },
            });
          });
        }
        
        currentUserId = sponsorId;
      }
      processedCount++;
    } catch (error) {
      console.error(`Error processing referral income for bonus ${bonus.id}:`, error);
      errorCount++;
    }
  }
  
  console.log(`Processed referral income: ${processedCount} bonuses processed, ${errorCount} errors.`);
}
```

## Testing the Fixes

### Using the Test Script:
```bash
cd /path/to/api
node src/scripts/test-referral-income.js
```

### Using API Endpoints:
1. **Check current status:**
   ```
   GET /api/testing/referral-income-status
   ```

2. **Run specific jobs:**
   ```
   POST /api/testing/run-trading-bonus
   POST /api/testing/run-referral-income
   POST /api/testing/run-salary
   ```

3. **Run all jobs:**
   ```
   POST /api/testing/run-all-jobs
   ```

## Expected Results After Fix

1. **No more duplicate referral income** - Each trading bonus will only generate referral income once
2. **Proper table name resolution** - All Prisma queries will use correct table names
3. **Better error handling** - Individual errors won't stop the entire process
4. **Comprehensive logging** - Clear visibility into what's being processed
5. **Debugging capabilities** - Easy ways to test and inspect the referral income system

## Verification Steps

1. Check that users with sponsor relationships receive referral income when their referees get trading bonuses
2. Verify that running the referral income job multiple times doesn't create duplicate payments
3. Confirm that all 20 levels of referral income are calculated correctly
4. Test that error handling works properly when sponsor chains are broken
5. Validate that wallet balances are updated correctly

The referral income system should now work properly and be much more reliable and debuggable.