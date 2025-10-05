import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import passport from 'passport';
import { signJwt, requireAuth } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { generateUniqueReferralCode } from '../utils/referralCode.js';
export const authRouter = Router();

// Zod schemas don't need type annotations in JS
const registerSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  sponsor_referral_code: z.string().min(4),
  position: z.enum(['LEFT', 'RIGHT'])
});

authRouter.post('/register', async (req, res) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { full_name, email, password, sponsor_referral_code, position } = parse.data;

  try {
    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    
    const sponsor = await prisma.users.findUnique({ where: { referral_code: sponsor_referral_code } });
    if (!sponsor) return res.status(400).json({ error: 'Invalid sponsor referral code' });
    
    // Allow multiple users on the same side (LEFT or RIGHT)
    // No position limit validation needed
    
    console.log(`Registering new user ${email} under sponsor ${sponsor.email} (ID: ${sponsor.id})`);

    const passwordHash = await bcrypt.hash(password, 10);
    const referralCode = await generateUniqueReferralCode();
    
    const newUser = await prisma.users.create({
      data: {
        full_name, 
        email, 
        password_hash: passwordHash, 
        referral_code: referralCode,
        sponsor_id: sponsor.id,
        position: position,
        wallets: { create: { balance: 0 } },
      },
    });
    
    console.log(`Successfully created user ${newUser.email} with sponsor_id: ${newUser.sponsor_id}`);

    // UPDATED: Include the user's role in the JWT
    const token = signJwt({ id: newUser.id, role: newUser.role });
    return res.status(201).json({ token, referral_code: referralCode });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

authRouter.post('/login', async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { email, password } = parse.data;

  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });
    
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    
    // UPDATED: Include the user's role in the JWT
    const token = signJwt({ id: user.id, role: user.role });
    return res.json({ token });
  } catch {
    return res.status(500).json({ error: 'Login failed' });
  }
});

authRouter.post('/guest', async (_req, res) => {
  try {
    const guest = await prisma.users.findUnique({ where: { email: 'guest@demo.local' } });
    if (!guest) return res.status(404).json({ error: 'Guest user not configured' });
    
    // UPDATED: Include the guest user's role in the JWT
    const token = signJwt({ id: guest.id, role: guest.role });
    return res.json({ token, guest: true });
  } catch {
    return res.status(500).json({ error: 'Guest login failed' });
  }
});

authRouter.get('/sponsor/:code', async (req, res) => {
  const code = req.params.code;
  if (!code) return res.status(400).json({ error: 'Missing code' });
  try {
    const sponsor = await prisma.users.findUnique({
      where: { referral_code: code },
      select: { full_name: true, referral_code: true }
    });
    if (!sponsor) return res.status(404).json({ error: 'Sponsor not found' });
    return res.json(sponsor);
  } catch {
    return res.status(500).json({ error: 'Lookup failed' });
  }
});

// Google OAuth Routes
console.log('Setting up Google OAuth routes...');
authRouter.get('/google', (req, res, next) => {
  console.log('Google OAuth route accessed');
  // Get referral code and position from query parameters
  const referralCode = req.query.ref || req.query.referral_code || '';
  const position = req.query.position || '';
  console.log('Referral code received:', referralCode);
  console.log('Position received:', position);
  
  // Pass both referral code and position as state parameter to OAuth
  const stateData = JSON.stringify({ referralCode, position });
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state: stateData // Pass both referral code and position as state
  })(req, res, next);
});

authRouter.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://localhost:8080/login',
    session: false,
  }),
  (req, res) => {
    const user = req.user;
    // UPDATED: Include the user's role in the JWT
    const token = signJwt({ id: user.id, role: user.role });

    res.redirect(`http://localhost:8080/auth/callback?token=${token}`);
  }
);

import otpStore from '../lib/otpStore.js';
import emailService from '../services/emailService.js';

// Generate OTP for deposit verification
authRouter.post('/send-deposit-otp', requireAuth, async (req, res) => {
  const { amount, blockchain } = req.body;
  const userId = req.user.id;

  if (!amount || !blockchain || amount < 100 || amount % 10 !== 0) {
    return res.status(400).json({ error: 'Invalid deposit amount or blockchain' });
  }

  try {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 10 minutes expiration
    const otpData = {
      otp,
      userId,
      amount,
      blockchain,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
    
    otpStore.set(userId, otpData);
    
    // Get user info for sending OTP
    const user = await prisma.users.findUnique({ 
      where: { id: userId },
      select: { email: true, full_name: true }
    });

    if (!user?.email) {
      return res.status(400).json({ error: 'User email not found' });
    }

    // Send OTP via email
    try {
      await emailService.sendOTP(user.email, otp, 'deposit', user.full_name);
      console.log(`OTP email sent to ${user.email} for deposit verification`);
      
      res.json({ 
        success: true, 
        message: 'OTP sent to your registered email address',
        // In development, include OTP in response for testing
        ...(process.env.NODE_ENV !== 'production' && { otp })
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Fallback to console log if email fails
      console.log(`Fallback - OTP for ${user.email}: ${otp}`);
      console.log(`Deposit details - Amount: $${amount}, Blockchain: ${blockchain}`);
      
      res.json({ 
        success: true, 
        message: 'OTP generated (Email service temporarily unavailable - check console)',
        // In development, include OTP in response for testing
        ...(process.env.NODE_ENV !== 'production' && { otp })
      });
    }
  } catch (error) {
    console.error('OTP generation error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Generate OTP for income withdrawal verification
authRouter.post('/send-withdrawal-otp', requireAuth, async (req, res) => {
  const { type, amount, blockchain, withdrawal_address } = req.body;
  const userId = req.user.id;

  if (!type || !blockchain || !withdrawal_address || type !== 'income') {
    return res.status(400).json({ error: 'Invalid withdrawal parameters' });
  }

  if (!amount || amount < 10 || amount % 10 !== 0) {
    return res.status(400).json({ error: 'Invalid withdrawal amount' });
  }

  try {
    // Verify user has sufficient balance for income withdrawal
    const wallet = await prisma.wallets.findUnique({
      where: { user_id: userId }
    });

    if (!wallet || Number(wallet.balance) < amount) {
      return res.status(400).json({ error: 'Insufficient balance for withdrawal' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 10 minutes expiration
    const otpData = {
      otp,
      userId,
      type: 'income_withdrawal',
      amount,
      blockchain,
      withdrawal_address,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
    
    otpStore.set(`withdrawal_${userId}`, otpData);
    
    // Get user info for sending OTP
    const user = await prisma.users.findUnique({ 
      where: { id: userId },
      select: { email: true, full_name: true }
    });

    if (!user?.email) {
      return res.status(400).json({ error: 'User email not found' });
    }

    // Send OTP via email
    try {
      await emailService.sendOTP(user.email, otp, 'withdrawal', user.full_name);
      console.log(`OTP email sent to ${user.email} for withdrawal verification`);
      
      res.json({ 
        success: true, 
        message: 'OTP sent to your registered email address',
        // In development, include OTP in response for testing
        ...(process.env.NODE_ENV !== 'production' && { otp })
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Fallback to console log if email fails
      console.log(`Fallback - Withdrawal OTP for ${user.email}: ${otp}`);
      console.log(`Withdrawal details - Type: ${type}, Amount: $${amount}, Blockchain: ${blockchain}`);
      
      res.json({ 
        success: true, 
        message: 'OTP generated (Email service temporarily unavailable - check console)',
        // In development, include OTP in response for testing
        ...(process.env.NODE_ENV !== 'production' && { otp })
      });
    }
  } catch (error) {
    console.error('Withdrawal OTP generation error:', error);
    res.status(500).json({ error: 'Failed to send withdrawal OTP' });
  }
});

// Generate OTP for investment withdrawal verification
authRouter.post('/send-investment-withdrawal-otp', requireAuth, async (req, res) => {
  const { type, investment_id, blockchain, withdrawal_address } = req.body;
  const userId = req.user.id;

  if (!type || !investment_id || !blockchain || !withdrawal_address || type !== 'investment') {
    return res.status(400).json({ error: 'Invalid investment withdrawal parameters' });
  }

  try {
    // Verify investment exists and belongs to user
    const investment = await prisma.investments.findUnique({
      where: { 
        id: investment_id,
        user_id: userId 
      }
    });

    if (!investment) {
      return res.status(404).json({ error: 'Investment not found or access denied' });
    }

    if (investment.status !== 'active') {
      return res.status(400).json({ error: `Cannot withdraw from ${investment.status} investment` });
    }

    // Check 6-month lock period
    const currentDate = new Date();
    const investmentDate = new Date(investment.start_date);
    const monthsDifference = (currentDate.getFullYear() - investmentDate.getFullYear()) * 12 + 
                            (currentDate.getMonth() - investmentDate.getMonth());
    
    if (monthsDifference < 6) {
      const unlockDate = new Date(investmentDate);
      unlockDate.setMonth(unlockDate.getMonth() + 6);
      return res.status(400).json({ 
        error: `Investment locked until ${unlockDate.toLocaleDateString()}. Lock period: 6 months from investment date.` 
      });
    }

    // Check if there's already a pending withdrawal
    const existingWithdrawal = await prisma.transactions.findFirst({
      where: {
        user_id: userId,
        description: { contains: investment_id },
        income_source: 'investment_withdrawal',
        status: 'PENDING'
      }
    });

    if (existingWithdrawal) {
      return res.status(400).json({ error: 'There is already a pending withdrawal request for this investment' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 10 minutes expiration
    const otpData = {
      otp,
      userId,
      type: 'investment_withdrawal',
      investment_id,
      amount: investment.amount,
      blockchain,
      withdrawal_address,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
    
    otpStore.set(`withdrawal_${userId}`, otpData);
    
    // Get user info for sending OTP
    const user = await prisma.users.findUnique({ 
      where: { id: userId },
      select: { email: true, full_name: true }
    });

    if (!user?.email) {
      return res.status(400).json({ error: 'User email not found' });
    }

    // Send OTP via email
    try {
      await emailService.sendOTP(user.email, otp, 'investment_withdrawal', user.full_name);
      console.log(`OTP email sent to ${user.email} for investment withdrawal verification`);
      
      res.json({ 
        success: true, 
        message: 'OTP sent to your registered email address',
        // In development, include OTP in response for testing
        ...(process.env.NODE_ENV !== 'production' && { otp })
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Fallback to console log if email fails
      console.log(`Fallback - Investment withdrawal OTP for ${user.email}: ${otp}`);
      console.log(`Investment withdrawal details - Investment ID: ${investment_id}, Amount: $${investment.amount}, Blockchain: ${blockchain}`);
      
      res.json({ 
        success: true, 
        message: 'OTP generated (Email service temporarily unavailable - check console)',
        // In development, include OTP in response for testing
        ...(process.env.NODE_ENV !== 'production' && { otp })
      });
    }
  } catch (error) {
    console.error('Investment withdrawal OTP generation error:', error);
    res.status(500).json({ error: 'Failed to send investment withdrawal OTP' });
  }
});

// Verify OTP and create deposit transaction
const depositSchema = z.object({
  amount: z.number()
    .min(100, 'Minimum deposit amount is $100')
    .refine((val) => val % 10 === 0, 'Amount must be in multiples of $10'),
  blockchain: z.string().min(1, 'Blockchain selection is required'),
  otp_code: z.string().min(6, 'OTP code is required').max(6, 'OTP code must be 6 digits'),
  transaction_hash: z.string().optional(),
  screenshot: z.string().optional() // Base64 encoded image
});

authRouter.post('/verify-deposit-otp', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const parse = depositSchema.safeParse(req.body);

  if (!parse.success) {
    return res.status(400).json({ 
      success: false, 
      error: parse.error.flatten() 
    });
  }

  const { amount, blockchain, otp_code, transaction_hash, screenshot } = parse.data;

  try {
    // Verify OTP first
    const otpData = otpStore.get(userId);
    
    if (!otpData) {
      return res.status(400).json({ 
        success: false, 
        error: 'OTP not found or expired. Please request a new OTP.' 
      });
    }

    if (otpData.otp !== otp_code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid OTP code' 
      });
    }

    if (new Date() > otpData.expiresAt) {
      otpStore.delete(userId);
      return res.status(400).json({ 
        success: false, 
        error: 'OTP has expired. Please request a new OTP.' 
      });
    }

    // Verify OTP data matches request
    if (otpData.amount !== amount || otpData.blockchain !== blockchain) {
      return res.status(400).json({ 
        success: false, 
        error: 'OTP data does not match deposit request' 
      });
    }

    // Get user info for transaction description
    const user = await prisma.users.findUnique({ 
      where: { id: userId },
      select: { email: true, full_name: true }
    });

    // Create deposit transaction with screenshot and details
    let descriptionDetails = `Crypto deposit of $${amount} via ${blockchain}`;
    if (transaction_hash) {
      descriptionDetails += ` (Tx: ${transaction_hash})`;
    }
    descriptionDetails += ` - OTP verified`;
    if (screenshot) {
      descriptionDetails += ` - Screenshot provided`;
    }
    
    // Create transaction and metadata in a database transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create the main transaction record
      const transaction = await prisma.transactions.create({
        data: {
          user_id: userId,
          amount,
          type: 'credit',
          income_source: `${blockchain}_deposit`,
          status: 'PENDING',
          description: descriptionDetails,
        },
      });
      
      // Create deposit metadata with screenshot and details
      const metadata = await prisma.deposit_metadata.create({
        data: {
          transaction_id: transaction.id,
          blockchain,
          screenshot: screenshot || null,
          transaction_hash: transaction_hash || null,
          wallet_address: null, // Could be added later if needed
          ip_address: null, // Could be extracted from request
          user_agent: null, // Could be extracted from request headers
        },
      });
      
      return { transaction, metadata };
    });
    
    const transaction = result.transaction;

    // Clear OTP after successful submission
    otpStore.delete(userId);

    console.log(`✅ Deposit transaction created for ${user?.email}: $${amount} via ${blockchain}`);
    console.log(`Transaction ID: ${transaction.id}, Status: PENDING`);

    res.status(201).json({
      success: true,
      message: 'Deposit request submitted successfully! Your transaction is being processed.',
      transaction: {
        id: transaction.id,
        amount: Number(transaction.amount),
        blockchain,
        status: transaction.status,
        timestamp: transaction.timestamp,
      },
    });
  } catch (error) {
    console.error('Deposit verification failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process deposit request' 
    });
  }
});
