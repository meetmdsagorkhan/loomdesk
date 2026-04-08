import { MemberDashboard } from "@/components/dashboard/member-dashboard";
import { redirectIfWrongRole } from "@/lib/auth";

export default async function MemberPage() {
  const session = await redirectIfWrongRole("member");
  return <MemberDashboard user={session.profile} />;
}
