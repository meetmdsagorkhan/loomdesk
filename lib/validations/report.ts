import { z } from 'zod';

export const entrySchema = z.object({
  type: z.enum(['TICKET', 'CHAT']),
  referenceId: z.string().min(1, 'Reference ID is required'),
  status: z.enum(['SOLVED', 'PENDING']),
  note: z.string().min(5, 'Note must be at least 5 characters'),
  pendingReason: z.string().optional(),
}).refine(
  (data) => {
    if (data.status === 'PENDING') {
      return data.pendingReason && data.pendingReason.length >= 1;
    }
    return true;
  },
  {
    message: 'Pending reason is required when status is Pending',
    path: ['pendingReason'],
  }
);

export type EntryFormData = z.infer<typeof entrySchema>;
