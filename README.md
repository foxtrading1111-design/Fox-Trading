# 🦊 Fox Trading Platform

A comprehensive MLM trading platform with crypto deposits, investment management, and referral systems.

## 🚀 Features

- **Multi-Level Marketing (MLM)** - 3-level referral system with automated income distribution
- **Investment Packages** - Various investment plans with monthly profit calculations
- **Crypto Deposits** - BEP-20 and TRC-20 support with custom QR codes
- **Admin Dashboard** - Complete transaction management and approval system
- **OTP Security** - Email-based verification for deposits and withdrawals
- **Real-time Analytics** - Dashboard with live data updates and profit tracking
- **Withdrawal System** - Secure income and investment withdrawal requests
- **Professional UI** - Modern responsive design with company branding

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express framework
- **Prisma** ORM with PostgreSQL database
- **JWT** authentication + Google OAuth integration
- **AWS SES** for email services and OTP delivery
- **Zod** for input validation
- **bcryptjs** for password security

### Frontend  
- **React 18** with TypeScript
- **Vite** for fast build tooling
- **Tailwind CSS** + shadcn/ui components
- **React Query** for efficient state management
- **React Router** for navigation
- **Sonner** for toast notifications

### Infrastructure
- **PostgreSQL** production database
- **Prisma Migrations** for database versioning
- **Environment-based configuration**
- **Comprehensive error handling**
- **Real-time profit calculations**

## 📋 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Google Cloud OAuth credentials
- AWS SES email service configured

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
   - Admin Panel: http://localhost:8080/admin (requires admin role)

## 🏗️ Project Structure

```
fox-trading/
├── api/                    # Backend server
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Authentication & validation
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Helper functions
│   │   └── jobs/           # Scheduled tasks
│   ├── prisma/             # Database schema & migrations
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities and API client
│   └── package.json
└── docs/                   # Documentation
```

## 🚀 Deployment

See [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md) for production deployment instructions including:

- Render.com hosting setup
- Custom domain configuration  
- Environment variable management
- Auto-deployment from GitHub
- SSL certificate setup

**Monthly hosting cost: ~$16** (including database and domain)

## 💼 Business Features

### MLM System
- **3-Level Referrals:** 10% → 5% → 3% commission structure
- **Binary Tree:** LEFT/RIGHT positioning system
- **Real-time Income:** Automatic commission distribution
- **Network Analytics:** Team performance tracking

### Investment Management  
- **Multiple Packages:** Various investment tiers
- **Monthly Profits:** Automated profit calculations
- **6-Month Lock:** Security period for investments
- **Withdrawal System:** Secure profit extraction

### Admin Controls
- **Transaction Approval:** Manual review of deposits/withdrawals
- **User Management:** Complete user oversight
- **Analytics Dashboard:** Business performance metrics
- **System Monitoring:** Real-time platform health

## 🔐 Security Features

- **JWT Authentication** with secure token management
- **OTP Verification** for sensitive operations
- **Password Hashing** with bcrypt
- **Input Validation** using Zod schemas
- **CORS Protection** for API security
- **Rate Limiting** on sensitive endpoints
- **Environment Variables** for credential management

## 📚 Documentation

- [API Documentation](./docs/API.md) - Complete endpoint reference
- [Database Schema](./docs/DATABASE.md) - Database structure guide
- [Deployment Guide](./COMPLETE_DEPLOYMENT_GUIDE.md) - Production setup
- [OAuth Setup](./api/GOOGLE_OAUTH_SETUP_GUIDE.md) - Google authentication

## 🧪 Testing

### Backend Testing
```bash
cd api
npm test
```

### Frontend Testing  
```bash
cd frontend
npm test
```

### Integration Testing
```bash
# Test complete user flows
npm run test:integration
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation for new features
- Ensure responsive design compatibility
- Test on multiple devices and browsers

## 📈 Performance

- **Backend:** Optimized API responses with proper indexing
- **Frontend:** Lazy loading and code splitting
- **Database:** Efficient queries with Prisma
- **Caching:** Strategic caching for improved performance
- **Real-time Updates:** Efficient data synchronization

## 📄 License

This project is proprietary and confidential. All rights reserved.

## 📞 Support

- **Technical Support:** Create an issue in this repository
- **Business Inquiries:** contact@yourcompany.com
- **Emergency Support:** Available 24/7 for production issues

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core MLM functionality
- ✅ Crypto deposit integration
- ✅ Admin dashboard
- ✅ Production deployment

### Phase 2 (Planned)
- 📱 Mobile application
- 🔄 Additional crypto networks
- 📊 Advanced analytics
- 🌍 Multi-language support

### Phase 3 (Future)
- 🤖 AI-powered insights
- 🏦 Bank integration
- 📈 Trading automation
- 🌐 Global expansion

---

**Built with ❤️ for the future of decentralized trading**