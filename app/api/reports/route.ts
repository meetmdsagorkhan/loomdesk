import { getCurrentUserProfile, requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { listReports, upsertReportWithEntries } from "@/lib/services/report-service";
import { reportQuerySchema, reportSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const session = await getCurrentUserProfile();
    const { searchParams } = new URL(request.url);
    const params = reportQuerySchema.parse({
      month: searchParams.get("month") ?? undefined,
      userId: searchParams.get("userId") ?? undefined
    });

    const reports =
      session.profile.role === "admin"
        ? await listReports({ month: params.month, userId: params.userId })
        : await listReports({ month: params.month, userId: session.profile.id });

    return ok(reports);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole("member");
    const payload = reportSchema.parse(await request.json());
    const report = await upsertReportWithEntries({
      userId: session.profile.id,
      date: payload.date,
      entries: payload.entries.map((entry) => ({
        type: entry.type,
        session_id: entry.session_id,
        status: entry.status,
        pending_reason: entry.pending_reason?.trim() || null
      }))
    });

    return ok(report, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
