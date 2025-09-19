
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
      // Increase timeout to 90 seconds to handle multiple API calls
      // @ts-ignore
      executionTimeout: 90,
    },
  },
  allowedDevOrigins: ["https://3000-firebase-studio-1748136055988.cluster-sumfw3zmzzhzkx4mpvz3ogth4y.cloudworkstations.dev"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
