import { Role } from '@prisma/client';

export type Permission =
  | 'view_team_analytics'
  | 'manage_users'
  | 'manage_invitations'
  | 'manage_shifts'
  | 'manage_leaves'
  | 'score_reports'
  | 'view_all_reports'
  | 'view_audit_logs'
  | 'system_settings'
  | 'post_announcements';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'view_team_analytics',
    'manage_users',
    'manage_invitations',
    'manage_shifts',
    'manage_leaves',
    'score_reports',
    'view_all_reports',
    'view_audit_logs',
    'system_settings',
    'post_announcements',
  ],
  TEAM_LEAD: [
    'view_team_analytics',
    'manage_shifts',
    'manage_leaves',
    'score_reports',
    'view_all_reports',
    'post_announcements',
  ],
  MEMBER: [],
};

export function hasPermission(role: Role | string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role as Role] || [];
  return permissions.includes(permission);
}

export function canAccessRoute(role: Role | string | undefined | null, path: string): boolean {
  if (!role) return false;
  if (role === 'ADMIN') return true;

  // Normalize path to handle both /dashboard/xxx and /xxx
  const normalizedPath = path.startsWith('/dashboard/') 
    ? path.replace('/dashboard/', '/') 
    : path === '/dashboard' ? '/' : path;

  // Define strictly protected routes (Global Admin/Lead only)
  const routeProtections: { path: string; allowedRoles: Role[] }[] = [
    { path: '/analytics', allowedRoles: ['ADMIN', 'TEAM_LEAD'] },
    // Scoring and QA are now role-aware and allow Members to see their own data
    // so we don't block them at the middleware level anymore.
  ];

  // Check if normalized path is protected
  const protection = routeProtections.find(p => normalizedPath.startsWith(p.path));
  
  if (protection) {
    return (protection.allowedRoles as string[]).includes(role as string);
  }

  // Default to allowing access (pages handle internal filtering)
  return true;
}
