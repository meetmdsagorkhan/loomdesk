import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminToken, createMemberToken, LIVEKIT_URL } from "@/lib/livekit";

export const dynamic = "force-dynamic";

// GET /api/monitoring/livekit-token?userId=<id>&role=admin|member
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");
    const role = searchParams.get("role");

    if (!targetUserId || !role) {
      return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
    }

    if (role === "admin") {
      // Only ADMINs and TEAM_LEADs can get admin tokens
      if (session.user.role !== "ADMIN" && session.user.role !== "TEAM_LEAD") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const token = await createAdminToken(session.user.id, targetUserId);
      return NextResponse.json({ token, url: LIVEKIT_URL });
    }

    if (role === "member") {
      // Members can only get tokens for themselves
      if (session.user.id !== targetUserId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const token = await createMemberToken(session.user.id);
      return NextResponse.json({ token, url: LIVEKIT_URL });
    }

    return NextResponse.json({ error: "Invalid role. Must be admin or member" }, { status: 400 });
  } catch (error) {
    console.error("LiveKit token generation error:", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}
