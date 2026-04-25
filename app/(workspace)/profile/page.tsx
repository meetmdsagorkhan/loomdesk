'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { User, Mail, Loader2, ShieldCheck, KeyRound, ChevronRight, Camera, Briefcase, Building2, Calendar, Lock, Copy, Smartphone, ScanQrCode } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import { BentoGrid, BentoCard } from '@/components/shared/BentoGrid';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { showToast } from '@/components/shared/Toast';
import { handleApiError } from '@/lib/error-handler';

export default function ProfilePage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const { update } = useSession();

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

  const [emailAddress, setEmailAddress] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorRecoveryCodesRemaining, setTwoFactorRecoveryCodesRemaining] = useState(0);
  const [twoFactorSetupSecret, setTwoFactorSetupSecret] = useState<string | null>(null);
  const [twoFactorSetupUrl, setTwoFactorSetupUrl] = useState<string | null>(null);
  const [twoFactorQrCodeDataUrl, setTwoFactorQrCodeDataUrl] = useState<string | null>(null);
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
        handleApiError('Failed to fetch profile', 'Profile');
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
      handleApiError(error, 'Profile');
    }
  }, [user?.email, user?.name]);

  const fetchTwoFactorStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/user/two-factor');

      if (!response.ok) {
        handleApiError('Failed to fetch two-factor status', 'Profile');
        return;
      }

      const data = await response.json();
      setTwoFactorEnabled(Boolean(data.enabled));
      setTwoFactorRecoveryCodesRemaining(Number(data.recoveryCodesRemaining ?? 0));
      setEmailVerified(Boolean(data.emailVerified));
    } catch (error) {
      handleApiError(error, 'Profile');
    }
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

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

      const data = await response.json();

      if (!response.ok) {
        handleApiError(data.error || 'Failed to update profile', 'Profile');
        return;
      }

      showToast('Profile updated successfully', 'success');
      setProfileData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      
      setEmailVerified(Boolean(data.user?.emailVerifiedAt));
      setEmailAddress(data.user?.email || emailAddress);
      
      if (data.emailVerificationRequired) {
        showToast('Email changed. Check your inbox to verify the new address.', 'info');
      }

      await update();
      await fetchProfile();
      await fetchTwoFactorStatus();
    } catch (error) {
      handleApiError(error, 'Profile');
    } finally {
      setIsUpdatingProfile(false);
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
      handleApiError(error, 'Profile');
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
      handleApiError(error, 'Profile');
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
      handleApiError(error, 'Profile');
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
      handleApiError(error, 'Profile');
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

  const copyTwoFactorSecret = async () => {
    if (!twoFactorSetupSecret) return;

    try {
      await navigator.clipboard.writeText(twoFactorSetupSecret);
      showToast('Authenticator key copied', 'success');
    } catch (error) {
      handleApiError(error, 'Profile');
    }
  };

  useEffect(() => {
    void fetchProfile();
    void fetchTwoFactorStatus();
  }, [fetchProfile, fetchTwoFactorStatus]);

  useEffect(() => {
    let cancelled = false;

    const generateQrCode = async () => {
      if (!twoFactorSetupUrl) {
        setTwoFactorQrCodeDataUrl(null);
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(twoFactorSetupUrl, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 220,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });

        if (!cancelled) {
          setTwoFactorQrCodeDataUrl(dataUrl);
        }
      } catch (error) {
        // Silently fail - QR code generation will not display
      }
    };

    return () => {
      cancelled = true;
    };
  }, [twoFactorSetupUrl]);

  if (!mounted) return null;

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <PageHeader
        badge="Account"
        title="Profile Settings"
        subtitle="Manage your personal information and security preferences."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-3 space-y-4">
          <GlassCard variant="minimal" padding="sm" className="border-white/10 overflow-hidden sticky top-24">
            <div className="flex flex-col gap-1">
              {[
                { id: 'profile', label: 'Personal Details', icon: User },
                { id: 'security', label: 'Security & Privacy', icon: ShieldCheck },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center justify-between w-full overflow-hidden px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                    activeTab === item.id
                      ? 'text-primary-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 z-10">
                    <item.icon
                      size={18}
                      className={`${activeTab === item.id ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}
                    />
                    <span className="text-sm tracking-tight">{item.label}</span>
                  </div>
                  {activeTab === item.id && (
                    <motion.div
                      layoutId="activeTabGlow"
                      className="absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--primary-light))_100%)] shadow-[0_8px_32px_rgba(99,102,241,0.3),0_4px_16px_rgba(99,102,241,0.2),inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.1)] backdrop-blur-xl"
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
                        <h2 className="text-xl font-bold tracking-tight text-foreground font-heading">Personal Profile</h2>
                        <p className="text-sm text-muted-foreground mt-1">Manage your identity and professional credentials</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                        <User className="text-primary" size={24} />
                      </div>
                    </div>

                    <form onSubmit={handleProfileUpdate} className="space-y-8">
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
                          <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                            <Camera size={24} className="text-white" />
                            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
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
                          <Input type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className="form-input" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold ml-1 flex items-center gap-2">
                            <Mail size={14} className="text-primary" /> Email Address
                          </Label>
                          <Input type="email" value={emailAddress} disabled className="form-input opacity-70 bg-white/5 cursor-not-allowed" />
                        </div>
                      </div>

                      <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
                        <div className="relative flex justify-start"><span className="bg-transparent pr-4 text-xs font-bold uppercase tracking-widest text-primary/60">Professional Details</span></div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold ml-1 flex items-center gap-2"><Briefcase size={14} className="text-primary" /> Position</Label>
                          <Input type="text" value={profileData.position} onChange={(e) => setProfileData({ ...profileData, position: e.target.value })} className="form-input" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold ml-1 flex items-center gap-2"><Building2 size={14} className="text-primary" /> Department</Label>
                          <Input type="text" value={profileData.department} onChange={(e) => setProfileData({ ...profileData, department: e.target.value })} className="form-input" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold ml-1 flex items-center gap-2"><KeyRound size={14} className="text-primary" /> Company</Label>
                          <Input type="text" value={profileData.company} onChange={(e) => setProfileData({ ...profileData, company: e.target.value })} className="form-input" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold ml-1 flex items-center gap-2"><Calendar size={14} className="text-primary" /> Joining Date</Label>
                          <Input type="date" value={profileData.joiningDate} onChange={(e) => setProfileData({ ...profileData, joiningDate: e.target.value })} className="form-input" />
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={isUpdatingProfile} className="btn-primary min-w-[140px]">
                          {isUpdatingProfile ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                          {isUpdatingProfile ? 'Saving...' : 'Update Profile'}
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

                    <div className="mb-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20"><Lock size={18} className="text-primary" /></div>
                        <div>
                          <h3 className="font-bold text-foreground">Update Password</h3>
                          <p className="text-xs text-muted-foreground">Ensure your account uses a long, random password to stay secure.</p>
                        </div>
                      </div>
                      <form onSubmit={handleProfileUpdate} className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold ml-1">Current Password</Label>
                            <Input type="password" value={profileData.currentPassword} onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })} className="form-input" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold ml-1">New Password</Label>
                            <Input type="password" value={profileData.newPassword} onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })} className="form-input" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold ml-1">Confirm Password</Label>
                            <Input type="password" value={profileData.confirmPassword} onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })} className="form-input" />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button type="submit" disabled={isUpdatingProfile || !profileData.currentPassword || !profileData.newPassword} className="btn-primary min-w-[140px]">
                            {isUpdatingProfile ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                            {isUpdatingProfile ? 'Updating...' : 'Change Password'}
                          </Button>
                        </div>
                      </form>
                    </div>

                    <div className="relative py-4 mb-8">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
                      <div className="relative flex justify-start"><span className="bg-transparent pr-4 text-xs font-bold uppercase tracking-widest text-primary/60">Advanced Protection</span></div>
                    </div>

                    <div className="grid gap-6">
                      <div className="p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent flex items-center justify-between group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${emailVerified ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}><Mail size={20} /></div>
                          <div>
                            <p className="font-bold text-foreground">Email Integrity</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{emailVerified ? `Verified: ${emailAddress}` : 'Verification Pending'}</p>
                          </div>
                        </div>
                        <div className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${emailVerified ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{emailVerified ? 'Authentic' : 'Pending'}</div>
                      </div>

                      <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${twoFactorEnabled ? 'bg-success/20 text-success' : 'bg-muted/20 text-muted-foreground'}`}><KeyRound size={20} /></div>
                          <div>
                            <p className="font-bold text-foreground">Two-Factor Authentication</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Secure your account with Google Authenticator or any TOTP authenticator app</p>
                          </div>
                        </div>
                        <div className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${twoFactorEnabled ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted-foreground'}`}>{twoFactorEnabled ? 'Active' : 'Inactive'}</div>
                      </div>

                      {!twoFactorEnabled && !twoFactorSetupSecret && (
                        <Button onClick={startTwoFactorSetup} disabled={isTwoFactorLoading || !emailVerified} className="btn-primary w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20">
                            {isTwoFactorLoading ? <Loader2 size={18} className="animate-spin" /> : 'Set Up Google Authenticator'}
                        </Button>
                      )}

                        {twoFactorSetupSecret && !twoFactorEnabled && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 space-y-6 p-6 rounded-2xl border border-primary/30 bg-primary/5">
                            <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
                              <div className="space-y-3">
                                <p className="text-xs font-bold uppercase tracking-widest text-primary">Scan QR Code</p>
                                <div className="rounded-2xl border border-white/10 bg-white p-3 shadow-sm">
                                  {twoFactorQrCodeDataUrl ? (
                                    <img
                                      src={twoFactorQrCodeDataUrl}
                                      alt="Google Authenticator QR code"
                                      className="h-[220px] w-[220px] rounded-xl object-contain"
                                    />
                                  ) : (
                                    <div className="flex h-[220px] w-[220px] items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                      <Loader2 size={24} className="animate-spin" />
                                    </div>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  Open Google Authenticator, tap the <span className="font-semibold text-foreground">+</span> button, then scan this QR code.
                                </p>
                              </div>

                              <div className="space-y-5">
                                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                                      <Smartphone size={16} />
                                    </div>
                                    <div className="space-y-1 text-sm text-muted-foreground">
                                      <p className="font-semibold text-foreground">Google Authenticator setup</p>
                                      <p>1. Install or open Google Authenticator on your phone.</p>
                                      <p>2. Tap <span className="font-semibold text-foreground">Add a code</span>.</p>
                                      <p>3. Scan the QR code, or enter the setup key manually.</p>
                                      <p>4. Enter the 6-digit code below to finish activation.</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-bold uppercase tracking-widest text-primary">Manual Setup Key</p>
                                    <Button type="button" variant="outline" onClick={copyTwoFactorSecret} className="h-8 rounded-lg border-white/10 bg-white/5 px-3 text-xs">
                                      <Copy size={12} className="mr-1.5" />
                                      Copy
                                    </Button>
                                  </div>
                                  <div className="p-4 rounded-xl bg-black/20 border border-white/10 font-mono text-sm break-all text-center tracking-[0.2em] font-bold">
                                    {twoFactorSetupSecret}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    Use this only if you can’t scan the QR code.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <ScanQrCode size={15} className="text-primary" />
                                <p className="text-xs font-bold uppercase tracking-widest text-primary">Enter 6-Digit Authenticator Code</p>
                              </div>
                              <Input type="text" value={twoFactorOtp} onChange={(e) => setTwoFactorOtp(e.target.value)} placeholder="123456" className="form-input text-center text-2xl tracking-[0.3em] font-bold h-14" maxLength={6} />
                            </div>
                            <div className="flex gap-3">
                              <Button onClick={enableTwoFactor} disabled={isTwoFactorLoading || twoFactorOtp.length < 6} className="btn-primary flex-1">Finalize Activation</Button>
                              <Button variant="outline" onClick={() => { setTwoFactorSetupSecret(null); setTwoFactorSetupUrl(null); setTwoFactorQrCodeDataUrl(null); setTwoFactorOtp(''); }}>Abort</Button>
                            </div>
                          </motion.div>
                        )}

                        {twoFactorEnabled && (
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">Two-factor authentication is currently enabled for your account.</p>
                            <div className="flex gap-4">
                              <Input type="password" value={twoFactorPassword} onChange={(e) => setTwoFactorPassword(e.target.value)} placeholder="Enter password to disable 2FA" className="form-input" />
                              <Button variant="destructive" onClick={disableTwoFactor} disabled={isTwoFactorLoading || !twoFactorPassword}>Disable 2FA</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
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
