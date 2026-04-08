import { inviteSchema } from "@/lib/validations";
import { fail, ok } from "@/lib/http";
import { createInvite, listInvites, listTeamMembers } from "@/lib/services/invite-service";
import { requireRole } from "@/lib/auth";

export async function GET() {
  try {
    await requireRole("admin");
    const [members, invites] = await Promise.all([listTeamMembers(), listInvites()]);
    return ok({ members, invites });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole("admin");
    const payload = inviteSchema.parse(await request.json());
    const invite = await createInvite({
      email: payload.email,
      invitedBy: session.profile.id,
      role: payload.role,
      expiresInDays: payload.expiresInDays
    });

    return ok(invite, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
