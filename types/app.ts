import type { Database } from "@/types/database";

export type UserRecord = Database["public"]["Tables"]["users"]["Row"];
export type InviteRecord = Database["public"]["Tables"]["invites"]["Row"];
export type AuditRecord = Database["public"]["Tables"]["audits"]["Row"];
export type EntryRecord = Database["public"]["Tables"]["entries"]["Row"] & {
  audits?: AuditRecord[];
};
export type ReportRecord = Database["public"]["Tables"]["reports"]["Row"] & {
  users?: Pick<UserRecord, "email" | "role"> | null;
  entries: EntryRecord[];
};
export type MessageRecord = Database["public"]["Tables"]["messages"]["Row"] & {
  user?: Pick<UserRecord, "email"> | null;
  creator?: Pick<UserRecord, "email"> | null;
};
export type PerformanceRecord = {
  user_id: string;
  month: string;
  score: number;
  issues_count: number;
  deductions: number;
  users?: Pick<UserRecord, "email"> | null;
};
