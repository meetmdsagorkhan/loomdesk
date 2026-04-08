import { format } from "date-fns";
import { requireRole } from "@/lib/auth";
import { fail } from "@/lib/http";
import { getPerformanceScores } from "@/lib/services/performance-service";

export async function GET(request: Request) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? format(new Date(), "yyyy-MM");
    const rows = await getPerformanceScores(month);

    const csv = [
      ["email", "month", "score", "issues_count", "deductions"].join(","),
      ...rows.map((row) =>
        [row.users?.email ?? "", row.month, row.score, row.issues_count, row.deductions].join(",")
      )
    ].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="performance-${month}.csv"`
      }
    });
  } catch (error) {
    return fail(error);
  }
}
