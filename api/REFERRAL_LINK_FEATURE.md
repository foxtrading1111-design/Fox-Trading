# Referral Link Feature

## New Feature Implemented
Added a referral link system that automatically applies the referral code when a new user clicks the link and visits the signup page.

## What Was Added

### 1. Dashboard - Referral Link Display
**File:** `frontend/src/pages/app/Dashboard.tsx`

**Changes:**
- Added referral link generation: `${origin}/register?ref={referralCode}`
- Added copy button for referral link (with visual feedback)
- Shows both referral code and referral link
- Visual feedback when copied (checkmark icon)

**New UI:**
```
Referral Code
[ABC123] [📋]  ← Copy code button
https://...  /register?ref=ABC123 [📋]  ← Copy link button
```

### 2. Register Page - Auto-fill from URL
**File:** `frontend/src/pages/Register.tsx`

**Changes:**
- Added `useSearchParams` to read URL parameters
- Auto-fills referral code from `?ref=CODE` parameter
- Auto-verifies the referral code
- Shows success toast when code is applied
- Smooth user experience - code is pre-filled and ready

**How it works:**
1. User clicks referral link: `/register?ref=ABC123`
2. Page loads and reads `ref` parameter
3. Automatically fills in the sponsor code field
4. Verifies the sponsor code
5. Shows toast: "Referral code ABC123 applied!"
6. User just needs to continue with position and details

## User Flow

### Scenario 1: Sharing Referral Link
```
User A (Existing):
1. Opens dashboard
2. Sees referral code: ABC123
3. Sees referral link: https://site.com/register?ref=ABC123
4. Clicks copy button on link
5. Shares link with User B

User B (New):
1. Clicks link from User A
2. Lands on register page
3. Sees "Referral code ABC123 applied!" toast
4. Sponsor code is pre-filled with "ABC123"
5. Sponsor name shows: "User A"
6. Just selects position (Left/Right) and enters details
7. Completes registration
```

### Scenario 2: Manual Entry (Still Works)
```
User B (New):
1. Goes to /register directly
2. Manually enters referral code
3. Continues as normal
```

## Features

### ✅ Dashboard
- **Referral Code Display:** Shows user's unique code
- **Copy Code Button:** One-click copy of referral code
- **Referral Link Display:** Full URL with ref parameter
- **Copy Link Button:** One-click copy of full link
- **Visual Feedback:** Checkmark shows when copied
- **Responsive Design:** Works on mobile and desktop

### ✅ Register Page
- **URL Parameter Support:** Reads `?ref=CODE` from URL
- **Auto-fill:** Automatically fills sponsor code field
- **Auto-verify:** Verifies the code on page load
- **Toast Notification:** Shows success message
- **Seamless UX:** User doesn't need to do anything extra
- **Backward Compatible:** Manual entry still works

## Example URLs

### Referral Links Generated:
```
Production:
https://yoursite.com/register?ref=ABC123

Local Development:
http://localhost:5173/register?ref=ABC123
```

### Parameter Format:
- Parameter name: `ref`
- Parameter value: User's referral code
- Example: `?ref=JOHN123`

## Technical Implementation

### Frontend Changes

**Dashboard.tsx:**
```typescript
// Generate referral link
const referralLink = `${window.location.origin}/register?ref=${userStats.referralCode}`;

// Copy with feedback
const copyToClipboard = (text: string, itemName: string) => {
  navigator.clipboard.writeText(text);
  setCopiedItem(itemName);
  setTimeout(() => setCopiedItem(null), 2000);
};
```

**Register.tsx:**
```typescript
// Read URL parameter
const [searchParams] = useSearchParams();

// Auto-fill on mount
useEffect(() => {
  const refCode = searchParams.get('ref');
  if (refCode) {
    setSponsorCode(refCode);
    toast.success(`Referral code ${refCode} applied!`);
    verifyReferralCode(refCode);
  }
}, [searchParams]);
```

## Benefits

1. **Easier Sharing:** Users can share a single link instead of explaining the code
2. **Better UX:** New users don't need to copy/paste the code manually
3. **Higher Conversion:** Fewer steps = more completed registrations
4. **Tracking:** Can see which users came from referral links
5. **Professional:** Modern referral system like other platforms
6. **Mobile Friendly:** Works great on mobile devices

## Testing

### Test the Feature:

1. **Get Your Referral Link:**
   ```
   - Login to dashboard
   - Find referral section
   - Copy the referral link
   ```

2. **Test Auto-fill:**
   ```
   - Paste link in browser (or open in incognito)
   - Should land on /register?ref=YOUR_CODE
   - Should see success toast
   - Sponsor code should be pre-filled
   - Sponsor name should show
   ```

3. **Test Copy Buttons:**
   ```
   - Click copy on referral code → Should copy code
   - Click copy on referral link → Should copy full URL
   - Should see checkmark for 2 seconds
   ```

## Future Enhancements (Optional)

- Add QR code for referral link
- Track clicks on referral links
- Show referral link statistics
- Social media share buttons
- Email invite feature
- WhatsApp share button

---

**Status:** ✅ IMPLEMENTED
**Date:** 2025-10-11
**Files Changed:**
- `frontend/src/pages/app/Dashboard.tsx`
- `frontend/src/pages/Register.tsx`
**Impact:** Users can now share referral links that auto-fill the code on signup
