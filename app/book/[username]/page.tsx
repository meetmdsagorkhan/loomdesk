'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, Video, ChevronRight, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !host) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="text-center space-y-4 glass-card p-10 max-w-md w-full relative z-10">
          <AlertCircle size={48} className="mx-auto text-destructive" />
          <h1 className="text-2xl font-bold font-heading">User not found</h1>
          <p className="text-muted-foreground font-sans">The scheduling page for <span className="font-mono text-foreground">@{username}</span> does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-2xl px-6 py-16 sm:py-24 z-10 font-sans">
        {/* Host Card */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-primary/80 to-accent/80 text-3xl font-bold text-white shadow-2xl ring-4 ring-white/10 overflow-hidden backdrop-blur-xl">
            {host.image ? (
              <img src={host.image} alt={host.name} className="w-full h-full object-cover" />
            ) : (
              getInitials(host.name)
            )}
          </div>
          <h1 className="text-4xl font-bold font-heading mb-2">{host.name}</h1>
          {(host.position || host.company) && (
            <p className="text-muted-foreground font-medium">
              {[host.position, host.company].filter(Boolean).join(' · ')}
            </p>
          )}
          <Badge variant="outline" className="mt-4 glass-pill text-muted-foreground font-normal">
            Select an event type below to schedule a meeting
          </Badge>
        </div>

        {/* Event Types */}
        {host.eventTypes.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <Calendar size={36} className="mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">No meeting types available yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {host.eventTypes.map((event) => (
              <Link
                key={event.id}
                href={`/book/${username}/${event.slug}`}
                className="group flex items-center gap-5 glass-panel p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-primary/30"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <Video size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold font-heading group-hover:text-primary transition-colors">{event.title}</h2>
                  {event.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <div className="flex items-center gap-1.5 glass-pill px-2.5 py-1">
                      <Clock size={12} className="text-primary" />
                      <span>{event.duration} minutes</span>
                    </div>
                    <div className="flex items-center gap-1.5 glass-pill px-2.5 py-1">
                      <Video size={12} className="text-success" />
                      <span className="text-success">Google Meet</span>
                    </div>
                  </div>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}

        <p className="mt-16 text-center text-xs text-muted-foreground/60 font-medium tracking-wide uppercase">
          Powered by Loomdesk
        </p>
      </div>
    </div>
  );
}
