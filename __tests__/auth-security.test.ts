import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import {
  clearFailedLogins,
  getAccountLockState,
  recordFailedLogin,
  resetAccountLockStore,
} from '@/lib/auth-security';

const lockoutOptions = {
  threshold: 5,
  windowMs: 15 * 60 * 1000,
  baseLockMs: 15 * 60 * 1000,
};

describe('auth security helpers', () => {
  const realNow = Date.now;

  beforeEach(() => {
    resetAccountLockStore();
    Date.now = () => new Date('2026-04-22T00:00:00.000Z').getTime();
  });

  afterEach(() => {
    Date.now = realNow;
    resetAccountLockStore();
  });

  it('locks an account after repeated failures', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      recordFailedLogin('person@example.com', lockoutOptions);
    }

    const state = getAccountLockState('person@example.com', lockoutOptions);

    assert.equal(state.locked, true);
    assert.equal(state.retryAfterMs, 15 * 60 * 1000);
  });

  it('clears failures after a successful login', () => {
    recordFailedLogin('person@example.com', lockoutOptions);
    clearFailedLogins('person@example.com');

    const state = getAccountLockState('person@example.com', lockoutOptions);

    assert.equal(state.locked, false);
    assert.equal(state.failureCount, 0);
  });
});
