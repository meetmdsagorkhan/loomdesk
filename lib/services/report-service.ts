import { endOfMonth, format, startOfMonth } from "date-fns";
import { AppError } from "@/lib/errors";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type ReportInput = {
  userId: string;
  date: string;
  entries: Array<Omit<Database["public"]["Tables"]["entries"]["Insert"], "report_id">>;
};

export async function upsertReportWithEntries(params: ReportInput) {
  const supabase = createAdminSupabaseClient();

  const { data: existingReport } = await supabase
    .from("reports")
    .select("id")
    .eq("user_id", params.userId)
    .eq("date", params.date)
    .maybeSingle();

  let reportId = existingReport?.id;

  if (!reportId) {
    const { data: newReport, error: reportError } = await supabase
      .from("reports")
      .insert({
        user_id: params.userId,
        date: params.date
      })
      .select("id")
      .single();

    if (reportError || !newReport) {
      throw new AppError(reportError?.message ?? "Unable to create report", 500);
    }

    reportId = newReport.id;
  } else {
    const { error: deleteError } = await supabase.from("entries").delete().eq("report_id", reportId);
    if (deleteError) {
      throw new AppError(deleteError.message, 500);
    }
  }

  const { error: entriesError } = await supabase.from("entries").insert(
    params.entries.map((entry) => ({
      ...entry,
      report_id: reportId!
    }))
  );

  if (entriesError) {
    throw new AppError(entriesError.message, 500);
  }

  return getReportById(reportId);
}

export async function getReportById(reportId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*, users(email, role), entries(*, audits(*))")
    .eq("id", reportId)
    .single();

  if (error) {
    throw new AppError(error.message, 500);
  }

  return data;
}

export async function listReports(params: { month?: string; userId?: string }) {
  const supabase = createAdminSupabaseClient();
  const baseMonth = params.month ? new Date(`${params.month}-01`) : new Date();

  let query = supabase
    .from("reports")
    .select("*, users(email, role), entries(*, audits(*))")
    .gte("date", format(startOfMonth(baseMonth), "yyyy-MM-dd"))
    .lte("date", format(endOfMonth(baseMonth), "yyyy-MM-dd"))
    .order("date", { ascending: false });

  if (params.userId) {
    query = query.eq("user_id", params.userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(error.message, 500);
  }

  return data;
}

export async function getMemberReportHistory(userId: string) {
  return listReports({ userId });
}
