import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https' as const,
        hostname: 'images.kiwi.com',
        pathname: '/airlines/**',
      },
    ],
  },
  // Rewrite legacy URLs to Next.js routes
  async rewrites() {
    return [
      {
        source: '/FlightSearch.htm',
        destination: '/FlightSearch',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
