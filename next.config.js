/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during Next.js build to avoid compatibility issues
    // ESLint will still run via npm lint command
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['ffmpeg-static', 'ffprobe-static'],
  },
};

module.exports = nextConfig;
