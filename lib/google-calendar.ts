import 'server-only';

import { google } from 'googleapis';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env.server';

// ── OAuth2 Client ──────────────────────────────────────────────────────────────
export function createOAuth2Client() {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI.'
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function isGoogleOAuthConfigured() {
  return Boolean(
    env.GOOGLE_OAUTH_CLIENT_ID &&
    env.GOOGLE_OAUTH_CLIENT_SECRET &&
    env.GOOGLE_OAUTH_REDIRECT_URI
  );
}

// ── Authorization URL ─────────────────────────────────────────────────────────
export function getGoogleAuthUrl(): string {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Always get refresh token
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  });
}

// ── Exchange code for tokens ──────────────────────────────────────────────────
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// ── Store tokens for a user ───────────────────────────────────────────────────
export async function storeGoogleTokens(
  userId: string,
  tokens: {
    access_token: string;
    refresh_token?: string | null;
    expiry_date?: number | null;
  }
) {
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Missing access_token or refresh_token from Google OAuth response.');
  }

  await prisma.googleCalendarToken.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000),
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000),
    },
  });
}

// ── Get a refreshed OAuth2 client for a user ─────────────────────────────────
export async function getAuthenticatedClient(userId: string) {
  const tokenRecord = await prisma.googleCalendarToken.findUnique({
    where: { userId },
  });

  if (!tokenRecord) {
    throw new Error('Google Calendar not connected. Please connect your Google Calendar first.');
  }

  const oauth2Client = createOAuth2Client();

  oauth2Client.setCredentials({
    access_token: tokenRecord.accessToken,
    refresh_token: tokenRecord.refreshToken,
    expiry_date: tokenRecord.expiresAt.getTime(),
  });

  // Auto-refresh if token is expired (or will expire in the next 60 seconds)
  if (tokenRecord.expiresAt.getTime() < Date.now() + 60 * 1000) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    // Persist new tokens
    await prisma.googleCalendarToken.update({
      where: { userId },
      data: {
        accessToken: credentials.access_token!,
        ...(credentials.refresh_token ? { refreshToken: credentials.refresh_token } : {}),
        expiresAt: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : new Date(Date.now() + 3600 * 1000),
      },
    });
  }

  return oauth2Client;
}

// ── Create a Google Calendar event with Google Meet ───────────────────────────
export type CreateMeetEventParams = {
  hostUserId: string;
  title: string;
  description?: string | null;
  guestName: string;
  guestEmail: string;
  startTime: Date;
  endTime: Date;
};

export type CreatedMeetEvent = {
  googleCalendarEventId: string;
  meetLink: string;
};

export async function createMeetEvent(params: CreateMeetEventParams): Promise<CreatedMeetEvent> {
  const { hostUserId, title, description, guestName, guestEmail, startTime, endTime } = params;

  const auth = await getAuthenticatedClient(hostUserId);
  const calendar = google.calendar({ version: 'v3', auth });

  const requestId = `loomdesk-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const event = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody: {
      summary: title,
      description: description
        ? `${description}\n\nBooked by ${guestName} (${guestEmail}) via Loomdesk Scheduling.`
        : `Booked by ${guestName} (${guestEmail}) via Loomdesk Scheduling.`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: [
        { email: guestEmail, displayName: guestName },
      ],
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    },
  });

  const meetLink =
    event.data.hangoutLink ||
    event.data.conferenceData?.entryPoints?.[0]?.uri;

  if (!meetLink) {
    throw new Error('Google Meet link was not generated. Ensure the Google Calendar API has Meet enabled.');
  }

  return {
    googleCalendarEventId: event.data.id!,
    meetLink,
  };
}

// ── Delete a Google Calendar event ───────────────────────────────────────────
export async function deleteMeetEvent(hostUserId: string, googleCalendarEventId: string) {
  try {
    const auth = await getAuthenticatedClient(hostUserId);
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleCalendarEventId,
      sendUpdates: 'all',
    });
  } catch (error: any) {
    // If the event is already deleted or not found, ignore
    if (error?.code === 410 || error?.code === 404) return;
    throw error;
  }
}

// ── Disconnect ────────────────────────────────────────────────────────────────
export async function disconnectGoogleCalendar(userId: string) {
  const tokenRecord = await prisma.googleCalendarToken.findUnique({ where: { userId } });
  if (!tokenRecord) return;

  // Try to revoke the token at Google
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: tokenRecord.refreshToken });
    await oauth2Client.revokeToken(tokenRecord.refreshToken);
  } catch {
    // Ignore revocation errors — we still delete the record
  }

  await prisma.googleCalendarToken.delete({ where: { userId } });
}
