import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Output standalone for Docker deployment
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https' as const,
        hostname: 'images.kiwi.com',
        pathname: '/airlines/**',
      },
      {
        protocol: 'http' as const,
        hostname: 'api.stuba.com',
        pathname: '/**',
      },
      {
        protocol: 'https' as const,
        hostname: 'api.stuba.com',
        pathname: '/**',
      },
      {
        protocol: 'https' as const,
        hostname: 'photos.hotelbeds.com',
        pathname: '/**',
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
