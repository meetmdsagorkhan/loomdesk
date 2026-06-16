'use client';

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Badge from '@/components/shared/Badge';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import { MessageSquare, Bug, Lightbulb, Image as ImageIcon, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { showToast } from '@/components/shared/Toast';
import { handleApiError } from '@/lib/error-handler';

import { SubmissionModal } from '@/components/feedback/SubmissionModal';

type SubmissionType = 'FEEDBACK' | 'BUG_REPORT' | 'FEATURE_REQUEST';
type SubmissionStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type SubmissionPriority = 'LOW' | 'MEDIUM' | 'HIGH';

interface Submission {
  id: string;
  type: SubmissionType;
  title: string;
  description: string;
  status: SubmissionStatus;
  priority: SubmissionPriority;
  adminNote: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export default function MySubmissionsPage() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      router.push('/dashboard');
      return;
    }

    fetchSubmissions();
  }, [user, mounted, router]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/submissions');
      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (error) {
      handleApiError(error, 'My Submissions');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: SubmissionType) => {
    switch (type) {
      case 'FEEDBACK':
        return <MessageSquare size={16} className="text-blue-500" />;
      case 'BUG_REPORT':
        return <Bug size={16} className="text-red-500" />;
      case 'FEATURE_REQUEST':
        return <Lightbulb size={16} className="text-yellow-500" />;
    }
  };

  const getStatusVariant = (status: SubmissionStatus) => {
    switch (status) {
      case 'OPEN':
        return 'warning';
      case 'IN_PROGRESS':
        return 'info';
      case 'RESOLVED':
        return 'success';
      case 'CLOSED':
        return 'default';
    }
  };

  const getPriorityVariant = (priority: SubmissionPriority) => {
    switch (priority) {
      case 'LOW':
        return 'default';
      case 'MEDIUM':
        return 'warning';
      case 'HIGH':
        return 'danger';
    }
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        badge="My Submissions"
        title="Your Feedback & Requests"
        subtitle="View and track the status of your feedback, bug reports, and feature requests."
      />

      {submissions.length === 0 ? (
        <GlassCard variant="panel" padding="md">
          <div className="text-center py-12">
            <div className="rounded-2xl border border-dashed border-white/25 bg-white/20 p-8 backdrop-blur-sm flex flex-col items-center">
              <p className="text-muted-foreground">No submissions yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Use the feedback button to submit your first feedback, bug report, or feature request.
              </p>
              <SubmissionModal trigger={<Button className="mt-4 rounded-xl">Create Submission</Button>} />
            </div>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <GlassCard key={submission.id} variant="panel" padding="md">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {getTypeIcon(submission.type)}
                      <h3 className="font-semibold text-foreground">{submission.title}</h3>
                      <Badge variant={getStatusVariant(submission.status)} label={submission.status} />
                      <Badge variant={getPriorityVariant(submission.priority)} label={submission.priority} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{submission.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {formatDistanceToNow(new Date(submission.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {submission.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-white/20">
                    <img
                      src={submission.imageUrl}
                      alt="Submission image"
                      className="w-full h-auto max-h-64 object-cover"
                    />
                  </div>
                )}

                {submission.adminNote && (
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare size={14} className="text-primary" />
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                        Admin Response
                      </p>
                    </div>
                    <p className="text-sm text-foreground">{submission.adminNote}</p>
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
