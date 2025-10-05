# 🔧 OAuth Redirect URL Fix

## Problem
OAuth redirects are going to `localhost:8080` instead of your production frontend URL.

## Solution

### 1. **Update Google OAuth Console**

Go to [Google Cloud Console](https://console.cloud.google.com) and update your OAuth credentials:

**Authorized redirect URIs** (add these):
```
https://fox-trading-api-2jv8.onrender.com/api/auth/google/callback
https://fox-trading.onrender.com/auth/callback
```

### 2. **Set Environment Variables**

In your Render.com backend service, add these environment variables:

```bash
FRONTEND_URL=https://fox-trading.onrender.com
BACKEND_URL=https://fox-trading-api-2jv8.onrender.com
NODE_ENV=production
```

### 3. **Current URLs (Confirmed)**
- **Backend**: `https://fox-trading-api-2jv8.onrender.com`
- **Frontend**: `https://fox-trading.onrender.com`

### 4. **Test the Fix**
1. Deploy the updated code
2. Try Google OAuth login from production
3. It should redirect to your frontend instead of localhost

## Quick Fix Applied
The code now uses dynamic URLs based on environment:
- **Development**: `http://localhost:8080`  
- **Production**: Uses `FRONTEND_URL` env var or fallback URL

## If Still Not Working
1. Check Google Console redirect URLs match exactly
2. Verify environment variables are set in Render
3. Check browser dev tools for any redirect errors