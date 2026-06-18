# Deployment Guide - Production & Development

This guide explains how to set up and manage two deployment channels for Loomdesk: **Production** (main branch) and **Development** (dev branch).

## Overview

- **Production**: Live deployment for users (main branch)
- **Development**: Testing environment for fixes and features (dev branch)
- Each environment uses a separate database to prevent data contamination

## Prerequisites

- Two PostgreSQL databases (one for production, one for development)
- Vercel account (or your preferred hosting platform)
- GitHub repository with `main` and `dev` branches

---

## Step 1: Set Up Separate Databases

### Production Database
Create a PostgreSQL database for production:
```bash
# Example using Supabase, Neon, or your PostgreSQL provider
# Database name: loomdesk-prod
# Save the connection string as: DATABASE_URL_PROD
```

### Development Database
Create a separate PostgreSQL database for development:
```bash
# Example using Supabase, Neon, or your PostgreSQL provider
# Database name: loomdesk-dev
# Save the connection string as: DATABASE_URL_DEV
```

---

## Step 2: Configure Vercel Environments

### Option A: Using Vercel (Recommended)

1. **Connect your GitHub repository to Vercel**
   - Go to Vercel dashboard → Add New Project
   - Import your GitHub repository

2. **Set up Production Environment**
   - In Vercel project settings → Environment Variables
   - Add the following variables for **Production**:
     ```
     DATABASE_URL=postgresql://user:password@prod-host:5432/loomdesk-prod
     AUTH_SECRET=your-production-auth-secret
     NEXTAUTH_URL=https://your-production-domain.com
     CORS_ALLOWED_ORIGINS=https://your-production-domain.com
     RESEND_API_KEY=your-production-resend-key
     EMAIL_FROM=noreply@yourdomain.com
     EMAIL_REPLY_TO=support@yourdomain.com
     GOOGLE_CALENDAR_API_KEY=your-google-calendar-api-key
     NEXT_PUBLIC_SUPABASE_URL=your-prod-supabase-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-supabase-anon-key
     ```

3. **Set up Development Environment**
   - In Vercel project settings → Environments
   - Add the same variables for **Preview** (this will be used for dev branch):
     ```
     DATABASE_URL=postgresql://user:password@dev-host:5432/loomdesk-dev
     AUTH_SECRET=your-dev-auth-secret
     NEXTAUTH_URL=https://your-dev-domain.vercel.app
     CORS_ALLOWED_ORIGINS=https://your-dev-domain.vercel.app
     RESEND_API_KEY=your-dev-resend-key
     EMAIL_FROM=noreply@yourdomain.com
     EMAIL_REPLY_TO=support@yourdomain.com
     GOOGLE_CALENDAR_API_KEY=your-google-calendar-api-key
     NEXT_PUBLIC_SUPABASE_URL=your-dev-supabase-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-supabase-anon-key
     ```

4. **Configure Branch Deployment**
   - In Vercel project settings → Git
   - Set **Production Branch** to `main`
   - Set **Preview Branches** to include `dev`

### Option B: Using Docker

If you prefer Docker deployment:

1. **Create separate `.env` files**:
   ```bash
   # .env.production
   DATABASE_URL=postgresql://user:password@prod-host:5432/loomdesk-prod
   AUTH_SECRET=your-production-auth-secret
   NEXTAUTH_URL=https://your-production-domain.com
   # ... other production variables

   # .env.development
   DATABASE_URL=postgresql://user:password@dev-host:5432/loomdesk-dev
   AUTH_SECRET=your-dev-auth-secret
   NEXTAUTH_URL=https://your-dev-domain.com
   # ... other development variables
   ```

2. **Build and deploy for each environment**:
   ```bash
   # Production
   docker build --build-arg NODE_ENV=production -t loomdesk:prod .
   docker run -d --env-file .env.production -p 3000:3000 loomdesk:prod

   # Development
   docker build --build-arg NODE_ENV=development -t loomdesk:dev .
   docker run -d --env-file .env.development -p 3001:3000 loomdesk:dev
   ```

---

## Step 3: Database Migrations

### Running Migrations Separately

When you make schema changes, run migrations on both databases:

```bash
# Production database
DATABASE_URL="postgresql://user:password@prod-host:5432/loomdesk-prod" npx prisma migrate deploy

# Development database
DATABASE_URL="postgresql://user:password@dev-host:5432/loomdesk-dev" npx prisma migrate deploy
```

### Seeding Data (Optional)

If you need to seed test data in development:

```bash
DATABASE_URL="postgresql://user:password@dev-host:5432/loomdesk-dev" npx prisma db seed
```

---

## Step 4: Development Workflow

### Daily Development Cycle

1. **Switch to dev branch**:
   ```bash
   git checkout dev
   git pull origin dev
   ```

2. **Make your changes** (features, fixes, etc.)

3. **Test locally**:
   ```bash
   npm run dev
   # Uses your local .env file
   ```

4. **Commit and push to dev**:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin dev
   ```

5. **Deploy to development environment**:
   - Vercel will automatically deploy the `dev` branch as a Preview deployment
   - Test your changes on the development URL
   - Verify everything works as expected

### Promoting to Production

Once you're satisfied with changes in development:

1. **Merge dev to main**:
   ```bash
   git checkout main
   git pull origin main
   git merge dev
   git push origin main
   ```

   **OR** use GitHub:
   - Create a Pull Request from `dev` to `main`
   - Review the changes
   - Merge the PR

2. **Automatic Production Deployment**:
   - Vercel will automatically deploy the `main` branch to Production
   - Production database will be used
   - Your changes are now live for users

3. **Sync dev branch** (optional, to keep them in sync):
   ```bash
   git checkout dev
   git merge main
   git push origin dev
   ```

---

## Step 5: Best Practices

### Database Safety
- **Never** use the production database for testing
- Always test migrations on the development database first
- Keep production database backups

### Environment Variables
- Use different `AUTH_SECRET` for each environment
- Use different API keys for services (Resend, Supabase, etc.) if possible
- Never commit `.env` files to GitHub

### Branch Management
- Keep `dev` branch for active development
- Keep `main` branch stable and production-ready
- Use feature branches for larger changes:
  ```bash
  git checkout -b feature/new-feature dev
  # Work on feature
  git checkout dev
  git merge feature/new-feature
  ```

### Testing Before Production
1. Test locally with development database
2. Deploy to development environment (dev branch)
3. Test thoroughly on development URL
4. Merge to main only after testing

---

## Step 6: Troubleshooting

### Deployment Fails
- Check Vercel deployment logs
- Verify all environment variables are set
- Ensure database migrations ran successfully

### Database Connection Issues
- Verify database connection strings
- Check database firewall settings
- Ensure database is accessible from Vercel

### Environment Variables Not Working
- Clear Vercel cache: `vercel --prod --force`
- Restart the deployment
- Check variable names match exactly

---

## Quick Reference

| Environment | Branch | Database | Deployment URL |
|-------------|--------|----------|----------------|
| Production | main | loomdesk-prod | your-production-domain.com |
| Development | dev | loomdesk-dev | your-dev-domain.vercel.app |

### Common Commands

```bash
# Switch to development
git checkout dev

# Switch to production
git checkout main

# Merge dev to main
git checkout main
git merge dev
git push origin main

# Run migrations on production
DATABASE_URL="prod-connection-string" npx prisma migrate deploy

# Run migrations on development
DATABASE_URL="dev-connection-string" npx prisma migrate deploy
```

---

## Summary

1. **Set up two separate databases** (production and development)
2. **Configure Vercel** with two environments (Production and Preview)
3. **Work on dev branch** for all development and testing
4. **Deploy to development** to test changes
5. **Merge dev to main** to promote to production
6. **Production deploys automatically** when main is updated

This workflow ensures your production environment remains stable while allowing you to test thoroughly before releasing changes.
