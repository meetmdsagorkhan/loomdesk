import crypto from "node:crypto";
import { addDays, isBefore } from "date-fns";
import { AppError } from "@/lib/errors";
import { getEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendInviteEmail } from "@/lib/mail";
import type { UserRole } from "@/types/database";

export async function createInvite(params: { email: string; invitedBy: string; role: UserRole; expiresInDays: number }) {
  const supabase = createAdminSupabaseClient();
  const normalizedEmail = params.email.toLowerCase();

  const [{ data: existingUser }, { data: existingInvite }] = await Promise.all([
    supabase.from("users").select("id").eq("email", normalizedEmail).maybeSingle(),
    supabase
      .from("invites")
      .select("id, status")
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .maybeSingle()
  ]);

  if (existingUser) {
    throw new AppError("A member with this email already exists", 409);
  }

  if (existingInvite) {
    throw new AppError("There is already a pending invite for this email", 409);
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = addDays(new Date(), params.expiresInDays).toISOString();

  const { data: invite, error } = await supabase
    .from("invites")
    .insert({
      email: normalizedEmail,
      token,
      expires_at: expiresAt,
      invited_by: params.invitedBy,
      status: "pending"
    })
    .select("*")
    .single();

  if (error) {
    throw new AppError(error.message, 500);
  }

  const env = getEnv();
  const inviteLink = `${env.NEXT_PUBLIC_APP_URL}/invite/${token}?email=${encodeURIComponent(normalizedEmail)}&role=${params.role}`;
  await sendInviteEmail({
    email: normalizedEmail,
    inviteLink,
    expiresAt
  });

  return invite;
}

export async function acceptInvite(params: { token: string; password: string }) {
  const supabase = createAdminSupabaseClient();
  const { data: invite, error: inviteError } = await supabase
    .from("invites")
    .select("*")
    .eq("token", params.token)
    .maybeSingle();

  if (inviteError || !invite) {
    throw new AppError("Invite not found", 404);
  }

  if (invite.status !== "pending") {
    throw new AppError("Invite has already been used", 409);
  }

  if (isBefore(new Date(invite.expires_at), new Date())) {
    await supabase.from("invites").update({ status: "expired" }).eq("id", invite.id);
    throw new AppError("Invite has expired", 410);
  }

  const createdUser = await supabase.auth.admin.createUser({
    email: invite.email,
    password: params.password,
    email_confirm: true
  });

  if (createdUser.error || !createdUser.data.user) {
    const message = createdUser.error?.message ?? "Unable to create user";
    throw new AppError(message.includes("already") ? "This invite email is already registered" : message, message.includes("already") ? 409 : 500);
  }

  const { error: userInsertError } = await supabase.from("users").insert({
    id: createdUser.data.user.id,
    email: invite.email,
    role: "member"
  });

  if (userInsertError) {
    await supabase.auth.admin.deleteUser(createdUser.data.user.id);
    throw new AppError(userInsertError.message, 500);
  }

  const { error: inviteUpdateError } = await supabase
    .from("invites")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString()
    })
    .eq("id", invite.id);

  if (inviteUpdateError) {
    await supabase.from("users").delete().eq("id", createdUser.data.user.id);
    await supabase.auth.admin.deleteUser(createdUser.data.user.id);
    throw new AppError(inviteUpdateError.message, 500);
  }

  return {
    email: invite.email
  };
}

export async function listTeamMembers() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });

  if (error) {
    throw new AppError(error.message, 500);
  }

  return data;
}

export async function listInvites() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("invites").select("*").order("created_at", { ascending: false });

  if (error) {
    throw new AppError(error.message, 500);
  }

  return data;
}
