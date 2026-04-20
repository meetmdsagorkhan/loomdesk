'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, Users, Bell, Mail, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin } from '@/lib/auth-utils';
import { showToast } from '@/components/shared/Toast';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type Tab = 'profile' | 'team' | 'notifications';

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
      setEmailNotifications(Boolean(data.user?.emailNotifications ?? true));
    } catch (error) {
      handleApiError(error, 'Settings');
    }
  }, [user?.name]);

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
      await fetchProfile();
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
      {/* Header */}
      <section className="rounded-3xl border border-border/60 bg-card/80 p-6 card-elevation-md backdrop-blur-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
            Settings
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Manage your account and team settings
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Update your profile, manage team members, and configure notification preferences.
          </p>
        </div>
      </section>

          {/* Tabs */}
          <section className="flex gap-2 p-2 bg-muted/30 rounded-2xl card-elevation-sm">
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
          </section>

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <section className="rounded-3xl border border-border/60 bg-card/80 p-6 card-elevation-md backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-foreground mb-4">Profile Settings</h2>
              <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Current Password</label>
                  <input
                    type="password"
                    value={profileData.currentPassword}
                    onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                    placeholder="Leave blank to keep current password"
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
                  <input
                    type="password"
                    value={profileData.newPassword}
                    onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                    placeholder="Leave blank to keep current password"
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
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
            </section>
          )}

          {activeTab === 'team' && isAdmin({ user }) && (
            <section className="rounded-3xl border border-border/60 bg-card/80 p-6 card-elevation-md backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-foreground mb-4">Team Management</h2>
              <form onSubmit={handleInvite} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <input
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    placeholder="Enter team member email"
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                  <select
                    value={inviteData.role}
                    onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="TEAM_LEAD">Team Lead</option>
                    <option value="ADMIN">Admin</option>
                  </select>
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
            </section>
          )}

          {activeTab === 'notifications' && (
            <section className="rounded-3xl border border-border/60 bg-card/80 p-6 card-elevation-md backdrop-blur-sm">
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
            </section>
          )}
        </div>
  );
}
