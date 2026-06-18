'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, Video, ChevronRight, AlertCircle } from 'lucide-react';

type EventType = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  duration: number;
  active: boolean;
};

type Host = {
  id: string;
  name: string;
  image?: string | null;
  position?: string | null;
  company?: string | null;
  eventTypes: EventType[];
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function BookUserPage() {
  const params = useParams<{ username: string }>();
  const username = params.username;

  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/public/users/${username}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return; }
        return r.json();
      })
      .then((data) => {
        if (data?.user) setHost(data.user);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !host) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <AlertCircle size={48} className="mx-auto text-rose-400/60" />
          <h1 className="text-2xl font-bold text-white">User not found</h1>
          <p className="text-slate-400">The scheduling page for <span className="text-slate-200 font-mono">@{username}</span> does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-violet-600/15 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-2xl px-6 py-16 sm:py-24">
        {/* Host Card */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white shadow-[0_8px_32px_rgba(99,102,241,0.3)] ring-4 ring-white/10 overflow-hidden">
            {host.image ? (
              <img src={host.image} alt={host.name} className="w-full h-full object-cover" />
            ) : (
              getInitials(host.name)
            )}
          </div>
          <h1 className="text-3xl font-bold text-white">{host.name}</h1>
          {(host.position || host.company) && (
            <p className="mt-1.5 text-slate-400">
              {[host.position, host.company].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className="mt-3 text-sm text-slate-500">
            Select an event type below to schedule a meeting.
          </p>
        </div>

        {/* Event Types */}
        {host.eventTypes.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-sm">
            <Calendar size={36} className="mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400">No meeting types available yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {host.eventTypes.map((event) => (
              <Link
                key={event.id}
                href={`/book/${username}/${event.slug}`}
                className="group flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-200 hover:border-indigo-500/40 hover:bg-white/10 hover:shadow-[0_4px_24px_rgba(99,102,241,0.15)]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/20 transition-all">
                  <Video size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-white group-hover:text-indigo-200 transition-colors">{event.title}</h2>
                  {event.description && (
                    <p className="mt-0.5 text-sm text-slate-400 line-clamp-1">{event.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={11} />
                    <span>{event.duration} minutes</span>
                    <span className="mx-1">·</span>
                    <span className="text-emerald-400">Google Meet</span>
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-slate-600 group-hover:text-indigo-400 transition-all group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}

        <p className="mt-12 text-center text-xs text-slate-600">
          Powered by Loomdesk Scheduling
        </p>
      </div>
    </div>
  );
}
