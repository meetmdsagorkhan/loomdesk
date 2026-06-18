'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';
import { Check, X, Loader2, Calendar, Filter, ChevronLeft, ChevronRight, User, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Badge from '@/components/shared/Badge';
import ConfirmModal from '@/components/shared/ConfirmModal';
import PageHeader from '@/components/shared/PageHeader';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin } from '@/lib/auth-utils';
import { showToast } from '@/components/shared/Toast';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type LeaveRequest = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export default function LeaveAdminPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [actionLeaveId, setActionLeaveId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  interface SavedLeaveFilter {
    id: string;
    name: string;
    status: string;
    userId: string;
  }
  const [savedLeaveFilters, setSavedLeaveFilters] = useState<SavedLeaveFilter[]>([]);
  const [newLeaveFilterName, setNewLeaveFilterName] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('loomdesk_leave_filters');
    if (stored) {
      try {
        setSavedLeaveFilters(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  const handleSaveLeaveFilter = () => {
    if (!newLeaveFilterName.trim()) return;
    const newFilter: SavedLeaveFilter = {
      id: Date.now().toString(),
      name: newLeaveFilterName.trim(),
      status: selectedStatus,
      userId: selectedUserId,
    };
    const next = [...savedLeaveFilters, newFilter];
    setSavedLeaveFilters(next);
    localStorage.setItem('loomdesk_leave_filters', JSON.stringify(next));
    setNewLeaveFilterName('');
    showToast(`Filter preset "${newFilter.name}" saved`, 'success');
  };

  const handleDeleteLeaveFilter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = savedLeaveFilters.filter((f) => f.id !== id);
    setSavedLeaveFilters(next);
    localStorage.setItem('loomdesk_leave_filters', JSON.stringify(next));
    showToast('Filter preset deleted', 'success');
  };

  const handleApplyLeavePreset = (preset: SavedLeaveFilter) => {
    setSelectedStatus(preset.status);
    setSelectedUserId(preset.userId);
    showToast(`Loaded view: ${preset.name}`, 'info');
  };
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);

  const toggleSelectRequest = (id: string) => {
    setSelectedRequestIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllPending = () => {
    if (selectedRequestIds.length === pendingRequests.length) {
      setSelectedRequestIds([]);
    } else {
      setSelectedRequestIds(pendingRequests.map((r) => r.id));
    }
  };

  const handleBulkAction = async (type: 'approve' | 'reject') => {
    if (selectedRequestIds.length === 0) return;

    setIsProcessing(true);
    try {
      await Promise.all(
        selectedRequestIds.map((id) =>
          fetch(`/api/leave/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: type === 'approve' ? 'APPROVED' : 'REJECTED',
            }),
          })
        )
      );

      await fetchLeaveRequests();
      setSelectedRequestIds([]);
      showToast(
        `Successfully ${type === 'approve' ? 'approved' : 'rejected'} ${selectedRequestIds.length} requests`,
        'success'
      );
    } catch (error) {
      handleApiError(error, 'Leave Admin Bulk');
    } finally {
      setIsProcessing(false);
    }
  };

  // New Timeline Grid sub-tab states
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'inbox'>('timeline');
  const [startDate, setStartDate] = useState(new Date());

  const getWeekDays = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      dates.push(d);
    }
    return dates;
  };
  const weekDays = getWeekDays();

  const handlePrevWeek = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() - 7);
    setStartDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 7);
    setStartDate(d);
  };

  const handleToday = () => {
    setStartDate(new Date());
  };

  const getMemberLeaveForDate = (memberId: string, date: Date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const dateStr = d.toISOString().split('T')[0];

    const matched = leaveRequests.find((req) => {
      if (req.user?.id !== memberId) return false;
      const startD = new Date(req.startDate);
      startD.setMinutes(startD.getMinutes() - startD.getTimezoneOffset());
      const start = startD.toISOString().split('T')[0];

      const endD = new Date(req.endDate);
      endD.setMinutes(endD.getMinutes() - endD.getTimezoneOffset());
      const end = endD.toISOString().split('T')[0];

      return dateStr >= start && dateStr <= end;
    });

    return matched;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        handleApiError('Failed to fetch members', 'Leave Admin');
        return;
      }
      const data = await response.json();
      // Filter out ADMIN users from the member list
      setMembers((data.users || []).filter((u: { role: string }) => u.role !== 'ADMIN'));
    } catch (error) {
      handleApiError(error, 'Leave Admin');
    }
  };

  const fetchLeaveRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      // Do not filter by status server-side so the Timeline gets all leave data
      if (selectedUserId && selectedUserId !== 'all') params.append('userId', selectedUserId);

      const response = await fetch(`/api/leave?${params}`);
      if (!response.ok) {
        handleApiError('Failed to fetch leave requests', 'Leave Admin');
        return;
      }
      const data = await response.json();
      setLeaveRequests(data.leaveRequests || []);
    } catch (error) {
      handleApiError(error, 'Leave Admin');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, selectedUserId]);

  useEffect(() => {
    if (userLoading) return;
    if (!mounted) return;

    if (!user || !isAdmin({ user })) {
      router.push('/dashboard');
      return;
    }

    fetchMembers();
    fetchLeaveRequests();
  }, [user, userLoading, router, fetchLeaveRequests, mounted]);

  const handleAction = async () => {
    if (!actionLeaveId || !actionType) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/leave/${actionLeaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionType === 'approve' ? 'APPROVED' : 'REJECTED',
        }),
      });

      if (!response.ok) {
        handleApiError('Failed to update leave request', 'Leave Admin');
        return;
      }

      await fetchLeaveRequests();
      setActionLeaveId(null);
      setActionType(null);
      showToast(
        actionType === 'approve' ? 'Leave request approved' : 'Leave request rejected',
        'success'
      );
    } catch (error) {
      handleApiError(error, 'Leave Admin');
    } finally {
      setIsProcessing(false);
    }
  };

  const getDaysCount = (start: string, end: string) => {
    return differenceInDays(new Date(end), new Date(start)) + 1;
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

  const pendingRequests = leaveRequests.filter((r) => r.status === 'PENDING');
  const filteredLeaveRequests = leaveRequests.filter((req) => 
    selectedStatus === 'all' || req.status === selectedStatus
  );

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Leave Management"
        title="Review and manage leave requests"
        subtitle="Approve or reject pending requests, filter by status or member, and track team leave from one place."
      />

      {/* Sub-tabs Navigation */}
      <div className="flex border-b border-white/10 pb-1 gap-6">
        {[
          { id: 'timeline', label: 'Timeline Planner', icon: Calendar },
          { id: 'inbox', label: 'Request Inbox', icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as 'timeline' | 'inbox')}
            className={`relative pb-3 text-sm font-semibold transition-colors duration-300 flex items-center gap-2 ${
              activeSubTab === tab.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeSubTab === tab.id && (
              <motion.div
                layoutId="activeLeaveAdminSubTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="space-y-8"
        >
          {activeSubTab === 'timeline' && (
            <div className="rounded-3xl border border-white/10 bg-background/30 p-6 backdrop-blur-md shadow-xl">
              {/* Timeline Header Controls */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Leave Timeline Matrix</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Visualize and process team-wide leaves dynamically</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrevWeek} className="h-9 w-9 p-0 rounded-xl">
                    <ChevronLeft size={16} />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleToday} className="h-9 px-3 rounded-xl text-xs font-semibold">
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNextWeek} className="h-9 w-9 p-0 rounded-xl">
                    <ChevronRight size={16} />
                  </Button>
                  <span className="text-xs font-bold text-muted-foreground ml-2">
                    {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
                  </span>
                </div>
              </div>

              {/* Matrix Grid */}
              <div className="overflow-x-auto rounded-2xl border border-white/5 bg-background/20">
                <div className="min-w-[800px]">
                  {/* Grid Headers */}
                  <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-white/10 bg-white/5 py-3">
                    <div className="pl-6 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <User size={13} className="text-primary" /> Member Name
                    </div>
                    {weekDays.map((day) => (
                      <div key={day.toISOString()} className="text-center">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {format(day, 'EEE')}
                        </div>
                        <div className={`mt-1 text-sm font-bold ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'text-primary' : 'text-foreground'}`}>
                          {format(day, 'MMM d')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Grid Rows */}
                  {members.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">No team members loaded.</div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {members.map((member) => (
                        <div key={member.id} className="grid grid-cols-[200px_repeat(7,1fr)] items-center py-4 hover:bg-white/[0.02] transition-colors">
                          <div className="pl-6 font-semibold text-foreground text-sm truncate" title={member.name}>
                            {member.name}
                          </div>
                          {weekDays.map((day) => {
                            const leave = getMemberLeaveForDate(member.id, day);
                            return (
                              <div key={day.toISOString()} className="px-2 flex justify-center">
                                {leave ? (
                                  <div
                                    onClick={() => {
                                      if (leave.status === 'PENDING') {
                                        setActionLeaveId(leave.id);
                                        setActionType('approve');
                                      }
                                    }}
                                    className={`w-full rounded-2xl p-2.5 text-center text-xs font-medium cursor-pointer shadow-sm transition-all duration-300 ${
                                      leave.status === 'APPROVED'
                                        ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:scale-[1.02]'
                                        : leave.status === 'REJECTED'
                                        ? 'bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:bg-rose-500/20 hover:scale-[1.02]'
                                        : 'bg-amber-500/10 border border-amber-500/25 text-amber-400 animate-pulse hover:bg-amber-500/20 hover:scale-[1.02]'
                                    }`}
                                    title={`Applied: ${format(new Date(leave.createdAt), 'MMM d')}\nReason: ${leave.reason}`}
                                  >
                                    <div className="font-bold truncate uppercase tracking-widest text-[9px]">
                                      {leave.status}
                                    </div>
                                    <div className="mt-0.5 text-[10px] opacity-80 truncate">
                                      {leave.reason}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full h-10 rounded-2xl border border-dashed border-white/5 hover:border-white/20 transition-all flex items-center justify-center text-muted-foreground text-[10px] font-mono hover:bg-white/[0.01]">
                                    Available
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'inbox' && (
            <>
              {/* Filter Bar */}
              <section className="glass-card rounded-3xl p-4 card-elevation-md md:p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="form-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Member Filter */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Member</label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="form-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Members</SelectItem>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Apply Button */}
                  <div className="flex items-end">
                    <Button onClick={fetchLeaveRequests} className="w-full rounded-xl">
                      <Filter size={16} className="mr-2" />
                      Apply Filters
                    </Button>
                  </div>
                </div>

                {/* Saved Views Preset Bar */}
                {savedLeaveFilters.length > 0 && (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2 select-none">Saved Views</span>
                    <div className="flex flex-wrap gap-2">
                      {savedLeaveFilters.map((preset) => (
                        <div
                          key={preset.id}
                          onClick={() => handleApplyLeavePreset(preset)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary-foreground cursor-pointer transition-all"
                        >
                          <span>{preset.name}</span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteLeaveFilter(preset.id, e)}
                            className="text-muted-foreground hover:text-red-400 font-bold transition-colors ml-1"
                            title="Delete View"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save Current View Form */}
                <div className="mt-4 flex gap-2 items-center justify-end border-t border-white/10 pt-4">
                  <Input
                    type="text"
                    placeholder="Name current filter view..."
                    value={newLeaveFilterName}
                    onChange={(e) => setNewLeaveFilterName(e.target.value)}
                    className="h-8 text-xs max-w-[200px] rounded-lg bg-white/5 border-white/10 text-foreground"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleSaveLeaveFilter}
                    disabled={!newLeaveFilterName.trim()}
                    className="text-xs h-8 px-3 rounded-lg border-white/20 hover:bg-white/5"
                  >
                    Save Preset
                  </Button>
                </div>
              </section>

              {/* Pending Requests Section */}
              {selectedStatus === 'PENDING' && pendingRequests.length > 0 && (
                <section className="glass-card rounded-3xl overflow-hidden card-elevation-md">
                  <div className="border-b border-border/60 bg-warning/5 p-4 md:p-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">
                      Pending Requests ({pendingRequests.length})
                    </h2>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={handleSelectAllPending}
                      className="text-xs h-7 px-2.5 rounded-lg border-white/20 text-muted-foreground hover:text-white hover:bg-white/5"
                    >
                      {selectedRequestIds.length === pendingRequests.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="divide-y divide-border/40">
                    {pendingRequests.map((leave) => {
                      const overlapCount = leaveRequests.filter((req) => 
                        req.status === 'APPROVED' &&
                        new Date(req.startDate) <= new Date(leave.endDate) &&
                        new Date(leave.startDate) <= new Date(req.endDate) &&
                        req.id !== leave.id
                      ).length;

                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                      const requestFrequency = leaveRequests.filter((req) => 
                        req.user?.id === leave.user?.id && 
                        new Date(req.createdAt) >= thirtyDaysAgo
                      ).length;

                      // Weekend border checks: start on Fri/Sat or end on Sun/Mon
                      const startDay = new Date(leave.startDate).getDay();
                      const endDay = new Date(leave.endDate).getDay();
                      const isWeekendBorder = startDay === 5 || startDay === 6 || endDay === 0 || endDay === 1;

                      // Risk calculations
                      let riskScore = overlapCount * 35;
                      if (isWeekendBorder) riskScore += 20;
                      if (requestFrequency > 2) riskScore += 20;
                      riskScore = Math.min(riskScore, 100);

                      let riskLevel = 'Safe';
                      let riskColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                      let riskReason = 'Optimal coverage, approve recommended.';
                      
                      if (riskScore >= 70) {
                        riskLevel = 'Critical Risk';
                        riskColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                        riskReason = 'High staffing risk / potential attendance pattern cluster.';
                      } else if (riskScore >= 30) {
                        riskLevel = 'Warning Risk';
                        riskColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                        riskReason = 'Moderate overlap / verify department coverage.';
                      }

                      return (
                        <div key={leave.id} className="p-4 md:p-6 flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={selectedRequestIds.includes(leave.id)}
                            onChange={() => toggleSelectRequest(leave.id)}
                            className="accent-primary h-4 w-4 mt-1.5 rounded cursor-pointer shrink-0"
                          />
                          <div className="flex-1">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                              <div className="flex-1">
                                <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                                  <h3 className="font-medium text-foreground">{leave.user?.name || "Unknown User"}</h3>
                                  <span className="text-sm text-muted-foreground">{leave.user?.email || "No email"}</span>
                                </div>
                                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                                  <div>
                                    <span className="text-muted-foreground">Dates:</span>{' '}
                                    <span className="text-foreground">
                                      {format(new Date(leave.startDate), 'MMM d')} -{' '}
                                      {format(new Date(leave.endDate), 'MMM d, yyyy')}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Duration:</span>{' '}
                                    <span className="text-foreground">{getDaysCount(leave.startDate, leave.endDate)} days</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Applied:</span>{' '}
                                    <span className="text-foreground">
                                      {format(new Date(leave.createdAt), 'MMM d, yyyy')}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <span className="text-sm text-muted-foreground">Reason: </span>
                                  <span className="text-sm text-foreground break-words">{leave.reason}</span>
                                </div>
                                
                                {/* Decision Support Badges */}
                                <div className="mt-3.5 flex flex-wrap gap-2 items-center">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Decision Support:</span>
                                  {overlapCount > 0 ? (
                                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                      {overlapCount} Approved Overlap{overlapCount > 1 ? 's' : ''}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      No Overlap Conflicts
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${requestFrequency > 2 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                    30D Freq: {requestFrequency} request{requestFrequency !== 1 ? 's' : ''}
                                  </span>
                                  {isWeekendBorder && (
                                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                      Weekend Border
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${riskColor}`} title={riskReason}>
                                    {riskLevel} ({riskScore}%)
                                  </span>
                                </div>
                              </div>
                              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full rounded-xl border-destructive text-destructive hover:bg-destructive/10 sm:w-auto"
                                  disabled={isProcessing}
                                  onClick={() => {
                                    setActionLeaveId(leave.id);
                                    setActionType('reject');
                                  }}
                                >
                                  <X size={16} className="mr-2" />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  className="w-full rounded-xl bg-success text-success-foreground hover:bg-success/90 sm:w-auto"
                                  disabled={isProcessing}
                                  onClick={() => {
                                    setActionLeaveId(leave.id);
                                    setActionType('approve');
                                  }}
                                >
                                  <Check size={16} className="mr-2" />
                                  Approve
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* All Requests Table */}
              <section className="glass-card rounded-3xl overflow-hidden card-elevation-md">
                <div className="border-b border-border/60 p-4 md:p-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    All Requests ({filteredLeaveRequests.length})
                  </h2>
                </div>
                {filteredLeaveRequests.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="rounded-2xl border border-dashed border-slate-300/50 p-8 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(0,0,0,0.05),0_8px_32px_rgba(0,0,0,0.05)] dark:border-slate-700/50 dark:bg-slate-800/50 dark:backdrop-blur-sm dark:shadow-none">
                      <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No leave requests found</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 md:p-6">
                    <div className="hidden lg:block">
                      <div className="overflow-x-auto rounded-2xl border border-border/40 bg-background/30 backdrop-blur-sm">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border/60 backdrop-blur-sm">
                              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Member</th>
                              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Start Date</th>
                              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">End Date</th>
                              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Days</th>
                              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Reason</th>
                              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Applied On</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredLeaveRequests.map((leave) => (
                              <tr key={leave.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 backdrop-blur-sm">
                                <td className="px-6 py-4 text-sm text-foreground">{leave.user?.name || "Unknown User"}</td>
                                <td className="px-6 py-4 text-sm text-foreground">
                                  {format(new Date(leave.startDate), 'MMM d, yyyy')}
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground">
                                  {format(new Date(leave.endDate), 'MMM d, yyyy')}
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground">
                                  {getDaysCount(leave.startDate, leave.endDate)}
                                </td>
                                <td className="max-w-xs truncate px-6 py-4 text-sm text-muted-foreground">
                                  {leave.reason}
                                </td>
                                <td className="px-6 py-4">
                                  <Badge
                                    variant={
                                      leave.status === 'APPROVED'
                                        ? 'success'
                                        : leave.status === 'REJECTED'
                                        ? 'danger'
                                        : 'warning'
                                    }
                                    label={leave.status}
                                  />
                                </td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">
                                  {format(new Date(leave.createdAt), 'MMM d, yyyy')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-3 lg:hidden">
                      {filteredLeaveRequests.map((leave) => (
                        <div
                          key={leave.id}
                          className="rounded-2xl border border-border/40 bg-background/35 p-4 backdrop-blur-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{leave.user?.name || "Unknown User"}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{leave.user?.email || "No email"}</p>
                            </div>
                            <Badge
                              variant={
                                leave.status === 'APPROVED'
                                  ? 'success'
                                  : leave.status === 'REJECTED'
                                  ? 'danger'
                                  : 'warning'
                              }
                              label={leave.status}
                            />
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Dates
                              </p>
                              <p className="mt-1 text-sm text-foreground">
                                {format(new Date(leave.startDate), 'MMM d')} - {format(new Date(leave.endDate), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Duration
                              </p>
                              <p className="mt-1 text-sm text-foreground">
                                {getDaysCount(leave.startDate, leave.endDate)} days
                              </p>
                            </div>
                            <div className="sm:col-span-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Reason
                              </p>
                              <p className="mt-1 text-sm text-foreground break-words">{leave.reason}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Applied
                              </p>
                              <p className="mt-1 text-sm text-foreground">
                                {format(new Date(leave.createdAt), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bulk actions floating toolbar */}
      {selectedRequestIds.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 bg-slate-900/90 dark:bg-slate-950/90 border border-white/20 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <span className="text-sm font-bold text-white">
            {selectedRequestIds.length} request{selectedRequestIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('reject')}
              disabled={isProcessing}
              className="border-red-500 text-red-400 hover:bg-red-500/10 rounded-xl"
            >
              <X size={14} className="mr-1.5" />
              Reject Selected
            </Button>
            <Button
              size="sm"
              onClick={() => handleBulkAction('approve')}
              disabled={isProcessing}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
            >
              <Check size={14} className="mr-1.5" />
              Approve Selected
            </Button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!actionLeaveId && !!actionType}
        onCancel={() => {
          setActionLeaveId(null);
          setActionType(null);
        }}
        onConfirm={handleAction}
        title={actionType === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
        description={`Are you sure you want to ${actionType} this leave request? This action cannot be undone.`}
        confirmLabel={actionType === 'approve' ? 'Approve' : 'Reject'}
        variant={actionType === 'approve' ? 'default' : 'danger'}
      />
    </div>
  );
}
