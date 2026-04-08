import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { redirectIfWrongRole } from "@/lib/auth";

export default async function AdminPage() {
  const session = await redirectIfWrongRole("admin");
  return <AdminDashboard user={session.profile} />;
}
