/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  transpilePackages: ["@keystatic/core", "@keystatic/next"],
};
module.exports = nextConfig;
