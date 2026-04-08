import { z } from "zod";
import { ENTRY_STATUSES, MESSAGE_TYPES, REPORT_ENTRY_TYPES, USER_ROLES } from "@/lib/constants";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(USER_ROLES).default("member"),
  expiresInDays: z.coerce.number().int().min(1).max(14).default(7)
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(72)
});

export const reportEntrySchema = z
  .object({
    id: z.string().optional(),
    type: z.enum(REPORT_ENTRY_TYPES),
    session_id: z.string().min(1, "Session ID is required"),
    status: z.enum(ENTRY_STATUSES),
    pending_reason: z.string().nullable().optional()
  })
  .superRefine((value, ctx) => {
    if (value.status === "pending" && !value.pending_reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pending_reason"],
        message: "Pending entries require a reason"
      });
    }
  });

export const reportSchema = z.object({
  date: z.string().date(),
  entries: z.array(reportEntrySchema).min(1, "At least one entry is required")
});

export const auditSchema = z.object({
  user_id: z.string().uuid(),
  entry_id: z.string().uuid(),
  issue_found: z.boolean(),
  note: z.string().trim().max(500).nullable().optional(),
  points_deducted: z.coerce.number().int().min(0).max(1).default(0)
});

export const messageSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum(MESSAGE_TYPES),
  message: z.string().trim().min(5).max(1000)
});

export const reportQuerySchema = z.object({
  month: z.string().optional(),
  userId: z.string().uuid().optional()
});
