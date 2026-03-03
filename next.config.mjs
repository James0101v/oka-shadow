/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["http://127.0.0.1:*", "http://localhost:*"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
