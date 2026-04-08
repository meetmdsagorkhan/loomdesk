export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "admin" | "member";
export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";
export type EntryType = "chat" | "ticket";
export type EntryStatus = "solved" | "pending";
export type MessageType = "reminder" | "warning" | "note";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
      };
      invites: {
        Row: {
          id: string;
          email: string;
          token: string;
          expires_at: string;
          status: InviteStatus;
          invited_by: string | null;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          token: string;
          expires_at: string;
          status?: InviteStatus;
          invited_by?: string | null;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["invites"]["Row"]>;
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Row"]>;
      };
      entries: {
        Row: {
          id: string;
          report_id: string;
          type: EntryType;
          session_id: string;
          status: EntryStatus;
          pending_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          type: EntryType;
          session_id: string;
          status: EntryStatus;
          pending_reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["entries"]["Row"]>;
      };
      audits: {
        Row: {
          id: string;
          user_id: string;
          entry_id: string;
          issue_found: boolean;
          note: string | null;
          points_deducted: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entry_id: string;
          issue_found?: boolean;
          note?: string | null;
          points_deducted?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audits"]["Row"]>;
      };
      messages: {
        Row: {
          id: string;
          user_id: string;
          type: MessageType;
          message: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: MessageType;
          message: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
      };
    };
    Views: {
      monthly_scores: {
        Row: {
          user_id: string;
          month: string;
          score: number;
          issues_count: number;
          deductions: number;
        };
      };
    };
  };
}
