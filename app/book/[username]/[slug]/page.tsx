'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Video,
  Check,
  AlertCircle,
  User,
  Mail,
} from 'lucide-react';

type EventType = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  duration: number;
};

type Host = {
  name: string;
  image?: string | null;
  position?: string | null;
  company?: string | null;
};

type BookedSlot = { startTime: string; endTime: string };

type ConfirmedBooking = {
  id: string;
  name: string;
  email: string;
  startTime: string;
  endTime: string;
  meetLink?: string | null;           // per-booking dynamic link
  eventType: {
    title: string;
    duration: number;
    meetLink?: string | null;         // static fallback
    user: { name: string; username: string };
  };
};

// Generate time slots for a day
function generateSlots(duration: number, bookedSlots: BookedSlot[], date: Date): Date[] {
  const slots: Date[] = [];
  const start = new Date(date);
  start.setHours(9, 0, 0, 0);
  const end = new Date(date);
  end.setHours(18, 0, 0, 0);

  const now = new Date();

  for (let t = new Date(start); t < end; t = new Date(t.getTime() + duration * 60000)) {
    // Skip past slots
    if (t <= now) continue;

    const slotEnd = new Date(t.getTime() + duration * 60000);

    // Check for conflicts with booked slots
    const isBooked = bookedSlots.some((b) => {
      const bs = new Date(b.startTime);
      const be = new Date(b.endTime);
      return t < be && slotEnd > bs;
    });

    if (!isBooked) {
      slots.push(new Date(t));
    }
  }

  return slots;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function BookSlotPage() {
  const params = useParams<{ username: string; slug: string }>();
  const { username, slug } = params;

  const [host, setHost] = useState<Host | null>(null);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Calendar state
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Time slot state
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);

  // Form state
  const [step, setStep] = useState<'calendar' | 'form' | 'confirmed'>('calendar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null);

  // Fetch event type info
  useEffect(() => {
    if (!username || !slug) return;
    fetch(`/api/public/users/${username}/${slug}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setEventType(data.eventType);
        setHost(data.host);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [username, slug]);

  // Fetch booked slots when date selected
  useEffect(() => {
    if (!selectedDate || !eventType || !username || !slug) return;
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    setSlotsLoading(true);
    fetch(`/api/public/users/${username}/${slug}?date=${dateStr}`)
      .then((r) => r.json())
      .then((data) => {
        setBookedSlots(data.bookedSlots || []);
        setSlotsLoading(false);
      })
      .catch(() => setSlotsLoading(false));
  }, [selectedDate, eventType, username, slug]);

  const availableSlots = useMemo(() => {
    if (!selectedDate || !eventType) return [];
    return generateSlots(eventType.duration, bookedSlots, selectedDate);
  }, [selectedDate, bookedSlots, eventType]);

  // Calendar helpers
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const isDateDisabled = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    d.setHours(0,0,0,0);
    return d < today || d.getDay() === 0 || d.getDay() === 6;
  };

  const handleDayClick = (day: number) => {
    if (isDateDisabled(day)) return;
    const d = new Date(calYear, calMonth, day);
    setSelectedDate(d);
    setSelectedSlot(null);
  };

  const handleSlotClick = (slot: Date) => {
    setSelectedSlot(slot);
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !eventType) return;
    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventTypeId: eventType.id,
          name,
          email,
          startTime: selectedSlot.toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to book. Please try again.');
        return;
      }

      setConfirmedBooking(data.booking);
      setStep('confirmed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !eventType || !host) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <AlertCircle size={48} className="mx-auto text-rose-400/60" />
          <h1 className="text-2xl font-bold text-white">Event not found</h1>
          <p className="text-slate-400">This scheduling link may be inactive or removed.</p>
          <Link href={`/book/${username}`} className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300">
            <ChevronLeft size={14} /> Back to {username}'s page
          </Link>
        </div>
      </div>
    );
  }

  // ─── Confirmation Screen ────────────────────────────────────────────────────
  if (step === 'confirmed' && confirmedBooking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-6">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-600/10 blur-[120px]" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-indigo-600/10 blur-[120px]" />
        </div>
        <div className="relative w-full max-w-md text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
            <Check size={32} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">You're booked!</h1>
            <p className="mt-2 text-slate-400">A confirmation has been sent to {confirmedBooking.email}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm text-left space-y-4">
            <h2 className="font-semibold text-white">{confirmedBooking.eventType.title}</h2>
            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex items-center gap-2.5">
                <Calendar size={15} className="text-indigo-400 shrink-0" />
                <span>{new Date(confirmedBooking.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock size={15} className="text-indigo-400 shrink-0" />
                <span>
                  {formatTime(new Date(confirmedBooking.startTime))} – {formatTime(new Date(confirmedBooking.endTime))} ({confirmedBooking.eventType.duration} min)
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <User size={15} className="text-indigo-400 shrink-0" />
                <span>with {confirmedBooking.eventType.user.name}</span>
              </div>
            </div>

            {(confirmedBooking.meetLink || confirmedBooking.eventType.meetLink) && (
              <a
                href={(confirmedBooking.meetLink || confirmedBooking.eventType.meetLink)!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 py-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/25 transition-all"
              >
                <Video size={16} />
                Join Google Meet
                {confirmedBooking.meetLink && (
                  <span className="ml-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold">Unique Link</span>
                )}
              </a>
            )}
          </div>

          <Link href={`/book/${username}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
            <ChevronLeft size={14} /> Schedule another meeting
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-violet-600/15 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        {/* Back link */}
        <Link href={`/book/${username}`} className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
          <ChevronLeft size={14} /> Back
        </Link>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* ── Left: Event Info ── */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 space-y-5 h-fit">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white overflow-hidden shadow-[0_4px_16px_rgba(99,102,241,0.3)]">
                {host.image ? <img src={host.image} alt={host.name} className="w-full h-full object-cover" /> : getInitials(host.name)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white truncate">{host.name}</p>
                {(host.position || host.company) && (
                  <p className="text-xs text-slate-400 truncate">{[host.position, host.company].filter(Boolean).join(' · ')}</p>
                )}
              </div>
            </div>

            <div>
              <h1 className="text-xl font-bold text-white">{eventType.title}</h1>
              {eventType.description && (
                <p className="mt-1 text-sm text-slate-400">{eventType.description}</p>
              )}
            </div>

            <div className="space-y-2.5 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-indigo-400 shrink-0" />
                <span>{eventType.duration} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Video size={14} className="text-emerald-400 shrink-0" />
                <span className="text-emerald-400">Google Meet</span>
              </div>
              {selectedDate && step === 'form' && selectedSlot && (
                <>
                  <div className="h-px bg-white/10 my-1" />
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-indigo-400 shrink-0" />
                    <span className="text-slate-200">
                      {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-indigo-400 shrink-0" />
                    <span className="text-slate-200">{formatTime(selectedSlot)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Right: Calendar or Form ── */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            {step === 'calendar' && (
              <div className="space-y-6">
                {/* Calendar */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-white">
                      {MONTHS[calMonth]} {calYear}
                    </h2>
                    <div className="flex gap-1">
                      <button
                        onClick={prevMonth}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <button
                        onClick={nextMonth}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAYS.map((d) => (
                      <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-600 py-1">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells */}
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const d = new Date(calYear, calMonth, day);
                      const isDisabled = isDateDisabled(day);
                      const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === calMonth && selectedDate?.getFullYear() === calYear;
                      const isToday = d.toDateString() === today.toDateString();

                      return (
                        <button
                          key={day}
                          onClick={() => handleDayClick(day)}
                          disabled={isDisabled}
                          className={`
                            relative flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium transition-all duration-150
                            ${isDisabled ? 'text-slate-700 cursor-not-allowed' : 'cursor-pointer hover:bg-indigo-500/20 hover:text-indigo-200'}
                            ${isSelected ? 'bg-indigo-500 text-white shadow-[0_2px_12px_rgba(99,102,241,0.4)] hover:bg-indigo-500 hover:text-white' : ''}
                            ${isToday && !isSelected ? 'text-indigo-400 border border-indigo-500/30' : ''}
                            ${!isDisabled && !isSelected ? 'text-slate-300' : ''}
                          `}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3">
                      {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h3>
                    {slotsLoading ? (
                      <div className="flex h-20 items-center justify-center">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
                        <p className="text-sm text-slate-400">No available slots on this day.</p>
                        <p className="text-xs text-slate-600 mt-1">Try selecting a different date.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.toISOString()}
                            onClick={() => handleSlotClick(slot)}
                            className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-slate-300 hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-200 transition-all duration-150"
                          >
                            {formatTime(slot)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!selectedDate && (
                  <div className="flex h-24 items-center justify-center">
                    <p className="text-sm text-slate-600">Select a date to see available times</p>
                  </div>
                )}
              </div>
            )}

            {step === 'form' && selectedSlot && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep('calendar')}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <h2 className="text-base font-semibold text-white">Your Details</h2>
                </div>

                {formError && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
                      <User size={12} /> Your Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Smith"
                      required
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
                      <Mail size={12} /> Email Address *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-sm text-slate-400 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-indigo-400" />
                      <span>{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-indigo-400" />
                      <span>{formatTime(selectedSlot)} · {eventType.duration} min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Video size={13} className="text-emerald-400" />
                      <span className="text-emerald-400">Google Meet link will be provided</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !name || !email}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(99,102,241,0.35)] transition-all hover:bg-indigo-500 hover:shadow-[0_4px_24px_rgba(99,102,241,0.5)] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    )}
                    Confirm Booking
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-slate-700">
          Powered by Loomdesk Scheduling
        </p>
      </div>
    </div>
  );
}
