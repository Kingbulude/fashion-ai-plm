// Next.js Instrumentation 钩子
// 应用启动时执行一次，用于初始化 Skill 系统和 Pipeline 注册表
// 详见 https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // 仅在 Node.js 运行时注册（避免 Edge Runtime 重复初始化）
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // 注册所有 Skill（通信、文档生成等）
    await import("@/lib/skills");

    // 注册所有 Pipeline（测款-决策-下单、采购自动化、每日巡检）
    await import("@/lib/pipeline/registry");

    console.log("[instrumentation] Skills + Pipelines 初始化完成");
  }
}
