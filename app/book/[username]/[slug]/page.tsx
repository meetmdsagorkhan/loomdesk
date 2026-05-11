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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !eventType || !host) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="text-center space-y-4 glass-card p-10 max-w-md w-full relative z-10">
          <AlertCircle size={48} className="mx-auto text-destructive" />
          <h1 className="text-2xl font-bold font-heading">Event not found</h1>
          <p className="text-muted-foreground font-sans">This scheduling link may be inactive or removed.</p>
          <Link href={`/book/${username}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
            <ChevronLeft size={14} /> Back to {username}'s page
          </Link>
        </div>
      </div>
    );
  }

  // ─── Confirmation Screen ────────────────────────────────────────────────────
  if (step === 'confirmed' && confirmedBooking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-success/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
        </div>
        <div className="relative w-full max-w-md text-center space-y-6 z-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-success/20 border border-success/30 shadow-2xl backdrop-blur-md">
            <Check size={40} className="text-success" />
          </div>
          <div>
            <h1 className="text-4xl font-bold font-heading mb-2">You're booked!</h1>
            <p className="text-muted-foreground">A confirmation has been sent to <span className="font-medium text-foreground">{confirmedBooking.email}</span></p>
          </div>

          <div className="glass-card p-8 text-left space-y-5">
            <h2 className="font-bold font-heading text-xl">{confirmedBooking.eventType.title}</h2>
            <div className="space-y-4 text-sm text-muted-foreground font-medium">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Calendar size={16} />
                </div>
                <span>{new Date(confirmedBooking.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Clock size={16} />
                </div>
                <span>
                  {formatTime(new Date(confirmedBooking.startTime))} – {formatTime(new Date(confirmedBooking.endTime))} ({confirmedBooking.eventType.duration} min)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <User size={16} />
                </div>
                <span>with {confirmedBooking.eventType.user.name}</span>
              </div>
            </div>

            {(confirmedBooking.meetLink || confirmedBooking.eventType.meetLink) && (
              <a
                href={(confirmedBooking.meetLink || confirmedBooking.eventType.meetLink)!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-success/15 border border-success/30 py-3.5 text-sm font-semibold text-success hover:bg-success/25 transition-all"
              >
                <Video size={18} />
                Join Google Meet
                {confirmedBooking.meetLink && (
                  <span className="ml-1 rounded bg-success/20 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">Unique Link</span>
                )}
              </a>
            )}
          </div>

          <Link href={`/book/${username}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
            <ChevronLeft size={16} /> Schedule another meeting
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden font-sans">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16 z-10">
        {/* Back link */}
        <Link href={`/book/${username}`} className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={16} /> Back
        </Link>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* ── Left: Event Info ── */}
          <div className="glass-panel p-6 space-y-6 h-fit">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br from-primary/80 to-accent/80 text-lg font-bold text-white overflow-hidden shadow-xl ring-2 ring-white/10">
                {host.image ? <img src={host.image} alt={host.name} className="w-full h-full object-cover" /> : getInitials(host.name)}
              </div>
              <div className="min-w-0">
                <p className="font-bold font-heading text-lg truncate">{host.name}</p>
                {(host.position || host.company) && (
                  <p className="text-xs text-muted-foreground font-medium truncate">{[host.position, host.company].filter(Boolean).join(' · ')}</p>
                )}
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold font-heading">{eventType.title}</h1>
              {eventType.description && (
                <p className="mt-2 text-sm text-muted-foreground">{eventType.description}</p>
              )}
            </div>

            <div className="space-y-3 text-sm text-muted-foreground font-medium">
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-primary shrink-0" />
                <span>{eventType.duration} minutes</span>
              </div>
              <div className="flex items-center gap-3">
                <Video size={16} className="text-success shrink-0" />
                <span className="text-success">Google Meet</span>
              </div>
              {selectedDate && step === 'form' && selectedSlot && (
                <>
                  <div className="h-px bg-white/10 my-3" />
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-primary shrink-0" />
                    <span className="text-foreground">
                      {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-primary shrink-0" />
                    <span className="text-foreground">{formatTime(selectedSlot)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Right: Calendar or Form ── */}
          <div className="glass-panel p-6 sm:p-8">
            {step === 'calendar' && (
              <div className="space-y-8">
                {/* Calendar */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold font-heading">
                      {MONTHS[calMonth]} {calYear}
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={prevMonth}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={nextMonth}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {DAYS.map((d) => (
                      <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-1">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
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
                            relative flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200
                            ${isDisabled ? 'text-muted-foreground/30 cursor-not-allowed' : 'cursor-pointer hover:bg-primary/20 hover:text-primary'}
                            ${isSelected ? 'bg-primary text-primary-foreground shadow-lg hover:bg-primary hover:text-primary-foreground' : ''}
                            ${isToday && !isSelected ? 'text-primary border border-primary/30' : ''}
                            ${!isDisabled && !isSelected ? 'text-foreground/80' : ''}
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
                  <div className="pt-2">
                    <h3 className="text-base font-bold font-heading mb-4">
                      {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h3>
                    {slotsLoading ? (
                      <div className="flex h-24 items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="rounded-xl border border-white/5 bg-white/5 p-8 text-center">
                        <p className="text-sm font-medium text-muted-foreground">No available slots on this day.</p>
                        <p className="text-xs text-muted-foreground/60 mt-2">Try selecting a different date.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.toISOString()}
                            onClick={() => handleSlotClick(slot)}
                            className="rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-foreground/80 hover:border-primary/40 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                          >
                            {formatTime(slot)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!selectedDate && (
                  <div className="flex h-32 items-center justify-center border-t border-white/5 mt-4">
                    <p className="text-sm font-medium text-muted-foreground">Select a date to see available times</p>
                  </div>
                )}
              </div>
            )}

            {step === 'form' && selectedSlot && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setStep('calendar')}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <h2 className="text-xl font-bold font-heading">Your Details</h2>
                </div>

                {formError && (
                  <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <User size={14} /> Your Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Smith"
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <Mail size={14} /> Email Address *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    />
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/5 px-5 py-4 text-sm text-muted-foreground space-y-2.5">
                    <div className="flex items-center gap-3">
                      <Calendar size={15} className="text-primary" />
                      <span className="font-medium text-foreground">{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock size={15} className="text-primary" />
                      <span className="font-medium text-foreground">{formatTime(selectedSlot)} · {eventType.duration} min</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Video size={15} className="text-success" />
                      <span className="text-success font-medium">Google Meet link will be provided</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !name || !email}
                    className="flex w-full items-center justify-center gap-2 rounded-xl btn-primary py-4 text-sm font-bold shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting && (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    )}
                    Confirm Booking
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        <p className="mt-16 text-center text-xs text-muted-foreground/60 font-medium tracking-wide uppercase">
          Powered by Loomdesk
        </p>
      </div>
    </div>
  );
}
