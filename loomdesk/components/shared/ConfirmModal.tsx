'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'default';
}

export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'default',
}: ConfirmModalProps) {
  const isDanger = variant === 'danger';
  
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[400px] p-6 border-white/10">
        <div className="flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 fade-in duration-200">
          <div className={cn(
            "p-3 rounded-2xl border backdrop-blur-md shadow-lg",
            isDanger 
              ? "bg-red-500/10 border-red-500/20 text-red-500 shadow-red-500/5" 
              : "bg-primary/10 border-primary/20 text-primary shadow-primary/5"
          )}>
            {isDanger ? (
              <AlertCircle className="w-6 h-6" />
            ) : (
              <HelpCircle className="w-6 h-6" />
            )}
          </div>

          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-semibold font-heading tracking-tight text-foreground">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground max-w-[300px]">
              {description}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-3 w-full sm:flex-row flex-col-reverse sm:justify-center mt-2">
            <Button 
              variant="outline" 
              onClick={onCancel} 
              className="rounded-xl w-full sm:w-auto px-5 bg-white/5 border-white/10 hover:bg-white/10 text-foreground"
            >
              Cancel
            </Button>
            <Button
              variant={isDanger ? 'destructive' : 'default'}
              onClick={onConfirm}
              className={cn(
                "rounded-xl w-full sm:w-auto px-5",
                isDanger 
                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                  : "bg-primary hover:bg-primary/90 text-white shadow-[0_8px_24px_rgba(125,92,255,0.3)]"
              )}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
