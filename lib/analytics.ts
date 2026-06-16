'use client';

export interface AnalyticsEvent {
  id: string;
  timestamp: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
}

export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number
) => {
  if (typeof window === 'undefined') return;

  try {
    const event: AnalyticsEvent = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      category,
      action,
      label,
      value,
    };

    const stored = localStorage.getItem('loomdesk_analytics_events');
    let events: AnalyticsEvent[] = [];
    if (stored) {
      events = JSON.parse(stored);
    }

    events.unshift(event);
    // Limit to last 200 events to manage storage size
    events = events.slice(0, 200);

    localStorage.setItem('loomdesk_analytics_events', JSON.stringify(events));

    // Optional dispatch for real-time console updates
    window.dispatchEvent(
      new CustomEvent('loomdesk_new_analytics_event', { detail: event })
    );
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

export const getAnalyticsEvents = (): AnalyticsEvent[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('loomdesk_analytics_events');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const clearAnalyticsEvents = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('loomdesk_analytics_events');
};
