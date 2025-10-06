import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

class EmailService {
  constructor() {
    // Initialize email transporter
    this.transporter = null;
    this.initializeTransporter();
    // Optional: verify transporter on boot for diagnostics (non-fatal)
    this.verifyTransporter();
  }

  /**
   * Initialize email transporter based on configuration
   */
  initializeTransporter() {
    const emailService = process.env.EMAIL_SERVICE || 'gmail';

    if (emailService === 'sendgrid_api') {
      // Twilio SendGrid Mail API (HTTP). No SMTP sockets; most reliable on PaaS.
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('SENDGRID_API_KEY not set; sendgrid_api cannot send emails');
      } else {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      }
      this.transporter = null; // not used in API mode
      return;
    }
    
    if (emailService === 'sendgrid') {
      // Twilio SendGrid via SMTP
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,        // STARTTLS
        requireTLS: true,
        auth: {
          user: 'apikey',     // literal username for SendGrid SMTP
          pass: process.env.SENDGRID_API_KEY,
        },
        connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT || 30000),
        greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT || 15000),
        socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT || 30000),
        tls: { minVersion: 'TLSv1.2', rejectUnauthorized: false },
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
      });
    } else if (emailService === 'gmail') {
      // Gmail SMTP configuration
      // Prefer STARTTLS on port 587 to avoid issues with port 465 on some hosts
      const host = 'smtp.gmail.com';
      const port = Number(process.env.EMAIL_GMAIL_PORT || 587); // 587 (STARTTLS) by default
      const secure = port === 465; // true only if 465

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        requireTLS: !secure, // force STARTTLS on 587
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD, // App Password
        },
        // Be tolerant to slower cold connections
        connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT || 30000),
        greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT || 15000),
        socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT || 30000),
        tls: {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: false, // some hosts need this; safe for outbound client
        },
        pool: true,
        maxConnections: 2,
        maxMessages: 20,
      });
    } else if (emailService === 'aws-ses') {
      // AWS SES SMTP configuration
      const region = process.env.AWS_SES_REGION || 'us-east-1';
      this.transporter = nodemailer.createTransport({
        host: `email-smtp.${region}.amazonaws.com`,
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.AWS_SES_SMTP_USERNAME,
          pass: process.env.AWS_SES_SMTP_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    } else {
      // Generic SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
  }

  /**
   * Send email using configured transporter
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} htmlContent - HTML email content
   * @returns {Promise<Object>} - Email sending result
   */
  async sendEmail(to, subject, htmlContent) {
    try {
      // Validate email address format
      if (!to.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error('Invalid email address format');
      }

      const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
      const svc = process.env.EMAIL_SERVICE || 'gmail';

      // SendGrid Mail API path (no SMTP sockets)
      if (svc === 'sendgrid_api') {
        if (!process.env.SENDGRID_API_KEY) {
          throw new Error('SENDGRID_API_KEY not set');
        }
        const msg = { to, from, subject, html: htmlContent };
        const [resp] = await sgMail.send(msg);
        const msgId = resp.headers?.['x-message-id'] || resp.headers?.['x-message-id'] || undefined;
        console.log(`Email sent via SendGrid API to ${to}. Status: ${resp.statusCode}`);
        return { success: true, messageId: msgId, status: resp.statusCode };
      }

      // Nodemailer SMTP path
      const mailOptions = { from, to, subject, html: htmlContent };

      let result;
      try {
        result = await this.transporter.sendMail(mailOptions);
      } catch (primaryErr) {
        // If we tried 587 and it still fails, and 465 is not yet tried, attempt 465 once (Gmail-only)
        const triedPort = Number(process.env.EMAIL_GMAIL_PORT || 587);
        if (svc === 'gmail' && triedPort !== 465) {
          console.warn('Primary Gmail send failed on 587, attempting SSL 465 once...');
          const sslTransporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
            connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT || 30000),
            greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT || 15000),
            socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT || 30000),
            tls: { minVersion: 'TLSv1.2', rejectUnauthorized: false },
          });
          result = await sslTransporter.sendMail(mailOptions);
        } else {
          throw primaryErr;
        }
      }
      
      console.log(`Email sent successfully to ${to}. Message ID: ${result.messageId}`);
      return { success: true, messageId: result.messageId, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Send OTP email with automatic fallback
   * @param {string} email - Recipient email address
   * @param {string} otp - OTP code
   * @param {string} type - Type of OTP (deposit, withdrawal, etc.)
   * @param {string} userName - User's name for personalization
   * @returns {Promise<Object>} - Email sending result
   */
  async sendOTP(email, otp, type = 'verification', userName = '') {
    const { subject, htmlContent } = this.formatOTPEmail(otp, type, userName);
    
    try {
      return await this.sendEmail(email, subject, htmlContent);
    } catch (error) {
      console.error(`Primary email service (${process.env.EMAIL_SERVICE}) failed:`, error.message);
      
      // If AWS SES fails, try Gmail as fallback
      if (process.env.EMAIL_SERVICE === 'aws-ses' && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        console.log('Attempting Gmail fallback...');
        try {
          // Temporarily create Gmail transporter for fallback
          const gmailTransporter = this.createGmailTransporter();
          const result = await this.sendEmailWithTransporter(gmailTransporter, email, subject, htmlContent);
          console.log('✅ Gmail fallback successful');
          return result;
        } catch (gmailError) {
          console.error('Gmail fallback also failed:', gmailError.message);
          throw error; // Throw original error
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Verify transporter connectivity (logs only)
   */
  async verifyTransporter() {
    try {
      if (!this.transporter) return; // sendgrid_api mode skips SMTP verification
      const info = await this.transporter.verify();
      console.log('Email transporter verified:', info === true ? 'OK' : info);
    } catch (e) {
      console.warn('Email transporter verification failed:', e?.message || e);
    }
  }
  
  /**
   * Create Gmail transporter for fallback
   * @returns {Object} - Gmail transporter
   */
  createGmailTransporter() {
    // Use the already imported nodemailer
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  
  /**
   * Send email with specific transporter
   * @param {Object} transporter - Nodemailer transporter
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} htmlContent - HTML content
   * @returns {Promise<Object>} - Email result
   */
  async sendEmailWithTransporter(transporter, to, subject, htmlContent) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: htmlContent,
    };
    
    const result = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully'
    };
  }

  /**
   * Format OTP email based on type
   * @param {string} otp - OTP code
   * @param {string} type - Type of OTP
   * @param {string} userName - User's name
   * @returns {Object} - Subject and HTML content
   */
  formatOTPEmail(otp, type, userName = '') {
    const greeting = userName ? `Hi ${userName},` : 'Hello,';
    
    const subjects = {
      deposit: 'FoxTrade - Deposit Verification Code',
      withdrawal: 'FoxTrade - Withdrawal Verification Code',
      investment_withdrawal: 'FoxTrade - Investment Withdrawal Verification Code',
      verification: 'FoxTrade - Verification Code',
    };

    const descriptions = {
      deposit: 'to verify your deposit request',
      withdrawal: 'to verify your withdrawal request',
      investment_withdrawal: 'to verify your investment withdrawal request',
      verification: 'to complete your verification',
    };

    const subject = subjects[type] || subjects.verification;
    const description = descriptions[type] || descriptions.verification;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>FoxTrade Verification Code</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🦊 FoxTrade</h1>
          <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Verification Code</p>
        </div>
        
        <div style="background: #ffffff; padding: 40px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">${greeting}</p>
          
          <p style="font-size: 16px; margin-bottom: 25px;">You requested a verification code ${description}. Please use the code below:</p>
          
          <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 10px; padding: 25px; text-align: center; margin: 30px 0;">
            <p style="font-size: 18px; margin-bottom: 15px; color: #555;">Your verification code is:</p>
            <p style="font-size: 36px; font-weight: bold; color: #667eea; margin: 0; letter-spacing: 3px; font-family: 'Courier New', monospace;">${otp}</p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              ⚠️ <strong>Important Security Information:</strong><br>
              • This code is valid for 10 minutes only<br>
              • Do not share this code with anyone<br>
              • FoxTrade will never ask for your verification code<br>
              • If you didn't request this code, please ignore this email
            </p>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">If you have any questions, please contact our support team.</p>
          
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            Best regards,<br>
            <strong>The FoxTrade Team</strong>
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>© ${new Date().getFullYear()} FoxTrade. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    return { subject, htmlContent };
  }

  /**
   * Test email service configuration
   * @returns {Promise<boolean>} - Configuration test result
   */
  async testConfiguration() {
    try {
      // Check if transporter is configured
      if (!this.transporter) {
        throw new Error('Email transporter not configured');
      }

      // Verify transporter configuration
      await this.transporter.verify();
      
      console.log('Email Service configured successfully');
      console.log(`Service: ${process.env.EMAIL_SERVICE || 'gmail'}`);
      console.log(`From: ${process.env.EMAIL_FROM || process.env.EMAIL_USER}`);
      
      return true;
    } catch (error) {
      console.error('Email service configuration error:', error);
      return false;
    }
  }
}

// Create and export singleton instance
const emailService = new EmailService();
export default emailService;
