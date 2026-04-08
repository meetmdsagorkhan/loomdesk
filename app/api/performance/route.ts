import { format } from "date-fns";
import { getCurrentUserProfile } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { getMemberPerformance, getPerformanceScores } from "@/lib/services/performance-service";

export async function GET(request: Request) {
  try {
    const session = await getCurrentUserProfile();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? format(new Date(), "yyyy-MM");

    const data =
      session.profile.role === "admin"
        ? await getPerformanceScores(month)
        : await getMemberPerformance(session.profile.id, month);

    return ok(data);
  } catch (error) {
    return fail(error);
  }
}
