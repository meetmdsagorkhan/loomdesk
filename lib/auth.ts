import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export async function getCurrentUserProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AppError("Unauthorized", 401);
  }

  const admin = createAdminSupabaseClient();
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new AppError("User profile not found", 403);
  }

  return {
    authUser: user,
    profile
  };
}

export async function requireRole(role: UserRow["role"]) {
  const currentUser = await getCurrentUserProfile();

  if (currentUser.profile.role !== role) {
    throw new AppError("Forbidden", 403);
  }

  return currentUser;
}

export async function getSessionForPage() {
  try {
    return await getCurrentUserProfile();
  } catch {
    redirect("/login");
  }
}

export async function redirectIfWrongRole(expectedRole: UserRow["role"]) {
  const session = await getSessionForPage();

  if (session.profile.role !== expectedRole) {
    redirect(session.profile.role === "admin" ? "/admin" : "/member");
  }

  return session;
}
