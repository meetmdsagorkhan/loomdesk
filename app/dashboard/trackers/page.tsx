'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import DataTable from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { showToast } from '@/components/shared/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  CreditCard, 
  DollarSign, 
  UserMinus, 
  PowerOff, 
  Plus, 
  Search, 
  Loader2, 
  X, 
  Unlock,
  CheckCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';

type TrackerType = 'CARD_SUSPENSION' | 'DUE_WAIVE' | 'ACCOUNT_TERMINATION' | 'RESOURCE_CLOSURE';

interface TrackerItem {
  id: string;
  type: TrackerType;
  userName: string;
  cardLast4: string | null;
  amount: number | null;
  reason: string;
  status: string;
  actionDate: string | null;
  actionBy: string | null;
  actionReason: string | null;
  resourceType: string | null;
  note: string | null;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
}

export default function TrackersPage() {
  const { user: currentUser } = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TrackerItem[]>([]);
  const [activeTab, setActiveTab] = useState<TrackerType>('CARD_SUSPENSION');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TrackerItem | null>(null);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [formType, setFormType] = useState<TrackerType>('CARD_SUSPENSION');
  const [formData, setFormData] = useState({
    userName: '',
    cardLast4: '',
    amount: '',
    reason: '',
    resourceType: '',
    note: '',
  });

  // Unblock Form State
  const [unblockData, setUnblockData] = useState({
    unblockedBy: '',
    unblockedDate: '',
    unblockingReason: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTrackers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      const res = await fetch(`/api/trackers?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch trackers');
      }
      const data = await res.json();
      if (data.success) {
        setItems(data.trackers || []);
      } else {
        showToast(data.error || 'Failed to fetch trackers', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading tracker logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (mounted) {
      void fetchTrackers();
    }
  }, [mounted, fetchTrackers]);

  // Handle Log Task Submission
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userName || !formData.reason) {
      showToast('Please fill out the User Name and Reason fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/trackers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formType,
          userName: formData.userName,
          cardLast4: formData.cardLast4 || undefined,
          amount: formData.amount ? parseFloat(formData.amount) : undefined,
          reason: formData.reason,
          resourceType: formData.resourceType || undefined,
          note: formData.note || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Task tracked successfully', 'success');
        setIsLogModalOpen(false);
        setFormData({
          userName: '',
          cardLast4: '',
          amount: '',
          reason: '',
          resourceType: '',
          note: '',
        });
        void fetchTrackers();
      } else {
        showToast(data.error || 'Failed to track task', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while saving task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Card Unblocking Submission
  const handleUnblockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!unblockData.unblockedBy || !unblockData.unblockingReason) {
      showToast('Please fill out all fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/trackers/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'UNBLOCKED',
          actionDate: unblockData.unblockedDate ? new Date(unblockData.unblockedDate).toISOString() : new Date().toISOString(),
          actionBy: unblockData.unblockedBy,
          actionReason: unblockData.unblockingReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Card unblocked successfully', 'success');
        setIsUnblockModalOpen(false);
        setSelectedItem(null);
        setUnblockData({
          unblockedBy: '',
          unblockedDate: '',
          unblockingReason: '',
        });
        void fetchTrackers();
      } else {
        showToast(data.error || 'Failed to unblock card', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while unblocking', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Log Modal with default type
  const openLogModal = (type: TrackerType) => {
    setFormType(type);
    setIsLogModalOpen(true);
  };

  // Open Unblock Modal for specific item
  const openUnblockModal = (item: TrackerItem) => {
    setSelectedItem(item);
    setUnblockData({
      unblockedBy: currentUser?.name || '',
      unblockedDate: format(new Date(), 'yyyy-MM-dd'),
      unblockingReason: '',
    });
    setIsUnblockModalOpen(true);
  };

  // Filter items for current active tab
  const activeItems = useMemo(() => {
    return items.filter(item => item.type === activeTab);
  }, [items, activeTab]);

  // Dynamic stats calculation
  const stats = useMemo(() => {
    const cardSuspensions = items.filter(i => i.type === 'CARD_SUSPENSION');
    const activeSuspensions = cardSuspensions.filter(i => i.status === 'SUSPENDED').length;
    
    const dueWaives = items.filter(i => i.type === 'DUE_WAIVE');
    const totalWaived = dueWaives.reduce((sum, i) => sum + (i.amount || 0), 0);

    const accountTerminations = items.filter(i => i.type === 'ACCOUNT_TERMINATION').length;
    const resourceClosures = items.filter(i => i.type === 'RESOURCE_CLOSURE').length;

    return {
      activeSuspensions,
      totalWaived,
      accountTerminations,
      resourceClosures,
    };
  }, [items]);

  // Define columns for each tab
  const columns = useMemo(() => {
    switch (activeTab) {
      case 'CARD_SUSPENSION':
        return [
          { key: 'userName', label: 'User Name' },
          { key: 'cardLast4', label: 'Card Last 4' },
          { key: 'reason', label: 'Reason for Suspension' },
          { key: 'status', label: 'Status' },
          { key: 'unblockedDate', label: 'Unblocked Date' },
          { key: 'unblockedBy', label: 'Unblocked By' },
          { key: 'unblockingReason', label: 'Unblocking Reason' },
          { key: 'note', label: 'Note' },
          { key: 'actions', label: 'Actions', sortable: false },
        ];
      case 'DUE_WAIVE':
        return [
          { key: 'userName', label: 'User Name' },
          { key: 'cardLast4', label: 'Card Last 4' },
          { key: 'amount', label: 'Waived Amount' },
          { key: 'reason', label: 'Reason for Waive' },
          { key: 'actionBy', label: 'Waived By' },
          { key: 'note', label: 'Note' },
          { key: 'createdAt', label: 'Logged Date' },
        ];
      case 'ACCOUNT_TERMINATION':
        return [
          { key: 'userName', label: 'User Name' },
          { key: 'reason', label: 'Reason for Termination' },
          { key: 'actionBy', label: 'Terminated By' },
          { key: 'status', label: 'Status' },
          { key: 'note', label: 'Note' },
          { key: 'createdAt', label: 'Termination Date' },
        ];
      case 'RESOURCE_CLOSURE':
        return [
          { key: 'userName', label: 'Owner Name' },
          { key: 'resourceType', label: 'Resource Type' },
          { key: 'reason', label: 'Reason for Closure' },
          { key: 'status', label: 'Status' },
          { key: 'note', label: 'Note' },
          { key: 'createdAt', label: 'Closure Date' },
        ];
    }
  }, [activeTab]);

  // Format data for DataTable
  const formattedData = useMemo(() => {
    return activeItems.map(item => {
      const baseRow: Record<string, React.ReactNode> = {
        userName: <span className="font-semibold text-slate-800 dark:text-slate-100">{item.userName}</span>,
        note: <span className="text-xs text-muted-foreground block max-w-xs truncate" title={item.note || ''}>{item.note || '—'}</span>,
        createdAt: <span className="text-xs text-muted-foreground">{format(new Date(item.createdAt), 'MMM dd, yyyy')}</span>,
      };

      if (activeTab === 'CARD_SUSPENSION') {
        const isSuspended = item.status === 'SUSPENDED';
        baseRow.cardLast4 = <Badge variant="outline" className="font-mono bg-white/40 dark:bg-black/20">•••• {item.cardLast4 || '—'}</Badge>;
        baseRow.reason = <span className="text-sm text-foreground">{item.reason}</span>;
        baseRow.status = (
          <Badge className={isSuspended ? 'bg-destructive/15 text-destructive border-destructive/20 font-medium' : 'bg-success/15 text-success border-success/20 font-medium'}>
            {item.status}
          </Badge>
        );
        baseRow.unblockedDate = item.actionDate ? (
          <span className="text-xs text-foreground">{format(new Date(item.actionDate), 'MMM dd, yyyy')}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
        baseRow.unblockedBy = <span className="text-xs text-foreground">{item.actionBy || '—'}</span>;
        baseRow.unblockingReason = <span className="text-xs text-muted-foreground block max-w-[140px] truncate" title={item.actionReason || ''}>{item.actionReason || '—'}</span>;
        baseRow.actions = isSuspended ? (
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 text-xs gap-1 border-primary/20 bg-primary/5 hover:bg-primary/15 text-primary"
            onClick={() => openUnblockModal(item)}
          >
            <Unlock size={12} />
            Unblock
          </Button>
        ) : (
          <span className="text-xs text-success flex items-center gap-1 font-medium">
            <CheckCircle size={12} /> Resolved
          </span>
        );
      }

      if (activeTab === 'DUE_WAIVE') {
        baseRow.cardLast4 = <Badge variant="outline" className="font-mono">•••• {item.cardLast4 || '—'}</Badge>;
        baseRow.amount = <span className="font-bold text-success-light">${item.amount?.toFixed(2) || '0.00'}</span>;
        baseRow.reason = <span className="text-sm text-foreground">{item.reason}</span>;
        baseRow.actionBy = <span className="text-xs text-foreground">{item.actionBy || '—'}</span>;
      }

      if (activeTab === 'ACCOUNT_TERMINATION') {
        baseRow.reason = <span className="text-sm text-foreground">{item.reason}</span>;
        baseRow.actionBy = <span className="text-xs text-foreground">{item.actionBy || '—'}</span>;
        baseRow.status = (
          <Badge className="bg-destructive/15 text-destructive border-destructive/20 font-medium">
            {item.status}
          </Badge>
        );
      }

      if (activeTab === 'RESOURCE_CLOSURE') {
        baseRow.resourceType = <Badge className="bg-info/15 text-info border-info/20 font-semibold uppercase text-[10px] tracking-wider">{item.resourceType || 'OTHER'}</Badge>;
        baseRow.reason = <span className="text-sm text-foreground">{item.reason}</span>;
        baseRow.status = (
          <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/20 font-medium">
            {item.status}
          </Badge>
        );
      }

      return baseRow;
    });
  }, [activeItems, activeTab, currentUser]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          badge="Operations"
          title="Special Task Trackers"
          subtitle="Log, manage, and audit restricted task operations."
        />
        <Button 
          onClick={() => openLogModal(activeTab)}
          className="btn-primary self-start sm:self-center flex items-center gap-2 rounded-2xl shadow-lg shadow-primary/20 h-11 px-5"
        >
          <Plus size={16} />
          Log New Task
        </Button>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard variant="minimal" padding="md" className="border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Suspensions</p>
              <h3 className="text-3xl font-bold font-heading text-destructive">{stats.activeSuspensions}</h3>
            </div>
            <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
              <CreditCard size={20} />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 rounded-full blur-xl opacity-10 bg-destructive" />
        </GlassCard>

        <GlassCard variant="minimal" padding="md" className="border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Dues Waived</p>
              <h3 className="text-3xl font-bold font-heading text-success">${stats.totalWaived.toFixed(2)}</h3>
            </div>
            <div className="p-3 rounded-2xl bg-success/10 border border-success/20 text-success">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 rounded-full blur-xl opacity-10 bg-success" />
        </GlassCard>

        <GlassCard variant="minimal" padding="md" className="border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Terminations</p>
              <h3 className="text-3xl font-bold font-heading text-warning">{stats.accountTerminations}</h3>
            </div>
            <div className="p-3 rounded-2xl bg-warning/10 border border-warning/20 text-warning">
              <UserMinus size={20} />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 rounded-full blur-xl opacity-10 bg-warning" />
        </GlassCard>

        <GlassCard variant="minimal" padding="md" className="border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Closed Resources</p>
              <h3 className="text-3xl font-bold font-heading text-info">{stats.resourceClosures}</h3>
            </div>
            <div className="p-3 rounded-2xl bg-info/10 border border-info/20 text-info">
              <PowerOff size={20} />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 rounded-full blur-xl opacity-10 bg-info" />
        </GlassCard>
      </div>

      {/* Main Workspace Area */}
      <GlassCard variant="default" padding="lg" className="border-white/10 space-y-6">
        {/* Header Controller */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          {/* Tab buttons */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-black/10 border border-white/5 self-start">
            {[
              { id: 'CARD_SUSPENSION', label: 'Card Suspensions', icon: CreditCard },
              { id: 'DUE_WAIVE', label: 'Due Waives', icon: DollarSign },
              { id: 'ACCOUNT_TERMINATION', label: 'Terminations', icon: UserMinus },
              { id: 'RESOURCE_CLOSURE', label: 'Resource Closures', icon: PowerOff },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TrackerType)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                    isActive 
                      ? 'bg-primary text-white shadow-md shadow-primary/20' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search user, card, note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input pl-10 h-10 w-full rounded-xl"
            />
          </div>
        </div>

        {/* Data table container */}
        <div className="min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Fetching tracking logs...</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={formattedData}
              emptyMessage={`No ${activeTab.toLowerCase().replace('_', ' ')} logs found matching your filters`}
              pagination={true}
              pageSize={8}
            />
          )}
        </div>
      </GlassCard>

      {/* --- MODAL DIALOGS --- */}

      {/* 1. Log New Task Modal */}
      <AnimatePresence>
        {isLogModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
              onClick={() => setIsLogModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-white/70 dark:bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl z-10"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold font-heading text-foreground">Log Operational Task</h3>
                  <p className="text-xs text-muted-foreground">Track special action for support and audit records.</p>
                </div>
                <button 
                  onClick={() => setIsLogModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleLogSubmit} className="space-y-4">
                {/* Selector inside form */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold ml-1">Task Category</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'CARD_SUSPENSION', label: 'Card Suspension' },
                      { id: 'DUE_WAIVE', label: 'Due Waive' },
                      { id: 'ACCOUNT_TERMINATION', label: 'Account Termination' },
                      { id: 'RESOURCE_CLOSURE', label: 'Resource Closure' },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setFormType(type.id as TrackerType)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                          formType === type.id
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-white/5 border-white/10 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Common fields */}
                <div className="space-y-1.5">
                  <Label htmlFor="userName" className="text-xs font-semibold ml-1">
                    {formType === 'RESOURCE_CLOSURE' ? 'Owner / User Name' : 'User Name'}
                  </Label>
                  <Input 
                    id="userName" 
                    value={formData.userName} 
                    onChange={e => setFormData({ ...formData, userName: e.target.value })}
                    placeholder="Enter full name"
                    className="form-input h-10 rounded-xl"
                    required
                  />
                </div>

                {/* Conditional Card last 4 */}
                {(formType === 'CARD_SUSPENSION' || formType === 'DUE_WAIVE') && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cardLast4" className="text-xs font-semibold ml-1">Card Last 4 Digits</Label>
                    <Input 
                      id="cardLast4" 
                      value={formData.cardLast4} 
                      onChange={e => setFormData({ ...formData, cardLast4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      placeholder="e.g. 1234"
                      className="form-input h-10 rounded-xl font-mono"
                      maxLength={4}
                    />
                  </div>
                )}

                {/* Conditional Amount for Due Waive */}
                {formType === 'DUE_WAIVE' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="amount" className="text-xs font-semibold ml-1">Waived Amount ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="amount" 
                        type="number"
                        step="0.01"
                        value={formData.amount} 
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        className="form-input pl-9 h-10 rounded-xl font-semibold text-success-light"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Conditional Resource Type for Resource Closure */}
                {formType === 'RESOURCE_CLOSURE' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="resourceType" className="text-xs font-semibold ml-1">Resource Type</Label>
                    <Select
                      value={formData.resourceType}
                      onValueChange={(val) => setFormData({ ...formData, resourceType: val })}
                    >
                      <SelectTrigger className="h-10 rounded-xl w-full bg-white/5 border-white/10 text-foreground">
                        <SelectValue placeholder="Select resource category..." />
                      </SelectTrigger>
                      <SelectContent className="border border-white/10">
                        <SelectItem value="SERVER">Server / Compute</SelectItem>
                        <SelectItem value="DATABASE">Database</SelectItem>
                        <SelectItem value="DOMAIN">Domain Name</SelectItem>
                        <SelectItem value="EMAIL">Email Address</SelectItem>
                        <SelectItem value="REPOSITORY">Git Repository</SelectItem>
                        <SelectItem value="API_KEY">API Key / Access Token</SelectItem>
                        <SelectItem value="OTHER">Other Resource</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Reason field */}
                <div className="space-y-1.5">
                  <Label htmlFor="reason" className="text-xs font-semibold ml-1">
                    {formType === 'CARD_SUSPENSION' ? 'Reason for Suspension' :
                     formType === 'DUE_WAIVE' ? 'Reason for Waive' :
                     formType === 'ACCOUNT_TERMINATION' ? 'Reason for Termination' :
                     'Reason for Closure'}
                  </Label>
                  <Input 
                    id="reason" 
                    value={formData.reason} 
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Provide justification or reason"
                    className="form-input h-10 rounded-xl"
                    required
                  />
                </div>

                {/* Note Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="note" className="text-xs font-semibold ml-1">Additional Note</Label>
                  <Textarea 
                    id="note" 
                    value={formData.note} 
                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Enter supplementary details..."
                    className="form-input rounded-xl min-h-[70px] py-2"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-white/10">
                  <Button 
                    type="submit" 
                    disabled={submitting} 
                    className="btn-primary flex-1 h-11 rounded-xl"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
                    Save Log Entry
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsLogModalOpen(false)} 
                    className="h-11 rounded-xl px-5"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Unblock Card Action Modal */}
      <AnimatePresence>
        {isUnblockModalOpen && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
              onClick={() => { setIsUnblockModalOpen(false); setSelectedItem(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/70 dark:bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl z-10"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold font-heading text-foreground">Resolve Card Suspension</h3>
                  <p className="text-xs text-muted-foreground">Unblock card and log authorization details.</p>
                </div>
                <button 
                  onClick={() => { setIsUnblockModalOpen(false); setSelectedItem(null); }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mb-4 p-3.5 bg-primary/5 border border-primary/20 rounded-2xl space-y-1">
                <p className="text-xs text-muted-foreground font-semibold">SUSPENDED CARD INFO</p>
                <p className="text-sm font-bold text-foreground">{selectedItem.userName}</p>
                <div className="flex gap-4 text-xs font-medium text-muted-foreground">
                  <span>Card: <span className="font-mono">•••• {selectedItem.cardLast4}</span></span>
                  <span>Reason: {selectedItem.reason}</span>
                </div>
              </div>

              <form onSubmit={handleUnblockSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="unblockedBy" className="text-xs font-semibold ml-1">Authorized By</Label>
                  <Input 
                    id="unblockedBy" 
                    value={unblockData.unblockedBy} 
                    onChange={e => setUnblockData({ ...unblockData, unblockedBy: e.target.value })}
                    placeholder="Enter authorized personnel name"
                    className="form-input h-10 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="unblockedDate" className="text-xs font-semibold ml-1">Unblocked Date</Label>
                  <Input 
                    id="unblockedDate" 
                    type="date"
                    value={unblockData.unblockedDate} 
                    onChange={e => setUnblockData({ ...unblockData, unblockedDate: e.target.value })}
                    className="form-input h-10 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="unblockingReason" className="text-xs font-semibold ml-1">Reason for Unblocking</Label>
                  <Textarea 
                    id="unblockingReason" 
                    value={unblockData.unblockingReason} 
                    onChange={e => setUnblockData({ ...unblockData, unblockingReason: e.target.value })}
                    placeholder="Describe why the card is being unblocked..."
                    className="form-input rounded-xl min-h-[80px] py-2"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-white/10">
                  <Button 
                    type="submit" 
                    disabled={submitting} 
                    className="btn-primary flex-1 h-11 rounded-xl"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
                    Confirm Unblock
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => { setIsUnblockModalOpen(false); setSelectedItem(null); }} 
                    className="h-11 rounded-xl px-5"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
