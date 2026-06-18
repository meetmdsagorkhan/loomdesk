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
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e2e8f0; background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%); padding: 40px 24px;">
      <div style="max-width: 560px; margin: 0 auto; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 24px; padding: 40px; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(139, 92, 246, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <img src="https://loomdesk.online/logo.png" alt="LoomDesk" style="height: 48px; width: auto; margin: 0 auto;" />
        </div>
        <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 20px; background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${title}</h1>
        <p style="font-size: 16px; line-height: 1.8; margin: 0 0 32px; color: #cbd5e1;">${intro}</p>
        <a href="${ctaUrl}" style="display: inline-block; padding: 16px 32px; border-radius: 16px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; font-weight: 600; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(139, 92, 246, 0.2); transition: all 0.3s ease;">
          ${ctaLabel}
        </a>
        <p style="font-size: 14px; line-height: 1.7; margin: 32px 0 0; color: #94a3b8;">
          ${outro}
        </p>
        <p style="font-size: 13px; line-height: 1.7; margin: 20px 0 0; color: #64748b; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
          If the button does not work, copy and paste this link into your browser:<br />
          <a href="${ctaUrl}" style="color: #a78bfa; text-decoration: underline;">${ctaUrl}</a>
        </p>
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: center;">
          <p style="font-size: 12px; color: #64748b; margin: 0;">© 2024 LoomDesk. All rights reserved.</p>
        </div>
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
