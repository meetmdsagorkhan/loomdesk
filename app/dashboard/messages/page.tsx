'use client';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePresence } from '@/hooks/usePresence';
import { Hash, User as UserIcon, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import ChatWindow from '@/components/chat/ChatWindow';
import { handleApiError } from '@/lib/error-handler';

type User = {
  id: string;
  name: string;
  email: string;
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
        title="Team Messages"
        subtitle="Real-time communication with your team."
      />

      <GlassCard variant="panel" padding="none" className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 md:w-80 flex flex-col bg-black/5 dark:bg-white/5 relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="p-4 bg-background/30 backdrop-blur-md">
            <h3 className="font-semibold text-foreground">Channels & Direct</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {/* General Channel */}
            <button
              onClick={() => setSelectedContact({ id: 'channel:general', name: 'General Team' })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${selectedContact.id === 'channel:general'
                ? 'glass-panel shadow-sm font-semibold text-foreground'
                : 'hover:bg-white/5 text-foreground/70'
                }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedContact.id === 'channel:general' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted-foreground/10'
                }`}>
                <Hash size={18} />
              </div>
              <span className="truncate flex-1 text-left">General Team</span>
            </button>

            {/* Announcements Channel */}
            <button
              onClick={() => setSelectedContact({ id: 'channel:announcements', name: 'Announcements' })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mt-1 ${selectedContact.id === 'channel:announcements'
                ? 'glass-panel shadow-sm font-semibold text-foreground'
                : 'hover:bg-white/5 text-foreground/70'
                }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedContact.id === 'channel:announcements' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted-foreground/10'
                }`}>
                <Hash size={18} />
              </div>
              <span className="truncate flex-1 text-left">Announcements</span>
            </button>

            <div className="pt-4 pb-2 px-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Direct Messages</span>
            </div>

            {/* Members List */}
            {isLoadingMembers ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 text-center py-4">No other members found.</p>
            ) : (
              members.map((member) => {
                const isOnline = onlineUsers.some(u => u.id === member.id);
                const isSelected = selectedContact.id === member.id;

                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedContact({ id: member.id, name: member.name })}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isSelected
                      ? 'glass-panel shadow-sm font-semibold text-foreground'
                      : 'hover:bg-white/5 text-foreground/70'
                      }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="w-8 h-8">
                        {member.image && <AvatarImage src={member.image} alt={member.name} />}
                        <AvatarFallback className="bg-muted-foreground/10 text-xs">
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online Status Dot */}
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${isOnline ? 'bg-success' : 'bg-muted-foreground'
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
          <div className="p-4 bg-background/30 backdrop-blur-md flex justify-between items-center z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                {!selectedContact.id.startsWith('channel:') && members.find(m => m.id === selectedContact.id)?.image && (
                  <AvatarImage src={members.find(m => m.id === selectedContact.id)?.image || ''} alt={selectedContact.name} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary">
                  {selectedContact.id.startsWith('channel:') ? <Hash size={20} /> : selectedContact.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-foreground">{selectedContact.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedContact.id.startsWith('channel:')
                    ? selectedContact.id === 'channel:announcements' ? 'Company announcements' : 'Company-wide discussion channel'
                    : onlineUsers.some(u => u.id === selectedContact.id) ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden flex flex-col">
            <ChatWindow key={selectedContact.id} contactId={selectedContact.id} contactName={selectedContact.name} />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
