'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calendar,
  Plus,
  Video,
  Clock,
  Link2,
  Copy,
  ExternalLink,
  Trash2,
  Edit2,
  Check,
  X,
  Users,
  CalendarCheck,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Plug,
  Unplug,
  Sparkles,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import PageHeader from '@/components/shared/PageHeader';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type EventType = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  duration: number;
  meetLink?: string | null;
  active: boolean;
  createdAt: string;
  _count: { bookings: number };
};

type Booking = {
  id: string;
  name: string;
  email: string;
  startTime: string;
  endTime: string;
  status: 'CONFIRMED' | 'CANCELLED';
  meetLink?: string | null;          // per-booking dynamic link
  googleCalendarEventId?: string | null;
  eventType: {
    title: string;
    duration: number;
    meetLink?: string | null;         // static fallback
    slug: string;
  };
};

type GoogleCalStatus = {
  connected: boolean;
  configured: boolean;
  connectedAt?: string | null;
};

type Tab = 'events' | 'bookings';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function BookingStatusBadge({ status }: { status: Booking['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        status === 'CONFIRMED'
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-rose-500/15 text-rose-400'
      )}
    >
      {status === 'CONFIRMED' ? <Check size={10} className="mr-1" /> : <X size={10} className="mr-1" />}
      {status === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}
    </span>
  );
}

export default function SchedulingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [tab, setTab] = useState<Tab>('events');

  // Google Calendar state
  const [gcalStatus, setGcalStatus] = useState<GoogleCalStatus | null>(null);
  const [gcalLoading, setGcalLoading] = useState(true);
  const [gcalDisconnecting, setGcalDisconnecting] = useState(false);
  const [gcalBanner, setGcalBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Event Types State
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDuration, setFormDuration] = useState(30);
  const [formMeetLink, setFormMeetLink] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [slugManuallySet, setSlugManuallySet] = useState(false);

  // Bookings State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'CONFIRMED' | 'ALL'>('CONFIRMED');

  // Availability State
  const [availability, setAvailability] = useState<any[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [availabilityDay, setAvailabilityDay] = useState('MONDAY');
  const [availabilityStart, setAvailabilityStart] = useState('09:00');
  const [availabilityEnd, setAvailabilityEnd] = useState('17:00');

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const username = (user as any)?.username;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const fetchEventTypes = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await fetch('/api/event-types');
      if (res.ok) {
        const data = await res.json();
        setEventTypes(data.eventTypes);
      }
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const res = await fetch(`/api/bookings?status=${bookingStatus}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings);
      }
    } finally {
      setBookingsLoading(false);
    }
  }, [bookingStatus]);

  const fetchGcalStatus = useCallback(async () => {
    setGcalLoading(true);
    try {
      const res = await fetch('/api/auth/google-calendar/status');
      if (res.ok) setGcalStatus(await res.json());
    } finally {
      setGcalLoading(false);
    }
  }, []);

  const handleGcalDisconnect = async () => {
    if (!confirm('Disconnect Google Calendar? New bookings will use the static Meet link fallback.')) return;
    setGcalDisconnecting(true);
    const res = await fetch('/api/auth/google-calendar/disconnect', { method: 'DELETE' });
    setGcalDisconnecting(false);
    if (res.ok) {
      setGcalBanner({ type: 'success', msg: 'Google Calendar disconnected.' });
      fetchGcalStatus();
    } else {
      setGcalBanner({ type: 'error', msg: 'Failed to disconnect. Try again.' });
    }
  };

  useEffect(() => {
    fetchEventTypes();
    fetchGcalStatus();
  }, [fetchEventTypes, fetchGcalStatus]);

  useEffect(() => {
    if (tab === 'bookings') fetchBookings();
    if (tab === 'availability') fetchAvailability();
  }, [tab, fetchBookings, fetchAvailability]);

  // Handle OAuth callback params
  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected === 'true') {
      setGcalBanner({ type: 'success', msg: '✓ Google Calendar connected! Bookings will now generate unique Meet links.' });
      fetchGcalStatus();
      router.replace('/dashboard/scheduling');
    } else if (error) {
      const msgs: Record<string, string> = {
        access_denied: 'You denied Google Calendar access.',
        no_refresh_token: 'No refresh token received. Please try again — make sure to grant all permissions.',
        callback_failed: 'OAuth callback failed. Check your Google Cloud credentials.',
      };
      setGcalBanner({ type: 'error', msg: msgs[error] ?? `OAuth error: ${error}` });
      router.replace('/dashboard/scheduling');
    }
  }, [searchParams, router, fetchGcalStatus]);

  const openCreateForm = () => {
    setEditingEvent(null);
    setFormTitle('');
    setFormSlug('');
    setFormDesc('');
    setFormDuration(30);
    setFormMeetLink('');
    setFormError('');
    setSlugManuallySet(false);
    setShowForm(true);
  };

  const openEditForm = (event: EventType) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormSlug(event.slug);
    setFormDesc(event.description || '');
    setFormDuration(event.duration);
    setFormMeetLink(event.meetLink || '');
    setFormError('');
    setSlugManuallySet(true);
    setShowForm(true);
  };

  const handleTitleChange = (val: string) => {
    setFormTitle(val);
    if (!slugManuallySet) {
      setFormSlug(slugify(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      const body = {
        title: formTitle,
        slug: formSlug,
        description: formDesc || null,
        duration: formDuration,
        meetLink: formMeetLink || null,
      };

      const url = editingEvent ? `/api/event-types/${editingEvent.id}` : '/api/event-types';
      const method = editingEvent ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Something went wrong');
        return;
      }

      setShowForm(false);
      fetchEventTypes();
    } finally {
      setFormSubmitting(false);
    }
  };

  const toggleActive = async (event: EventType) => {
    await fetch(`/api/event-types/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !event.active }),
    });
    fetchEventTypes();
  };

  const deleteEvent = async (event: EventType) => {
    if (!confirm(`Delete "${event.title}"? All its bookings will also be removed.`)) return;
    await fetch(`/api/event-types/${event.id}`, { method: 'DELETE' });
    fetchEventTypes();
  };

  const cancelBooking = async (bookingId: string) => {
    if (!confirm('Cancel this booking?')) return;
    await fetch(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    fetchBookings();
  };

  const addAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/scheduling/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayOfWeek: availabilityDay,
          startTime: availabilityStart,
          endTime: availabilityEnd,
          isAvailable: true
        }),
      });
      if (res.ok) {
        setShowAvailabilityForm(false);
        fetchAvailability();
      }
    } catch (error) {
      console.error('Failed to add availability:', error);
    }
  };

  const deleteAvailability = async (id: string) => {
    if (!confirm('Delete this availability slot?')) return;
    await fetch(`/api/scheduling/availability/${id}`, { method: 'DELETE' });
    fetchAvailability();
  };

  const updatePreferences = async (updates: any) => {
    try {
      const res = await fetch('/api/scheduling/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  const copyLink = (slug: string) => {
    const link = `${origin}/book/${username}/${slug}`;
    navigator.clipboard.writeText(link);
    setCopiedId(slug);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (userLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Admin Only"
        title="Scheduling"
        subtitle="Create shareable meeting links and manage bookings — powered by Google Meet."
      />

      {/* Google Calendar Banner */}
      {gcalBanner && (
        <div className={cn(
          'flex items-start gap-3 rounded-2xl border px-4 py-3',
          gcalBanner.type === 'success'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
        )}>
          {gcalBanner.type === 'success'
            ? <Check size={15} className="mt-0.5 shrink-0" />
            : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
          <p className="text-sm flex-1">{gcalBanner.msg}</p>
          <button onClick={() => setGcalBanner(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Google Calendar Connect Card */}
      {!gcalLoading && gcalStatus && (
        <GlassCard variant="panel" padding="none">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                gcalStatus.connected
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-white/15 bg-white/5 text-muted-foreground'
              )}>
                {gcalStatus.connected ? <Plug size={18} /> : <Unplug size={18} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">Google Calendar</p>
                  {gcalStatus.connected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      <Check size={9} /> Connected
                    </span>
                  )}
                  {!gcalStatus.configured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                      Not Configured
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {gcalStatus.connected
                    ? 'Each booking creates a unique Google Meet link automatically.'
                    : gcalStatus.configured
                      ? 'Connect to generate unique Meet links for every booking.'
                      : 'Add GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI to your .env file.'}
                </p>
              </div>
            </div>
            <div className="shrink-0">
              {gcalStatus.connected ? (
                <button
                  onClick={handleGcalDisconnect}
                  disabled={gcalDisconnecting}
                  className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-2 text-sm font-semibold text-rose-400/80 hover:bg-rose-500/15 hover:text-rose-400 transition-all disabled:opacity-50"
                >
                  <Unplug size={13} />
                  {gcalDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              ) : gcalStatus.configured ? (
                <a
                  href="/api/auth/google-calendar"
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-all"
                >
                  <Sparkles size={13} />
                  Connect Google Calendar
                </a>
              ) : null}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Username warning */}
      {!username && (
        <GlassCard variant="panel" className="border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3 p-4">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-300">Username required</p>
              <p className="mt-0.5 text-sm text-amber-300/70">
                Set a username in your{' '}
                <button
                  onClick={() => router.push('/profile')}
                  className="underline underline-offset-2 hover:text-amber-200"
                >
                  profile
                </button>{' '}
                before creating event types. Your booking link will be{' '}
                <span className="font-mono">
                  {origin}/book/YOUR_USERNAME/slug
                </span>
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 w-fit">
        {(['events', 'bookings', 'availability'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200',
              tab === t
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/8'
            )}
          >
            {t === 'events' ? <Calendar size={14} /> : t === 'bookings' ? <CalendarCheck size={14} /> : <Clock size={14} />}
            {t === 'events' ? 'Event Types' : t === 'bookings' ? 'Bookings' : 'Availability'}
          </button>
        ))}
      </div>

      {/* ── EVENT TYPES TAB ── */}
      {tab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {eventTypes.length} event type{eventTypes.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={openCreateForm}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-all hover:bg-primary/90 hover:shadow-md"
            >
              <Plus size={15} />
              New Event Type
            </button>
          </div>

          {/* Create/Edit Form */}
          {showForm && (
            <GlassCard variant="panel" padding="none">
              <div className="border-b border-white/10 px-6 py-4">
                <h3 className="text-base font-semibold text-foreground">
                  {editingEvent ? 'Edit Event Type' : 'Create Event Type'}
                </h3>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5 p-6">
                {formError && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                    <AlertCircle size={15} />
                    {formError}
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="e.g. 30 Min Intro Call"
                      required
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      URL Slug *
                    </label>
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => { setFormSlug(e.target.value); setSlugManuallySet(true); }}
                      placeholder="e.g. intro-call"
                      required
                      disabled={!!editingEvent}
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                    />
                    {username && formSlug && (
                      <p className="text-[11px] text-muted-foreground font-mono truncate">
                        {origin}/book/{username}/{formSlug}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Description
                  </label>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="A brief description of this meeting type..."
                    rows={2}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Duration
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DURATION_OPTIONS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setFormDuration(d)}
                          className={cn(
                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150',
                            formDuration === d
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-white/15 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                          )}
                        >
                          {d}m
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Google Meet Link
                    </label>
                    <input
                      type="url"
                      value={formMeetLink}
                      onChange={(e) => setFormMeetLink(e.target.value)}
                      placeholder="https://meet.google.com/xxx-yyyy-zzz"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-white/8 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow transition-all hover:bg-primary/90 disabled:opacity-60"
                  >
                    {formSubmitting && (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    )}
                    {editingEvent ? 'Save Changes' : 'Create Event Type'}
                  </button>
                </div>
              </form>
            </GlassCard>
          )}

          {/* Event Types List */}
          {eventsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : eventTypes.length === 0 ? (
            <GlassCard variant="panel" className="flex flex-col items-center justify-center py-16 gap-3">
              <Calendar size={40} className="text-muted-foreground/30" />
              <p className="text-sm font-semibold text-muted-foreground">No event types yet</p>
              <p className="text-xs text-muted-foreground/60">Create your first scheduling link above.</p>
            </GlassCard>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {eventTypes.map((event) => (
                <GlassCard key={event.id} variant="panel" padding="none" className={cn(!event.active && 'opacity-60')}>
                  <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {event.duration} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={11} />
                            {event._count.bookings} booking{event._count.bookings !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleActive(event)}
                        title={event.active ? 'Deactivate' : 'Activate'}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {event.active
                          ? <ToggleRight size={22} className="text-emerald-400" />
                          : <ToggleLeft size={22} />
                        }
                      </button>
                    </div>

                    {event.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                    )}

                    {event.meetLink && (
                      <a
                        href={event.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <Video size={12} />
                        Google Meet link
                        <ExternalLink size={10} />
                      </a>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 border-t border-white/10 pt-3">
                      {username && (
                        <button
                          onClick={() => copyLink(event.slug)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
                        >
                          {copiedId === event.slug ? (
                            <><Check size={12} className="text-emerald-400" /> Copied!</>
                          ) : (
                            <><Copy size={12} /> Copy Link</>
                          )}
                        </button>
                      )}
                      {username && (
                        <a
                          href={`/book/${username}/${event.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center rounded-lg border border-white/15 bg-white/5 p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
                          title="Preview"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                      <button
                        onClick={() => openEditForm(event)}
                        className="flex items-center justify-center rounded-lg border border-white/15 bg-white/5 p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
                        title="Edit"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => deleteEvent(event)}
                        className="flex items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/5 p-1.5 text-rose-400/60 hover:bg-rose-500/15 hover:text-rose-400 transition-all"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Booking link preview */}
                    {username && (
                      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                        <Link2 size={11} className="shrink-0 text-muted-foreground/50" />
                        <span className="text-[10px] font-mono text-muted-foreground/60 truncate">
                          /book/{username}/{event.slug}
                        </span>
                      </div>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BOOKINGS TAB ── */}
      {tab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1 w-fit">
              {(['CONFIRMED', 'ALL'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setBookingStatus(s)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150',
                    bookingStatus === s
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s === 'CONFIRMED' ? 'Upcoming' : 'All'}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>
          </div>

          {bookingsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : bookings.length === 0 ? (
            <GlassCard variant="panel" className="flex flex-col items-center justify-center py-16 gap-3">
              <CalendarCheck size={40} className="text-muted-foreground/30" />
              <p className="text-sm font-semibold text-muted-foreground">No bookings yet</p>
              <p className="text-xs text-muted-foreground/60">Share your event links to receive bookings.</p>
            </GlassCard>
          ) : (
            <GlassCard variant="panel" padding="none">
              <div className="divide-y divide-white/10">
                {bookings.map((booking) => (
                  <div key={booking.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm">{booking.name}</span>
                        <BookingStatusBadge status={booking.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{booking.email}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="font-medium text-foreground/70">{booking.eventType.title}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatDateTime(booking.startTime)}
                        </span>
                        <span>·</span>
                        <span>{booking.eventType.duration} min</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {(booking.meetLink || booking.eventType.meetLink) && (
                        <a
                          href={(booking.meetLink || booking.eventType.meetLink)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all"
                        >
                          <Video size={12} />
                          Join Meet
                          {booking.meetLink && booking.googleCalendarEventId && (
                            <span className="ml-1 rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] font-bold">LIVE</span>
                          )}
                        </a>
                      )}
                      {booking.status === 'CONFIRMED' && (
                        <button
                          onClick={() => cancelBooking(booking.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-xs font-semibold text-rose-400/70 hover:bg-rose-500/15 hover:text-rose-400 transition-all"
                        >
                          <X size={12} />
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* ── AVAILABILITY TAB ── */}
      {tab === 'availability' && (
        <div className="space-y-6">
          {/* Scheduling Preferences */}
          <GlassCard variant="panel" padding="none">
            <div className="border-b border-white/10 px-6 py-4">
              <h3 className="text-base font-semibold text-foreground">Scheduling Preferences</h3>
            </div>
            <div className="p-6 space-y-6">
              {preferences ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Timezone</label>
                    <select
                      value={preferences.timezone}
                      onChange={(e) => updatePreferences({ timezone: e.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                      <option value="Asia/Shanghai">Shanghai</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Default Slot Duration (min)</label>
                    <input
                      type="number"
                      value={preferences.slotDuration}
                      onChange={(e) => updatePreferences({ slotDuration: parseInt(e.target.value) })}
                      min="15"
                      max="180"
                      step="15"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Buffer Before (min)</label>
                    <input
                      type="number"
                      value={preferences.bufferBefore}
                      onChange={(e) => updatePreferences({ bufferBefore: parseInt(e.target.value) })}
                      min="0"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Buffer After (min)</label>
                    <input
                      type="number"
                      value={preferences.bufferAfter}
                      onChange={(e) => updatePreferences({ bufferAfter: parseInt(e.target.value) })}
                      min="0"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Minimum Notice (min)</label>
                    <input
                      type="number"
                      value={preferences.minimumNotice}
                      onChange={(e) => updatePreferences({ minimumNotice: parseInt(e.target.value) })}
                      min="0"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Max Bookings Per Day</label>
                    <input
                      type="number"
                      value={preferences.maxBookingsPerDay}
                      onChange={(e) => updatePreferences({ maxBookingsPerDay: parseInt(e.target.value) })}
                      min="1"
                      max="50"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex h-20 items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
          </GlassCard>

          {/* Weekly Availability */}
          <GlassCard variant="panel" padding="none">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h3 className="text-base font-semibold text-foreground">Weekly Availability</h3>
              <button
                onClick={() => setShowAvailabilityForm(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-all hover:bg-primary/90 hover:shadow-md"
              >
                <Plus size={15} />
                Add Time Slot
              </button>
            </div>
            
            {showAvailabilityForm && (
              <div className="border-b border-white/10 p-6 bg-white/[0.02]">
                <form onSubmit={addAvailability} className="grid gap-4 sm:grid-cols-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Day</label>
                    <select
                      value={availabilityDay}
                      onChange={(e) => setAvailabilityDay(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                      <option value="MONDAY">Monday</option>
                      <option value="TUESDAY">Tuesday</option>
                      <option value="WEDNESDAY">Wednesday</option>
                      <option value="THURSDAY">Thursday</option>
                      <option value="FRIDAY">Friday</option>
                      <option value="SATURDAY">Saturday</option>
                      <option value="SUNDAY">Sunday</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Start Time</label>
                    <input
                      type="time"
                      value={availabilityStart}
                      onChange={(e) => setAvailabilityStart(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">End Time</label>
                    <input
                      type="time"
                      value={availabilityEnd}
                      onChange={(e) => setAvailabilityEnd(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:bg-primary/90"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAvailabilityForm(false)}
                      className="flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="p-6 space-y-3">
              {availabilityLoading ? (
                <div className="flex h-20 items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : availability.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Clock size={40} className="text-muted-foreground/30" />
                  <p className="text-sm font-semibold text-muted-foreground">No availability set</p>
                  <p className="text-xs text-muted-foreground/60">Add time slots above to define when you're available for meetings.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availability.map((avail) => (
                    <div
                      key={avail.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-foreground w-24">{avail.dayOfWeek}</span>
                        <span className="text-sm text-muted-foreground">
                          {avail.startTime} - {avail.endTime}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteAvailability(avail.id)}
                        className="flex items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/5 p-1.5 text-rose-400/60 hover:bg-rose-500/15 hover:text-rose-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
