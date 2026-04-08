import { AppError } from "@/lib/errors";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function createAudit(params: {
  user_id: string;
  entry_id: string;
  issue_found: boolean;
  note?: string | null;
  points_deducted: number;
}) {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("audits")
    .insert({
      user_id: params.user_id,
      entry_id: params.entry_id,
      issue_found: params.issue_found,
      note: params.note ?? null,
      points_deducted: params.points_deducted
    })
    .select("*")
    .single();

  if (error) {
    throw new AppError(error.message, 500);
  }

  return data;
}

export async function listAuditsForUser(userId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("audits")
    .select("*, entries(session_id, type, report_id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError(error.message, 500);
  }

  return data;
}
