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
  // Production source maps - disable to avoid source map warnings
  // productionBrowserSourceMaps: false,
  // Rewrite legacy URLs to Next.js routes
  async rewrites() {
    return [
      {
        source: '/FlightSearch.htm',
        destination: '/FlightSearch',
      },
      {
        source: '/checkout.htm',
        destination: '/checkout',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
