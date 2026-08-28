import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Vercel's Next 16.3 adapter does not emit the root NFT traces that
  // standalone finalization expects. Keep standalone output for Docker,
  // while allowing Vercel to use its native build output.
  output: process.env.VERCEL ? undefined : 'standalone',
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
      {
        protocol: 'https' as const,
        hostname: 'cdn.worldota.net',
        pathname: '/**',
      },
      {
        protocol: 'https' as const,
        hostname: 'media-cdn.tripadvisor.com',
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
