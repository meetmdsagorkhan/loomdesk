import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createEmailVerificationExpiryDate,
  createEmailVerificationTokenValue,
  createEmailVerificationUrl,
} from '@/lib/email-verification';

describe('email verification helpers', () => {
  it('creates a random token value', () => {
    const token = createEmailVerificationTokenValue();

    assert.equal(typeof token, 'string');
    assert.ok(token.length >= 32);
  });

  it('creates an absolute verification URL', () => {
    const url = createEmailVerificationUrl('verify-token');

    assert.match(url, /^https?:\/\/.+\/verify-email\?token=verify-token$/);
  });

  it('creates a future verification expiry date', () => {
    const expiry = createEmailVerificationExpiryDate(60_000);

    assert.ok(expiry.getTime() > Date.now());
  });
});
