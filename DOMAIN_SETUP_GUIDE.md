# Domain Setup Guide for foxtradingai.com

## ✅ Changes Made

### 1. Backend CORS Configuration Updated
**File:** `api/index.js`
- Added `https://foxtradingai.com` to allowed origins
- Added `https://www.foxtradingai.com` to allowed origins

## 🔧 Steps to Complete Setup

### Step 1: Configure DNS in Namecheap

1. **Login to Namecheap**
   - Go to https://www.namecheap.com
   - Navigate to Domain List → Manage your domain

2. **Go to Advanced DNS Tab**

3. **Add/Update DNS Records:**

   **For Frontend (foxtradingai.com):**
   ```
   Type: A Record
   Host: @
   Value: [Get this IP from Render - see Step 2]
   TTL: Automatic
   ```

   ```
   Type: CNAME Record
   Host: www
   Value: fox-trading-frontend.onrender.com
   TTL: Automatic
   ```

   **For API Subdomain (api.foxtradingai.com):**
   ```
   Type: CNAME Record
   Host: api
   Value: fox-trading-api.onrender.com
   TTL: Automatic
   ```

4. **Remove any conflicting records** (parking page, default A records, etc.)

### Step 2: Configure Custom Domain in Render

#### For Frontend Service:
1. Go to Render Dashboard → `fox-trading-frontend` service
2. Click **Settings** → **Custom Domains**
3. Add these domains:
   - `foxtradingai.com`
   - `www.foxtradingai.com`
4. Render will show you the A Record IP address - use this in Namecheap DNS

#### For Backend API Service:
1. Go to Render Dashboard → `fox-trading-api` service
2. Click **Settings** → **Custom Domains**
3. Add domain:
   - `api.foxtradingai.com`

### Step 3: Update Environment Variables in Render

#### Frontend Service Environment Variables:
1. Go to `fox-trading-frontend` → **Environment**
2. Update `VITE_API_URL`:
   ```
   VITE_API_URL=https://api.foxtradingai.com
   ```

#### Backend Service Environment Variables:
1. Go to `fox-trading-api` → **Environment**
2. Update `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://foxtradingai.com
   ```

### Step 4: Deploy Changes

1. **Commit and push the CORS changes:**
   ```bash
   git add api/index.js
   git commit -m "Add foxtradingai.com to CORS allowed origins"
   git push origin main
   ```

2. **Manually deploy both services in Render:**
   - Go to each service dashboard
   - Click **Manual Deploy** → **Deploy latest commit**

### Step 5: Wait for DNS Propagation

- DNS changes take 5 minutes to 48 hours (usually 15-30 minutes)
- Check propagation status: https://www.whatsmydns.net
- Render will automatically provision SSL certificates once DNS is verified

### Step 6: Update Frontend API URL (if using api subdomain)

If you want to use `api.foxtradingai.com` instead of the Render URL:

**File:** `frontend/src/lib/api.ts` (line 24)
```typescript
baseUrl = import.meta.env.VITE_API_URL || 'https://api.foxtradingai.com';
```

Then redeploy the frontend.

## 🔍 Verification

After DNS propagation and deployment:

1. **Test Frontend:**
   - Visit https://foxtradingai.com
   - Visit https://www.foxtradingai.com

2. **Test API:**
   - Visit https://api.foxtradingai.com/api/health
   - Should return: `{"ok": true, "timestamp": "...", "environment": "production"}`

3. **Test CORS:**
   - Login to your app from the new domain
   - Check browser console for CORS errors (should be none)

## 📝 Current Configuration

### Allowed Origins (Backend):
- https://fox-trading-frontend.onrender.com
- https://www.thefoxtrading.com
- https://thefoxtrading.com
- https://foxtradingai.com ✅ NEW
- https://www.foxtradingai.com ✅ NEW

### API URL (Frontend):
- Currently: https://fox-trading-api.onrender.com
- After Step 6: https://api.foxtradingai.com

## ⚠️ Important Notes

1. **SSL/HTTPS:** Render automatically provisions SSL certificates via Let's Encrypt
2. **DNS Propagation:** Be patient - it can take up to 48 hours
3. **Old Domain:** Keep the old domain (thefoxtrading.com) in CORS until you're ready to remove it
4. **Environment Variables:** Make sure to update them in Render dashboard, not just in code

## 🚀 Quick Commands

```bash
# Commit CORS changes
git add api/index.js
git commit -m "Add foxtradingai.com to CORS allowed origins"
git push origin main

# Check DNS propagation
# Visit: https://www.whatsmydns.net/?query=foxtradingai.com&type=A

# Test API health
curl https://api.foxtradingai.com/api/health
```

## 📞 Support

If you encounter issues:
1. Check Render logs for both services
2. Check browser console for CORS errors
3. Verify DNS records in Namecheap
4. Ensure environment variables are set correctly in Render
