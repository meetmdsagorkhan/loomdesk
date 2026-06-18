/**
 * Google Calendar Integration
 * 
 * Handles syncing bookings with Google Calendar
 */

import { google } from 'googleapis';
import { prisma } from '@/lib/db';

interface CalendarEvent {
  id: string;
  hangoutLink?: string;
}

/**
 * Get Google Calendar client for a user
 */
async function getCalendarClient(userId: string) {
  const token = await prisma.googleCalendarToken.findUnique({
    where: { userId }
  });

  if (!token) {
    throw new Error('Google Calendar not connected');
  }

  // Check if token needs refresh
  if (new Date(token.expiresAt) < new Date()) {
    // Token refresh logic would go here
    // For now, throw error
    throw new Error('Google Calendar token expired. Please reconnect.');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken
  });

  return oauth2Client;
}

/**
 * Create an event in Google Calendar
 */
export async function createGoogleCalendarEvent(
  userId: string,
  startTime: Date,
  endTime: Date,
  title: string,
  description?: string
): Promise<CalendarEvent> {
  try {
    const auth = await getCalendarClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        description: description || '',
        start: {
          dateTime: startTime.toISOString(),
        },
        end: {
          dateTime: endTime.toISOString(),
        },
        conferenceData: {
          createRequest: {
            requestId: `loomdesk-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        },
        reminders: {
          useDefault: true,
        }
      },
      conferenceDataVersion: 1
    });

    return {
      id: event.data.id || '',
      hangoutLink: event.data.hangoutLink || undefined
    };
  } catch (error) {
    console.error('Failed to create Google Calendar event:', error);
    throw error;
  }
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  userId: string,
  eventId: string
): Promise<void> {
  try {
    const auth = await getCalendarClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId
    });
  } catch (error) {
    console.error('Failed to delete Google Calendar event:', error);
    throw error;
  }
}

/**
 * Get busy times from Google Calendar
 */
export async function getGoogleCalendarBusyTimes(
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<Array<{ start: Date; end: Date }>> {
  try {
    const auth = await getCalendarClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: [{ id: 'primary' }]
      }
    });

    const busyTimes: Array<{ start: Date; end: Date }> = [];

    if (response.data.calendars?.primary?.busy) {
      for (const busy of response.data.calendars.primary.busy) {
        if (busy.start && busy.end) {
          busyTimes.push({
            start: new Date(busy.start),
            end: new Date(busy.end)
          });
        }
      }
    }

    return busyTimes;
  } catch (error) {
    console.error('Failed to get Google Calendar busy times:', error);
    throw error;
  }
}

/**
 * Sync all bookings to Google Calendar (for initial setup or recovery)
 */
export async function syncBookingsToGoogleCalendar(userId: string): Promise<void> {
  const bookings = await prisma.booking.findMany({
    where: {
      eventType: { userId },
      status: 'CONFIRMED',
      googleCalendarEventId: null
    },
    include: {
      eventType: true
    }
  });

  for (const booking of bookings) {
    try {
      const calendarEvent = await createGoogleCalendarEvent(
        userId,
        booking.startTime,
        booking.endTime,
        `${booking.eventType.title} with ${booking.name}`,
        `Booking email: ${booking.email}`
      );

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          googleCalendarEventId: calendarEvent.id,
          meetLink: calendarEvent.hangoutLink
        }
      });
    } catch (error) {
      console.error(`Failed to sync booking ${booking.id} to Google Calendar:`, error);
    }
  }
}
