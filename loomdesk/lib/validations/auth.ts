import { z } from 'zod';

export const passwordPolicySchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must include at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
  .regex(/[0-9]/, 'Password must include at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must include at least one special character');

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
  otp: z.string().trim().optional(),
  recoveryCode: z.string().trim().optional(),
  rememberMe: z.preprocess(
    (value) => value === true || value === 'true' || value === 'on',
    z.boolean().default(false)
  ),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const inviteSignupSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required').min(2, 'Name must be at least 2 characters'),
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type InviteSignupFormData = z.infer<typeof inviteSignupSchema>;

// Leave request validation
export const leaveRequestSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(1, 'Reason is required').min(5, 'Reason must be at least 5 characters'),
});

export type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

// Leave approval/rejection validation
export const leaveApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export type LeaveApprovalFormData = z.infer<typeof leaveApprovalSchema>;

// Shift creation validation
export const shiftSchema = z.object({
  name: z.string().min(1, 'Shift name is required').min(2, 'Name must be at least 2 characters'),
  startTime: z.string().min(1, 'Start time is required').regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().min(1, 'End time is required').regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  reportDeadline: z.string().min(1, 'Report deadline is required').regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
});

export type ShiftFormData = z.infer<typeof shiftSchema>;

// Shift assignment validation
export const shiftAssignmentSchema = z.object({
  shiftId: z.string().min(1, 'Shift is required'),
  userId: z.string().min(1, 'User is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});

export type ShiftAssignmentFormData = z.infer<typeof shiftAssignmentSchema>;

// Score event validation
export const scoreEventSchema = z.object({
  userId: z.string().min(1, 'User is required'),
  reportId: z.string().optional(),
  entryId: z.string().optional(),
  severity: z.enum(['MINOR', 'MAJOR']),
  reason: z.string().min(1, 'Reason is required').min(3, 'Reason must be at least 3 characters'),
  adminNote: z.string().optional(),
});

export type ScoreEventFormData = z.infer<typeof scoreEventSchema>;

// Feedback validation
export const feedbackSchema = z.object({
  entryId: z.string().min(1, 'Entry is required'),
  comment: z.string().min(1, 'Comment is required').min(3, 'Comment must be at least 3 characters'),
});

export type FeedbackFormData = z.infer<typeof feedbackSchema>;
