import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createPasswordResetToken,
  verifyPasswordResetToken,
} from '@/lib/password-reset';

const user = {
  id: 'user_123',
  email: 'jane@example.com',
  password: 'hashed-password-value',
};

describe('password reset tokens', () => {
  it('validates a freshly generated token', () => {
    const token = createPasswordResetToken(user, 60_000);
    const result = verifyPasswordResetToken(token, user);

    assert.equal(result.valid, true);
  });

  it('becomes invalid if the user password changes', () => {
    const token = createPasswordResetToken(user, 60_000);
    const result = verifyPasswordResetToken(token, {
      ...user,
      password: 'new-hash',
    });

    assert.equal(result.valid, false);
  });
});
