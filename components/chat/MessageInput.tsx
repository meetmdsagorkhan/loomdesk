import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showToast } from '@/components/shared/Toast';

interface MessageInputProps {
  receiverId: string;
  onMessageSent: (message: any) => void;
  broadcastTyping: (isTyping: boolean) => void;
}

export default function MessageInput({ receiverId, onMessageSent, broadcastTyping }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);

    // Typing indicator logic
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 2000);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || isSending) return;

    setIsSending(true);
    broadcastTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: receiverId.startsWith('channel:') ? null : receiverId,
          channel: receiverId.startsWith('channel:') ? receiverId.split(':')[1] : null,
          content: content.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }

      const message = await res.json();
      setContent('');
      onMessageSent(message);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSend} className="p-4 bg-background/30 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.02)] z-10 relative">
      <div className="flex gap-2">
        <Input
          type="text"
          value={content}
          onChange={handleChange}
          placeholder="Type a message..."
          className="form-input flex-1 rounded-full px-6 py-5 text-sm"
          disabled={isSending}
        />
        <Button
          type="submit"
          disabled={!content.trim() || isSending}
          className="rounded-full w-12 h-12 p-0 flex items-center justify-center shrink-0 shadow-md hover:shadow-lg transition-all"
        >
          {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-1" />}
        </Button>
      </div>
    </form>
  );
}
