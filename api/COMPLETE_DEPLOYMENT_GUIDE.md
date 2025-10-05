# 🚀 **Fox Trading - Complete Production Deployment Guide**

## 🎯 **Your Requirements:**
✅ **Automatic deployments** when you push code to GitHub  
✅ **Custom domain** setup and configuration  
✅ **Production-ready** deployment with your existing codebase  

---

## 🔥 **RECOMMENDED: Render.com Auto-Deployment**

### **Why Render.com?**
- ✅ **Auto-deploys** from GitHub on every push
- ✅ **Custom domain** support with free SSL
- ✅ **PostgreSQL** database included
- ✅ **Node.js + React** optimized
- ✅ **$14/month** total cost
- ✅ **Zero downtime** deployments

---

## 📋 **STEP-BY-STEP DEPLOYMENT**

### **Phase 1: Repository Setup**

#### 1. **Push Your Code to GitHub** (if not already done)
```bash
# From your project root directory
cd "C:\Users\Kunal\OneDrive\Desktop\trade\trade"

# Initialize git if needed
git init
git add .
git commit -m "Initial commit - Fox Trading Platform"

# Create GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/fox-trading.git
git branch -M main
git push -u origin main
```

#### 2. **Repository Structure Check**
Your repo should look like this:
```
fox-trading/
├── api/              ← Backend (Node.js + Prisma)
├── frontend/         ← Frontend (React + Vite)
├── README.md
└── .gitignore
```

---

### **Phase 2: Database Setup**

#### 1. **Create Render Database**
1. Go to [render.com](https://render.com) → Sign up/Login
2. Click **"New +"** → **"PostgreSQL"**
3. **Database Name:** `fox-trading-db`
4. **Database User:** `fox_trading_user`
5. **Region:** Choose closest to your users
6. **Plan:** **Starter ($7/month)**
7. Click **"Create Database"**

#### 2. **Save Database Connection**
Copy the **Internal Database URL** (starts with `postgresql://`)
```
postgresql://fox_trading_user:password@dpg-xxx.oregon-postgres.render.com/fox_trading_db
```

---

### **Phase 3: Backend Deployment**

#### 1. **Create Backend Service**
1. **New +** → **"Web Service"**
2. **Connect Repository:** Select your GitHub repo
3. **Configuration:**
   - **Name:** `fox-trading-api`
   - **Branch:** `main`
   - **Root Directory:** `api`
   - **Environment:** `Node`
   - **Region:** Same as database
   - **Plan:** **Starter ($7/month)**

#### 2. **Build & Start Commands**
```bash
# Build Command:
npm install && npx prisma generate && npx prisma migrate deploy

# Start Command:  
npm start
```

#### 3. **Environment Variables**
Add these in Render Dashboard → Your Service → Environment:

```bash
# Database
DATABASE_URL=postgresql://[YOUR_RENDER_DATABASE_URL]

# Authentication  
JWT_SECRET=FoxTrading2024SuperSecretKey!@#$%^&*()_+1234567890
NODE_ENV=production

# Frontend URL (update after frontend deployment)
FRONTEND_URL=https://your-domain.com

# Google OAuth (update redirect URLs in Google Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret

# External APIs
COINMARKETCAP_API_KEY=your-coinmarketcap-api-key

# Email Service
EMAIL_SERVICE=aws-ses
EMAIL_FROM="FoxTrade <your-email@company.com>"
AWS_SES_SMTP_USERNAME=your-aws-ses-username
AWS_SES_SMTP_PASSWORD=your-aws-ses-password
AWS_SES_REGION=us-east-1

# Render specific
PORT=10000
```

#### 4. **Deploy Backend**
Click **"Create Web Service"** - Render will:
- Clone your repo
- Install dependencies  
- Run database migrations
- Start your server
- Provide a URL like: `https://fox-trading-api-xxx.onrender.com`

---

### **Phase 4: Frontend Deployment**

#### 1. **Update Frontend API Configuration**
First, update your frontend to use the backend URL:

```typescript
// frontend/src/hooks/use-api.tsx
const API_BASE_URL = isDevelopment 
  ? '/api' // Local development
  : 'https://fox-trading-api-xxx.onrender.com/api'; // Your backend URL
```

#### 2. **Create Frontend Service**
1. **New +** → **"Static Site"**
2. **Connect Repository:** Same GitHub repo
3. **Configuration:**
   - **Name:** `fox-trading-frontend`
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

#### 3. **Environment Variables (Frontend)**
```bash
# Production API URL
VITE_API_URL=https://fox-trading-api-xxx.onrender.com
```

#### 4. **Deploy Frontend**
Click **"Create Static Site"** - You'll get a URL like:
`https://fox-trading-frontend-xxx.onrender.com`

---

### **Phase 5: Custom Domain Setup**

#### 1. **Add Custom Domain to Services**

**For Backend (API):**
1. Go to your backend service → **Settings** → **Custom Domains**
2. Add: `api.your-domain.com`
3. Note the CNAME record shown

**For Frontend:**
1. Go to your frontend service → **Settings** → **Custom Domains**  
2. Add: `your-domain.com` and `www.your-domain.com`
3. Note the CNAME records shown

#### 2. **Configure DNS (Your Domain Provider)**
In your domain's DNS settings, add these records:

```dns
# Frontend
Type: CNAME
Name: @
Value: fox-trading-frontend-xxx.onrender.com

Type: CNAME  
Name: www
Value: fox-trading-frontend-xxx.onrender.com

# Backend API
Type: CNAME
Name: api
Value: fox-trading-api-xxx.onrender.com
```

#### 3. **Update Environment Variables**
Update these after domain setup:

**Backend:**
```bash
FRONTEND_URL=https://your-domain.com
```

**Frontend:**
```bash
VITE_API_URL=https://api.your-domain.com
```

#### 4. **Update Google OAuth**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials → Your OAuth Client
3. **Authorized redirect URIs:** Add:
   - `https://your-domain.com/auth/callback`
   - `https://api.your-domain.com/api/auth/google/callback`

---

### **Phase 6: Auto-Deployment Setup**

#### 1. **GitHub Integration (Already Active!)**
Render automatically:
- ✅ **Watches your GitHub repo**
- ✅ **Deploys on every push to main**
- ✅ **Shows build status**
- ✅ **Rolls back on failures**

#### 2. **Development Workflow**
```bash
# Make changes to your code
# Test locally
npm run dev

# Commit and push
git add .
git commit -m "Added new feature"
git push origin main

# 🎉 Render auto-deploys in ~2-5 minutes!
```

#### 3. **Deployment Notifications**
Set up notifications:
1. Render Dashboard → **Account Settings** → **Notifications**
2. Add your email for deployment status
3. Optional: Slack/Discord webhooks

---

## 🔒 **SECURITY CHECKLIST**

### **Before Going Live:**

#### 1. **Update Production Secrets**
```bash
# Generate new JWT secret (64+ characters)
JWT_SECRET=YourSuperSecretProductionKeyThatIsVeryLongAndSecure123!@#$

# Verify Google OAuth for production domain
# Check AWS SES configuration
# Test email sending
```

#### 2. **Database Security**
- ✅ Database uses SSL by default on Render
- ✅ Connection string includes SSL parameters
- ✅ Access restricted to your services only

#### 3. **CORS Configuration**
Your backend already has proper CORS setup for production domains.

---

## 📊 **MONITORING & MAINTENANCE**

### **Built-in Monitoring:**
- **Render Dashboard:** Shows service health, logs, metrics
- **Deploy History:** See all deployments and rollback if needed
- **Real-time Logs:** Debug issues as they happen

### **Post-Deployment Testing:**
1. ✅ User registration with referral code
2. ✅ Login and Google OAuth
3. ✅ Crypto deposit with QR codes
4. ✅ OTP email delivery
5. ✅ Admin panel access
6. ✅ Investment creation
7. ✅ Withdrawal requests

---

## 💰 **MONTHLY COSTS**

### **Render.com Hosting:**
```
PostgreSQL Database (Starter): $7/month
Backend Web Service (Starter):  $7/month
Frontend Static Site:           FREE
Custom Domain SSL:              FREE
─────────────────────────────────────
Total:                         $14/month
```

### **Additional Services:**
```
Domain Registration:           $10-15/year
AWS SES Email:                $1-2/month (based on usage)
```

**Total Monthly Cost: ~$16/month**

---

## 🚨 **TROUBLESHOOTING GUIDE**

### **Common Issues & Solutions:**

#### 1. **Build Fails**
```bash
# Check build logs in Render dashboard
# Common fixes:
- Ensure package.json has correct scripts
- Check Node.js version compatibility
- Verify environment variables are set
```

#### 2. **Database Connection Error**
```bash
# Verify DATABASE_URL format
# Check database service status
# Ensure migrations ran successfully
```

#### 3. **CORS Errors**
```bash
# Update FRONTEND_URL in backend environment
# Verify domain spelling matches exactly
# Check browser console for specific errors
```

#### 4. **Custom Domain Not Working**
```bash
# Check DNS propagation (use whatsmydns.net)
# Verify CNAME records point to correct Render URLs
# Wait up to 48 hours for full DNS propagation
```

#### 5. **QR Codes Missing**
```bash
# Ensure frontend/public/qr-codes/ folder is in git
# Check file names: bep20-qr.png, trc20-qr.png
# Verify files are under 5MB each
```

---

## 🎉 **FINAL LAUNCH CHECKLIST**

- [ ] **Repository pushed to GitHub**
- [ ] **Database created and connected**  
- [ ] **Backend service deployed and healthy**
- [ ] **Frontend deployed with correct API URL**
- [ ] **Custom domain configured with SSL**
- [ ] **Environment variables updated for production**
- [ ] **Google OAuth redirect URLs updated**
- [ ] **Email service tested (AWS SES)**
- [ ] **QR codes displaying correctly**
- [ ] **Test complete user registration flow**
- [ ] **Test admin approval process**
- [ ] **Test crypto deposit with OTP**
- [ ] **Test withdrawal requests**
- [ ] **Monitor error logs for 24 hours**

---

## 📞 **SUPPORT & RESOURCES**

### **Render.com Support:**
- **Dashboard:** [render.com/dashboard](https://render.com/dashboard)
- **Documentation:** [render.com/docs](https://render.com/docs)
- **Status Page:** [status.render.com](https://status.render.com)
- **Community:** [community.render.com](https://community.render.com)

### **Emergency Contacts:**
- **Render Support:** support@render.com
- **DNS Issues:** Your domain registrar support
- **AWS SES Issues:** AWS Support Console

---

## 🚀 **POST-LAUNCH**

### **What Happens After Deployment:**
1. **Auto-deployments** work immediately
2. **SSL certificates** activate within minutes
3. **Domain propagation** takes 24-48 hours
4. **Users can register** and start using the platform
5. **Admin panel** ready for transaction management

### **Marketing Your Platform:**
- Share your custom domain
- Test with friends/family first
- Monitor user feedback
- Scale up hosting plans as needed

---

## 🎊 **YOU'RE READY TO LAUNCH!**

Your Fox Trading platform is **production-ready** with:
- ✅ Automatic GitHub deployments
- ✅ Custom domain with SSL
- ✅ Professional email system
- ✅ Complete MLM/referral system
- ✅ Admin transaction management
- ✅ Secure crypto deposits
- ✅ Real-time profit calculations

**Total setup time: ~2-3 hours**
**Monthly cost: ~$16**
**Maintenance: Minimal (auto-updates from GitHub)**

🦊 **Happy Trading!** 🚀