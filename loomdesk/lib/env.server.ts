import 'server-only';

import { z } from 'zod';

const optionalString = <Schema extends z.ZodTypeAny>(schema: Schema) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    schema.optional()
  );

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters long'),
  NEXTAUTH_URL: z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    let trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = `https://${trimmed}`;
    }
    return trimmed;
  }, z.string().url('NEXTAUTH_URL must be a valid URL').optional()),
  NEXT_PUBLIC_SUPABASE_URL: optionalString(
    z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString(
    z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY cannot be empty')
  ),
  CORS_ALLOWED_ORIGINS: optionalString(z.string()),
  EMAIL_FROM: optionalString(z.string().email('EMAIL_FROM must be a valid email address')),
  EMAIL_REPLY_TO: optionalString(
    z.string().email('EMAIL_REPLY_TO must be a valid email address')
  ),
  RESEND_API_KEY: optionalString(z.string().min(1, 'RESEND_API_KEY cannot be empty')),
  GOOGLE_CALENDAR_API_KEY: optionalString(z.string().min(1, 'GOOGLE_CALENDAR_API_KEY cannot be empty')),
  GOOGLE_OAUTH_CLIENT_ID: optionalString(z.string().min(1)),
  GOOGLE_OAUTH_CLIENT_SECRET: optionalString(z.string().min(1)),
  GOOGLE_OAUTH_REDIRECT_URI: optionalString(z.string().url()),
  AUTH_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  AUTH_LOCKOUT_BASE_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  SESSION_MAX_AGE_MS: z.coerce.number().int().positive().default(12 * 60 * 60 * 1000),
  SESSION_REMEMBER_ME_MAX_AGE_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30 * 24 * 60 * 60 * 1000),
  EMAIL_VERIFICATION_TOKEN_TTL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(24 * 60 * 60 * 1000),
  MESSAGE_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),
  MESSAGE_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60 * 1000),
  PASSWORD_RESET_TOKEN_TTL_MS: z.coerce.number().int().positive().default(60 * 60 * 1000),
});

let cachedEnv: z.infer<typeof envSchema> | null = null;

function getEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsedEnv = envSchema.safeParse(process.env);

  if (!parsedEnv.success) {
    const issues = parsedEnv.error.issues
      .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  cachedEnv = parsedEnv.data;
  return cachedEnv;
}

export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get(_target, prop) {
    return getEnv()[prop as keyof z.infer<typeof envSchema>];
  },
});

export function getAllowedCorsOrigins() {
  const defaults = [
    'https://loomdesk.online',
    'https://www.loomdesk.online',
    'https://app.loomdesk.online',
    'https://admin.loomdesk.online',
    'https://dashboard.loomdesk.online',
    'https://meet.loomdesk.online',
    'http://localhost:3000',
  ];

  return Array.from(
    new Set(
      [
        env.NEXTAUTH_URL,
        ...defaults,
        ...(env.CORS_ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()) ?? []),
      ].filter(Boolean)
    )
  );
}
