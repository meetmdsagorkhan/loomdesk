'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Bug, Lightbulb, Loader2, Upload, X } from 'lucide-react';
import { showToast } from '@/components/shared/Toast';

type SubmissionType = 'FEEDBACK' | 'BUG_REPORT' | 'FEATURE_REQUEST';

export function SubmissionModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<SubmissionType>('FEEDBACK');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be less than 5MB', 'error');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('title', title);
      formData.append('description', description);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      showToast('Your submission has been received', 'success');
      setOpen(false);
      setTitle('');
      setDescription('');
      removeImage();
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
      <DialogTrigger
        className="glass-pill flex h-12 w-12 items-center justify-center rounded-full hover:scale-110 transition-transform"
        title="Submit Feedback"
      >
        <MessageSquare size={20} className="text-foreground" />
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
          <div>
            <Label htmlFor="image">Image (Optional)</Label>
            <div className="mt-2">
              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <Upload size={24} className="text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload an image</p>
                  <p className="text-xs text-muted-foreground mt-1">Max 5MB</p>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-2 bg-destructive text-white rounded-full hover:bg-destructive/90 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                id="image"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
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
