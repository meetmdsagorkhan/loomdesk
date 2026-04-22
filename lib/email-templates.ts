type PasswordResetEmailInput = {
  resetUrl: string;
  recipientEmail: string;
};

type InviteEmailInput = {
  inviteUrl: string;
  recipientEmail: string;
  role: string;
  inviterName?: string | null;
};

type EmailVerificationEmailInput = {
  verificationUrl: string;
  recipientEmail: string;
  recipientName?: string | null;
};

function wrapEmail(title: string, intro: string, ctaLabel: string, ctaUrl: string, outro: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; background: #f8fafc; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
        <p style="font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #6366f1; font-weight: 700; margin: 0 0 12px;">LoomDesk</p>
        <h1 style="font-size: 24px; margin: 0 0 16px;">${title}</h1>
        <p style="font-size: 15px; line-height: 1.7; margin: 0 0 24px;">${intro}</p>
        <a href="${ctaUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #111827; color: #ffffff; text-decoration: none; font-weight: 600;">
          ${ctaLabel}
        </a>
        <p style="font-size: 13px; line-height: 1.7; margin: 24px 0 0; color: #6b7280;">
          ${outro}
        </p>
        <p style="font-size: 12px; line-height: 1.7; margin: 16px 0 0; color: #9ca3af;">
          If the button does not work, copy and paste this link into your browser:<br />
          <a href="${ctaUrl}" style="color: #6366f1;">${ctaUrl}</a>
        </p>
      </div>
    </div>
  `.trim();

  return {
    html,
    text: `${title}\n\n${intro}\n\n${ctaLabel}: ${ctaUrl}\n\n${outro}`,
  };
}

export function buildPasswordResetEmail({
  resetUrl,
  recipientEmail,
}: PasswordResetEmailInput) {
  return {
    subject: 'Reset your LoomDesk password',
    ...wrapEmail(
      'Reset your password',
      `We received a request to reset the password for ${recipientEmail}. Use the secure link below to choose a new password.`,
      'Reset password',
      resetUrl,
      'This link expires automatically. If you did not request this reset, you can safely ignore this email.'
    ),
  };
}

export function buildInviteEmail({
  inviteUrl,
  recipientEmail,
  role,
  inviterName,
}: InviteEmailInput) {
  const inviterText = inviterName ? `${inviterName} invited you` : 'You have been invited';

  return {
    subject: 'You have been invited to LoomDesk',
    ...wrapEmail(
      'Join LoomDesk',
      `${inviterText} to LoomDesk as a ${role.replace('_', ' ')}. Finish setting up your account for ${recipientEmail} using the secure invitation below.`,
      'Accept invitation',
      inviteUrl,
      'This invitation expires automatically. If you were not expecting it, you can ignore this message.'
    ),
  };
}

export function buildEmailVerificationEmail({
  verificationUrl,
  recipientEmail,
  recipientName,
}: EmailVerificationEmailInput) {
  const recipientText = recipientName ? recipientName : recipientEmail;

  return {
    subject: 'Verify your LoomDesk email address',
    ...wrapEmail(
      'Verify your email',
      `Finish securing the LoomDesk account for ${recipientText} by confirming that you can receive messages at ${recipientEmail}.`,
      'Verify email',
      verificationUrl,
      'This verification link expires automatically. If you did not expect this message, you can ignore it.'
    ),
  };
}
