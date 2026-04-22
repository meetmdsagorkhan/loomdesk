import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { inviteSignupSchema, loginSchema, passwordPolicySchema } from '@/lib/validations/auth';

describe('auth validation', () => {
  it('rejects weak passwords', () => {
    assert.equal(passwordPolicySchema.safeParse('password').success, false);
    assert.equal(passwordPolicySchema.safeParse('Password1').success, false);
  });

  it('accepts strong invite signup payloads', () => {
    const result = inviteSignupSchema.safeParse({
      fullName: 'Jane Doe',
      password: 'Admin@123',
      confirmPassword: 'Admin@123',
    });

    assert.equal(result.success, true);
  });

  it('coerces remember-me login payloads', () => {
    const result = loginSchema.safeParse({
      email: 'jane@example.com',
      password: 'Admin@123',
      rememberMe: 'on',
    });

    assert.equal(result.success, true);
    assert.equal(result.data.rememberMe, true);
  });
});
