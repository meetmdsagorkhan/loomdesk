import { AppError } from "@/lib/errors";
import { sendAdminMessageEmail } from "@/lib/mail";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function createMessage(params: {
  user_id: string;
  type: "reminder" | "warning" | "note";
  message: string;
  created_by: string;
}) {
  const supabase = createAdminSupabaseClient();

  const { data: member } = await supabase.from("users").select("email").eq("id", params.user_id).maybeSingle();
  if (!member) {
    throw new AppError("Member not found", 404);
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      user_id: params.user_id,
      type: params.type,
      message: params.message,
      created_by: params.created_by
    })
    .select("*")
    .single();

  if (error) {
    throw new AppError(error.message, 500);
  }

  await sendAdminMessageEmail({
    email: member.email,
    type: params.type,
    message: params.message
  });

  return data;
}

export async function listMessages(userId?: string) {
  const supabase = createAdminSupabaseClient();
  let query = supabase.from("messages").select("*, user:users!messages_user_id_fkey(email), creator:users!messages_created_by_fkey(email)").order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(error.message, 500);
  }

  return data;
}
