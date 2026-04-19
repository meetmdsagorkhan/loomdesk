export type NavIcon =
  | 'dashboard'
  | 'reports'
  | 'qa'
  | 'leave'
  | 'shifts'
  | 'attendance'
  | 'analytics'
  | 'settings';

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: NavIcon;
  section: 'Overview' | 'Workflows' | 'Operations' | 'Admin';
  matches?: string[];
};

export const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Overview',
    description: 'Scoreboard and summary',
    icon: 'dashboard',
    section: 'Overview',
  },
  {
    href: '/reports',
    label: 'Reports',
    description: 'Daily reporting workspace',
    icon: 'reports',
    section: 'Workflows',
    matches: ['/dashboard/reports'],
  },
  {
    href: '/qa',
    label: 'QA Review',
    description: 'Review reports and score work',
    icon: 'qa',
    section: 'Workflows',
    matches: ['/qa/', '/dashboard/qa', '/dashboard/qa/'],
  },
  {
    href: '/leave',
    label: 'Leave',
    description: 'Requests and approvals',
    icon: 'leave',
    section: 'Operations',
    matches: ['/leave/admin', '/dashboard/leave', '/dashboard/leave/admin'],
  },
  {
    href: '/shifts',
    label: 'Shifts',
    description: 'Templates, assignments, schedules',
    icon: 'shifts',
    section: 'Operations',
    matches: ['/shifts/my-schedule', '/dashboard/shifts', '/dashboard/shifts/my-schedule'],
  },
  {
    href: '/attendance',
    label: 'Attendance',
    description: 'Presence and punctuality',
    icon: 'attendance',
    section: 'Operations',
    matches: ['/dashboard/attendance'],
  },
  {
    href: '/analytics',
    label: 'Analytics',
    description: 'Performance and trends',
    icon: 'analytics',
    section: 'Admin',
    matches: ['/dashboard/analytics'],
  },
  {
    href: '/settings',
    label: 'Settings',
    description: 'Profile and preferences',
    icon: 'settings',
    section: 'Admin',
    matches: ['/dashboard/settings'],
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

const routeOverrides: Array<{
  test: (pathname: string) => boolean;
  meta: RouteMeta;
}> = [
  {
    test: (pathname) => pathname === '/dashboard',
    meta: {
      title: 'Overview',
      description: 'Track the team at a glance and spot what needs attention first.',
      href: '/dashboard',
    },
  },
  {
    test: (pathname) => pathname === '/reports' || pathname === '/dashboard/reports',
    meta: {
      title: 'Reports',
      description: 'Create, review, and submit daily work logs without leaving the workflow.',
      href: '/reports',
    },
  },
  {
    test: (pathname) => pathname === '/qa' || pathname === '/dashboard/qa',
    meta: {
      title: 'QA Review',
      description: 'Inspect submitted reports, leave feedback, and apply score deductions cleanly.',
      href: '/qa',
    },
  },
  {
    test: (pathname) => pathname.startsWith('/qa/') || pathname.startsWith('/dashboard/qa/'),
    meta: {
      title: 'QA Detail',
      description: 'A focused review surface for one report, its entries, and score history.',
      href: '/qa',
    },
  },
  {
    test: (pathname) => pathname === '/leave' || pathname === '/dashboard/leave',
    meta: {
      title: 'Leave',
      description: 'Request time off, review status, and keep team coverage visible.',
      href: '/leave',
    },
  },
  {
    test: (pathname) =>
      pathname === '/leave/admin' || pathname === '/dashboard/leave/admin',
    meta: {
      title: 'Leave Admin',
      description: 'Approve or reject requests from a queue built for quick decisions.',
      href: '/leave/admin',
    },
  },
  {
    test: (pathname) => pathname === '/shifts' || pathname === '/dashboard/shifts',
    meta: {
      title: 'Shifts',
      description: 'Manage shift templates and assignments from one operational hub.',
      href: '/shifts',
    },
  },
  {
    test: (pathname) =>
      pathname === '/shifts/my-schedule' || pathname === '/dashboard/shifts/my-schedule',
    meta: {
      title: 'My Schedule',
      description: 'See your assigned shifts and upcoming coverage windows clearly.',
      href: '/shifts/my-schedule',
    },
  },
  {
    test: (pathname) => pathname === '/attendance' || pathname === '/dashboard/attendance',
    meta: {
      title: 'Attendance',
      description: 'Monitor presence patterns, late submissions, and missed days.',
      href: '/attendance',
    },
  },
  {
    test: (pathname) => pathname === '/analytics' || pathname === '/dashboard/analytics',
    meta: {
      title: 'Analytics',
      description: 'Follow performance trends, quality shifts, and operational pressure points.',
      href: '/analytics',
    },
  },
  {
    test: (pathname) => pathname === '/settings' || pathname === '/dashboard/settings',
    meta: {
      title: 'Settings',
      description: 'Update profile details and tune the workspace to your preferences.',
      href: '/settings',
    },
  },
];

export function getRouteMeta(pathname: string): RouteMeta {
  const match = routeOverrides.find((route) => route.test(pathname));

  if (match) {
    return match.meta;
  }

  return {
    title: 'Workspace',
    description: 'Everything you need to manage reporting, reviews, and team operations.',
    href: '/dashboard',
  };
}
