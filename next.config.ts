import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard/qa/:path*',
        destination: '/qa/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/leave/admin',
        destination: '/leave/admin',
        permanent: false,
      },
      {
        source: '/dashboard/shifts/my-schedule',
        destination: '/shifts/my-schedule',
        permanent: false,
      },
      {
        source: '/dashboard/reports',
        destination: '/reports',
        permanent: false,
      },
      {
        source: '/dashboard/qa',
        destination: '/qa',
        permanent: false,
      },
      {
        source: '/dashboard/leave',
        destination: '/leave',
        permanent: false,
      },
      {
        source: '/dashboard/shifts',
        destination: '/shifts',
        permanent: false,
      },
      {
        source: '/dashboard/attendance',
        destination: '/attendance',
        permanent: false,
      },
      {
        source: '/dashboard/analytics',
        destination: '/analytics',
        permanent: false,
      },
      {
        source: '/dashboard/settings',
        destination: '/settings',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
