import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Check, CheckCheck, X, Reply, Forward, Hash, Bell, Smile, MessageSquare } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useChat, ChatMessage } from '@/hooks/useChat';
import MessageInput from './MessageInput';
import { hasPermission } from '@/lib/permissions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { showToast } from '@/components/shared/Toast';
import { Button } from '@/components/ui/button';

interface ChatWindowProps {
  contactId: string;
  contactName: string;
  setSelectedContact?: (contact: { id: string; name: string }) => void;
}

export default function ChatWindow({ contactId, contactName, setSelectedContact }: ChatWindowProps) {
  const { user } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<{ id: string; name: string; email?: string; image?: string | null; role?: string; isActive?: boolean; position?: string; department?: string; company?: string; joiningDate?: Date | string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Slack-Grade Features State
  const [reactions, setReactions] = useState<Record<string, { emoji: string; count: number; users: string[] }[]>>({});
  const [activeThreadMessage, setActiveThreadMessage] = useState<ChatMessage | null>(null);
  const [threadComments, setThreadComments] = useState<Record<string, { id: string; senderName: string; content: string; createdAt: Date }[]>>({});
  const [threadInput, setThreadInput] = useState('');

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

  const toggleReaction = (messageId: string, emoji: string) => {
    setReactions((prev) => {
      const msgReactions = prev[messageId] || [];
      const existing = msgReactions.find((r) => r.emoji === emoji);
      const username = user?.name || 'Anonymous';

      let nextReactions;
      if (existing) {
        if (existing.users.includes(username)) {
          // Remove reaction
          const nextUsers = existing.users.filter((u) => u !== username);
          if (nextUsers.length === 0) {
            nextReactions = msgReactions.filter((r) => r.emoji !== emoji);
          } else {
            nextReactions = msgReactions.map((r) =>
              r.emoji === emoji ? { ...r, count: r.count - 1, users: nextUsers } : r
            );
          }
        } else {
          // Add user to existing
          nextReactions = msgReactions.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, username] } : r
          );
        }
      } else {
        // Create new reaction
        nextReactions = [...msgReactions, { emoji, count: 1, users: [username] }];
      }

      return { ...prev, [messageId]: nextReactions };
    });
  };

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
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [contactId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      if (showEmojiPicker) {
        setShowEmojiPicker(false);
        setEmojiPickerMessageId(null);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showEmojiPicker]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMessageSent = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
    setReplyToMessage(null);
  };

  const handleProfileClick = async (userId: string, userName: string) => {
    setSelectedProfile({ id: userId, name: userName });
    setLoadingProfile(true);
    
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedProfile({
          id: data.id,
          name: data.name,
          email: data.email,
          image: data.image,
          role: data.role,
          isActive: data.isActive,
          position: data.position,
          department: data.department,
          company: data.company,
          joiningDate: data.joiningDate,
        });
      }
    } catch (error) {
      // Keep basic profile
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleForward = async (recipientId: string) => {
    if (!forwardMessage) return;

    try {
      const payload: any = {
        receiverId: recipientId.startsWith('channel:') ? null : recipientId,
        channel: recipientId.startsWith('channel:') ? recipientId.split(':')[1] : null,
        content: forwardMessage.content,
        isForwarded: true,
        originalSenderId: forwardMessage.senderId,
      };

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const message = await res.json();
        setMessages((prev) => [...prev, message]);
        broadcastMessage(message);
      }
    } catch (error) {
      console.error('Failed to forward message', error);
    } finally {
      setShowForwardModal(false);
      setForwardMessage(null);
    }
  };

  const isContactTyping = isTyping[contactId] || (isChannel && Object.values(isTyping).some(Boolean));
  const showTypingIndicator = isContactTyping;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full max-h-full overflow-hidden bg-background/30 relative">
      {/* Main Chat Flow container */}
      <div className="flex-1 flex flex-col h-full max-h-full overflow-hidden relative">
        {/* Messages Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
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
              const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
              const showName = !isMe && isChannel && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);

              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {showAvatar && (
                    <Avatar className="w-10 h-10 shrink-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleProfileClick(msg.senderId, msg.senderName); }}>
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm font-semibold">
                        {msg.senderName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    onDoubleClick={() => setReplyToMessage(msg)}
                    className={`min-w-[250px] max-w-[400px] px-4 py-2.5 rounded-2xl relative group cursor-pointer ${
                      isMe
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-sm shadow-lg'
                        : 'bg-slate-200 dark:bg-slate-700 rounded-bl-sm text-slate-900 dark:text-slate-100 shadow-md'
                    }`}
                  >
                    {showEmojiPicker && emojiPickerMessageId === msg.id && (
                      <div 
                        className={`absolute ${isMe ? 'right-0' : 'left-0'} top-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 shadow-xl z-50`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex gap-1 overflow-x-auto">
                          {['😀', '😂', '😍', '👍', '🎉', '🔥', '❤️', '👋', '🙏', '✅', '😢', '🤔'].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); setShowEmojiPicker(false); setEmojiPickerMessageId(null); }}
                              className="w-8 h-8 text-xl hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {msg.replyTo && (
                      <div className={`text-xs mb-2 pb-2 border-b ${isMe ? 'border-white/20' : 'border-slate-300 dark:border-slate-600'}`}>
                        <span className="opacity-70">Replying to {msg.replyTo.senderName}:</span>
                        <p className="truncate opacity-60">{msg.replyTo.content}</p>
                      </div>
                    )}
                    {showName && (
                      <button
                        onClick={() => handleProfileClick(msg.senderId, msg.senderName)}
                        className="text-xs font-semibold mb-1 hover:underline cursor-pointer transition-colors"
                      >
                        {msg.senderName}
                      </button>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                    
                    <div className={`flex items-center gap-1 mt-1 justify-end text-[10px] ${isMe ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}`}>
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && !isChannel && (
                        <span className="ml-0.5">
                          {msg.read ? <CheckCheck size={12} className="text-green-300" /> : <Check size={12} />}
                        </span>
                      )}
                    </div>

                    {/* Emoji Reactions Stack */}
                    {reactions[msg.id] && reactions[msg.id].length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {reactions[msg.id].map((react) => {
                          const hasReacted = react.users.includes(user?.name || '');
                          return (
                            <button
                              key={react.emoji}
                              onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, react.emoji); }}
                              title={`Reacted by: ${react.users.join(', ')}`}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-all duration-300",
                                hasReacted
                                  ? "bg-primary/15 border-primary/30 text-primary font-bold shadow-sm"
                                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-muted-foreground"
                              )}
                            >
                              <span>{react.emoji}</span>
                              <span>{react.count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Reply/Forward/React Buttons */}
                    <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-28' : '-right-28'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveThreadMessage(msg); }}
                        className="p-1.5 rounded-full bg-white dark:bg-slate-700 shadow-md hover:scale-110 transition-transform"
                        title="Open Thread Replies"
                      >
                        <MessageSquare size={14} className={isMe ? 'text-blue-500' : 'text-slate-600 dark:text-slate-300'} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setReplyToMessage(msg); }}
                        className="p-1.5 rounded-full bg-white dark:bg-slate-700 shadow-md hover:scale-110 transition-transform"
                        title="Quote Inline"
                      >
                        <Reply size={14} className={isMe ? 'text-blue-500' : 'text-slate-600 dark:text-slate-300'} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setForwardMessage(msg); setShowForwardModal(true); }}
                        className="p-1.5 rounded-full bg-white dark:bg-slate-700 shadow-md hover:scale-110 transition-transform"
                        title="Forward"
                      >
                        <Forward size={14} className={isMe ? 'text-blue-500' : 'text-slate-600 dark:text-slate-300'} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setEmojiPickerMessageId(msg.id); setShowEmojiPicker(!showEmojiPicker); }}
                        className="p-1.5 rounded-full bg-white dark:bg-slate-700 shadow-md hover:scale-110 transition-transform"
                        title="React"
                      >
                        <Smile size={14} className={isMe ? 'text-blue-500' : 'text-slate-600 dark:text-slate-300'} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {showTypingIndicator && (
            <div className="flex items-start">
              <div className="bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center shadow-md">
                <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">{contactName} is typing</span>
                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-1 w-1" />
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-20 right-4 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-colors z-40"
            title="Scroll to bottom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7"/>
            </svg>
          </button>
        )}

        {canPost ? (
          <MessageInput 
            receiverId={contactId} 
            onMessageSent={handleMessageSent} 
            broadcastTyping={broadcastTyping}
            replyToMessage={replyToMessage}
            onCancelReply={() => setReplyToMessage(null)}
          />
        ) : (
          <div className="p-4 bg-muted/20 border-t border-border/40 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
            Only Administrators can post to this channel.
          </div>
        )}
      </div>

      {/* Sub-Thread Sidebar Drawer */}
      <AnimatePresence>
        {activeThreadMessage && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-80 md:w-96 border-l border-white/10 bg-slate-900/90 backdrop-blur-md flex flex-col h-full shadow-2xl z-20 shrink-0"
          >
            {/* Thread Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground">Thread Message</h4>
                <p className="text-xs text-muted-foreground">Replying to {activeThreadMessage.senderName}</p>
              </div>
              <button
                onClick={() => setActiveThreadMessage(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Parent Message Display */}
            <div className="p-4 bg-white/5 border-b border-white/10 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{activeThreadMessage.senderName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(activeThreadMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                {activeThreadMessage.content}
              </p>
            </div>

            {/* Reply thread Comments list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {threadComments[activeThreadMessage.id] && threadComments[activeThreadMessage.id].length > 0 ? (
                threadComments[activeThreadMessage.id].map((comment) => (
                  <div key={comment.id} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{comment.senderName}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {comment.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground opacity-50 py-12">
                  <MessageSquare size={32} className="mb-2" />
                  <p className="text-xs">No replies in this thread yet.</p>
                </div>
              )}
            </div>

            {/* Thread Reply Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!threadInput.trim() || !activeThreadMessage) return;

                const newReply = {
                  id: Math.random().toString(),
                  senderName: user?.name || 'Anonymous',
                  content: threadInput,
                  createdAt: new Date(),
                };

                setThreadComments((prev) => ({
                  ...prev,
                  [activeThreadMessage.id]: [...(prev[activeThreadMessage.id] || []), newReply],
                }));

                setThreadInput('');
                showToast('Thread reply sent', 'success');
              }}
              className="p-4 border-t border-white/10 bg-white/5 flex gap-2 items-center"
            >
              <input
                type="text"
                placeholder="Reply to thread..."
                value={threadInput}
                onChange={(e) => setThreadInput(e.target.value)}
                className="form-input h-9 flex-1 text-xs rounded-lg bg-background text-foreground"
              />
              <Button type="submit" size="sm" className="rounded-lg h-9 px-4 text-xs font-semibold">
                Reply
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Profile Modal Overlay */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedProfile(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Profile</h3>
              <button onClick={() => setSelectedProfile(null)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col items-center">
              {loadingProfile ? (
                <Loader2 className="w-20 h-20 mb-4 animate-spin text-primary" />
              ) : (
                <Avatar className="w-20 h-20 mb-4">
                  {selectedProfile.image && <AvatarImage src={selectedProfile.image} alt={selectedProfile.name} />}
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-2xl font-semibold">
                    {selectedProfile.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <h4 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">{selectedProfile.name}</h4>
              <div className="w-full space-y-3 mt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Email:</span>
                  <span className="text-slate-900 dark:text-white font-medium">{loadingProfile ? '...' : (selectedProfile.email || '-')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Role:</span>
                  <span className="text-slate-900 dark:text-white font-medium">{loadingProfile ? '...' : (selectedProfile.role || '-')}</span>
                </div>
                
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
                  <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Professional Details</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Position:</span>
                      <span className="text-slate-900 dark:text-white font-medium">{loadingProfile ? '...' : (selectedProfile.position || '-')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Department:</span>
                      <span className="text-slate-900 dark:text-white font-medium">{loadingProfile ? '...' : (selectedProfile.department || '-')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Company:</span>
                      <span className="text-slate-900 dark:text-white font-medium">{loadingProfile ? '...' : (selectedProfile.company || '-')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Joining Date:</span>
                      <span className="text-slate-900 dark:text-white font-medium">
                        {loadingProfile ? '...' : (selectedProfile.joiningDate ? new Date(selectedProfile.joiningDate).toLocaleDateString() : '-')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {setSelectedContact && !contactId.startsWith('channel:') && (
                <button
                  onClick={() => {
                    setSelectedContact({ id: selectedProfile.id, name: selectedProfile.name });
                    setSelectedProfile(null);
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-2.5 px-4 rounded-xl transition-all mt-4"
                >
                  Send Message
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message Forwarding Modal Overlay */}
      {showForwardModal && forwardMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForwardModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Forward Message</h3>
              <button onClick={() => setShowForwardModal(false)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-xl">
              <p className="text-sm text-slate-700 dark:text-slate-300">{forwardMessage.content}</p>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Select a recipient to forward this message:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => handleForward('channel:general')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
              >
                <Hash size={18} className="text-slate-500" />
                <span className="text-slate-900 dark:text-white">General Team</span>
              </button>
              <button
                onClick={() => handleForward('channel:announcements')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
              >
                <Bell size={18} className="text-slate-500" />
                <span className="text-slate-900 dark:text-white">Announcements</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
