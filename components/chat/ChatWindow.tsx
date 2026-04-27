import { useState, useEffect, useRef } from 'react';
import { Loader2, Check, CheckCheck } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useChat, ChatMessage } from '@/hooks/useChat';
import MessageInput from './MessageInput';
import { hasPermission } from '@/lib/permissions';

interface ChatWindowProps {
  contactId: string;
  contactName: string;
}

export default function ChatWindow({ contactId, contactName }: ChatWindowProps) {
  const { user } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isChannel = contactId.startsWith('channel:');
  const channelName = isChannel ? contactId.split(':')[1] : null;

  const roomId = isChannel 
    ? contactId 
    : [user?.id || '', contactId].sort().join('_');

  const {
    messages,
    setMessages,
    isTyping,
    broadcastMessage,
    broadcastTyping,
    broadcastRead,
  } = useChat(roomId, user ? { id: user.id, name: user.name } : null);

  const canPost = !isChannel || contactId !== 'channel:announcements' || hasPermission(user?.role, 'post_announcements');

  useEffect(() => {
    if (!user) return;
    
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          isChannel 
            ? `/api/messages?channel=${channelName}&limit=100`
            : `/api/messages?userId=${contactId}&limit=100`
        );
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
          
          // Mark as read if there are unread messages from this contact
          const hasUnread = data.some((m: ChatMessage) => m.senderId === contactId && !m.read);
          if (hasUnread && !isChannel) {
            await fetch('/api/messages/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ senderId: contactId }),
            });
            broadcastRead(user.id);
          }
        }
      } catch (error) {
        // Silently fail - messages will retry on next interaction
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [contactId, user?.id]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleMessageSent = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
    broadcastMessage(message);
  };

  const isContactTyping = isTyping[contactId] || (isChannel && Object.values(isTyping).some(Boolean));

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden bg-background/30 relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-2xl">👋</span>
            </div>
            <p>No messages yet. Say hello to {contactName}!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderId === user?.id;
            const showName = !isMe && isChannel && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {showName && (
                  <span className="text-xs text-muted-foreground ml-2 mb-1">{msg.senderName}</span>
                )}
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl relative group ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-sm shadow-md'
                      : 'glass-panel rounded-bl-sm border-border/40 text-foreground shadow-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <div className={`flex items-center gap-1 mt-1 justify-end text-[10px] ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && !isChannel && (
                      <span className="ml-0.5">
                        {msg.read ? <CheckCheck size={12} className="text-blue-300" /> : <Check size={12} />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {isContactTyping && (
          <div className="flex items-start">
            <div className="glass-panel text-foreground px-4 py-3 rounded-2xl rounded-bl-sm border-border/40 flex gap-1 items-center shadow-sm">
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-1 w-1" />
      </div>

      {canPost ? (
        <MessageInput 
          receiverId={contactId} 
          onMessageSent={handleMessageSent} 
          broadcastTyping={broadcastTyping}
        />
      ) : (
        <div className="p-4 bg-muted/20 border-t border-border/40 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
          Only Administrators can post to this channel.
        </div>
      )}
    </div>
  );
}
