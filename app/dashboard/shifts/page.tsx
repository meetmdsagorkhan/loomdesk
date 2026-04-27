'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Loader2, Plus, Trash2, Pencil, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  endDate: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
  shift: Shift;
};

type ShiftException = {
  id: string;
  date: string;
  shiftId: string | null;
  shift: Shift | null;
  note: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export default function ShiftsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [exceptions, setExceptions] = useState<ShiftException[]>([]);
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
    untilFurtherNotice: false,
  });
  const [isAssigning, setIsAssigning] = useState(false);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState<string | null>(null);
  
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editingShiftForm, setEditingShiftForm] = useState({
    name: '',
    startTime: '',
    endTime: '',
    reportDeadline: '',
  });
  const [isUpdatingShift, setIsUpdatingShift] = useState(false);
  const [deleteShiftId, setDeleteShiftId] = useState<string | null>(null);

  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false);

  const [exceptionForm, setExceptionForm] = useState({
    userId: '',
    date: '',
    shiftId: '',
    note: '',
  });
  const [isCreatingException, setIsCreatingException] = useState(false);
  const [deleteExceptionId, setDeleteExceptionId] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (userLoading) return;
    if (!mounted) return;

    // Team Leads and Admins can manage shifts
    // Members are redirected to their own schedule
    if (!user || (!isAdmin({ user }) && user.role !== 'TEAM_LEAD')) {
      router.push('/shifts/my-schedule');
      return;
    }

    fetchShifts();
    fetchAssignments();
    fetchExceptions();
    fetchMembers();
  }, [user, userLoading, router, mounted]);

  const fetchExceptions = async () => {
    try {
      const response = await fetch('/api/shifts/exceptions');
      if (response.ok) {
        const data = await response.json();
        setExceptions(data.exceptions || []);
      }
    } catch (error) {
      // Silently fail - exceptions list will be empty
    }
  };

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
      // Filter out ADMIN users from the member list
      setMembers((data.users || []).filter((u: { role: string }) => u.role !== 'ADMIN'));
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

  const handleEditShiftClick = (shift: Shift) => {
    setEditingShiftId(shift.id);
    setEditingShiftForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      reportDeadline: shift.reportDeadline,
    });
    setError('');
  };

  const handleUpdateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!editingShiftForm.name || !editingShiftForm.startTime || !editingShiftForm.endTime || !editingShiftForm.reportDeadline) {
      setError('All fields are required');
      return;
    }

    setIsUpdatingShift(true);
    try {
      const response = await fetch(`/api/shifts/${editingShiftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingShiftForm),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to update shift');
        return;
      }

      await fetchShifts();
      setEditingShiftId(null);
      showToast('Shift updated successfully', 'success');
    } catch (error) {
      handleApiError(error, 'Shift Management');
    } finally {
      setIsUpdatingShift(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!deleteShiftId) return;

    try {
      const response = await fetch(`/api/shifts/${deleteShiftId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        handleApiError(data.error || 'Failed to delete shift', 'Shift Management');
        return;
      }

      await fetchShifts();
      setDeleteShiftId(null);
      showToast('Shift deleted', 'success');
    } catch (error) {
      handleApiError(error, 'Shift Management');
    }
  };

  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!assignForm.userId || !assignForm.shiftId || !assignForm.startDate) {
      setError('Required fields are missing');
      return;
    }

    if (!assignForm.untilFurtherNotice && !assignForm.endDate) {
      setError('End date is required unless "Until further notice" is checked');
      return;
    }

    const isEditing = !!editingAssignmentId;
    const actionStateSetter = isEditing ? setIsUpdatingAssignment : setIsAssigning;
    actionStateSetter(true);
    
    try {
      const payload = {
        userId: assignForm.userId,
        shiftId: assignForm.shiftId,
        startDate: assignForm.startDate,
        endDate: assignForm.untilFurtherNotice ? null : assignForm.endDate,
      };

      const url = isEditing ? `/api/shifts/assignments/${editingAssignmentId}` : '/api/shifts/assign';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || `Failed to ${isEditing ? 'update' : 'assign'} shift`);
        return;
      }

      await fetchAssignments();
      setAssignForm({ userId: '', shiftId: '', startDate: '', endDate: '', untilFurtherNotice: false });
      setEditingAssignmentId(null);
      showToast(`Shift ${isEditing ? 'updated' : 'assigned'} successfully`, 'success');
    } catch (error) {
      handleApiError(error, 'Shift Management');
    } finally {
      actionStateSetter(false);
    }
  };

  const handleEditAssignmentClick = (assignment: ShiftAssignment) => {
    setEditingAssignmentId(assignment.id);
    setAssignForm({
      userId: assignment.user.id,
      shiftId: assignment.shift.id,
      startDate: new Date(assignment.startDate).toISOString().split('T')[0],
      endDate: assignment.endDate ? new Date(assignment.endDate).toISOString().split('T')[0] : '',
      untilFurtherNotice: !assignment.endDate,
    });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleCreateException = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!exceptionForm.userId || !exceptionForm.date || !exceptionForm.shiftId) {
      setError('Please fill in all required fields');
      return;
    }

    setIsCreatingException(true);
    try {
      const payload = {
        userId: exceptionForm.userId,
        date: exceptionForm.date,
        shiftId: exceptionForm.shiftId === 'off' ? null : exceptionForm.shiftId,
        note: exceptionForm.note,
      };

      const response = await fetch('/api/shifts/exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create override');
        return;
      }

      await fetchExceptions();
      setExceptionForm({ userId: '', date: '', shiftId: '', note: '' });
      showToast('Override created successfully', 'success');
    } catch (error) {
      handleApiError(error, 'Shift Management');
    } finally {
      setIsCreatingException(false);
    }
  };

  const handleDeleteException = async () => {
    if (!deleteExceptionId) return;

    try {
      const response = await fetch(`/api/shifts/exceptions/${deleteExceptionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        handleApiError(data.error || 'Failed to remove override', 'Shift Management');
        return;
      }

      await fetchExceptions();
      setDeleteExceptionId(null);
      showToast('Override removed', 'success');
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
            <GlassCard variant="panel" padding="sm" className="mb-6">
              <form onSubmit={handleCreateShift} className="space-y-4">
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
                <div className="flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-3 rounded-xl text-sm font-medium">
                  <AlertCircle size={16} />
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
            </GlassCard>
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
                <GlassCard key={shift.id} variant="panel" padding="sm" hover>
                  {editingShiftId === shift.id ? (
                    <form onSubmit={handleUpdateShift} className="space-y-4">
                      <div>
                        <Label className="form-label">Name</Label>
                        <Input
                          type="text"
                          value={editingShiftForm.name}
                          onChange={(e) => setEditingShiftForm({ ...editingShiftForm, name: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="form-label">Start Time</Label>
                          <Input
                            type="time"
                            value={editingShiftForm.startTime}
                            onChange={(e) => setEditingShiftForm({ ...editingShiftForm, startTime: e.target.value })}
                            className="form-input"
                          />
                        </div>
                        <div>
                          <Label className="form-label">End Time</Label>
                          <Input
                            type="time"
                            value={editingShiftForm.endTime}
                            onChange={(e) => setEditingShiftForm({ ...editingShiftForm, endTime: e.target.value })}
                            className="form-input"
                          />
                        </div>
                        <div>
                          <Label className="form-label">Report Deadline</Label>
                          <Input
                            type="time"
                            value={editingShiftForm.reportDeadline}
                            onChange={(e) => setEditingShiftForm({ ...editingShiftForm, reportDeadline: e.target.value })}
                            className="form-input"
                          />
                        </div>
                      </div>
                      {error && (
                        <div className="flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-3 rounded-xl text-sm font-medium">
                          <AlertCircle size={16} />
                          {error}
                        </div>
                      )}
                      <div className="flex gap-2 justify-end">
                        <Button type="submit" size="sm" disabled={isUpdatingShift} className="rounded-xl">
                          {isUpdatingShift ? <Loader2 size={14} className="mr-2 animate-spin" /> : 'Save'}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEditingShiftId(null)} className="rounded-xl">
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
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
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEditShiftClick(shift)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Pencil size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteShiftId(shift.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Assign/Edit Shift Panel */}
        <GlassCard variant="default" padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {editingAssignmentId ? 'Edit Assignment' : 'Assign Shift'}
            </h2>
            {editingAssignmentId && (
              <Button size="icon" variant="ghost" onClick={() => {
                setEditingAssignmentId(null);
                setAssignForm({ userId: '', shiftId: '', startDate: '', endDate: '', untilFurtherNotice: false });
                setError('');
              }}>
                <X size={16} />
              </Button>
            )}
          </div>
          <form onSubmit={handleAssignShift} className="space-y-4">
            <div>
              <Label className="form-label">Member</Label>
              <Select
                value={assignForm.userId}
                onValueChange={(value) => setAssignForm({ ...assignForm, userId: value })}
              >
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="form-label">Shift</Label>
              <Select
                value={assignForm.shiftId}
                onValueChange={(value) => setAssignForm({ ...assignForm, shiftId: value })}
              >
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {shift.name} ({shift.startTime} - {shift.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
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
              <div className={assignForm.untilFurtherNotice ? 'opacity-50' : ''}>
                <Label className="form-label">End Date</Label>
                <Input
                  type="date"
                  value={assignForm.endDate}
                  onChange={(e) => setAssignForm({ ...assignForm, endDate: e.target.value })}
                  min={assignForm.startDate}
                  disabled={assignForm.untilFurtherNotice}
                  className="form-input"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="untilFurtherNotice"
                checked={assignForm.untilFurtherNotice}
                onChange={(e) => {
                  setAssignForm({
                    ...assignForm,
                    untilFurtherNotice: e.target.checked,
                    ...(e.target.checked ? { endDate: '' } : {})
                  });
                }}
              />
              <Label htmlFor="untilFurtherNotice" className="text-sm font-medium text-foreground cursor-pointer">
                Until further notice (No end date)
              </Label>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-3 rounded-xl text-sm font-medium">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <Button type="submit" disabled={isAssigning || isUpdatingAssignment} className="w-full rounded-xl">
              {isAssigning || isUpdatingAssignment ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  {editingAssignmentId ? 'Updating...' : 'Assigning...'}
                </>
              ) : (
                editingAssignmentId ? 'Update Assignment' : 'Assign Shift'
              )}
            </Button>
          </form>
        </GlassCard>
      </div>

      {/* Current Assignments Table */}
      <GlassCard variant="default" padding="none">
        <div className="p-6 pb-2">
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
          <div className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs border border-primary/20">
                          {assignment.user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{assignment.user.name}</p>
                          <p className="text-xs text-muted-foreground">{assignment.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-500 border border-blue-500/20">
                        {assignment.shift.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getShiftHours(assignment.shift.startTime, assignment.shift.endTime)}h
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(assignment.startDate).toLocaleDateString()} - {assignment.endDate ? new Date(assignment.endDate).toLocaleDateString() : 'Until further notice'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEditAssignmentClick(assignment)}
                          className="rounded-xl"
                        >
                          <Pencil size={14} className="mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteAssignmentId(assignment.id)}
                          className="rounded-xl"
                        >
                          <Trash2 size={14} className="mr-2" />
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>

      {/* Exceptions & Overrides Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard variant="panel" padding="md" className="lg:col-span-1 h-fit">
          <h2 className="text-lg font-semibold text-foreground mb-4">Add Holiday / Override</h2>
          <form onSubmit={handleCreateException} className="space-y-4">
            <div>
              <Label className="form-label">Member</Label>
              <Select
                value={exceptionForm.userId}
                onValueChange={(value) => setExceptionForm({ ...exceptionForm, userId: value })}
              >
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="form-label">Date</Label>
              <Input
                type="date"
                value={exceptionForm.date}
                onChange={(e) => setExceptionForm({ ...exceptionForm, date: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <Label className="form-label">Action</Label>
              <Select
                value={exceptionForm.shiftId}
                onValueChange={(value) => setExceptionForm({ ...exceptionForm, shiftId: value })}
              >
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">🏖️ Day Off (Holiday)</SelectItem>
                  {shifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>🏢 Work: {shift.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="form-label">Note (Optional)</Label>
              <Input
                type="text"
                placeholder="e.g., Covering for John"
                value={exceptionForm.note}
                onChange={(e) => setExceptionForm({ ...exceptionForm, note: e.target.value })}
                className="form-input"
              />
            </div>
            <Button type="submit" disabled={isCreatingException} className="w-full rounded-xl">
              {isCreatingException ? <Loader2 size={16} className="mr-2 animate-spin" /> : 'Add Override'}
            </Button>
          </form>
        </GlassCard>

        <GlassCard variant="default" padding="none" className="lg:col-span-2">
          <div className="p-6 pb-2">
            <h2 className="text-lg font-semibold text-foreground">Holiday Overrides & Exceptions</h2>
          </div>
          {exceptions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 backdrop-blur-sm">
                <Clock size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No overrides set yet</p>
              </div>
            </div>
          ) : (
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Remove</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exceptions.map((exc) => (
                    <TableRow key={exc.id}>
                      <TableCell>
                        <p className="font-medium text-sm text-foreground">{exc.user.name}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(exc.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {exc.shift ? (
                          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-500 border border-blue-500/20">
                            Work: {exc.shift.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500 border border-green-500/20">
                            Day Off
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {exc.note || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteExceptionId(exc.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Delete Confirm Modals */}
      <ConfirmModal
        isOpen={!!deleteAssignmentId}
        onCancel={() => setDeleteAssignmentId(null)}
        onConfirm={handleDeleteAssignment}
        title="Remove Assignment"
        description="Are you sure you want to remove this shift assignment? This action cannot be undone."
        confirmLabel="Remove"
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!deleteShiftId}
        onCancel={() => setDeleteShiftId(null)}
        onConfirm={handleDeleteShift}
        title="Delete Shift Template"
        description="Are you sure you want to delete this shift template? You can only delete templates that have not been assigned yet."
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!deleteExceptionId}
        onCancel={() => setDeleteExceptionId(null)}
        onConfirm={handleDeleteException}
        title="Remove Override"
        description="Are you sure you want to remove this shift override? The member will return to their standard shift assignment for this date."
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
