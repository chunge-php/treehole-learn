/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // 题库封面/选项图片可能来自任意第三方域名, 放开远程加载
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" }
    ]
  },
  experimental: { serverActions: { bodySizeLimit: "55mb" } }
};
export default nextConfig;
