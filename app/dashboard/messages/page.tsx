'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { showToast } from '@/components/shared/Toast';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read: boolean;
};

type Conversation = {
  userId: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
};

export default function MessagesPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (userLoading || !mounted) return;
    if (!user) return;

    fetchConversations();
  }, [user, userLoading, mounted]);

  useEffect(() => {
    if (selectedConversation) {
      void fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (!selectedConversation && conversations.length > 0) {
      setSelectedConversation(conversations[0].userId);
    }
  }, [conversations, selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/messages/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      const data = await response.json();
      setConversations(data || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const response = await fetch(`/api/messages?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      const data = await response.json();
      setMessages(data || []);
      
      // Mark as read
      await fetch(`/api/messages/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedConversation,
          content: newMessage,
        }),
      });

      if (response.ok) {
        const message = await response.json();
        setMessages((prev) => [...prev, message]);
        setNewMessage('');
        await fetchConversations();
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to send message', 'error');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      showToast('Failed to send message', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!mounted || userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Messages</h1>
        <p className="text-muted-foreground mt-1">Communicate with your team</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <div className="glass-panel rounded-2xl overflow-hidden flex flex-col shadow-lg">
          <div className="p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center">
                <div className="rounded-2xl border border-dashed border-slate-300/50 p-8 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(0,0,0,0.05),0_8px_32px_rgba(0,0,0,0.05)] dark:border-slate-700/50 dark:bg-slate-800/50 dark:backdrop-blur-sm dark:shadow-none">
                  <p className="text-muted-foreground">No conversations found</p>
                </div>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => setSelectedConversation(conv.userId)}
                  className="border-b border-border hover:bg-muted/50 backdrop-blur-sm transition-colors text-left ${
                    selectedConversation === conv.userId ? 'bg-muted' : ''
                  }"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 bg-primary/10 text-primary">
                      <AvatarFallback className="text-sm font-semibold">
                        {getInitials(conv.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-foreground truncate">{conv.userName}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {conv.unreadCount}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden flex flex-col shadow-lg">
          {selectedConversation ? (
            <>
              <div className="p-4 shadow-sm">
                <h2 className="font-semibold text-foreground">
                  {conversations.find((c) => c.userId === selectedConversation)?.userName}
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        message.senderId === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendMessage} className="p-4 shadow-sm">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="form-input flex-1 py-2"
                  />
                  <Button type="submit" disabled={isSending || !newMessage.trim()}>
                    {isSending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
