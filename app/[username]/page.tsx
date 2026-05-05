/**
 * Public Booking Page
 * 
 * Displays a user's public booking page where invitees can schedule meetings
 * Route: /username
 */

import { notFound } from 'next/navigation';
import { getUserPublicAvailability } from '@/lib/scheduling/availability-actions';

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicBookingPage({ params }: PageProps) {
  const { username } = await params;
  const user = await getUserPublicAvailability(username);

  if (!user) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* User Profile Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-6">
            <div className="flex items-center gap-4">
              {user.image && (
                <img
                  src={user.image}
                  alt={user.name || ''}
                  className="w-16 h-16 rounded-full object-cover"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {user.name}
                </h1>
                <p className="text-slate-600">
                  Select a meeting type below to schedule
                </p>
              </div>
            </div>
          </div>

          {/* Event Types */}
          <div className="grid gap-4 mb-8">
            {user.eventTypes.map((eventType: { id: string; title: string; description: string | null; duration: number; slug: string }) => (
              <a
                key={eventType.id}
                href={`/book/${username}/${eventType.slug}`}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-left hover:shadow-md hover:border-slate-300 transition-all duration-200 group block"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {eventType.title}
                    </h2>
                    {eventType.description && (
                      <p className="text-slate-600 mt-1 text-sm">
                        {eventType.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{eventType.duration} min</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-slate-500">
            <p>Powered by LoomDesk</p>
          </div>
        </div>
      </div>
    </div>
  );
}
