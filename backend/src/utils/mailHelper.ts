import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export interface MailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  isMock: boolean;
  recipient: string;
  subject: string;
  timestamp: string;
  error?: string;
  previewUrl?: string;
}

export interface DispatchedEmail {
  id: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  timestamp: string;
  isMock: boolean;
  status: 'SENT' | 'FAILED';
  error?: string;
}

// In-memory audit trail of dispatched emails for diagnostics and testing
const mailLog: DispatchedEmail[] = [];
const MAX_MAIL_LOG = 100;

/**
 * Returns whether SMTP server credentials have been provided in environment.
 */
export function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  return Boolean(host && user);
}

/**
 * Creates and returns configured nodemailer transporter or null if using fallback.
 */
export function createMailTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim() || process.env.SMTP_PASSWORD?.trim();

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
  }

  return null;
}

/**
 * Core Mail Helper function.
 * Transmits email via configured SMTP transport or logs nicely to console in development fallback mode.
 */
export async function sendMail(options: MailOptions): Promise<SendMailResult> {
  const from = options.from || process.env.EMAIL_FROM || '"PetroPulse Forecourt ERP" <no-reply@petropulse.io>';
  const recipient = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  const timestamp = new Date().toISOString();
  const emailId = `mail-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const transporter = createMailTransporter();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo,
        attachments: options.attachments,
      });

      console.log(`[MailHelper] ✉️ Email sent successfully to "${recipient}" [ID: ${info.messageId}]`);

      const logEntry: DispatchedEmail = {
        id: emailId,
        to: recipient,
        subject: options.subject,
        text: options.text,
        html: options.html,
        timestamp,
        isMock: false,
        status: 'SENT',
      };
      recordMailLog(logEntry);

      return {
        success: true,
        messageId: info.messageId,
        isMock: false,
        recipient,
        subject: options.subject,
        timestamp,
      };
    } catch (err: any) {
      console.error(`[MailHelper] ❌ Failed to dispatch email to "${recipient}":`, err.message);

      const logEntry: DispatchedEmail = {
        id: emailId,
        to: recipient,
        subject: options.subject,
        text: options.text,
        html: options.html,
        timestamp,
        isMock: false,
        status: 'FAILED',
        error: err.message,
      };
      recordMailLog(logEntry);

      return {
        success: false,
        isMock: false,
        recipient,
        subject: options.subject,
        timestamp,
        error: err.message,
      };
    }
  }

  // Development / Offline Fallback Mode
  console.log('\n======================== [PETROPULSE DISPATCHED EMAIL] ========================');
  console.log(`To        : ${recipient}`);
  console.log(`From      : ${from}`);
  console.log(`Subject   : ${options.subject}`);
  console.log(`Timestamp : ${timestamp}`);
  console.log('-------------------------------------------------------------------------------');
  if (options.text) {
    console.log(options.text);
  } else if (options.html) {
    // Strip simple HTML tags for clean console display
    console.log(options.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  }
  console.log('===============================================================================\n');

  const logEntry: DispatchedEmail = {
    id: emailId,
    to: recipient,
    subject: options.subject,
    text: options.text,
    html: options.html,
    timestamp,
    isMock: true,
    status: 'SENT',
  };
  recordMailLog(logEntry);

  return {
    success: true,
    messageId: `mock-${emailId}`,
    isMock: true,
    recipient,
    subject: options.subject,
    timestamp,
  };
}

/**
 * Sends initial onboarding credentials to new forecourt staff members.
 */
export async function sendInitialCredentials(params: {
  user: {
    name: string;
    email: string;
    username?: string;
    role: string;
    stationName?: string;
  };
  temporaryPassword: string;
  loginUrl?: string;
}): Promise<SendMailResult> {
  const { user, temporaryPassword } = params;
  const appUrl = params.loginUrl || process.env.APP_URL || 'http://localhost:3000';
  const loginUrl = `${appUrl.replace(/\/+$/, '')}/login`;
  const stationText = user.stationName ? ` at ${user.stationName}` : '';

  const subject = `Welcome to PetroPulse - Your Forecourt Staff Credentials`;

  const text = `
Dear ${user.name},

Welcome to PetroPulse Forecourt ERP! A staff account has been provisioned for you${stationText}.

Here are your initial login credentials:
--------------------------------------------------
Role Assigned      : ${user.role}
Username / Email   : ${user.username || user.email}
Temporary Password : ${temporaryPassword}
Login Portal       : ${loginUrl}
--------------------------------------------------

For security compliance, please log in and change your temporary password immediately upon first access.

Best regards,
PetroPulse Forecourt Administration
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #064E3B 0%, #0D9488 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .logo-badge { display: inline-block; background: rgba(255,255,255,0.18); padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.25); }
    .content { padding: 32px 28px; line-height: 1.6; }
    .credentials-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .cred-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .cred-row:last-child { border-bottom: none; }
    .cred-label { color: #64748b; font-weight: 500; }
    .cred-value { font-family: monospace; font-weight: 700; color: #0f172a; }
    .btn { display: inline-block; background: #0D9488; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 16px 0; text-align: center; }
    .notice { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #92400e; margin-top: 24px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">PetroPulse Forecourt ERP</div>
      <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Welcome to the Team</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Your Forecourt Staff Account Has Been Provisioned</p>
    </div>

    <div class="content">
      <p>Hello <strong>${user.name}</strong>,</p>
      <p>An official staff account has been configured for you on the <strong>PetroPulse Fuel Forecourt Management Platform</strong>${stationText}.</p>

      <div class="credentials-card">
        <div class="cred-row">
          <span class="cred-label">Designated Role</span>
          <span class="cred-value" style="color: #0D9488;">${user.role}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Login Identifier</span>
          <span class="cred-value">${user.username || user.email}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Temporary Password</span>
          <span class="cred-value" style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; letter-spacing: 1px;">${temporaryPassword}</span>
        </div>
      </div>

      <div style="text-align: center;">
        <a href="${loginUrl}" class="btn">Log In to PetroPulse Portal</a>
      </div>

      <div class="notice">
        <strong>⚠️ Security Recommendation:</strong> This is a temporary password generated by your station administrator. For forecourt compliance and audit security, you will be prompted to set a permanent password upon first login.
      </div>
    </div>

    <div class="footer">
      This is an automated administrative notification from PetroPulse ERP. Please do not reply directly to this email.<br>
      © ${new Date().getFullYear()} PetroPulse Multi-Station Fuel Network. All rights reserved.
    </div>
  </div>
</body>
</html>
`.trim();

  return await sendMail({
    to: user.email,
    subject,
    text,
    html,
  });
}

/**
 * Sends a password reset authorization email.
 */
export async function sendPasswordResetMail(params: {
  user: {
    name: string;
    email: string;
  };
  resetToken: string;
  resetUrl?: string;
}): Promise<SendMailResult> {
  const { user, resetToken } = params;
  const appUrl = params.resetUrl || process.env.APP_URL || 'http://localhost:3000';
  const actionUrl = `${appUrl.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(user.email)}`;

  const subject = `PetroPulse Password Reset Request`;

  const text = `
Dear ${user.name},

A password reset was requested for your PetroPulse account.
To choose a new password, open this secure link in your browser:
${actionUrl}

This link is valid for 1 hour. If you did not make this request, please contact your station administrator immediately.

Best regards,
PetroPulse Forecourt Security
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
    <h2 style="color: #064E3B; margin-top: 0;">Password Reset Authorization</h2>
    <p>Hello <strong>${user.name}</strong>,</p>
    <p>We received a request to reset your password for the PetroPulse Forecourt ERP platform.</p>
    <p style="text-align: center; margin: 28px 0;">
      <a href="${actionUrl}" style="background: #0D9488; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Reset Your Password</a>
    </p>
    <p style="font-size: 13px; color: #64748b;">
      Or paste this URL into your browser: <br>
      <code style="word-break: break-all; color: #0f172a;">${actionUrl}</code>
    </p>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
      This link will expire in 60 minutes. If you did not request this, please disregard this email.
    </p>
  </div>
</body>
</html>
`.trim();

  return await sendMail({
    to: user.email,
    subject,
    text,
    html,
  });
}

/**
 * Sends critical tank low-level alert notification.
 */
export async function sendLowStockAlert(params: {
  managerEmail: string;
  stationName: string;
  tankName: string;
  fuelName: string;
  currentStockLiters: number;
  safeCapacityLiters: number;
  lowThresholdLiters: number;
}): Promise<SendMailResult> {
  const { managerEmail, stationName, tankName, fuelName, currentStockLiters, lowThresholdLiters, safeCapacityLiters } = params;
  const subject = `⚠️ URGENT: Low Fuel Stock Alert - ${tankName} (${stationName})`;

  const text = `
CRITICAL FORECOURT STOCK ALERT:
Station: ${stationName}
Tank   : ${tankName} (${fuelName})
Current Stock: ${currentStockLiters.toLocaleString()} Liters
Threshold    : ${lowThresholdLiters.toLocaleString()} Liters
Safe Capacity: ${safeCapacityLiters.toLocaleString()} Liters

Immediate replenishment decanting tanker order required.
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; background: #fff1f2; padding: 24px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 28px; border: 1px solid #fecdd3;">
    <div style="display: inline-block; background: #ffe4e6; color: #e11d48; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px;">CRITICAL INVENTORY ALERT</div>
    <h2 style="color: #9f1239; margin: 0 0 16px 0;">Low Fuel Threshold Warning</h2>
    <p>Tank <strong>${tankName}</strong> (${fuelName}) at <strong>${stationName}</strong> has dropped below statutory re-order threshold.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Current Stock</td><td style="padding: 8px 0; font-weight: 700; color: #e11d48;">${currentStockLiters.toLocaleString()} Liters</td></tr>
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Low Alert Threshold</td><td style="padding: 8px 0; font-weight: 600;">${lowThresholdLiters.toLocaleString()} Liters</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">Safe Capacity</td><td style="padding: 8px 0; font-weight: 600;">${safeCapacityLiters.toLocaleString()} Liters</td></tr>
    </table>
    <p style="font-size: 13px; color: #9f1239; background: #fff1f2; padding: 12px; border-radius: 8px;">
      Initiate tanker delivery schedule to avoid forecourt dispensing dry-outs.
    </p>
  </div>
</body>
</html>
`.trim();

  return await sendMail({
    to: managerEmail,
    subject,
    text,
    html,
  });
}

/**
 * Tests connection to configured SMTP server.
 */
export async function testSmtpConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  host?: string;
  port?: number;
  error?: string;
}> {
  const transporter = createMailTransporter();
  const host = process.env.SMTP_HOST || 'localhost';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);

  if (!transporter) {
    return {
      configured: false,
      connected: false,
      host,
      port,
      error: 'SMTP credentials not configured in environment. Using console fallback mode.',
    };
  }

  try {
    await transporter.verify();
    return {
      configured: true,
      connected: true,
      host,
      port,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      host,
      port,
      error: err.message,
    };
  }
}

/**
 * Helper to record dispatched email into in-memory audit log.
 */
function recordMailLog(entry: DispatchedEmail): void {
  mailLog.unshift(entry);
  if (mailLog.length > MAX_MAIL_LOG) {
    mailLog.pop();
  }
}

/**
 * Returns recent mail log for diagnostics and testing.
 */
export function getMailLog(): DispatchedEmail[] {
  return [...mailLog];
}

/**
 * Clears mail log (useful in unit tests).
 */
export function clearMailLog(): void {
  mailLog.length = 0;
}
