# 🔧 Complete OAuth Redirect Fix - Step by Step

## Current Issue
When users log in with Google OAuth, they are redirected to `localhost:8080` instead of your production site.

## ✅ Your Production URLs
- **Frontend**: `https://fox-trading.onrender.com`
- **Backend**: `https://fox-trading-api-2jv8.onrender.com`

---

## 🚀 STEP-BY-STEP FIX

### **Step 1: Update Google Cloud Console**

1. **Go to Google Cloud Console**: https://console.cloud.google.com
2. **Navigate to Credentials**:
   - Click **"APIs & Services"** → **"Credentials"**
3. **Find your OAuth client** (probably named something like "Fox Trading OAuth Client")
4. **Click the edit icon** (pencil) next to your OAuth 2.0 Client ID
5. **Add these Authorized redirect URIs**:
   ```
   https://fox-trading-api-2jv8.onrender.com/api/auth/google/callback
   https://fox-trading.onrender.com/auth/callback
   ```
6. **Keep existing URIs** (don't delete localhost ones for development)
7. **Click "Save"**

### **Step 2: Set Environment Variables in Render**

1. **Go to your Render Dashboard**: https://dashboard.render.com
2. **Find your backend service** (`fox-trading-api`)
3. **Click on the service** → **"Environment"** tab
4. **Add these environment variables**:
   ```
   FRONTEND_URL=https://fox-trading.onrender.com
   BACKEND_URL=https://fox-trading-api-2jv8.onrender.com
   NODE_ENV=production
   ```
5. **Click "Save Changes"**

### **Step 3: Deploy Updated Code**

The code fixes are already pushed to GitHub. To deploy:

1. **Go to your backend service** in Render dashboard
2. **Click "Manual Deploy"** → **"Deploy latest commit"**
3. **Wait for deployment** to complete (usually 2-5 minutes)

### **Step 4: Test the Fix**

1. **Go to**: https://fox-trading.onrender.com/login
2. **Click "Continue with Google"**
3. **Complete Google OAuth flow**
4. **You should be redirected back to**: https://fox-trading.onrender.com/auth/callback?token=...
5. **NOT to localhost anymore** ✅

---

## 🔍 TROUBLESHOOTING

### **If still redirecting to localhost:**
1. **Check environment variables** are set in Render
2. **Verify Google Console** redirect URIs are saved
3. **Clear browser cache** (OAuth responses can be cached)
4. **Try incognito/private browsing** mode

### **If getting "redirect_uri_mismatch" error:**
1. **Double-check** the redirect URIs in Google Console match exactly:
   - `https://fox-trading-api-2jv8.onrender.com/api/auth/google/callback`
2. **No trailing slashes**, **exact URL match required**

### **If getting "invalid_client" error:**
1. **Check** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in Render
2. **Verify** no extra spaces in the environment variables

---

## 📝 WHAT WAS CHANGED IN CODE

### **Before (Broken)**:
```javascript
res.redirect(`http://localhost:8080/auth/callback?token=${token}`);
```

### **After (Fixed)**:
```javascript
res.redirect(`${getFrontendUrl()}/auth/callback?token=${token}`);
```

The `getFrontendUrl()` function now returns:
- **Development**: `http://localhost:8080`
- **Production**: `https://fox-trading.onrender.com`

---

## 🎯 EXPECTED RESULT

**✅ Working OAuth Flow:**
1. User clicks "Continue with Google" on https://fox-trading.onrender.com/login
2. Redirected to Google for authentication
3. Google redirects to: `https://fox-trading-api-2jv8.onrender.com/api/auth/google/callback`
4. Backend processes OAuth, generates JWT token
5. Backend redirects to: `https://fox-trading.onrender.com/auth/callback?token=...`
6. Frontend receives token and logs user in

**❌ Old Broken Flow:**
- Step 5 was redirecting to `http://localhost:8080/auth/callback?token=...`

---

## ⏱️ TIME TO COMPLETE
- **Google Console Update**: 2 minutes
- **Render Environment Variables**: 1 minute  
- **Code Deployment**: 3-5 minutes
- **Testing**: 1 minute

**Total**: ~10 minutes

---

🎉 **After completing these steps, your OAuth login should work perfectly on production!**