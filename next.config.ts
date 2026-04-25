import type { NextConfig } from "next";

const nextAuthUrl = process.env.NEXTAUTH_URL;

if (!nextAuthUrl) {
  throw new Error("NEXTAUTH_URL is required");
}

new URL(nextAuthUrl);

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(nextAuthUrl.startsWith("https://")
    ? [
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      },
    ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ['192.168.0.106'],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
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
        source: '/dashboard/calendar',
        destination: '/calendar',
        permanent: false,
      },
      {
        source: '/dashboard/analytics',
        destination: '/analytics',
        permanent: false,
      },
      {
        source: '/dashboard/messages',
        destination: '/messages',
        permanent: false,
      },
      {
        source: '/dashboard/scoring',
        destination: '/scoring',
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
