import { format } from "date-fns";
import { MONTHLY_START_SCORE } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getPerformanceScores(month = format(new Date(), "yyyy-MM")) {
  const supabase = createAdminSupabaseClient();
  const [{ data, error }, { data: users, error: usersError }] = await Promise.all([
    supabase.from("monthly_scores").select("*").eq("month", month).order("score", { ascending: true }),
    supabase.from("users").select("id, email").eq("role", "member")
  ]);

  if (error || usersError) {
    throw new AppError(error?.message ?? usersError?.message ?? "Unable to load performance scores", 500);
  }

  const scoreMap = new Map(data.map((item) => [item.user_id, item]));

  return users
    .map((user) => {
      const item = scoreMap.get(user.id);

      return {
        user_id: user.id,
        month,
      score: item?.score ?? MONTHLY_START_SCORE,
      issues_count: item?.issues_count ?? 0,
      deductions: item?.deductions ?? 0,
        users: {
          email: user.email
        }
      };
    })
    .sort((a, b) => a.score - b.score);
}

export async function getMemberPerformance(userId: string, month = format(new Date(), "yyyy-MM")) {
  const supabase = createAdminSupabaseClient();
  const [{ data, error }, { data: user, error: userError }] = await Promise.all([
    supabase.from("monthly_scores").select("*").eq("month", month).eq("user_id", userId).maybeSingle(),
    supabase.from("users").select("email").eq("id", userId).maybeSingle()
  ]);

  if (error || userError) {
    throw new AppError(error?.message ?? userError?.message ?? "Unable to load member performance", 500);
  }

  return (
    (data
      ? {
          ...data,
          users: {
            email: user?.email ?? "Unknown member"
          }
        }
      : {
          user_id: userId,
          month,
          score: MONTHLY_START_SCORE,
          issues_count: 0,
          deductions: 0,
          users: {
            email: user?.email ?? "Unknown member"
          }
        })
  );
}
