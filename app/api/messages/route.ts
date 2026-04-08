import { getCurrentUserProfile, requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { createMessage, listMessages } from "@/lib/services/message-service";
import { messageSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await getCurrentUserProfile();
    const messages = await listMessages(session.profile.role === "admin" ? undefined : session.profile.id);
    return ok(messages);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole("admin");
    const payload = messageSchema.parse(await request.json());
    const message = await createMessage({
      ...payload,
      created_by: session.profile.id
    });
    return ok(message, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
