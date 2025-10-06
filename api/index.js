import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { json } from 'express';
import { authRouter } from './src/routes/auth.js';
import { userRouter } from './src/routes/user.js';
import { investmentRouter } from './src/routes/investment.js';
import { networkRouter } from './src/routes/network.js';
import { walletRouter } from './src/routes/wallet.js';
import { withdrawalRouter } from './src/routes/withdrawal.js';
import { cryptoRouter } from './src/routes/crypto.js';
import { scheduleCommissionJobs } from './src/jobs/scheduler.js';
import { rewardsRouter } from './src/routes/rewards.js';
import { testingRouter } from './src/routes/testing.js';
import { adminRouter } from './src/routes/admin.js';


const app = express();

// CORS configuration for production
const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_URL || 
  (isProduction ? process.env.RENDER_EXTERNAL_URL : 'http://localhost:8080');

app.use(cors({
  origin: isProduction ? 
    [frontendUrl, process.env.RENDER_EXTERNAL_URL, 'https://fox-trading-frontend.onrender.com'].filter(Boolean) : 
    ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true
}));

app.use(json());


app.get('/api/health', (_req, res) => res.json({ 
  ok: true, 
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development'
}));

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/investment', investmentRouter);
app.use('/api/network', networkRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/withdrawal', withdrawalRouter);
app.use('/api/crypto', cryptoRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api/testing', testingRouter);
app.use('/api/admin', adminRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: isProduction ? 'Something went wrong' : err.message
  });
});

const port = Number(process.env.PORT || 4000);

function start() {
  app.listen(port, () => {
    scheduleCommissionJobs();
    const publicUrl = process.env.RENDER_EXTERNAL_URL || frontendUrl || `http://localhost:${port}`;
    console.log(`Server listening at: ${publicUrl}`);
  });
}

// Always start the server
start();

// For Vercel, export the app as default
export default app;
