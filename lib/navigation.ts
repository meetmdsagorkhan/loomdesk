export type NavIcon =
  | 'dashboard'
  | 'reports'
  | 'qa'
  | 'leave'
  | 'shifts'
  | 'messages'
  | 'analytics'
  | 'scoring'
  | 'attendance'
  | 'settings'
  | 'profile';


export type NavItem = {
  href: string;
  label: string | { ADMIN: string; MEMBER: string; TEAM_LEAD?: string };
  description: string | { ADMIN: string; MEMBER: string; TEAM_LEAD?: string };
  icon: NavIcon;
  section: 'Overview' | 'Workflows' | 'Operations' | 'Admin' | 'Account';

  matches?: string[];
  roles?: string[]; // If undefined, visible to all
};

export const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: { ADMIN: 'Team Overview', MEMBER: 'My Dashboard' },
    description: { ADMIN: 'Full team performance snapshot', MEMBER: 'Your daily metrics and quick links' },
    icon: 'dashboard',
    section: 'Overview',
  },
  {
    href: '/reports',
    label: { ADMIN: 'All Reports', MEMBER: 'My Reports' },
    description: { ADMIN: 'Global reporting workspace', MEMBER: 'Create and review your logs' },
    icon: 'reports',
    section: 'Workflows',
    matches: ['/dashboard/reports'],
  },
  {
    href: '/qa',
    label: { ADMIN: 'QA Review', MEMBER: 'My Feedback' },
    description: { ADMIN: 'Review and score reports', MEMBER: 'See review status and feedback' },
    icon: 'qa',
    section: 'Workflows',
    matches: ['/qa/', '/dashboard/qa', '/dashboard/qa/'],
  },
  {
    href: '/scoring',
    label: { ADMIN: 'Leaderboard', MEMBER: 'My Performance' },
    description: { ADMIN: 'Team rankings and metrics', MEMBER: 'Your score and historical trends' },
    icon: 'scoring',
    section: 'Workflows',
    matches: ['/dashboard/scoring'],
  },
  {
    href: '/leave',
    label: { ADMIN: 'Leave Approvals', MEMBER: 'Request Leave' },
    description: { ADMIN: 'Review time-off requests', MEMBER: 'Request and track time off' },
    icon: 'leave',
    section: 'Operations',
    matches: ['/leave/admin', '/dashboard/leave', '/dashboard/leave/admin'],
  },
  {
    href: '/shifts',
    label: { ADMIN: 'Shift Management', MEMBER: 'My Schedule' },
    description: { ADMIN: 'Rosters and templates', MEMBER: 'Your upcoming shift timings' },
    icon: 'shifts',
    section: 'Operations',
    matches: ['/shifts/my-schedule', '/dashboard/shifts', '/dashboard/shifts/my-schedule'],
  },
  {
    href: '/messages',
    label: 'Messages',
    description: 'Team chat and announcements',
    icon: 'messages',
    section: 'Operations',
    matches: ['/dashboard/messages'],
  },
  {
    href: '/analytics',
    label: 'Analytics',
    description: 'Performance and trends',
    icon: 'analytics',
    section: 'Admin',
    matches: ['/dashboard/analytics'],
    roles: ['ADMIN', 'TEAM_LEAD'],
  },
  {
    href: '/settings',
    label: { ADMIN: 'Admin Settings', TEAM_LEAD: 'Admin Settings', MEMBER: 'My Settings' },
    description: { ADMIN: 'Workspace members and team controls', TEAM_LEAD: 'Workspace members and team controls', MEMBER: 'Profile and security preferences' },
    icon: 'settings',
    section: 'Admin',
    matches: ['/dashboard/settings'],
    roles: ['ADMIN', 'TEAM_LEAD'],
  },
  {
    href: '/profile',
    label: 'Profile',
    description: 'Personal and security settings',
    icon: 'profile',
    section: 'Account',
  },
];


export type RouteMeta = {
  title: string;
  description: string;
  href: string;
};

export function isNavItemActive(pathname: string, href: string, matches?: string[]) {
  if (pathname === href) {
    return true;
  }

  return (matches ?? []).some((match) => pathname === match || pathname.startsWith(match));
}

export function getNavItemLabel(item: NavItem, role: string = 'MEMBER'): string {
  if (typeof item.label === 'string') return item.label;
  return item.label[role as keyof typeof item.label] || item.label.MEMBER;
}

export function getNavItemDescription(item: NavItem, role: string = 'MEMBER'): string {
  if (typeof item.description === 'string') return item.description;
  return item.description[role as keyof typeof item.description] || item.description.MEMBER;
}

const routeOverrides: Array<{
  test: (pathname: string) => boolean;
  meta: (role: string) => RouteMeta;
}> = [
    {
      test: (pathname) => pathname === '/dashboard',
      meta: (role) => ({
        title: role === 'ADMIN' ? 'Team Overview' : 'My Dashboard',
        description: role === 'ADMIN' 
          ? 'Track the team at a glance and spot what needs attention first.'
          : 'Your personal workspace hub for daily work and performance.',
        href: '/dashboard',
      }),
    },
    {
      test: (pathname) => pathname === '/reports' || pathname === '/dashboard/reports',
      meta: (role) => ({
        title: role === 'ADMIN' ? 'All Reports' : 'My Reports',
        description: role === 'ADMIN'
          ? 'View and filter all submitted work logs across the organization.'
          : 'Create, review, and submit your daily work logs.',
        href: '/reports',
      }),
    },
    {
      test: (pathname) => pathname === '/qa' || pathname === '/dashboard/qa',
      meta: (role) => ({
        title: role === 'ADMIN' ? 'QA Review' : 'My Feedback',
        description: role === 'ADMIN'
          ? 'Inspect submitted reports, leave feedback, and apply score deductions.'
          : 'Review feedback and scores on your submitted reports.',
        href: '/qa',
      }),
    },
    {
      test: (pathname) => pathname.startsWith('/qa/') || pathname.startsWith('/dashboard/qa/'),
      meta: (role) => ({
        title: 'Review Detail',
        description: 'Detailed analysis of report entries and performance feedback.',
        href: '/qa',
      }),
    },
    {
      test: (pathname) => pathname === '/leave' || pathname === '/dashboard/leave',
      meta: (role) => ({
        title: role === 'ADMIN' ? 'Leave Approvals' : 'Request Leave',
        description: role === 'ADMIN'
          ? 'Manage team time-off requests and maintain coverage.'
          : 'Request time off and track your approval status.',
        href: '/leave',
      }),
    },
    {
      test: (pathname) => pathname === '/shifts' || pathname === '/dashboard/shifts',
      meta: (role) => ({
        title: role === 'ADMIN' ? 'Shift Management' : 'My Schedule',
        description: role === 'ADMIN'
          ? 'Configure shift templates and manage team assignments.'
          : 'Your upcoming work schedule and coverage windows.',
        href: '/shifts',
      }),
    },
    {
      test: (pathname) => pathname === '/analytics' || pathname === '/dashboard/analytics',
      meta: (role) => ({
        title: 'Team Analytics',
        description: 'In-depth performance trends and operational metrics.',
        href: '/analytics',
      }),
    },
    {
      test: (pathname) => pathname === '/scoring' || pathname === '/dashboard/scoring',
      meta: (role) => ({
        title: role === 'ADMIN' ? 'Scoring Leaderboard' : 'My Performance',
        description: role === 'ADMIN'
          ? 'Comprehensive view of team performance and rankings.'
          : 'Track your current score, rank, and quality trends.',
        href: '/scoring',
      }),
    },
    {
      test: (pathname) => pathname === '/settings' || pathname === '/dashboard/settings',
      meta: (role) => ({
        title: role === 'ADMIN' || role === 'TEAM_LEAD' ? 'Admin Settings' : 'My Settings',
        description: role === 'ADMIN' || role === 'TEAM_LEAD'
          ? 'Manage workspace members, permissions, and team access.'
          : 'Update your profile and personalize your workspace.',
        href: '/settings',
      }),
    },
    {
      test: (pathname) => pathname === '/profile',
      meta: () => ({
        title: 'Profile Settings',
        description: 'Manage your personal information and security preferences.',
        href: '/profile',
      }),
    },
  ];


export function getRouteMeta(pathname: string, role: string = 'MEMBER'): RouteMeta {
  const match = routeOverrides.find((route) => route.test(pathname));

  if (match) {
    return match.meta(role);
  }

  return {
    title: 'Workspace',
    description: 'Everything you need to manage reporting, reviews, and team operations.',
    href: '/dashboard',
  };
}
