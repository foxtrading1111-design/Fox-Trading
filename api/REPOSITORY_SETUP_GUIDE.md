# 📋 **Fox Trading - Company Repository Setup Guide**

## 🎯 **Setting Up Professional Company Repository**

### **Prerequisites:**
- Company GitHub account
- Fox Trading codebase ready for deployment
- Access to company email for verification

---

## 📂 **STEP 1: Prepare Repository Structure**

### **Clean Up Project Structure**
Let's ensure your project is organized professionally:

```
fox-trading/
├── api/                    ← Backend (Node.js + Prisma)
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   ├── index.js
│   └── .env.example
├── frontend/               ← Frontend (React + Vite)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── docs/                   ← Documentation
├── .gitignore
├── README.md
├── LICENSE
└── DEPLOYMENT_GUIDE.md
```

---

## 🔧 **STEP 2: Create .env.example Files**

### **Backend .env.example**
Create `api/.env.example` with template:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/fox_trading"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"

# Server Configuration
PORT=4000
FRONTEND_URL="http://localhost:8080"

# Google OAuth (Get from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# CoinMarketCap API
COINMARKETCAP_API_KEY="your-coinmarketcap-api-key"

# Email Configuration
EMAIL_SERVICE="aws-ses"
EMAIL_FROM="Your Company <noreply@yourcompany.com>"
AWS_SES_SMTP_USERNAME="your-aws-ses-username"
AWS_SES_SMTP_PASSWORD="your-aws-ses-password"
AWS_SES_REGION="us-east-1"
```

### **Frontend .env.example**
Create `frontend/.env.example` with:

```bash
# API Configuration
VITE_API_URL="http://localhost:4000"
```

---

## 📝 **STEP 3: Create Professional README.md**

### **Main README.md**
Create `README.md` in project root:

```markdown
# 🦊 Fox Trading Platform

A comprehensive MLM trading platform with crypto deposits, investment management, and referral systems.

## 🚀 Features

- **Multi-Level Marketing (MLM)** - 3-level referral system
- **Investment Packages** - Various investment plans with profit calculations
- **Crypto Deposits** - BEP-20 and TRC-20 support with QR codes
- **Admin Dashboard** - Complete transaction management
- **OTP Security** - Email-based verification for sensitive operations
- **Real-time Analytics** - Dashboard with live data updates

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express
- **Prisma** ORM with PostgreSQL
- **JWT** authentication + Google OAuth
- **AWS SES** for email services

### Frontend  
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** + shadcn/ui components
- **React Query** for state management

## 📋 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Google Cloud OAuth credentials
- AWS SES email service

### Installation

1. **Clone repository**
   ```bash
   git clone https://github.com/your-company/fox-trading.git
   cd fox-trading
   ```

2. **Backend setup**
   ```bash
   cd api
   npm install
   cp .env.example .env
   # Edit .env with your credentials
   npx prisma migrate dev
   npm run dev
   ```

3. **Frontend setup**
   ```bash
   cd frontend
   npm install  
   cp .env.example .env
   # Edit .env with API URL
   npm run dev
   ```

4. **Access application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:4000

## 🚀 Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for production deployment instructions.

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [Database Schema](./docs/DATABASE.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential.

## 📞 Support

For support, email support@yourcompany.com or create an issue in this repository.
```

---

## 🔒 **STEP 4: Create .gitignore**

### **Comprehensive .gitignore**
Create `.gitignore` in project root:

```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Production builds
/frontend/dist/
/api/dist/
build/
*.tgz

# Database
*.db
*.sqlite
*.sqlite3

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output/

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env.test

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Prisma
prisma/migrations/
!prisma/migrations/.gitkeep

# Local certificates
*.pem

# Vercel
.vercel

# Render
.render/
```

---

## 🚀 **STEP 5: Initialize Git Repository**

### **Commands to Run**

```bash
# Navigate to project root
cd "C:\Users\Kunal\OneDrive\Desktop\trade\trade"

# Initialize git repository
git init

# Create .env.example files (if not done)
# Backend
cp api/.env api/.env.example
# Edit .env.example to remove sensitive values

# Add all files
git add .

# Initial commit
git commit -m "Initial commit: Fox Trading Platform

- Complete MLM trading platform
- Backend: Node.js + Prisma + PostgreSQL  
- Frontend: React + TypeScript + Vite
- Features: Crypto deposits, investments, referrals
- Admin dashboard for transaction management
- OTP security and email notifications
- Custom QR codes for BEP-20/TRC-20 deposits
- Production-ready with comprehensive error handling"

# Set up remote origin (replace with your company repo)
git remote add origin https://github.com/YOUR-COMPANY/fox-trading.git

# Push to main branch
git branch -M main
git push -u origin main
```

---

## 🏢 **STEP 6: GitHub Repository Setup**

### **Create Company Repository**

1. **Go to GitHub** (signed in with company account)
2. **Create New Repository:**
   - **Name:** `fox-trading`
   - **Description:** `Professional MLM Trading Platform with Crypto Integration`
   - **Visibility:** Private (recommended for business)
   - **Initialize:** Leave unchecked (we have existing code)

3. **Repository Settings:**
   - **Topics:** `mlm`, `trading`, `crypto`, `react`, `nodejs`, `typescript`
   - **License:** None (proprietary)
   - **Branch Protection:** Set up after initial push

### **Professional Repository Description**
```
🦊 Fox Trading Platform - Comprehensive MLM trading system with crypto deposits, 
investment management, 3-level referrals, admin dashboard, and real-time analytics.

Built with Node.js, React, TypeScript, and PostgreSQL.
```

---

## 📊 **STEP 7: Set Up Branch Protection (Optional)**

### **After Initial Push:**
1. **Go to:** Repository → Settings → Branches
2. **Add rule for** `main` branch:
   - ✅ Require pull request reviews
   - ✅ Require status checks
   - ✅ Require up-to-date branches
   - ✅ Include administrators

---

## 🔧 **STEP 8: Verify Repository Structure**

### **Final Repository Check:**
```bash
# Check git status
git status

# View commit history
git log --oneline

# Check remote
git remote -v

# Verify all files are tracked
git ls-files
```

---

## 📋 **PROFESSIONAL REPOSITORY CHECKLIST**

- [ ] **Clean project structure** organized
- [ ] **Professional README.md** created
- [ ] **Comprehensive .gitignore** added
- [ ] **.env.example** files created (no secrets)
- [ ] **Documentation** folder structured
- [ ] **Initial commit** with descriptive message
- [ ] **Company GitHub repository** created
- [ ] **Remote origin** configured
- [ ] **Code pushed** to main branch
- [ ] **Repository settings** configured
- [ ] **Branch protection** enabled (if needed)

---

## 🎯 **NEXT STEPS AFTER REPOSITORY SETUP**

1. ✅ **Repository is ready** for deployment
2. ✅ **Team members** can be invited
3. ✅ **Render.com deployment** can connect to this repo
4. ✅ **Auto-deployments** will work from this repo
5. ✅ **Professional setup** for investors/stakeholders

---

## 🤝 **TEAM COLLABORATION**

### **Invite Team Members:**
1. Repository → Settings → Manage access
2. **Invite collaborators** with appropriate permissions:
   - **Admin:** Full access
   - **Write:** Push to branches, create PRs
   - **Read:** View code only

### **Development Workflow:**
```bash
# Feature development
git checkout -b feature/new-feature
# Make changes
git commit -m "Add new feature"
git push origin feature/new-feature
# Create Pull Request on GitHub
```

---

🎉 **Your company repository is now ready for professional development and deployment!**