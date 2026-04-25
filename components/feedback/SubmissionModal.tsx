'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Bug, Lightbulb, Loader2 } from 'lucide-react';
import { showToast } from '@/components/shared/Toast';

type SubmissionType = 'FEEDBACK' | 'BUG_REPORT' | 'FEATURE_REQUEST';

export function SubmissionModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<SubmissionType>('FEEDBACK');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title, description }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      showToast('Your submission has been received', 'success');
      setOpen(false);
      setTitle('');
      setDescription('');
    } catch (error) {
      showToast('Failed to submit. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'FEEDBACK':
        return <MessageSquare size={20} />;
      case 'BUG_REPORT':
        return <Bug size={20} />;
      case 'FEATURE_REQUEST':
        return <Lightbulb size={20} />;
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'FEEDBACK':
        return 'Feedback';
      case 'BUG_REPORT':
        return 'Bug Report';
      case 'FEATURE_REQUEST':
        return 'Feature Request';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <button
          className="glass-pill flex h-12 w-12 items-center justify-center rounded-full hover:scale-110 transition-transform"
          title="Submit Feedback"
        >
          <MessageSquare size={20} className="text-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="glass-panel rounded-3xl border-0 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon()}
            Submit {getTypeLabel()}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Type</Label>
            <div className="flex gap-2 mt-2">
              {(['FEEDBACK', 'BUG_REPORT', 'FEATURE_REQUEST'] as SubmissionType[]).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={type === t ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setType(t)}
                  className="flex-1"
                >
                  {t === 'FEEDBACK' && <MessageSquare size={14} className="mr-2" />}
                  {t === 'BUG_REPORT' && <Bug size={14} className="mr-2" />}
                  {t === 'FEATURE_REQUEST' && <Lightbulb size={14} className="mr-2" />}
                  {t.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details..."
              className="mt-2 min-h-[120px]"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
              Submit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
