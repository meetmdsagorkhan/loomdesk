'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import ConfirmModal from '@/components/shared/ConfirmModal';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin } from '@/lib/auth-utils';
import { showToast } from '@/components/shared/Toast';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type Shift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  reportDeadline: string;
};

type ShiftAssignment = {
  id: string;
  startDate: string;
  endDate: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  shift: Shift;
};

export default function ShiftsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateShift, setShowCreateShift] = useState(false);
  const [newShift, setNewShift] = useState({
    name: '',
    startTime: '',
    endTime: '',
    reportDeadline: '',
  });
  const [isCreatingShift, setIsCreatingShift] = useState(false);
  const [assignForm, setAssignForm] = useState({
    userId: '',
    shiftId: '',
    startDate: '',
    endDate: '',
  });
  const [isAssigning, setIsAssigning] = useState(false);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (userLoading) return;
    if (!mounted) return;

    if (!user || !isAdmin({ user })) {
      router.push('/dashboard');
      return;
    }

    fetchShifts();
    fetchAssignments();
    fetchMembers();
  }, [user, userLoading, router, mounted]);

  const fetchShifts = async () => {
    try {
      const response = await fetch('/api/shifts');
      if (!response.ok) {
        handleApiError('Failed to fetch shifts', 'Shift Management');
        return;
      }
      const data = await response.json();
      setShifts(data.shifts || []);
    } catch (error) {
      handleApiError(error, 'Shift Management');
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch('/api/shifts/schedule');
      if (!response.ok) {
        handleApiError('Failed to fetch assignments', 'Shift Management');
        return;
      }
      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (error) {
      handleApiError(error, 'Shift Management');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        handleApiError('Failed to fetch members', 'Shift Management');
        return;
      }
      const data = await response.json();
      setMembers(data.users || []);
    } catch (error) {
      handleApiError(error, 'Shift Management');
    }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newShift.name || !newShift.startTime || !newShift.endTime || !newShift.reportDeadline) {
      setError('All fields are required');
      return;
    }

    setIsCreatingShift(true);
    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShift),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create shift');
        return;
      }

      await fetchShifts();
      setNewShift({ name: '', startTime: '', endTime: '', reportDeadline: '' });
      setShowCreateShift(false);
      showToast('Shift created successfully', 'success');
    } catch (error) {
      handleApiError(error, 'Shift Management');
    } finally {
      setIsCreatingShift(false);
    }
  };

  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!assignForm.userId || !assignForm.shiftId || !assignForm.startDate || !assignForm.endDate) {
      setError('All fields are required');
      return;
    }

    setIsAssigning(true);
    try {
      const response = await fetch('/api/shifts/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to assign shift');
        return;
      }

      await fetchAssignments();
      setAssignForm({ userId: '', shiftId: '', startDate: '', endDate: '' });
      showToast('Shift assigned successfully', 'success');
    } catch (error) {
      handleApiError(error, 'Shift Management');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!deleteAssignmentId) return;

    try {
      const response = await fetch(`/api/shifts/assignments/${deleteAssignmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        handleApiError('Failed to delete assignment', 'Shift Management');
        return;
      }

      await fetchAssignments();
      setDeleteAssignmentId(null);
      showToast('Assignment removed', 'success');
    } catch (error) {
      handleApiError(error, 'Shift Management');
    }
  };

  const getShiftHours = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours.toFixed(1);
  };

  // Prevent SSR rendering
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Shift Management"
        title="Create shift templates and assign to team members"
        subtitle="Define work schedules, assign shifts to team members, and track all assignments from one centralized location."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shifts Panel */}
        <GlassCard variant="default" padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Shift Templates</h2>
            {!showCreateShift && (
              <Button size="sm" onClick={() => setShowCreateShift(true)}>
                <Plus size={16} className="mr-2" />
                Create Shift
              </Button>
            )}
          </div>

          {/* Create Shift Form */}
          {showCreateShift && (
            <form onSubmit={handleCreateShift} className="space-y-4 mb-6 p-4 bg-muted/50 rounded-2xl card-elevation-sm">
              <div>
                <Label className="form-label">Name</Label>
                <Input
                  type="text"
                  value={newShift.name}
                  onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                  placeholder="e.g., Morning Shift"
                  className="form-input"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="form-label">Start Time</Label>
                  <Input
                    type="time"
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="form-label">End Time</Label>
                  <Input
                    type="time"
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="form-label">Report Deadline</Label>
                  <Input
                    type="time"
                    value={newShift.reportDeadline}
                    onChange={(e) => setNewShift({ ...newShift, reportDeadline: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <Button type="submit" disabled={isCreatingShift} className="rounded-xl">
                  {isCreatingShift ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateShift(false);
                    setNewShift({ name: '', startTime: '', endTime: '', reportDeadline: '' });
                    setError('');
                  }}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Shifts List */}
          {shifts.length === 0 ? (
            <div className="text-center py-8">
              <div className="rounded-2xl border border-dashed border-slate-300/50 p-8 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(0,0,0,0.05),0_8px_32px_rgba(0,0,0,0.05)] dark:border-slate-700/50 dark:bg-slate-800/50 dark:backdrop-blur-sm dark:shadow-none">
                <Clock size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No shift templates created yet</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {shifts.map((shift) => (
                <div key={shift.id} className="p-4 bg-muted/50 rounded-2xl border border-border/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{shift.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {shift.startTime} - {shift.endTime} ({getShiftHours(shift.startTime, shift.endTime)}h)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Report deadline: {shift.reportDeadline}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Assign Shift Panel */}
        <GlassCard variant="default" padding="md">
          <h2 className="text-lg font-semibold text-foreground mb-4">Assign Shift</h2>
          <form onSubmit={handleAssignShift} className="space-y-4">
            <div>
              <Label className="form-label">Member</Label>
              <Select
                value={assignForm.userId}
                onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
                className="form-input"
              >
                <option value="">Select member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label className="form-label">Shift</Label>
              <Select
                value={assignForm.shiftId}
                onChange={(e) => setAssignForm({ ...assignForm, shiftId: e.target.value })}
                className="form-input"
              >
                <option value="">Select shift</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({shift.startTime} - {shift.endTime})
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="form-label">Start Date</Label>
                <Input
                  type="date"
                  value={assignForm.startDate}
                  onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <Label className="form-label">End Date</Label>
                <Input
                  type="date"
                  value={assignForm.endDate}
                  onChange={(e) => setAssignForm({ ...assignForm, endDate: e.target.value })}
                  min={assignForm.startDate}
                  className="form-input"
                />
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <Button type="submit" disabled={isAssigning} className="w-full rounded-xl">
              {isAssigning ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Shift'
              )}
            </Button>
          </form>
        </GlassCard>
      </div>

      {/* Current Assignments Table */}
      <GlassCard variant="default" padding="none">
        <div className="border-b border-border/60 p-6">
          <h2 className="text-lg font-semibold text-foreground">Current Assignments</h2>
        </div>
        {assignments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 backdrop-blur-sm">
              <Clock size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No shift assignments yet</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto p-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Member</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Shift</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Hours</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Period</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-4 text-sm text-foreground">{assignment.user.name}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{assignment.shift.name}</td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {getShiftHours(assignment.shift.startTime, assignment.shift.endTime)}h
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(assignment.startDate).toLocaleDateString()} - {new Date(assignment.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteAssignmentId(assignment.id)}
                        className="rounded-xl"
                      >
                        <Trash2 size={14} className="mr-2" />
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteAssignmentId}
        onCancel={() => setDeleteAssignmentId(null)}
        onConfirm={handleDeleteAssignment}
        title="Remove Assignment"
        description="Are you sure you want to remove this shift assignment? This action cannot be undone."
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
