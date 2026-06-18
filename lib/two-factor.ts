import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import { env } from '@/lib/env.server';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const RECOVERY_CODE_COUNT = 8;

function getEncryptionKey() {
  return createHash('sha256').update(env.AUTH_SECRET).digest();
}

function base32Encode(buffer: Buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(value: string) {
  const normalized = value.replace(/=+$/g, '').replace(/[\s-]/g, '').toUpperCase();
  let bits = 0;
  let current = 0;
  const output: number[] = [];

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);

    if (index === -1) {
      throw new Error('Invalid two-factor secret encoding');
    }

    current = (current << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((current >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function normalizeOtp(value: string | undefined) {
  return value?.replace(/\s+/g, '').trim() ?? '';
}

function normalizeRecoveryCode(value: string | undefined) {
  return value?.replace(/[^A-Z0-9]/gi, '').toUpperCase() ?? '';
}

function hashRecoveryCode(code: string) {
  return createHash('sha256')
    .update(`${env.AUTH_SECRET}:${normalizeRecoveryCode(code)}`)
    .digest('hex');
}

export function generateTwoFactorSecret() {
  return base32Encode(randomBytes(20));
}

export function encryptTwoFactorSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString(
    'base64url'
  )}`;
}

export function decryptTwoFactorSecret(payload: string) {
  const [iv, tag, ciphertext] = payload.split('.');

  if (!iv || !tag || !ciphertext) {
    throw new Error('Invalid encrypted two-factor secret');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(iv, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function createTotpToken(secret: string, timestamp: number = Date.now()) {
  const counter = Math.floor(timestamp / 1000 / TOTP_STEP_SECONDS);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', base32Decode(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

export function verifyTotpToken(secret: string, token: string, window: number = 1) {
  const normalizedToken = normalizeOtp(token);

  if (!/^\d{6}$/.test(normalizedToken)) {
    return false;
  }

  for (let stepOffset = -window; stepOffset <= window; stepOffset += 1) {
    const candidate = createTotpToken(
      secret,
      Date.now() + stepOffset * TOTP_STEP_SECONDS * 1000
    );

    if (candidate === normalizedToken) {
      return true;
    }
  }

  return false;
}

export function generateRecoveryCodes() {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = randomBytes(4).toString('hex').toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  });
}

export function hashRecoveryCodes(codes: string[]) {
  return codes.map(hashRecoveryCode);
}

export function verifyRecoveryCode(
  input: string | undefined,
  hashedCodes: string[]
) {
  const normalizedInput = normalizeRecoveryCode(input);

  if (!normalizedInput) {
    return { valid: false as const, remainingCodes: hashedCodes };
  }

  const candidateHash = hashRecoveryCode(normalizedInput);

  const matchIndex = hashedCodes.findIndex((hashedCode) => {
    if (hashedCode.length !== candidateHash.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(hashedCode), Buffer.from(candidateHash));
  });

  if (matchIndex === -1) {
    return { valid: false as const, remainingCodes: hashedCodes };
  }

  return {
    valid: true as const,
    remainingCodes: hashedCodes.filter((_, index) => index !== matchIndex),
  };
}

export function createTwoFactorOtpAuthUrl(email: string, secret: string) {
  const issuer = 'LoomDesk';
  const label = `${issuer}:${email}`;
  const url = new URL(`otpauth://totp/${encodeURIComponent(label)}`);
  url.searchParams.set('secret', secret);
  url.searchParams.set('issuer', issuer);
  url.searchParams.set('algorithm', 'SHA1');
  url.searchParams.set('digits', String(TOTP_DIGITS));
  url.searchParams.set('period', String(TOTP_STEP_SECONDS));
  return url.toString();
}

export function parseStoredRecoveryCodes(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
