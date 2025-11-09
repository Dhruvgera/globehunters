import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  eslint: {
    // Skip ESLint errors during production builds to unblock compilation
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.kiwi.com',
        pathname: '/airlines/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
