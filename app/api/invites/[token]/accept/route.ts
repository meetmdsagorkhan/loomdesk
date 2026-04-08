import { acceptInviteSchema } from "@/lib/validations";
import { acceptInvite } from "@/lib/services/invite-service";
import { fail, ok } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const payload = acceptInviteSchema.parse({
      ...(await request.json()),
      token
    });

    const result = await acceptInvite(payload);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
