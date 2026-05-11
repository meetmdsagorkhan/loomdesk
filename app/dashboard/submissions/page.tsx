'use client';

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin } from '@/lib/auth-utils';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, MessageSquare, Bug, Lightbulb, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { showToast } from '@/components/shared/Toast';

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
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function SubmissionsPage() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      router.push('/dashboard');
      return;
    }

    if (!isAdmin({ user })) {
      router.push('/dashboard');
      return;
    }

    fetchSubmissions();
  }, [user, mounted, router, filterType, filterStatus]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (filterStatus) params.append('status', filterStatus);

      const response = await fetch(`/api/submissions?${params}`);
      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (error) {
      showToast('Failed to fetch submissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateSubmission = async (id: string, updates: { status?: SubmissionStatus; priority?: SubmissionPriority }) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      showToast('Submission updated', 'success');
      fetchSubmissions();
    } catch (error) {
      showToast('Failed to update submission', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateAdminNote = async (id: string) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      showToast('Admin note updated', 'success');
      setAdminNote('');
      fetchSubmissions();
    } catch (error) {
      showToast('Failed to update admin note', 'error');
    } finally {
      setUpdatingId(null);
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

  const getStatusColor = (status: SubmissionStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-gray-500';
      case 'IN_PROGRESS':
        return 'bg-blue-500';
      case 'RESOLVED':
        return 'bg-green-500';
      case 'CLOSED':
        return 'bg-slate-500';
    }
  };

  const getPriorityColor = (priority: SubmissionPriority) => {
    switch (priority) {
      case 'LOW':
        return 'bg-slate-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'HIGH':
        return 'bg-red-500';
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Submissions</h1>
        <p className="text-muted-foreground">View and manage user feedback, bug reports, and feature requests</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter size={16} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-background"
          >
            <option value="">All Types</option>
            <option value="FEEDBACK">Feedback</option>
            <option value="BUG_REPORT">Bug Reports</option>
            <option value="FEATURE_REQUEST">Feature Requests</option>
          </select>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-background"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Submissions List */}
      <div className="space-y-8">
        {submissions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No submissions found
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Open Requests</h2>
              {submissions.filter(s => s.status === 'OPEN' || s.status === 'IN_PROGRESS').length === 0 ? (
                <p className="text-sm text-muted-foreground">No open requests.</p>
              ) : (
                submissions
                  .filter(s => s.status === 'OPEN' || s.status === 'IN_PROGRESS')
                  .map((submission) => (
            <div key={submission.id} className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getTypeIcon(submission.type)}
                    <h3 className="font-semibold">{submission.title}</h3>
                    <Badge className={getStatusColor(submission.status)}>{submission.status}</Badge>
                    <Badge className={getPriorityColor(submission.priority)}>{submission.priority}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{submission.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>From: {submission.user.name}</span>
                    <span>{submission.user.email}</span>
                    <span>{formatDistanceToNow(new Date(submission.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>

              {submission.adminNote && (
                <div className="bg-muted rounded-lg p-3">
                  <Label className="text-xs">Admin Note:</Label>
                  <p className="text-sm mt-1">{submission.adminNote}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={submission.status === 'IN_PROGRESS' ? 'default' : 'outline'}
                  onClick={() => updateSubmission(submission.id, { status: 'IN_PROGRESS' })}
                  disabled={updatingId === submission.id}
                >
                  {updatingId === submission.id && <Loader2 size={12} className="mr-2 animate-spin" />}
                  In Progress
                </Button>
                <Button
                  size="sm"
                  variant={submission.status === 'RESOLVED' ? 'default' : 'outline'}
                  onClick={() => updateSubmission(submission.id, { status: 'RESOLVED' })}
                  disabled={updatingId === submission.id}
                >
                  {updatingId === submission.id && <Loader2 size={12} className="mr-2 animate-spin" />}
                  Resolved
                </Button>
                <Button
                  size="sm"
                  variant={submission.status === 'CLOSED' ? 'default' : 'outline'}
                  onClick={() => updateSubmission(submission.id, { status: 'CLOSED' })}
                  disabled={updatingId === submission.id}
                >
                  {updatingId === submission.id && <Loader2 size={12} className="mr-2 animate-spin" />}
                  Closed
                </Button>
                <Button
                  size="sm"
                  variant={submission.priority === 'HIGH' ? 'default' : 'outline'}
                  onClick={() => updateSubmission(submission.id, { priority: 'HIGH' })}
                  disabled={updatingId === submission.id}
                >
                  {updatingId === submission.id && <Loader2 size={12} className="mr-2 animate-spin" />}
                  High Priority
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`note-${submission.id}`}>Add Admin Note</Label>
                <div className="flex gap-2">
                  <Textarea
                    id={`note-${submission.id}`}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1"
                  />
                  <Button
                    onClick={() => updateAdminNote(submission.id)}
                    disabled={updatingId === submission.id || !adminNote.trim()}
                  >
                    {updatingId === submission.id && <Loader2 size={12} className="mr-2 animate-spin" />}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
            </div>
          </>
        )}
      </div>

      {submissions.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-white/10 mt-8">
          <h2 className="text-xl font-semibold mb-4 text-foreground/70">Resolved & Closed</h2>
          <div className="grid gap-4 opacity-75">
            {submissions.filter(s => s.status === 'RESOLVED' || s.status === 'CLOSED').length === 0 ? (
              <p className="text-sm text-muted-foreground">No resolved requests.</p>
            ) : (
              submissions
                .filter(s => s.status === 'RESOLVED' || s.status === 'CLOSED')
                .map((submission) => (
                  <div key={submission.id} className="glass-panel rounded-2xl p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getTypeIcon(submission.type)}
                          <h3 className="font-semibold line-through text-muted-foreground">{submission.title}</h3>
                          <Badge className={getStatusColor(submission.status)}>{submission.status}</Badge>
                          <Badge className={getPriorityColor(submission.priority)}>{submission.priority}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{submission.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>From: {submission.user.name}</span>
                          <span>{formatDistanceToNow(new Date(submission.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
