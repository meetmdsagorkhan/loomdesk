import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/http";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }

    return ok({ success: true });
  } catch (error) {
    return fail(error);
  }
}
