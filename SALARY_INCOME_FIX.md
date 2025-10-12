# Salary Income Text Visibility Fix

## Issue
Text in the leg requirement boxes was blending with the white/light background, making it difficult or impossible to read.

## Changes Made

### 1. Rank Cards - Leg Requirement Boxes
**Before:**
- Light text on white/light backgrounds
- No borders
- Poor contrast

**After:**
- Dark text colors:
  - Green met: `text-green-800` (dark green text)
  - Not met: `text-gray-800` (dark gray text)
- Added borders:
  - Green met: `border border-green-300`
  - Not met: `border border-gray-300`
- Made amounts bold: `font-semibold`
- Made "Need" text red and bold: `text-red-600 font-medium`

### 2. Next Rank Progress Section
**Before:**
- Single line showing volume needed
- No clear leg breakdown

**After:**
- Two prominent boxes showing left and right leg requirements
- Larger text size for leg volumes: `text-lg font-bold`
- Clear color coding:
  - Met: Green background with dark green text and green border
  - Not met: Gray background with dark gray text and gray border
- Checkmark (✓) when requirement is met
- Bold red "Need" amounts when not met
- White card container for better contrast against yellow background

## Visual Improvements

### Color Scheme:
- **Green (Requirement Met):**
  - Background: `bg-green-100`
  - Text: `text-green-800` (dark, readable)
  - Border: `border-green-300` or `border-2 border-green-400`
  
- **Gray (Requirement Not Met):**
  - Background: `bg-gray-100` or `bg-gray-50`
  - Text: `text-gray-800` (dark, readable)
  - Border: `border-gray-300` or `border-2 border-gray-300`

- **Need Amount:**
  - Color: `text-red-600` (bright red)
  - Weight: `font-medium` or `font-semibold`

### Typography:
- Labels: `font-medium`
- Amounts: `font-semibold` or `font-bold`
- Need text: `font-medium` with red color

## Result

Now users can clearly see:
1. ✅ Which leg meets the requirement (green with checkmark)
2. ❌ Which leg needs more volume (gray with red "Need" amount)
3. 💰 Current volume in each leg (large, bold, dark text)
4. 📊 How much more is needed (bold red text)

## Example View

For Rank 1 requiring $5,000 per leg:

**Left Leg (Met):**
```
┌─────────────────────┐
│ Left Leg           │
│ $5,000            │ <- Large, bold, dark green
│ ✓ Met             │ <- Green checkmark
└─────────────────────┘
Green background, green border
```

**Right Leg (Not Met):**
```
┌─────────────────────┐
│ Right Leg          │
│ $100              │ <- Large, bold, dark gray
│ Need: $4,900      │ <- Bold red text
└─────────────────────┘
Gray background, gray border
```

## Files Modified
- `frontend/src/pages/app/SalaryIncome.tsx`

## Testing
After restarting frontend:
1. Navigate to Salary Income page
2. Check "Next Rank Progress" section - leg boxes should have clear, dark text
3. Scroll to "Rank System Overview" section - all rank cards should have readable text
4. Green boxes (met requirements) should have dark green text
5. Gray boxes (not met) should have dark gray text with red "Need" amounts
