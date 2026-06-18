# GEMINI.md - Project Interaction Guide

This guide explains how to interact with the Loomdesk codebase, including key patterns, architectural decisions, and common workflows.

## Project Overview

Loomdesk is a team management dashboard built with Next.js 16, React 19, NextAuth v5, Prisma, and PostgreSQL. It includes:

- Team reporting and QA scoring
- Attendance, leave, and shift management
- Messaging and notifications
- Scheduling/booking system (Calendly-like)
- Google Calendar integration
- Two-factor authentication
- Audit logging and security features

## Key Architectural Patterns

### App Router Structure

- **App Directory**: All routes use Next.js 16 App Router
- **Params Handling**: In Next.js 16, `params` is a `Promise` that must be awaited:
  ```typescript
  export default async function Page({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;
    // ...
  }
  ```

### Server Actions vs API Routes

- **Server Actions**: Used in `lib/scheduling/` for database operations with transaction support
- **API Routes**: Used for external-facing endpoints in `app/api/`
- **Dynamic Routes**: Most API routes use `export const dynamic = 'force-dynamic'` to prevent static generation

### Prisma Models

Core models include:
- `User` - Authentication and profile
- `Booking` - Scheduling bookings
- `EventType` - Schedulable event types
- `SchedulingPreferences` - User scheduling settings
- `Availability` - Weekly availability slots
- `GoogleCalendarToken` - OAuth tokens
- `Message` - Team messaging
- `AuditLog` - Security audit trail

### Security Patterns

- **Proxy Middleware**: Route protection via `proxy.ts`
- **Rate Limiting**: Database-backed with in-memory fallback
- **2FA**: TOTP-based with recovery codes
- **Session Management**: Server-side with invalidation support

## Common Workflows

### Adding a New API Route

1. Create file in `app/api/[route-name]/route.ts`
2. Add `export const dynamic = 'force-dynamic'` for dynamic routes
3. Use `auth()` from `@/auth` for authentication
4. Validate input with Zod schemas
5. Return appropriate HTTP status codes

Example:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({
  field: z.string()
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validated = schema.parse(body);
  // ...
}
```

### Adding a Server Action

1. Add `'use server'` at the top of the file
2. Use `auth()` for authentication
3. Use Prisma transactions for race condition protection
4. Call `revalidatePath()` after mutations

Example:
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export async function createItem(data: any) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const result = await prisma.$transaction(async (tx) => {
    // Transaction logic
  });

  revalidatePath('/dashboard/some-page');
  return result;
}
```

### Database Schema Changes

1. Modify `prisma/schema.prisma`
2. Run `npx prisma db push` to sync database (bypasses migration system)
3. Run `npx prisma generate` to regenerate Prisma client
4. Test locally before pushing

**Note**: The project uses `npx prisma db push` instead of migrations due to shadow database issues in some environments.

### Environment Variables

Required for development:
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth secret key
- `NEXTAUTH_URL` - Application URL

Optional but recommended:
- `RESEND_API_KEY` - Email delivery
- `EMAIL_FROM` - Sender email address
- `NEXT_PUBLIC_SUPABASE_URL` - Real-time notifications
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase auth

## File Structure

```
app/
├── (auth)/              # Authentication pages
├── api/                 # API routes
│   ├── scheduling/      # Scheduling feature APIs
│   ├── public/          # Public booking APIs
│   └── auth/            # Authentication APIs
├── dashboard/           # Protected dashboard pages
│   └── scheduling/      # Scheduling dashboard
├── [username]/          # Public user booking page
└── book/                # Booking flow pages

lib/
├── scheduling/          # Scheduling server actions
│   ├── availability-actions.ts
│   ├── booking-actions.ts
│   ├── availability-engine.ts
│   ├── email-notifications.ts
│   └── google-calendar-sync.ts
├── db.ts                # Prisma client
├── auth.ts              # NextAuth configuration
└── env.server.ts        # Environment validation

prisma/
└── schema.prisma        # Database schema
```

## Scheduling Feature

The scheduling feature allows users to:
- Create event types with custom durations
- Set weekly availability
- Configure booking preferences (timezone, buffers, notice periods)
- Accept bookings via public pages
- Sync with Google Calendar

Key files:
- `app/dashboard/scheduling/page.tsx` - Main dashboard
- `lib/scheduling/availability-engine.ts` - Slot generation logic
- `lib/scheduling/booking-actions.ts` - Booking operations
- `app/api/public/users/[username]/[slug]/route.ts` - Public booking API

## Common Issues & Solutions

### TypeScript Error: `params` is a Promise

**Error**: `Parameter 'params' implicitly has an 'any' type`

**Solution**: In Next.js 16, params must be typed as a Promise and awaited:
```typescript
export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
}
```

### Prisma Model Not Found

**Error**: `Property 'booking' does not exist on type 'PrismaClient'`

**Solution**: Run `npx prisma db push` and `npx prisma generate` to sync the schema and regenerate the client.

### Resend API Key Missing During Build

**Error**: `Missing API key. Pass it to the constructor new Resend("re_123")`

**Solution**: Use lazy initialization for Resend client:
```typescript
function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(process.env.RESEND_API_KEY);
}
```

### Transaction Client Type Issues

**Error**: `Property 'booking' does not exist on transaction client`

**Solution**: Cast transaction client to `any` as temporary workaround:
```typescript
await prisma.$transaction(async (tx: any) => {
  await tx.booking.create({ /* ... */ });
});
```

## Testing

Run tests with:
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
```

Tests use Node.js test runner with `tsx`.

## Build & Deployment

```bash
npm run build             # Production build
npm run start             # Start production server
```

The build includes:
- TypeScript type checking
- ESLint linting
- Static page generation
- API route compilation

## Security Notes

- All private routes are protected via proxy middleware
- Rate limiting is enforced on sensitive endpoints
- Audit logs track all authentication and authorization events
- 2FA is recommended for production deployments
- Environment variables are validated on startup

## Getting Help

- Check `README.md` for general setup
- Check `docs/api.md` for API documentation
- Check `SCHEDULING_SETUP.md` for scheduling feature setup
- Check `DEPLOYMENT_GUIDE.md` for deployment instructions
