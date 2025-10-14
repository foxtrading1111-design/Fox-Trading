# Income System - Changes Summary

## Date: January 2025

## Problem Statement
The income distribution system had incorrect logic:
- **Direct Income** was being confused with team-based commissions
- **Referral Income** was being calculated from downline deposits instead of user's own monthly profit
- Multiple services (`teamIncome.js`) were using wrong calculation methods

## Changes Made

### 1. Fixed Direct Income Logic ✅
**File:** `api/src/routes/investment.js`

**What was fixed:**
- Verified direct income is only paid on **first deposit** from direct referral
- Confirmed it's only paid to **Level 1 sponsor** (direct referrer)
- Amount: **10% of first deposit only**

**Status:** Already implemented correctly, no changes needed.

---

### 2. Fixed Referral Income Logic ✅
**Files:** 
- `api/src/jobs/workers.js`
- `api/src/services/monthlyProfitDistribution.js`

**What was fixed:**
- Updated referral percentages to: **10%, 5%, 3%, 2%, 1%, 0.5%** (levels 1-20)
- Added clear documentation that referral income is from **user's OWN monthly profit**
- Clarified that it distributes **UP to sponsors**, not down to team
- Changed variable names from "team" to "referral" for clarity

**Correct Logic:**
```javascript
const referralPercentages = [
  10,   // Level 1
  5,    // Level 2
  3,    // Level 3
  2,    // Level 4
  1,    // Level 5
  0.5, 0.5, 0.5, 0.5, 0.5,                     // Levels 6-10
  0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5  // Levels 11-20
];
```

---

### 3. Deprecated Incorrect Service ✅
**File:** `api/src/services/teamIncome.js`

**What was done:**
- Added deprecation warning at the top of the file
- Documented why it's incorrect (calculates from downline deposits)
- Directed developers to use correct services instead
- File is kept for reference but marked as **DO NOT USE**

**Why it was wrong:**
- Was calculating "team income" based on total downline deposits
- This meant users would receive commissions from entire team tree
- This is NOT how the system should work

---

### 4. Updated User Routes ✅
**File:** `api/src/routes/user.js`

**What was changed:**
- Updated `/dashboard/team-income` endpoint to support both old `team_income` and new `referral_income` sources
- Added backward compatibility during transition period
- Updated comments to clarify this is referral income from downlines' monthly profits
- Maintained same response structure for frontend compatibility

---

### 5. Created Database Cleanup Script ✅
**File:** `api/src/scripts/fix-income-data.js`

**What it does:**
- Identifies all old `team_income` transactions
- Marks them with `[OLD SYSTEM - INCORRECT CALCULATION]` tag
- Does NOT delete data (audit trail preserved)
- Validates `direct_income` transactions for duplicates
- Provides detailed report of affected users

**Usage:**
```bash
# Dry run (no changes)
node api/src/scripts/fix-income-data.js --dry-run

# Apply changes
node api/src/scripts/fix-income-data.js

# With recalculation flag
node api/src/scripts/fix-income-data.js --recalculate
```

---

### 6. Created Comprehensive Documentation ✅
**File:** `api/INCOME_SYSTEM_DOCUMENTATION.md`

**Contents:**
- Detailed explanation of each income type
- Clear examples with calculations
- Distribution percentages table
- FAQ section
- Code file references
- Migration guide from old system
- Testing instructions

---

## Income Types (Correct Definition)

### 1. Direct Income
- **When:** One-time, on first deposit only
- **Who receives:** Direct sponsor (Level 1) only
- **Amount:** 10% of first deposit
- **Source:** `direct_income`

### 2. Referral Income  
- **When:** Monthly, when user receives their monthly profit
- **Who receives:** All sponsors up to 20 levels
- **Amount:** 10%, 5%, 3%, 2%, 1%, 0.5% (of user's OWN monthly profit)
- **Source:** `referral_income`
- **Key:** Based on YOUR OWN profit, distributed UP to sponsors

### 3. Monthly Profit
- **When:** Monthly
- **Who receives:** The user themselves
- **Amount:** 10% of their own deposits
- **Source:** `monthly_profit` or `trading_bonus`

---

## Migration Path

### For Developers
1. ✅ Use `workers.js` or `monthlyProfitDistribution.js` for referral income
2. ✅ Never use `teamIncome.js` service
3. ✅ Query both `team_income` and `referral_income` for historical data
4. ✅ New transactions should only use `referral_income`

### For Database
1. Run cleanup script to mark old transactions
2. Review affected users and amounts
3. Decide on balance adjustment strategy
4. Run new monthly jobs to start correct calculations

### For Frontend
1. API endpoints remain the same (backward compatible)
2. Response structure unchanged
3. Both old and new income sources are aggregated
4. Users will see smooth transition

---

## Files Modified

### Core Logic
- ✅ `api/src/jobs/workers.js` - Updated percentages and documentation
- ✅ `api/src/services/monthlyProfitDistribution.js` - Renamed to referral_income
- ✅ `api/src/services/teamIncome.js` - Added deprecation warning
- ✅ `api/src/routes/investment.js` - Verified direct income logic
- ✅ `api/src/routes/user.js` - Updated endpoints for compatibility

### New Files
- ✅ `api/src/scripts/fix-income-data.js` - Database cleanup script
- ✅ `api/INCOME_SYSTEM_DOCUMENTATION.md` - Comprehensive documentation
- ✅ `api/INCOME_SYSTEM_CHANGES.md` - This file

---

## Testing Checklist

Before deploying to production:

- [ ] Run cleanup script in dry-run mode
- [ ] Review affected users and amounts
- [ ] Test direct income on new user registration
- [ ] Test referral income distribution manually
- [ ] Verify old transactions are marked correctly
- [ ] Check frontend displays both income types
- [ ] Validate percentages in all calculations
- [ ] Test monthly job execution
- [ ] Verify wallet balances are correct

---

## Important Notes

⚠️ **User Balances**
- Old `team_income` transactions are marked but NOT removed
- User wallet balances are NOT automatically adjusted
- Admin must decide on adjustment strategy
- Options: keep as bonus, manual adjustment, gradual deduction

⚠️ **Backward Compatibility**
- API endpoints maintain same structure
- Both `team_income` and `referral_income` are queried together
- Frontend requires no changes
- Historical data is preserved

⚠️ **Going Forward**
- All new transactions use correct logic
- `referral_income` source for new monthly distributions
- `direct_income` remains unchanged (was already correct)
- Old `team_income` service should not be used

---

## Next Steps

1. **Review Changes**
   - Review all modified files
   - Understand the new logic
   - Test in development environment

2. **Run Cleanup Script**
   ```bash
   node api/src/scripts/fix-income-data.js --dry-run
   ```

3. **Verify Results**
   - Check marked transactions in database
   - Review affected user counts
   - Validate calculations

4. **Deploy Changes**
   - Deploy updated code to production
   - Run cleanup script (without --dry-run)
   - Monitor for issues

5. **Test Monthly Jobs**
   - Test `runMonthlyTradingBonus()`
   - Test `runMonthlyReferralIncome()`
   - Verify new transactions use correct percentages

6. **Monitor**
   - Watch for any errors in logs
   - Check user complaints/feedback
   - Validate income calculations match expectations

---

## Contact & Support

If you have questions about these changes:
1. Read `INCOME_SYSTEM_DOCUMENTATION.md` first
2. Review this changes document
3. Check the code comments in modified files
4. Test in development environment before asking

---

## Version History

**v2.0 - January 2025**
- Fixed referral income percentages (10%, 5%, 3%, 2%, 1%, 0.5%)
- Corrected referral income logic (user's own profit, not downline)
- Deprecated incorrect teamIncome.js service
- Created cleanup script and documentation

**v1.0 - Previous**
- Initial implementation with incorrect team income logic
- Direct income was correct
- Referral income was based on downline deposits (wrong)

---

Last Updated: January 2025
