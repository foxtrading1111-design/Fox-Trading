import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the API root directory (parent of src)
const envPath = join(__dirname, '..', '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Debug: Check if environment variables are loaded
console.log('JWT_SECRET loaded:', !!process.env.JWT_SECRET);
console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);
console.log('PORT loaded:', !!process.env.PORT);
console.log('COINMARKETCAP_API_KEY loaded:', !!process.env.COINMARKETCAP_API_KEY);

import cors from 'cors';
import { json } from 'express';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/user.js';
import { investmentRouter } from './routes/investment.js';
import { networkRouter } from './routes/network.js';
import { walletRouter } from './routes/wallet.js';
import { cryptoRouter } from './routes/crypto.js';
import { scheduleCommissionJobs } from './jobs/scheduler.js';
import { rewardsRouter } from './routes/rewards.js';
import { testingRouter } from './routes/testing.js';
import { adminRouter } from './routes/admin.js';
import { withdrawalRouter } from './routes/withdrawal.js';


const app = express();
app.use(cors());
// Increase body parser limit for screenshots (50MB)
app.use(json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Debug: Log when routes are being registered
console.log('Registering auth routes...');
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/investment', investmentRouter);
app.use('/api/network', networkRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/crypto', cryptoRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api/withdrawal', withdrawalRouter);
app.use('/api/testing', testingRouter);
app.use('/api/admin', adminRouter);

const port = Number(process.env.PORT || 4000);

function start() {
  app.listen(port, () => {
    scheduleCommissionJobs();
    console.log(`Server listening on http://localhost:${port}`);
  });
}

start();