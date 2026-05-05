# LoomDesk Scheduling Feature Setup Guide

This guide will help you set up and configure the production-ready scheduling feature for LoomDesk.

## Overview

The scheduling feature includes:
- **User Scheduling Profiles**: Public booking pages with customizable availability
- **Calendar Availability Engine**: Dynamic time slot generation with timezone support
- **Booking Flow**: Clean, Calendly-inspired booking interface
- **Race Condition Protection**: Database transactions to prevent double-booking
- **Email Notifications**: Confirmation emails with .ics calendar invites
- **Google Calendar Integration**: Automatic Meet link generation and event sync
- **Analytics Dashboard**: Track booking statistics and trends

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- Google Cloud Project (for Calendar integration)
- Resend account (for email)

## Setup Instructions

### 1. Database Migration

The Prisma schema has been updated with new models for scheduling. Run the migration:

```bash
npx prisma migrate dev --name add_scheduling_features
```

Or if you're in production:

```bash
npx prisma migrate deploy
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Google Calendar OAuth (required for automatic Meet links)
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
GOOGLE_OAUTH_REDIRECT_URI=https://yourdomain.com/api/auth/google-calendar/callback

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_REPLY_TO=support@yourdomain.com
```

### 4. Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs:
     - Development: `http://localhost:3000/api/auth/google-calendar/callback`
     - Production: `https://yourdomain.com/api/auth/google-calendar/callback`
5. Copy Client ID and Client Secret to your `.env` file

### 5. Resend Email Setup

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Add your domain and verify DNS records
4. Copy API key to your `.env` file

### 6. User Setup

Each user needs to:
1. Set a username in their profile (required for booking links)
2. Configure their scheduling preferences:
   - Timezone
   - Working hours
   - Buffer times
   - Minimum notice period
   - Slot duration
3. Create event types (e.g., "30min Call", "1hr Consultation")
4. Optionally connect Google Calendar

## Usage

### For Hosts

1. Navigate to `/dashboard/scheduling`
2. Configure your availability in the "Availability" tab
3. Create event types in the "Event Types" tab
4. Copy booking links and share with clients
5. View and manage bookings in the "Bookings" tab
6. Check analytics at `/dashboard/scheduling/analytics`

### For Invitees

1. Visit the host's booking link (e.g., `https://yourdomain.com/username/event-slug`)
2. Select a date from the calendar
3. Choose an available time slot
4. Enter name and email
5. Confirm booking
6. Receive confirmation email with calendar invite

## API Endpoints

### Public Endpoints

- `GET /api/public/users/[username]/[slug]` - Get event type and booked slots
- `POST /api/public/bookings` - Create a new booking

### Protected Endpoints (Require Auth)

- `GET /api/scheduling/availability` - Get user's availability and preferences
- `POST /api/scheduling/availability` - Create availability slot
- `DELETE /api/scheduling/availability/[id]` - Delete availability slot
- `PATCH /api/scheduling/preferences` - Update scheduling preferences
- `GET /api/scheduling/analytics` - Get booking statistics
- `GET /api/event-types` - Get user's event types
- `POST /api/event-types` - Create event type
- `PATCH /api/event-types/[id]` - Update event type
- `DELETE /api/event-types/[id]` - Delete event type
- `GET /api/bookings` - Get user's bookings
- `PATCH /api/bookings/[id]` - Update booking (cancel/reschedule)

## Features

### Availability Engine

- Dynamic slot generation based on user preferences
- Timezone-aware calculations
- Buffer time support (before/after meetings)
- Minimum notice requirements
- Maximum bookings per day limit
- Working day configuration

### Booking System

- Race condition protection using database transactions
- Double-booking prevention
- Real-time slot validation
- Automatic Google Meet link generation
- Google Calendar event creation
- Email notifications with .ics attachments

### Email Notifications

- Booking confirmation to both host and invitee
- Calendar invite (.ics file) attached
- Reschedule notifications
- Cancellation notifications
- Professional email templates

### Google Calendar Integration

- OAuth 2.0 authentication flow
- Automatic Meet link generation
- Event creation on booking
- Event deletion on cancellation
- Event update on reschedule
- Busy time fetching (for future use)

## Deployment

### Vercel Deployment

1. Set environment variables in Vercel dashboard
2. Deploy the application
3. Update Google OAuth redirect URI to production URL
4. Run database migrations

### Environment Variables for Vercel

```bash
DATABASE_URL=your_production_database_url
AUTH_SECRET=your_auth_secret
NEXTAUTH_URL=https://yourdomain.com
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
GOOGLE_OAUTH_REDIRECT_URI=https://yourdomain.com/api/auth/google-calendar/callback
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_REPLY_TO=support@yourdomain.com
```

## Troubleshooting

### TypeScript Errors

If you see TypeScript errors about missing Prisma models:

```bash
npx prisma generate
```

### Google Calendar Connection Issues

1. Verify OAuth credentials are correct
2. Check redirect URI matches exactly
3. Ensure Google Calendar API is enabled
4. Verify consent screen is configured

### Email Not Sending

1. Check Resend API key is valid
2. Verify domain is verified in Resend
3. Check email configuration in environment variables
4. Review server logs for errors

### Booking Conflicts

The system uses database transactions to prevent double-booking. If you encounter conflicts:
1. Check database connection is stable
2. Verify transaction isolation level
3. Review logs for concurrent booking attempts

## Future Enhancements

- Stripe integration for paid meetings
- Group event support
- Round-robin scheduling for teams
- Outlook calendar integration
- SMS notifications
- Recurring meetings
- Custom booking fields
- Webhook integrations
- Advanced analytics with charts

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs
3. Check database connection
4. Verify environment variables
