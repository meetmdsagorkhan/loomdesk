import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createTotpToken,
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  generateRecoveryCodes,
  generateTwoFactorSecret,
  hashRecoveryCodes,
  verifyRecoveryCode,
  verifyTotpToken,
} from '@/lib/two-factor';

describe('two-factor helpers', () => {
  it('encrypts and decrypts a secret losslessly', () => {
    const secret = generateTwoFactorSecret();
    const encrypted = encryptTwoFactorSecret(secret);

    assert.equal(decryptTwoFactorSecret(encrypted), secret);
  });

  it('verifies a valid totp token', () => {
    const secret = generateTwoFactorSecret();
    const token = createTotpToken(secret);

    assert.equal(verifyTotpToken(secret, token), true);
    assert.equal(verifyTotpToken(secret, '000000'), false);
  });

  it('consumes a matching recovery code', () => {
    const recoveryCodes = generateRecoveryCodes();
    const hashedCodes = hashRecoveryCodes(recoveryCodes);
    const result = verifyRecoveryCode(recoveryCodes[0], hashedCodes);

    assert.equal(result.valid, true);
    assert.equal(result.remainingCodes.length, hashedCodes.length - 1);
  });
});
