'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, Bell, Mail, Loader2, Plus, ShieldCheck, KeyRound, RefreshCw, ChevronRight, Settings as SettingsIcon, Camera, Briefcase, Building2, Calendar, Lock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import { Switch } from '@/components/ui/switch';
import { BentoGrid, BentoCard } from '@/components/shared/BentoGrid';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin } from '@/lib/auth-utils';
import { showToast } from '@/components/shared/Toast';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function SettingsPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [mounted, setMounted] = useState(false);

  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({ 
    name: '', 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '',
    position: '',
    department: '',
    company: '',
    joiningDate: '',
    image: '' 
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [inviteData, setInviteData] = useState({ email: '', role: 'MEMBER' });
  const [isInviting, setIsInviting] = useState(false);

  const [emailAddress, setEmailAddress] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorRecoveryCodesRemaining, setTwoFactorRecoveryCodesRemaining] = useState(0);
  const [twoFactorSetupSecret, setTwoFactorSetupSecret] = useState<string | null>(null);
  const [twoFactorSetupUrl, setTwoFactorSetupUrl] = useState<string | null>(null);
  const [twoFactorOtp, setTwoFactorOtp] = useState('');
  const [twoFactorRecoveryCode, setTwoFactorRecoveryCode] = useState('');
  const [twoFactorPassword, setTwoFactorPassword] = useState('');
  const [generatedRecoveryCodes, setGeneratedRecoveryCodes] = useState<string[]>([]);
  const [isTwoFactorLoading, setIsTwoFactorLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        handleApiError('Failed to fetch profile', 'Settings');
        return;
      }

      const data = await response.json();
      setProfileData((prev) => ({
        ...prev,
        name: data.user?.name || user?.name || '',
        position: data.user?.position || '',
        department: data.user?.department || '',
        company: data.user?.company || '',
        joiningDate: data.user?.joiningDate ? new Date(data.user.joiningDate).toISOString().split('T')[0] : '',
        image: data.user?.image || '',
      }));
      setEmailAddress(data.user?.email || user?.email || '');
      setEmailVerified(Boolean(data.user?.emailVerifiedAt));
      setTwoFactorEnabled(Boolean(data.user?.twoFactorEnabled));
    } catch (error) {
      handleApiError(error, 'Settings');
    }
  }, [user?.email, user?.name]);

  const fetchTwoFactorStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/user/two-factor');

      if (!response.ok) {
        handleApiError('Failed to fetch two-factor status', 'Settings');
        return;
      }

      const data = await response.json();
      setTwoFactorEnabled(Boolean(data.enabled));
      setTwoFactorRecoveryCodesRemaining(Number(data.recoveryCodesRemaining ?? 0));
      setEmailVerified(Boolean(data.emailVerified));
    } catch (error) {
      handleApiError(error, 'Settings');
    }
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      showToast('New passwords do not match', 'error');
      setIsUpdatingProfile(false);
      return;
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileData.name,
          currentPassword: profileData.currentPassword || undefined,
          newPassword: profileData.newPassword || undefined,
          position: profileData.position || null,
          department: profileData.department || null,
          company: profileData.company || null,
          joiningDate: profileData.joiningDate || null,
          image: profileData.image || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        handleApiError(error.error || 'Failed to update profile', 'Settings');
        return;
      }

      showToast('Profile updated successfully', 'success');
      setProfileData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      if (response.ok) {
        const data = await response.json();
        setEmailVerified(Boolean(data.user?.emailVerifiedAt));
        setEmailAddress(data.user?.email || emailAddress);
        if (data.emailVerificationRequired) {
          showToast('Email changed. Check your inbox to verify the new address.', 'info');
        }
      }
      await fetchProfile();
      await fetchTwoFactorStatus();
    } catch (error) {
      handleApiError(error, 'Settings');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    try {
      const response = await fetch('/api/auth/invite/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteData.email,
          role: inviteData.role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        handleApiError(error.error || 'Failed to send invitation', 'Settings');
        return;
      }

      showToast('Invitation sent successfully', 'success');
      setInviteData({ email: '', role: 'MEMBER' });
    } catch (error) {
      handleApiError(error, 'Settings');
    } finally {
      setIsInviting(false);
    }
  };


  const handleTwoFactorAction = async (body: Record<string, unknown>) => {
    const response = await fetch('/api/user/two-factor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Two-factor action failed');
    }

    return data;
  };

  const startTwoFactorSetup = async () => {
    setIsTwoFactorLoading(true);
    setGeneratedRecoveryCodes([]);

    try {
      const data = await handleTwoFactorAction({ action: 'setup' });
      setTwoFactorSetupSecret(data.secret ?? null);
      setTwoFactorSetupUrl(data.otpauthUrl ?? null);
      setTwoFactorOtp('');
      showToast('Two-factor setup started. Enter a code from your authenticator app to finish.', 'success');
    } catch (error) {
      handleApiError(error, 'Settings');
    } finally {
      setIsTwoFactorLoading(false);
    }
  };

  const enableTwoFactor = async () => {
    setIsTwoFactorLoading(true);

    try {
      const data = await handleTwoFactorAction({
        action: 'enable',
        otp: twoFactorOtp,
      });

      setGeneratedRecoveryCodes(Array.isArray(data.recoveryCodes) ? data.recoveryCodes : []);
      setTwoFactorEnabled(true);
      setTwoFactorSetupSecret(null);
      setTwoFactorSetupUrl(null);
      setTwoFactorOtp('');
      setTwoFactorRecoveryCode('');
      showToast('Two-factor authentication enabled', 'success');
      await fetchTwoFactorStatus();
    } catch (error) {
      handleApiError(error, 'Settings');
    } finally {
      setIsTwoFactorLoading(false);
    }
  };

  const disableTwoFactor = async () => {
    setIsTwoFactorLoading(true);

    try {
      const data = await handleTwoFactorAction({
        action: 'disable',
        currentPassword: twoFactorPassword,
        otp: twoFactorOtp || undefined,
        recoveryCode: twoFactorRecoveryCode || undefined,
      });

      showToast(data.message || 'Two-factor authentication disabled', 'success');
      setTwoFactorEnabled(false);
      setTwoFactorSetupSecret(null);
      setTwoFactorSetupUrl(null);
      setTwoFactorOtp('');
      setTwoFactorRecoveryCode('');
      setTwoFactorPassword('');
      setGeneratedRecoveryCodes([]);
      await fetchTwoFactorStatus();
    } catch (error) {
      handleApiError(error, 'Settings');
    } finally {
      setIsTwoFactorLoading(false);
    }
  };

  const regenerateRecoveryCodes = async () => {
    setIsTwoFactorLoading(true);

    try {
      const data = await handleTwoFactorAction({
        action: 'regenerate-recovery-codes',
        currentPassword: twoFactorPassword,
        otp: twoFactorOtp || undefined,
        recoveryCode: twoFactorRecoveryCode || undefined,
      });

      setGeneratedRecoveryCodes(Array.isArray(data.recoveryCodes) ? data.recoveryCodes : []);
      setTwoFactorOtp('');
      setTwoFactorRecoveryCode('');
      showToast('Recovery codes regenerated', 'success');
      await fetchTwoFactorStatus();
    } catch (error) {
      handleApiError(error, 'Settings');
    } finally {
      setIsTwoFactorLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image size must be less than 2MB', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData((prev) => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    void fetchProfile();
    void fetchTwoFactorStatus();
  }, [fetchProfile, fetchTwoFactorStatus]);

  // Prevent SSR rendering
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <PageHeader
        badge="Settings"
        title="Command Center"
        subtitle="Manage your profile, team members, and security preferences from one place."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Spatial Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <GlassCard variant="minimal" padding="sm" className="border-white/10 overflow-hidden sticky top-24">
            <div className="flex flex-col gap-1">
              {[
                { id: 'profile', label: 'Profile', icon: User },
                ...(isAdmin({ user }) ? [{ id: 'team', label: 'Team', icon: Users }] : []),
                { id: 'security', label: 'Security', icon: ShieldCheck },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center justify-between w-full px-4 py-3.5 rounded-xl transition-all duration-300 group ${activeTab === item.id
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                >
                  <div className="flex items-center gap-3 z-10">
                    <item.icon size={18} className={`${activeTab === item.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                    <span className="text-sm tracking-tight">{item.label}</span>
                  </div>
                  {activeTab === item.id && (
                    <motion.div
                      layoutId="activeTabGlow"
                      className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20 shadow-[0_0_20px_rgba(125,92,255,0.15)]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <ChevronRight
                    size={14}
                    className={`transition-transform duration-300 z-10 ${activeTab === item.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}
                  />
                </button>
              ))}
            </div>
          </GlassCard>

        </div>

        {/* Dynamic Content Area */}
        <div className="lg:col-span-9 min-h-[600px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeTab === 'profile' && (
                <BentoGrid>
                  <BentoCard colSpan={3}>
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground font-heading">Profile Settings</h2>
                        <p className="text-sm text-muted-foreground mt-1">Manage your personal information and credentials</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                        <User className="text-primary" size={24} />
                      </div>
                    </div>

                    <form onSubmit={handleProfileUpdate} className="space-y-8">
                      {/* Profile Image Upload */}
                      <div className="flex flex-col items-center gap-4 mb-8">
                        <div className="relative group">
                          <Avatar className="w-24 h-24 border-2 border-primary/30 ring-4 ring-primary/5">
                            {profileData.image ? (
                              <AvatarImage src={profileData.image} alt={profileData.name} className="object-cover" />
                            ) : (
                              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                                {getInitials(profileData.name || 'User')}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <label 
                            htmlFor="avatar-upload" 
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                          >
                            <Camera size={24} className="text-white" />
                            <input 
                              id="avatar-upload" 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleImageUpload}
                            />
                          </label>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-foreground">Profile Picture</p>
                          <p className="text-xs text-muted-foreground mt-1">PNG, JPG or GIF up to 2MB</p>
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold ml-1 flex items-center gap-2">
                            <User size={14} className="text-primary" /> Full Name
                          </Label>
                          <Input
                            type="text"
                            value={profileData.name}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            className="form-input"
                            placeholder="Your Name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold ml-1 flex items-center gap-2">
                            <Mail size={14} className="text-primary" /> Email Address
                          </Label>
                          <Input
                            type="email"
                            value={emailAddress}
                            disabled
                            className="form-input opacity-70 bg-white/5 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-white/10"></span>
                        </div>
                        <div className="relative flex justify-start">
                          <span className="bg-transparent pr-4 text-xs font-bold uppercase tracking-widest text-primary/60">Professional Details</span>
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold ml-1 flex items-center gap-2">
                            <Briefcase size={14} className="text-primary" /> Position
                          </Label>
                          <Input
                            type="text"
                            value={profileData.position}
                            onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
                            placeholder="e.g. Senior Developer"
                            className="form-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold ml-1 flex items-center gap-2">
                            <Building2 size={14} className="text-primary" /> Department
                          </Label>
                          <Input
                            type="text"
                            value={profileData.department}
                            onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                            placeholder="e.g. Engineering"
                            className="form-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold ml-1 flex items-center gap-2">
                            <SettingsIcon size={14} className="text-primary" /> Company Name
                          </Label>
                          <Input
                            type="text"
                            value={profileData.company}
                            onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                            placeholder="LoomDesk"
                            className="form-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold ml-1 flex items-center gap-2">
                            <Calendar size={14} className="text-primary" /> Joining Date
                          </Label>
                          <Input
                            type="date"
                            value={profileData.joiningDate}
                            onChange={(e) => setProfileData({ ...profileData, joiningDate: e.target.value })}
                            className="form-input"
                          />
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={isUpdatingProfile} className="btn-primary min-w-[140px] h-11 px-8 rounded-xl font-semibold">
                          {isUpdatingProfile ? (
                            <>
                              <Loader2 size={18} className="mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Update Profile'
                          )}
                        </Button>
                      </div>
                    </form>
                  </BentoCard>
                </BentoGrid>
              )}

              {activeTab === 'team' && isAdmin({ user }) && (
                <BentoGrid>
                  <BentoCard colSpan={3}>
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground font-heading">Team Management</h2>
                        <p className="text-sm text-muted-foreground mt-1">Add new members and define their workspace permissions</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                        <Users className="text-primary" size={24} />
                      </div>
                    </div>

                    <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10 mb-8">
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        Invitations are sent via email. New members will have 72 hours to accept the invite before it expires.
                      </p>
                    </div>

                    <form onSubmit={handleInvite} className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold ml-1">Email Address</Label>
                          <Input
                            type="email"
                            value={inviteData.email}
                            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                            placeholder="colleague@company.com"
                            className="form-input"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold ml-1">Workspace Role</Label>
                          <Select
                            value={inviteData.role}
                            onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                            className="form-input bg-transparent"
                          >
                            <option value="MEMBER">Member (Standard Access)</option>
                            <option value="TEAM_LEAD">Team Lead (Management Access)</option>
                            <option value="ADMIN">Admin (Full Control)</option>
                          </Select>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={isInviting} className="btn-primary min-w-[160px] h-11 px-8 rounded-xl font-semibold">
                          {isInviting ? (
                            <>
                              <Loader2 size={18} className="mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Plus size={18} className="mr-2" />
                              Send Invitation
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </BentoCard>
                </BentoGrid>
              )}


              {activeTab === 'security' && (
                <BentoGrid>
                  <BentoCard colSpan={3}>
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground font-heading">Security Protocol</h2>
                        <p className="text-sm text-muted-foreground mt-1">Multi-factor authentication and identity verification</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                        <ShieldCheck className="text-primary" size={24} />
                      </div>
                    </div>

                    {/* Password Change Section */}
                    <div className="mb-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                          <Lock size={18} className="text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">Update Password</h3>
                          <p className="text-xs text-muted-foreground">Ensure your account uses a long, random password to stay secure.</p>
                        </div>
                      </div>

                      <form onSubmit={handleProfileUpdate} className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold ml-1">Current Password</Label>
                            <Input
                              type="password"
                              value={profileData.currentPassword}
                              onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                              placeholder="••••••••"
                              className="form-input"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold ml-1">New Password</Label>
                            <Input
                              type="password"
                              value={profileData.newPassword}
                              onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                              placeholder="Minimum 8 characters"
                              className="form-input"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold ml-1">Confirm Password</Label>
                            <Input
                              type="password"
                              value={profileData.confirmPassword}
                              onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                              placeholder="Match new password"
                              className="form-input"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button 
                            type="submit" 
                            disabled={isUpdatingProfile || !profileData.currentPassword || !profileData.newPassword} 
                            className="btn-primary min-w-[140px] h-10 px-6 rounded-xl font-semibold"
                          >
                            {isUpdatingProfile ? (
                              <>
                                <Loader2 size={16} className="mr-2 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              'Change Password'
                            )}
                          </Button>
                        </div>
                      </form>
                    </div>

                    <div className="relative py-4 mb-8">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10"></span>
                      </div>
                      <div className="relative flex justify-start">
                        <span className="bg-transparent pr-4 text-xs font-bold uppercase tracking-widest text-primary/60">Advanced Protection</span>
                      </div>
                    </div>

                    <div className="grid gap-6 mb-8">
                      {/* Email Verification Status */}
                      <div className="p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent flex items-center justify-between group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${emailVerified ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                            <Mail size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">Email Integrity</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {emailVerified ? `Verified: ${emailAddress}` : 'Verification Pending'}
                            </p>
                          </div>
                        </div>
                        <div className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${emailVerified ? 'bg-success/10 text-success border border-success/20' : 'bg-warning/10 text-warning border border-warning/20'}`}>
                          {emailVerified ? 'Authentic' : 'Pending'}
                        </div>
                      </div>

                      {/* 2FA Main Panel */}
                      <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${twoFactorEnabled ? 'bg-success/20 text-success' : 'bg-muted/20 text-muted-foreground'}`}>
                              <KeyRound size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-foreground">Two-Factor Authentication</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Add an extra layer of security to your account
                              </p>
                            </div>
                          </div>
                          <div className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${twoFactorEnabled ? 'bg-success/10 text-success border border-success/20' : 'bg-muted/10 text-muted-foreground border border-white/10'}`}>
                            {twoFactorEnabled ? 'Active' : 'Inactive'}
                          </div>
                        </div>

                        {!twoFactorEnabled && !twoFactorSetupSecret && (
                          <Button
                            onClick={startTwoFactorSetup}
                            disabled={isTwoFactorLoading || !emailVerified}
                            className="btn-primary w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
                          >
                            {isTwoFactorLoading ? <Loader2 size={18} className="animate-spin" /> : 'Activate Security Layer'}
                          </Button>
                        )}

                        {twoFactorSetupSecret && !twoFactorEnabled && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-4 space-y-6 p-6 rounded-2xl border border-primary/30 bg-primary/5"
                          >
                            <div className="space-y-4">
                              <p className="text-xs font-bold uppercase tracking-widest text-primary">Protocol Setup: Step 1</p>
                              <div className="p-4 rounded-xl bg-black/20 border border-white/10 font-mono text-sm break-all text-center tracking-widest font-bold">
                                {twoFactorSetupSecret}
                              </div>
                              <p className="text-[10px] text-muted-foreground text-center">Add this secret to your authenticator application</p>
                            </div>

                            <div className="space-y-4">
                              <p className="text-xs font-bold uppercase tracking-widest text-primary">Protocol Setup: Step 2</p>
                              <Input
                                type="text"
                                value={twoFactorOtp}
                                onChange={(e) => setTwoFactorOtp(e.target.value)}
                                placeholder="000 000"
                                className="form-input text-center text-2xl tracking-[0.5em] font-bold h-14"
                                maxLength={6}
                              />
                            </div>

                            <div className="flex gap-3 pt-2">
                              <Button onClick={enableTwoFactor} disabled={isTwoFactorLoading || twoFactorOtp.length < 6} className="btn-primary flex-1 h-12 rounded-xl font-bold">
                                Finalize Activation
                              </Button>
                              <Button variant="outline" onClick={() => { setTwoFactorSetupSecret(null); setTwoFactorOtp(''); }} className="btn-secondary px-6 rounded-xl border-white/10">
                                Abort
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        {twoFactorEnabled && (
                          <div className="mt-4 space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-primary/70 ml-1">Confirmation</Label>
                                <Input
                                  type="password"
                                  value={twoFactorPassword}
                                  onChange={(e) => setTwoFactorPassword(e.target.value)}
                                  placeholder="Password required"
                                  className="form-input"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-primary/70 ml-1">Current Code</Label>
                                <Input
                                  type="text"
                                  value={twoFactorOtp}
                                  onChange={(e) => setTwoFactorOtp(e.target.value)}
                                  placeholder="000 000"
                                  className="form-input font-mono"
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-4 pt-2">
                              <Button
                                onClick={regenerateRecoveryCodes}
                                disabled={isTwoFactorLoading || !twoFactorPassword || (!twoFactorOtp && !twoFactorRecoveryCode)}
                                className="btn-secondary flex-1 h-11 rounded-xl font-bold border-white/10"
                                variant="outline"
                              >
                                {isTwoFactorLoading ? <Loader2 size={18} className="animate-spin" /> : 'Refresh Recovery Keys'}
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={disableTwoFactor}
                                disabled={isTwoFactorLoading || !twoFactorPassword || (!twoFactorOtp && !twoFactorRecoveryCode)}
                                className="flex-1 h-11 rounded-xl font-bold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white transition-all"
                              >
                                Deactivate 2FA
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {generatedRecoveryCodes.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-2xl border border-warning/30 bg-warning/5"
                      >
                        <div className="flex items-center gap-2 text-warning mb-4">
                          <ShieldCheck size={18} />
                          <span className="font-bold uppercase tracking-widest text-xs">Emergency Recovery Protocol</span>
                        </div>
                        <p className="text-[11px] text-foreground/70 mb-6 leading-relaxed">
                          Save these cryptographic keys in a secure offline location. They provide emergency access if your primary authentication device is compromised.
                        </p>
                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                          {generatedRecoveryCodes.map((code) => (
                            <div key={code} className="p-3 rounded-xl bg-black/20 border border-white/10 font-mono text-[10px] font-bold text-foreground text-center tracking-widest">
                              {code}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </BentoCard>
                </BentoGrid>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
