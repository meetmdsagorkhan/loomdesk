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
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[400px]">
        <div className="animate-in zoom-in-95 fade-in duration-200">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant={variant === 'danger' ? 'destructive' : 'default'}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
