'use client';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePresence } from '@/hooks/usePresence';
import { Hash, User as UserIcon, Loader2, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import ChatWindow from '@/components/chat/ChatWindow';
import { handleApiError } from '@/lib/error-handler';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
};

export default function MessagesPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string }>({ id: 'channel:general', name: 'General Team' });
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  const { onlineUsers } = usePresence(user ? { id: user.id, name: user.name, email: user.email } : null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || userLoading || !user) return;

    const fetchMembers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          // Filter out the current user
          setMembers(data.users?.filter((m: User) => m.id !== user.id) || []);
        }
      } catch (error) {
        handleApiError('Failed to fetch members', 'Messages');
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [mounted, userLoading, user]);

  if (!mounted || userLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <PageHeader
        title="Messages"
        subtitle="Real-time communication with your team and channels."
      />

      <GlassCard variant="panel" padding="none" className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 md:w-80 flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] border-r border-slate-200 dark:border-slate-700">
          <div className="p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">Channels & Direct</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {/* General Channel */}
            <button
              onClick={() => setSelectedContact({ id: 'channel:general', name: 'General Team' })}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${selectedContact.id === 'channel:general'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md font-semibold'
                : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${selectedContact.id === 'channel:general' ? 'bg-white/20' : 'bg-slate-300 dark:bg-slate-600'
                }`}>
                <Hash size={18} />
              </div>
              <span className="truncate flex-1 text-left">General Team</span>
            </button>

            {/* Announcements Channel */}
            <button
              onClick={() => setSelectedContact({ id: 'channel:announcements', name: 'Announcements' })}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all mt-1 ${selectedContact.id === 'channel:announcements'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md font-semibold'
                : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${selectedContact.id === 'channel:announcements' ? 'bg-white/20' : 'bg-slate-300 dark:bg-slate-600'
                }`}>
                <Bell size={18} />
              </div>
              <span className="truncate flex-1 text-left">Announcements</span>
            </button>

            <div className="pt-4 pb-2 px-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Direct Messages</span>
            </div>

            {/* Members List */}
            {isLoadingMembers ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 px-3 text-center py-4">No other members found.</p>
            ) : (
              members.map((member) => {
                const isOnline = onlineUsers.some(u => u.id === member.id);
                const isSelected = selectedContact.id === member.id;

                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedContact({ id: member.id, name: member.name })}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${isSelected
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md font-semibold'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="w-10 h-10">
                        {member.image ? (
                          <AvatarImage src={member.image} alt={member.name} />
                        ) : null}
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm font-semibold">
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online Status Dot */}
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                    </div>
                    <span className="truncate flex-1 text-left">{member.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-transparent relative z-0">
          <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex justify-between items-center z-10 shadow-sm border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                {!selectedContact.id.startsWith('channel:') && members.find(m => m.id === selectedContact.id)?.image && (
                  <AvatarImage src={members.find(m => m.id === selectedContact.id)?.image || ''} alt={selectedContact.name} />
                )}
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold text-lg">
                  {selectedContact.id.startsWith('channel:') ? <Hash size={24} /> : selectedContact.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white text-lg">{selectedContact.name}</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {selectedContact.id.startsWith('channel:')
                    ? selectedContact.id === 'channel:announcements' ? 'Company announcements' : 'Company-wide discussion channel'
                    : onlineUsers.some(u => u.id === selectedContact.id) ? <span className="text-green-500 font-medium">Online</span> : <span className="text-gray-400">Offline</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden flex flex-col">
            <ChatWindow key={selectedContact.id} contactId={selectedContact.id} contactName={selectedContact.name} setSelectedContact={setSelectedContact} />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
