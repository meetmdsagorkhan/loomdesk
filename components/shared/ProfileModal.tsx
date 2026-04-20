'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, Mail, User, Building2 } from 'lucide-react';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: {
    name: string;
    email: string;
    role: string;
    createdAt: string;
    designation?: string;
    reportingTo?: string;
  };
}

export default function ProfileModal({ open, onClose, user }: ProfileModalProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Profile Information</DialogTitle>
          <DialogDescription>View your profile details</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24 bg-slate-900 text-white dark:bg-white dark:text-slate-950">
              <AvatarFallback className="text-2xl font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-foreground">{user.name}</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {user.role.toLowerCase().replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <User size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                <p className="text-sm font-semibold text-foreground">{user.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Mail size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm font-semibold text-foreground">{user.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Building2 size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Designation</p>
                <p className="text-sm font-semibold text-foreground">
                  {user.designation || user.role.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Calendar size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Working Since</p>
                <p className="text-sm font-semibold text-foreground">{formatDate(user.createdAt)}</p>
              </div>
            </div>

            {user.reportingTo && (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <User size={18} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Reporting To</p>
                  <p className="text-sm font-semibold text-foreground">{user.reportingTo}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={onClose} variant="outline" className="rounded-xl">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
