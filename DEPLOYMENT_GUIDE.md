# Deployment Guide - Production & Development

This guide explains how to set up and manage two deployment channels for Loomdesk: **Production** (main branch) and **Development** (dev branch).

## Overview

- **Production**: Live deployment for users (main branch) — uses existing Supabase DB
- **Development**: Testing environment for fixes and features (dev branch) — uses separate Supabase DB
- Each environment uses a separate database to prevent data contamination

## Environment Configuration

| Variable | Production (main) | Development (dev) |
|----------|-------------------|-------------------|
| Branch | `main` | `dev` |
| Database | See `.env` | See `.env.development` |
| AUTH_SECRET | See `.env` | See `.env.development` |
| Supabase | See `.env` | See `.env.development` |
| Email | Production Resend key | Dev Resend key (see `.env.development`) |

---

## Step 1: Configure Vercel Environments

1. **Connect your GitHub repository to Vercel** (if not already done)

2. **Set up Production Environment Variables** (for `main` branch):
   - In Vercel → Project Settings → Environment Variables → **Production**
   - Add all variables from your existing `.env` file

3. **Set up Development Environment Variables** (for `dev` branch):
   - In Vercel → Project Settings → Environment Variables → **Preview**
   - Add all variables from `.env.development`

4. **Configure Branch Deployment**:
   - In Vercel → Project Settings → Git
   - Set **Production Branch** to `main`
   - Preview deployments will automatically trigger for `dev` branch

---

## Step 2: Local Development

### Working on Dev

Use `.env.development` for local dev work:
```bash
git checkout dev
npm run dev   # Next.js picks up .env.development automatically
```

### Working on Production (locally)

Use `.env` for local production testing:
```bash
git checkout main
npm run dev   # Next.js picks up .env automatically
```

---

## Step 3: Database Migrations

Run migrations on each database separately:

```bash
# Production database (use DATABASE_URL from .env)
DATABASE_URL="your-production-db-url" npx prisma migrate deploy

# Development database (use DATABASE_URL from .env.development)
DATABASE_URL="your-dev-db-url" npx prisma migrate deploy
```

**Always test migrations on dev first**, then run on production.

### Seed Dev Database (Optional)

```bash
DATABASE_URL="your-dev-db-url" npx prisma db seed
```

---

## Step 4: Development Workflow

### Daily Cycle

1. **Switch to dev branch**:
   ```bash
   git checkout dev
   git pull origin dev
   ```

2. **Make your changes** (features, fixes, etc.)

3. **Test locally**:
   ```bash
   npm run dev
   ```

4. **Commit and push to dev**:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin dev
   ```

5. **Vercel auto-deploys** the `dev` branch as a Preview deployment with dev database

### Promoting to Production

When everything is tested and ready:

```bash
git checkout main
git pull origin main
git merge dev
git push origin main
```

**OR** via GitHub:
- Create a Pull Request from `dev` → `main`
- Review and merge

Vercel will auto-deploy `main` to Production with the production database. **No config changes needed.**

### Sync dev after merge (optional)

```bash
git checkout dev
git merge main
git push origin dev
```

---

## Best Practices

- **Never** use the production database for testing
- Always test migrations on dev database first
- Keep production database backups
- Use different API keys for services when possible
- Never commit `.env` files to GitHub (they're in `.gitignore`)

---

## Quick Reference

| Action | Command |
|--------|---------|
| Switch to dev | `git checkout dev` |
| Switch to main | `git checkout main` |
| Push to dev | `git push origin dev` |
| Merge dev → main | `git checkout main && git merge dev && git push origin main` |
| Migrate dev DB | `DATABASE_URL="dev-url" npx prisma migrate deploy` |
| Migrate prod DB | `DATABASE_URL="prod-url" npx prisma migrate deploy` |
