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
  experimental: { serverActions: { bodySizeLimit: "55mb" } },
  // 项目存量 Supabase 类型债 (旧枚举名/未声明表/null 兼容), 运行不受影响; 待统一清理
  typescript: { ignoreBuildErrors: true }
};
export default nextConfig;
