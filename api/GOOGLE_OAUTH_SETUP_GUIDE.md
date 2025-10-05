# 🔐 **Google OAuth Credentials Setup Guide**

## 🎯 **Creating New OAuth Credentials for Fox Trading Platform**

### **Prerequisites:**
- Google account (Gmail account)
- Access to Google Cloud Console
- Your custom domain (if available) or temporary Render URLs

---

## 📋 **STEP-BY-STEP SETUP**

### **Step 1: Create Google Cloud Project**

#### 1. **Access Google Cloud Console**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with your Google account
3. Accept terms if prompted

#### 2. **Create New Project**
1. Click the **project dropdown** at the top (next to "Google Cloud")
2. Click **"New Project"**
3. **Project Details:**
   - **Project Name:** `Fox Trading Platform`
   - **Organization:** Leave as "No organization" (unless you have one)
   - **Location:** Leave as default
4. Click **"Create"**
5. Wait for project creation (30-60 seconds)
6. **Select your new project** from the dropdown

---

### **Step 2: Enable Google+ API**

#### 1. **Enable Required APIs**
1. In the left sidebar, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"**
3. Click on **"Google+ API"**
4. Click **"Enable"**
5. Also search and enable **"Google Identity and Access Management (IAM) API"**

#### 2. **Alternative: Enable People API (Recommended)**
1. Search for **"People API"**
2. Click **"People API"**
3. Click **"Enable"**
4. This is the modern replacement for Google+ API

---

### **Step 3: Configure OAuth Consent Screen**

#### 1. **Navigate to OAuth Consent**
1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. **User Type:** Select **"External"** (allows any Google user to sign in)
3. Click **"Create"**

#### 2. **App Information**
Fill in the OAuth consent screen:

```
App name: Fox Trading Platform
User support email: your-email@gmail.com
App logo: (Optional - upload your fox logo if you have one)
```

#### 3. **App Domain**
```
Application home page: https://your-domain.com
Application privacy policy URL: https://your-domain.com/privacy
Application terms of service URL: https://your-domain.com/terms
```

**📝 Note:** If you don't have these pages yet, you can use placeholder URLs or skip them for now.

#### 4. **Authorized Domains**
Add your domains (you can add both production and staging):
```
your-domain.com
onrender.com
localhost (for development)
```

#### 5. **Developer Contact Information**
```
Email addresses: your-email@gmail.com
```

Click **"Save and Continue"**

---

### **Step 4: Configure Scopes**

#### 1. **Add Required Scopes**
1. Click **"Add or Remove Scopes"**
2. **Select these scopes:**
   - `../auth/userinfo.email` (See your primary Google Account email address)
   - `../auth/userinfo.profile` (See your personal info, including any personal info you've made publicly available)
   - `openid` (Associate you with your personal info on Google)

3. Click **"Update"**
4. Click **"Save and Continue"**

---

### **Step 5: Add Test Users (Development Phase)**

#### 1. **Add Test Users**
While your app is in "Testing" mode, only added users can sign in:

1. Click **"Add Users"**
2. Add email addresses of people who will test your app:
   ```
   your-email@gmail.com
   test-user@gmail.com
   another-user@gmail.com
   ```
3. Click **"Save and Continue"**
4. **Review** your settings and click **"Back to Dashboard"**

---

### **Step 6: Create OAuth Credentials**

#### 1. **Create Credentials**
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. **Application Type:** Select **"Web application"**

#### 2. **Configure Web Application**
```
Name: Fox Trading OAuth Client

Authorized JavaScript origins:
- http://localhost:8080 (for development)
- https://your-domain.com (your production domain)
- https://fox-trading-frontend-xxx.onrender.com (if using Render)

Authorized redirect URIs:
- http://localhost:8080/auth/callback (development)
- https://your-domain.com/auth/callback (production frontend)
- http://localhost:4000/api/auth/google/callback (development backend)
- https://api.your-domain.com/api/auth/google/callback (production backend)
- https://fox-trading-api-xxx.onrender.com/api/auth/google/callback (if using Render)
```

#### 3. **Create Credentials**
1. Click **"Create"**
2. **Copy and save** your credentials:
   - **Client ID:** `1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com`
   - **Client Secret:** `GOCSPX-abcdefghijklmnopqrstuvwxyz`

---

### **Step 7: Update Your Application**

#### 1. **Update Environment Variables**
Replace the OAuth credentials in your `.env` file:

```bash
# .env (Backend)
GOOGLE_CLIENT_ID=YOUR_NEW_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_NEW_CLIENT_SECRET
```

#### 2. **Update Production Environment**
When deploying to Render/production, use the same credentials in your environment variables.

---

### **Step 8: Test OAuth Integration**

#### 1. **Development Testing**
1. Start your development servers:
   ```bash
   # Backend
   cd api
   npm run dev
   
   # Frontend
   cd frontend
   npm run dev
   ```

2. **Test OAuth Flow:**
   - Go to `http://localhost:8080/login`
   - Click **"Continue with Google"**
   - You should see Google's consent screen
   - Sign in with a test user account
   - Verify you're redirected back to your app

#### 2. **Production Testing**
After deployment:
1. Go to your live domain
2. Test the same OAuth flow
3. Verify it works with your production URLs

---

## 🔧 **TROUBLESHOOTING COMMON ISSUES**

### **Issue 1: "Error 400: redirect_uri_mismatch"**
**Solution:**
- Check that redirect URIs in Google Console match exactly
- Ensure no trailing slashes
- Verify HTTP vs HTTPS protocol

### **Issue 2: "Error 403: access_denied"**
**Solution:**
- Add the test user to OAuth consent screen
- Check if app is still in "Testing" mode
- Verify scopes are correctly configured

### **Issue 3: "Error 400: invalid_client"**
**Solution:**
- Verify CLIENT_ID and CLIENT_SECRET are correct
- Check environment variables are loaded properly
- Ensure no extra spaces in credentials

### **Issue 4: OAuth works locally but not in production**
**Solution:**
- Update authorized domains in Google Console
- Add production URLs to redirect URIs
- Check environment variables in production

---

## 🚀 **PUBLISHING YOUR APP (When Ready)**

### **Making Your App Public**
Currently your app is in "Testing" mode (only test users can sign in).

#### **To Make It Public:**
1. Go to **"OAuth consent screen"**
2. Click **"Publish App"**
3. **Google Review:** 
   - Apps requesting sensitive scopes need verification
   - Your app uses basic scopes, so it should be auto-approved
   - Review takes 1-7 days if manual review is needed

#### **Alternative: Stay in Testing Mode**
- You can add up to **100 test users**
- No review required
- Good for private/internal applications

---

## 📝 **SECURITY BEST PRACTICES**

### **Credential Security:**
- ✅ Never commit CLIENT_SECRET to version control
- ✅ Use environment variables for all credentials
- ✅ Rotate credentials periodically
- ✅ Monitor OAuth usage in Google Console

### **Domain Security:**
- ✅ Only add domains you control
- ✅ Use HTTPS in production
- ✅ Keep authorized URIs minimal
- ✅ Remove development URIs from production config

---

## 📋 **FINAL CHECKLIST**

- [ ] **Google Cloud Project** created
- [ ] **APIs enabled** (People API or Google+ API)
- [ ] **OAuth consent screen** configured
- [ ] **Scopes added** (email, profile, openid)
- [ ] **Test users added** (if needed)
- [ ] **OAuth credentials** created
- [ ] **Redirect URIs** configured for all environments
- [ ] **Environment variables** updated
- [ ] **Development testing** completed
- [ ] **Production testing** completed (after deployment)

---

## 🎯 **YOUR NEW CREDENTIALS**

After completing this setup, you'll have:
```bash
GOOGLE_CLIENT_ID=YOUR_NEW_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_NEW_CLIENT_SECRET_HERE
```

**Use these in both:**
- Development (`.env` file)
- Production (Render environment variables)

---

## 📞 **SUPPORT RESOURCES**

### **Google Cloud Support:**
- **Documentation:** [cloud.google.com/docs/authentication](https://cloud.google.com/docs/authentication)
- **OAuth 2.0 Guide:** [developers.google.com/identity/protocols/oauth2](https://developers.google.com/identity/protocols/oauth2)
- **Console:** [console.cloud.google.com](https://console.cloud.google.com)

### **Common OAuth Errors:**
- **Google OAuth Errors:** [developers.google.com/identity/protocols/oauth2/web-server#handlingtheresponse](https://developers.google.com/identity/protocols/oauth2/web-server#handlingtheresponse)

---

🎉 **You're all set with fresh Google OAuth credentials!**

Your Fox Trading platform now has its own Google Cloud project with properly configured OAuth for secure user authentication. 🦊✨