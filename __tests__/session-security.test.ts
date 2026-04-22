import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createSessionExpiryTimestamp,
  isSessionExpired,
  normalizeRememberMe,
} from '@/lib/session-security';

describe('session security helpers', () => {
  it('normalizes remember-me input from auth forms', () => {
    assert.equal(normalizeRememberMe(true), true);
    assert.equal(normalizeRememberMe('true'), true);
    assert.equal(normalizeRememberMe('on'), true);
    assert.equal(normalizeRememberMe(false), false);
  });

  it('creates a future expiration timestamp', () => {
    const now = 1_700_000_000_000;
    assert.ok(createSessionExpiryTimestamp(false, now) > now);
    assert.ok(createSessionExpiryTimestamp(true, now) > createSessionExpiryTimestamp(false, now));
  });

  it('detects expired and invalid session timestamps', () => {
    const now = 1_700_000_000_000;
    assert.equal(isSessionExpired(now - 1, now), true);
    assert.equal(isSessionExpired(now + 1, now), false);
    assert.equal(isSessionExpired(undefined, now), true);
  });
});
