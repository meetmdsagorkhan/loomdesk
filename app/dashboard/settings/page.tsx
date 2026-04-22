'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, Users, Bell, Mail, Loader2, Plus, ShieldCheck, KeyRound, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import GlassCard from '@/components/shared/GlassCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin } from '@/lib/auth-utils';
import { showToast } from '@/components/shared/Toast';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type Tab = 'profile' | 'team' | 'notifications' | 'security';

export default function SettingsPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [mounted, setMounted] = useState(false);

  const [profileData, setProfileData] = useState({ name: '', currentPassword: '', newPassword: '' });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [inviteData, setInviteData] = useState({ email: '', role: 'MEMBER' });
  const [isInviting, setIsInviting] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
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
      }));
      setEmailAddress(data.user?.email || user?.email || '');
      setEmailVerified(Boolean(data.user?.emailVerifiedAt));
      setEmailNotifications(Boolean(data.user?.emailNotifications ?? true));
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
    e.preventDefault();
    setIsUpdatingProfile(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileData.name,
          currentPassword: profileData.currentPassword || undefined,
          newPassword: profileData.newPassword || undefined,
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

  const handleNotificationToggle = async () => {
    setIsUpdatingNotifications(true);
    try {
      const newValue = !emailNotifications;
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailNotifications: newValue,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        handleApiError(error.error || 'Failed to update notifications', 'Settings');
        return;
      }

      setEmailNotifications(newValue);
      showToast(
        newValue ? 'Email notifications enabled' : 'Email notifications disabled',
        'success'
      );
    } catch (error) {
      handleApiError(error, 'Settings');
    } finally {
      setIsUpdatingNotifications(false);
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
    <div className="space-y-8">
      <PageHeader
        badge="Settings"
        title="Manage your account and team settings"
        subtitle="Update your profile, manage team members, and configure notification preferences."
      />

          {/* Tabs */}
          <GlassCard variant="minimal" padding="sm">
            <div className="flex gap-2 p-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors ${
                activeTab === 'profile'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User size={16} />
              Profile
            </button>
            {isAdmin({ user }) && (
              <button
                onClick={() => setActiveTab('team')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors ${
                  activeTab === 'team'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users size={16} />
                Team
              </button>
            )}
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bell size={16} />
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors ${
                activeTab === 'security'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldCheck size={16} />
              Security
            </button>
          </div>
        </GlassCard>

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <GlassCard variant="default" padding="md">
              <h2 className="text-lg font-semibold text-foreground mb-4">Profile Settings</h2>
              <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-md">
                <div>
                  <Label className="form-label">Name</Label>
                  <Input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="form-label">Current Password</Label>
                  <Input
                    type="password"
                    value={profileData.currentPassword}
                    onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                    placeholder="Leave blank to keep current password"
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="form-label">New Password</Label>
                  <Input
                    type="password"
                    value={profileData.newPassword}
                    onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                    placeholder="Leave blank to keep current password"
                    className="form-input"
                  />
                </div>
                <Button type="submit" disabled={isUpdatingProfile} className="rounded-xl">
                  {isUpdatingProfile ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </form>
            </GlassCard>
          )}

          {activeTab === 'team' && isAdmin({ user }) && (
            <GlassCard variant="default" padding="md">
              <h2 className="text-lg font-semibold text-foreground mb-4">Team Management</h2>
              <form onSubmit={handleInvite} className="space-y-4 max-w-md">
                <div>
                  <Label className="form-label">Email</Label>
                  <Input
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    placeholder="Enter team member email"
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="form-label">Role</Label>
                  <Select
                    value={inviteData.role}
                    onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                    className="form-input"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="TEAM_LEAD">Team Lead</option>
                    <option value="ADMIN">Admin</option>
                  </Select>
                </div>
                <Button type="submit" disabled={isInviting} className="rounded-xl">
                  {isInviting ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </form>
            </GlassCard>
          )}

          {activeTab === 'notifications' && (
            <GlassCard variant="default" padding="md">
              <h2 className="text-lg font-semibold text-foreground mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-border/40">
                  <div className="flex items-center gap-3">
                    <Mail size={20} className="text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive email updates for important events</p>
                    </div>
                  </div>
                  <Button
                    variant={emailNotifications ? 'default' : 'outline'}
                    onClick={handleNotificationToggle}
                    disabled={isUpdatingNotifications}
                    className="rounded-xl"
                  >
                    {isUpdatingNotifications ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : emailNotifications ? (
                      'Enabled'
                    ) : (
                      'Disabled'
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}

          {activeTab === 'security' && (
            <GlassCard variant="default" padding="md">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Security</h2>
                <p className="text-sm text-muted-foreground">
                  Manage email verification and two-factor authentication for your account.
                </p>
              </div>

              <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">Email verification</p>
                    <p className="text-sm text-muted-foreground">
                      {emailVerified
                        ? `Verified for ${emailAddress || user?.email || 'your account'}`
                        : `Verification pending for ${emailAddress || user?.email || 'your account'}`}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm ${
                      emailVerified
                        ? 'bg-emerald-100/80 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'bg-amber-100/80 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300'
                    }`}
                  >
                    {emailVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">Two-factor authentication</p>
                    <p className="text-sm text-muted-foreground">
                      {twoFactorEnabled
                        ? `Enabled with ${twoFactorRecoveryCodesRemaining} recovery codes remaining`
                        : 'Protect your account with an authenticator app and backup recovery codes.'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm ${
                      twoFactorEnabled
                        ? 'bg-emerald-100/80 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                {!twoFactorEnabled && !twoFactorSetupSecret && (
                  <Button
                    onClick={startTwoFactorSetup}
                    disabled={isTwoFactorLoading || !emailVerified}
                    className="rounded-xl"
                  >
                    {isTwoFactorLoading ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} className="mr-2" />
                        Set Up Two-Factor Authentication
                      </>
                    )}
                  </Button>
                )}

                {!emailVerified && (
                  <p className="text-sm text-amber-600 dark:text-amber-300">
                    Verify your email address before enabling two-factor authentication.
                  </p>
                )}

                {twoFactorSetupSecret && !twoFactorEnabled && (
                  <div className="space-y-4 rounded-2xl border border-border/50 bg-background/80 p-4">
                    <div>
                      <p className="font-medium text-foreground">Step 1: Add this secret to your authenticator app</p>
                      <p className="mt-2 rounded-xl bg-muted/50 px-4 py-3 font-mono text-sm text-foreground break-all">
                        {twoFactorSetupSecret}
                      </p>
                      {twoFactorSetupUrl && (
                        <p className="mt-2 text-xs text-muted-foreground break-all">
                          OTPAuth URL: {twoFactorSetupUrl}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="form-label">
                        Step 2: Enter the 6-digit code from your authenticator app
                      </Label>
                      <Input
                        type="text"
                        value={twoFactorOtp}
                        onChange={(e) => setTwoFactorOtp(e.target.value)}
                        placeholder="123456"
                        className="form-input max-w-xs"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button onClick={enableTwoFactor} disabled={isTwoFactorLoading || twoFactorOtp.trim().length < 6} className="rounded-xl">
                        {isTwoFactorLoading ? (
                          <>
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            Enabling...
                          </>
                        ) : (
                          'Enable Two-Factor Authentication'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTwoFactorSetupSecret(null);
                          setTwoFactorSetupUrl(null);
                          setTwoFactorOtp('');
                        }}
                        disabled={isTwoFactorLoading}
                        className="rounded-xl"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {twoFactorEnabled && (
                  <div className="space-y-4 rounded-2xl border border-border/50 bg-background/80 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="form-label">
                          Current Password
                        </Label>
                        <Input
                          type="password"
                          value={twoFactorPassword}
                          onChange={(e) => setTwoFactorPassword(e.target.value)}
                          placeholder="Required for security changes"
                          className="form-input"
                        />
                      </div>
                      <div>
                        <Label className="form-label">
                          Authenticator Code
                        </Label>
                        <Input
                          type="text"
                          value={twoFactorOtp}
                          onChange={(e) => setTwoFactorOtp(e.target.value)}
                          placeholder="123456"
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="form-label">
                        Or Use a Recovery Code
                      </Label>
                      <Input
                        type="text"
                        value={twoFactorRecoveryCode}
                        onChange={(e) => setTwoFactorRecoveryCode(e.target.value)}
                        placeholder="ABCD-1234"
                        className="form-input max-w-xs"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={regenerateRecoveryCodes}
                        disabled={
                          isTwoFactorLoading ||
                          twoFactorPassword.trim().length === 0 ||
                          (twoFactorOtp.trim().length === 0 &&
                            twoFactorRecoveryCode.trim().length === 0)
                        }
                        className="rounded-xl"
                      >
                        {isTwoFactorLoading ? (
                          <>
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={16} className="mr-2" />
                            Regenerate Recovery Codes
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={disableTwoFactor}
                        disabled={
                          isTwoFactorLoading ||
                          twoFactorPassword.trim().length === 0 ||
                          (twoFactorOtp.trim().length === 0 &&
                            twoFactorRecoveryCode.trim().length === 0)
                        }
                        className="rounded-xl"
                      >
                        <KeyRound size={16} className="mr-2" />
                        Disable Two-Factor Authentication
                      </Button>
                    </div>
                  </div>
                )}

                {generatedRecoveryCodes.length > 0 && (
                  <div className="rounded-2xl border border-amber-300/40 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 backdrop-blur-sm">
                    <p className="font-medium text-foreground">Save these recovery codes now</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Each code can be used once if you lose access to your authenticator app.
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {generatedRecoveryCodes.map((code) => (
                        <div
                          key={code}
                          className="rounded-xl bg-background px-4 py-3 font-mono text-sm text-foreground"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          )}
        </div>
  );
}
