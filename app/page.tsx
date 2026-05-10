import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function Home() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('https://app.loomdesk.online/login');
  }
  
  const role = session.user.role;
  const targetDomain = (role === 'ADMIN' || role === 'TEAM_LEAD') 
    ? 'admin.loomdesk.online' 
    : 'dashboard.loomdesk.online';

  redirect(`https://${targetDomain}/`);
}
