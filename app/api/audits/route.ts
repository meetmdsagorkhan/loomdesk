import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { createAudit } from "@/lib/services/audit-service";
import { auditSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const payload = auditSchema.parse(await request.json());
    const audit = await createAudit(payload);
    return ok(audit, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
