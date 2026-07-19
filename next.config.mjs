/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用 instrumentation.ts 钩子
  // 用于在应用启动时注册 Skill 和 Pipeline
  experimental: {
    instrumentationHook: true,
  },
  turbopack: {
    root: "./",
  },
};

export default nextConfig;
