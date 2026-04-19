'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin } from '@/lib/auth-utils';

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
      const data = await response.json();
      setShifts(data.shifts || []);
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch('/api/shifts/schedule');
      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setMembers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
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
    } catch (error) {
      console.error('Failed to create shift:', error);
      setError('Failed to create shift');
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
    } catch (error) {
      console.error('Failed to assign shift:', error);
      setError('Failed to assign shift');
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
        alert('Failed to delete assignment');
        return;
      }

      await fetchAssignments();
      setDeleteAssignmentId(null);
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      alert('Failed to delete assignment');
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Shift Management</h1>
        <p className="text-muted-foreground mt-1">Create shift templates and assign to team members</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shifts Panel */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-foreground">Shift Templates</h2>
            {!showCreateShift && (
              <Button size="sm" onClick={() => setShowCreateShift(true)}>
                <Plus size={16} className="mr-2" />
                Create Shift
              </Button>
            )}
          </div>

          {/* Create Shift Form */}
          {showCreateShift && (
            <form onSubmit={handleCreateShift} className="space-y-4 mb-6 p-4 bg-muted/50 rounded-xl">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                <input
                  type="text"
                  value={newShift.name}
                  onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                  placeholder="e.g., Morning Shift"
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Start Time</label>
                  <input
                    type="time"
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">End Time</label>
                  <input
                    type="time"
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Report Deadline</label>
                  <input
                    type="time"
                    value={newShift.reportDeadline}
                    onChange={(e) => setNewShift({ ...newShift, reportDeadline: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
              </div>
              {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={isCreatingShift}>
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
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Shifts List */}
          {shifts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock size={48} className="mx-auto mb-4" />
              <p>No shift templates created yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {shifts.map((shift) => (
                <div key={shift.id} className="p-4 bg-muted/50 rounded-xl">
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
        </div>

        {/* Assign Shift Panel */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">Assign Shift</h2>
          <form onSubmit={handleAssignShift} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Member</label>
              <select
                value={assignForm.userId}
                onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              >
                <option value="">Select member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Shift</label>
              <select
                value={assignForm.shiftId}
                onChange={(e) => setAssignForm({ ...assignForm, shiftId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              >
                <option value="">Select shift</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({shift.startTime} - {shift.endTime})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Start Date</label>
                <input
                  type="date"
                  value={assignForm.startDate}
                  onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">End Date</label>
                <input
                  type="date"
                  value={assignForm.endDate}
                  onChange={(e) => setAssignForm({ ...assignForm, endDate: e.target.value })}
                  min={assignForm.startDate}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <Button type="submit" disabled={isAssigning} className="w-full">
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
        </div>
      </div>

      {/* Current Assignments Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-medium text-foreground">Current Assignments</h2>
        </div>
        {assignments.length === 0 ? (
          <div className="p-12 text-center">
            <Clock size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No shift assignments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Member</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Shift</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Hours</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Period</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="border-b border-border last:border-0">
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
      </div>

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
