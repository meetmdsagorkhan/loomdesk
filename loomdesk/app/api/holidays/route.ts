import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env.server';

type GoogleCalendarEvent = {
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
  summary?: string;
  description?: string;
};

type Holiday = {
  date: string;
  name: string;
  description?: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    if (!year) {
      return NextResponse.json({ error: 'Year parameter required' }, { status: 400 });
    }

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 });
    }

    const apiKey = env.GOOGLE_CALENDAR_API_KEY;

    if (!apiKey) {
      logger.warn('Google Calendar API key not configured');
      return NextResponse.json({ holidays: [] });
    }

    const calendarId = 'en.bd#holiday@group.v.calendar.google.com';
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${yearNum}-01-01T00:00:00Z&timeMax=${yearNum}-12-31T23:59:59Z`;

    const response = await fetch(url);
    if (!response.ok) {
      logger.error('Failed to fetch holidays from Google Calendar API', {
        status: response.status,
      });
      return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 502 });
    }

    const data: { items?: GoogleCalendarEvent[] } = await response.json();
    const holidays: Holiday[] = [];

    data.items?.forEach((item) => {
      const startStrRaw = item.start?.date || item.start?.dateTime;
      const endStrRaw = item.end?.date || item.end?.dateTime;

      if (!startStrRaw) return;

      const startDateStr = startStrRaw.split('T')[0];
      const endDateStr = endStrRaw ? endStrRaw.split('T')[0] : null;

      const name = item.summary || 'Holiday';
      const description = item.description;

      holidays.push({ date: startDateStr, name, description });

      if (endDateStr && endDateStr !== startDateStr) {
        const [yr, month, day] = startDateStr.split('-').map(Number);
        const startObj = new Date(yr, month - 1, day);
        const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
        const endObj = new Date(endYear, endMonth - 1, endDay);

        startObj.setDate(startObj.getDate() + 1);
        while (startObj < endObj) {
          const dateStr = startObj.toISOString().split('T')[0];
          holidays.push({ date: dateStr, name, description });
          startObj.setDate(startObj.getDate() + 1);
        }
      }
    });

    return NextResponse.json({ holidays });
  } catch (error) {
    logger.error('Holidays API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
