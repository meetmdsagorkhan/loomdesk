import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildEmailVerificationEmail,
  buildInviteEmail,
  buildPasswordResetEmail,
} from '@/lib/email-templates';

describe('email templates', () => {
  it('builds a password reset email with the secure link', () => {
    const result = buildPasswordResetEmail({
      resetUrl: 'https://example.com/reset?token=abc',
      recipientEmail: 'jane@example.com',
    });

    assert.equal(result.subject, 'Reset your LoomDesk password');
    assert.match(result.html, /https:\/\/example\.com\/reset\?token=abc/);
  });

  it('builds an invite email with role details', () => {
    const result = buildInviteEmail({
      inviteUrl: 'https://example.com/invite?token=xyz',
      recipientEmail: 'jane@example.com',
      role: 'TEAM_LEAD',
      inviterName: 'Alex',
    });

    assert.equal(result.subject, 'You have been invited to LoomDesk');
    assert.match(result.text, /Alex invited you/);
    assert.match(result.text, /TEAM LEAD|TEAM_LEAD/);
  });

  it('builds an email verification email with the secure link', () => {
    const result = buildEmailVerificationEmail({
      verificationUrl: 'https://example.com/verify-email?token=verify123',
      recipientEmail: 'jane@example.com',
      recipientName: 'Jane Doe',
    });

    assert.equal(result.subject, 'Verify your LoomDesk email address');
    assert.match(result.html, /verify-email\?token=verify123/);
    assert.match(result.text, /Jane Doe/);
  });
});
