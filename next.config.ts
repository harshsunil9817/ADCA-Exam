import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingIncludes: {
    '/*': ['./src/data/**/*'],
    '/test/**/*': ['./src/data/**/*'],
    '/admin/**/*': ['./src/data/**/*'],
    '/api/**/*': ['./src/data/**/*'],
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fra.cloud.appwrite.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'shiv-shakti-image-server.onrender.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
