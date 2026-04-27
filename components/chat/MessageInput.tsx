import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Smile, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/shared/Toast';
import { ChatMessage } from '@/hooks/useChat';

interface MessageInputProps {
  receiverId: string;
  onMessageSent: (message: any) => void;
  broadcastTyping: (isTyping: boolean) => void;
  replyToMessage?: ChatMessage | null;
  onCancelReply?: () => void;
}

const COMMON_EMOJIS = ['😀', '😂', '😍', '👍', '🎉', '🔥', '❤️', '👋', '🙏', '✅'];

export default function MessageInput({ receiverId, onMessageSent, broadcastTyping, replyToMessage, onCancelReply }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Typing indicator logic
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!content.trim() || isSending) return;

    setIsSending(true);
    broadcastTyping(false);

    try {
      const payload: any = {
        receiverId: receiverId.startsWith('channel:') ? null : receiverId,
        channel: receiverId.startsWith('channel:') ? receiverId.split(':')[1] : null,
        content: content.trim(),
      };

      if (replyToMessage) {
        payload.replyToId = replyToMessage.id;
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      const message = await res.json();
      onMessageSent(message);
      setContent('');
      setShowEmojiPicker(false);
    } catch (error) {
      showToast('Failed to send message', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      showToast('File upload not implemented yet', 'info');
    }
  };

  return (
    <div className="p-4 bg-background/30 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.02)] z-10 relative">
      {replyToMessage && (
        <div className="mb-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Replying to {replyToMessage.senderName}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{replyToMessage.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="ml-2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X size={16} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      )}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 bg-background border border-white/20 rounded-2xl p-3 shadow-xl z-20">
          <div className="grid grid-cols-5 gap-2">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="w-10 h-10 text-2xl hover:bg-white/10 rounded-xl transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleFileUpload}
          className="rounded-full h-12 w-12 shrink-0 mb-0.5"
          title="Attach file"
        >
          <Paperclip size={20} />
        </Button>
        
        <div className="flex-1 relative">
          <textarea
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="form-input w-full rounded-2xl px-4 py-3 pr-12 text-sm resize-none min-h-[48px] max-h-32"
            disabled={isSending}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
          />
          
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8"
            title="Add emoji"
          >
            <Smile size={18} />
          </Button>
        </div>
        
        <Button
          type="button"
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          className="rounded-full h-12 w-12 p-0 flex items-center justify-center shrink-0 mb-0.5 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
        >
          {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}
        </Button>
      </div>
    </div>
  );
}
