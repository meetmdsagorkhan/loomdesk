import { env } from '@/lib/env.server';
import { logger } from '@/lib/logger';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailDeliveryResult =
  | { mode: 'sent'; provider: 'resend' }
  | { mode: 'preview'; provider: 'log' };

function isEmailConfigured() {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

export async function sendTransactionalEmail(
  payload: EmailPayload
): Promise<EmailDeliveryResult> {
  if (!isEmailConfigured()) {
    logger.audit('email-preview', {
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    return { mode: 'preview', provider: 'log' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      reply_to: env.EMAIL_REPLY_TO,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend request failed with ${response.status}: ${body}`);
  }

  return { mode: 'sent', provider: 'resend' };
}
