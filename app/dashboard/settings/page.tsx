'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Users, Bell, Mail, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type Tab = 'profile' | 'team' | 'notifications';

export default function SettingsPage() {
  const router = useRouter();
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

  useEffect(() => {
    if (userLoading) return;
    if (!mounted) return;

    if (!user) {
      router.push('/login');
      return;
    }

    setProfileData((prev) => ({ ...prev, name: user.name || '' }));
  }, [user, userLoading, router, mounted]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileData.name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to update profile');
        return;
      }

      alert('Profile updated successfully!');
      setProfileData({ name: user?.name || '', currentPassword: '', newPassword: '' });
    } catch {
      alert('Failed to update profile');
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
        alert(error.error || 'Failed to send invitation');
        return;
      }

      alert('Invitation sent successfully');
      setInviteData({ email: '', role: 'MEMBER' });
    } catch {
      console.error('Failed to invite member');
      alert('Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  };

  const handleNotificationToggle = async () => {
    setIsUpdatingNotifications(true);
    try {
      // For now, store in localStorage. In production, this should be stored in user preferences database field
      const newValue = !emailNotifications;
      setEmailNotifications(newValue);
      localStorage.setItem('emailNotifications', String(newValue));
    } catch (error) {
      console.error('Failed to update notifications:', error);
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and team settings</p>
      </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <User size={16} />
              Profile
            </button>
            {isAdmin({ user }) && (
              <button
                onClick={() => setActiveTab('team')}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === 'team'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users size={16} />
                Team
              </button>
            )}
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'notifications'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bell size={16} />
              Notifications
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-lg font-medium text-foreground mb-4">Profile Settings</h2>
              <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Current Password</label>
                  <input
                    type="password"
                    value={profileData.currentPassword}
                    onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                    placeholder="Leave blank to keep current password"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
                  <input
                    type="password"
                    value={profileData.newPassword}
                    onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                    placeholder="Leave blank to keep current password"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
                <Button type="submit" disabled={isUpdatingProfile}>
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
            </div>
          )}

          {activeTab === 'team' && isAdmin({ user }) && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-lg font-medium text-foreground mb-4">Team Management</h2>
              <form onSubmit={handleInvite} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <input
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    placeholder="Enter team member email"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                  <select
                    value={inviteData.role}
                    onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="TEAM_LEAD">Team Lead</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <Button type="submit" disabled={isInviting}>
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
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-lg font-medium text-foreground mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
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
            </div>
          )}
        </div>
  );
}
