import type { RecoveryRequestRecord } from '@/lib/recoveryRequestsDb';
import nodemailer from 'nodemailer';

type EmailResult = {
  delivered: boolean;
  skippedReason?: string;
  errors?: string[];
};

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

function getOptionalEnv(name: string): string {
  return (process.env[name] ?? '').trim();
}

function getBooleanEnv(name: string, fallback = false): boolean {
  const value = getOptionalEnv(name).toLowerCase();
  if (!value) return fallback;
  return value === 'true' || value === '1' || value === 'yes';
}

function getSmtpConfig() {
  const host = getOptionalEnv('SMTP_HOST');
  const portRaw = getOptionalEnv('SMTP_PORT');
  const user = getOptionalEnv('SMTP_USER');
  const pass = getOptionalEnv('SMTP_PASS');
  const from = getOptionalEnv('EMAIL_FROM');
  const port = Number(portRaw || '587');
  const secure = getBooleanEnv('SMTP_SECURE', port === 465);

  if (!host || !user || !pass || !from || !Number.isFinite(port)) {
    return null;
  }

  return {
    host,
    port,
    user,
    pass,
    from,
    secure,
  };
}

async function sendWithSmtp(payload: EmailPayload): Promise<void> {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error('SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/EMAIL_FROM are not configured');
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
}

function buildGuardianLink(requestId: string): string {
  const base = getOptionalEnv('APP_BASE_URL');
  if (!base) return '';
  return `${base.replace(/\/+$/, '')}/guardian/requests/${requestId}`;
}

function buildUserLink(): string {
  const base = getOptionalEnv('APP_BASE_URL');
  if (!base) return '';
  return `${base.replace(/\/+$/, '')}/recover-address`;
}

export async function sendGuardianRecoveryRequestEmails(
  request: RecoveryRequestRecord,
): Promise<EmailResult> {
  if (!getSmtpConfig()) {
    return {
      delivered: false,
      skippedReason:
        'SMTP provider is not configured (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/EMAIL_FROM missing)',
    };
  }

  const link = buildGuardianLink(request.id);
  const errors: string[] = [];

  for (const guardian of request.guardians) {
    try {
      await sendWithSmtp({
        to: guardian.email,
        subject: `Recovery request for wallet ${request.walletId}`,
        html: `
          <p>A wallet recovery request has been submitted.</p>
          <p><strong>Wallet:</strong> ${request.walletId}</p>
          <p><strong>Reason:</strong> ${request.reason}</p>
          <p><strong>Expires:</strong> ${request.expiresAt}</p>
          ${link ? `<p><a href="${link}">Review request</a></p>` : '<p>Open app and check guardian requests.</p>'}
        `,
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    delivered: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export async function sendRecoveryOutcomeEmails(
  request: RecoveryRequestRecord,
): Promise<EmailResult> {
  if (!getSmtpConfig()) {
    return {
      delivered: false,
      skippedReason:
        'SMTP provider is not configured (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/EMAIL_FROM missing)',
    };
  }

  const link = buildUserLink();
  const recipients = [request.requesterEmail, ...request.guardians.map((g) => g.email)];
  const uniqueRecipients = Array.from(new Set(recipients.map((e) => e.toLowerCase())));
  const errors: string[] = [];

  for (const recipient of uniqueRecipients) {
    try {
      await sendWithSmtp({
        to: recipient,
        subject: `Recovery request ${request.status}: ${request.walletId}`,
        html: `
          <p>Recovery request status changed.</p>
          <p><strong>Wallet:</strong> ${request.walletId}</p>
          <p><strong>Status:</strong> ${request.status}</p>
          <p><strong>Updated:</strong> ${request.updatedAt}</p>
          ${link ? `<p><a href="${link}">Open recovery page</a></p>` : ''}
        `,
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    delivered: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
