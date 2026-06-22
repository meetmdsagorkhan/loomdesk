import { AccessToken } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;
export const LIVEKIT_URL = process.env.LIVEKIT_URL!;

/** Each member gets a dedicated room named after their user ID */
export function getLiveKitRoomName(userId: string): string {
  return `monitoring-${userId}`;
}

/**
 * Token for the admin — subscriber only, cannot publish.
 * Each admin gets a unique identity so multiple admins can view the same member.
 */
export async function createAdminToken(adminId: string, targetUserId: string): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: `admin-${adminId}`,
    ttl: "2h",
  });
  at.addGrant({
    roomJoin: true,
    room: getLiveKitRoomName(targetUserId),
    canSubscribe: true,
    canPublish: false,    // Admin only watches
    canPublishData: false,
  });
  return at.toJwt();
}

/**
 * Token for the member — publisher only, cannot subscribe.
 * Camera starts only when this token is used to connect.
 */
export async function createMemberToken(userId: string): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: `member-${userId}`,
    ttl: "2h",
  });
  at.addGrant({
    roomJoin: true,
    room: getLiveKitRoomName(userId),
    canPublish: true,     // Member publishes camera + mic
    canSubscribe: false,  // Member cannot see other streams
    canPublishData: false,
  });
  return at.toJwt();
}
