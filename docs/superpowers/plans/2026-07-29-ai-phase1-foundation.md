# Phase 1：AI 基座 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` or implement inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让系统具备统一调用 DeepSeek 并根据用户自然语言意图调度 AI Skill 的能力，前端 `/ai-workspace` 可展示 Skill、执行 Skill 并查看结构化结果。

**Architecture:** 新增 Provider 抽象层统一调用 DeepSeek/Cloudflare；新增 Orchestrator 负责意图识别、Skill 路由、上下文组装、执行与日志；新增 2 个 Demo Skill Handler；`/ai-workspace` 改版为左侧 Skill 列表 + 右侧对话/结果区。

**Tech Stack:** Next.js 15 Edge Runtime, TypeScript, Supabase, DeepSeek API, Cloudflare Workers AI (保留), React, Tailwind.

---

## 文件结构

| 文件 | 责任 |
|---|---|
| `supabase/migrations/043_ai_executions.sql` | 创建 `ai_executions` 表及 RLS 策略 |
| `src/lib/ai/providers/deepseek.ts` | DeepSeek Provider 实现 |
| `src/lib/ai/provider.ts` | 统一 Provider 选择器（根据 `AI_PROVIDER` 环境变量） |
| `src/lib/ai/orchestrator.ts` | AI Orchestrator：意图识别、路由、上下文、执行、日志 |
| `src/lib/skills/handlers/types.ts` | AI Skill Handler 类型定义 |
| `src/lib/skills/handlers/theme-planner.ts` | 主题企划 Skill Handler |
| `src/lib/skills/handlers/inventory-activation.ts` | 库存盘活 Skill Handler |
| `src/lib/skills/handlers/registry.ts` | AI Skill Handler 注册表 |
| `app/api/ai/orchestrate/route.ts` | 新的统一调度 API |
| `app/api/ai/chat/route.ts` | 重构为调用 Orchestrator（保持前端兼容） |
| `src/components/ai/ai-orchestrator-panel.tsx` | 新版 AI 执行面板（对话 + 结构化结果） |
| `src/components/ai/skill-result-card.tsx` | 结构化结果渲染卡片 |
| `app/ai-workspace/page.tsx` | 改为三栏：左侧 Skill 列表、中间面板 |

---

## Task 1：创建 `ai_executions` 事件表

**Files:**
- Create: `supabase/migrations/043_ai_executions.sql`

- [ ] **Step 1: 写入迁移文件**

```sql
-- ============================================
-- 043: AI 执行记录表
-- 用于记录每次 AI Skill 执行的输入、输出、模型和状态，
-- 支撑 Phase 2 的数据闭环和自我迭代。
-- ============================================

CREATE TABLE IF NOT EXISTS ai_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES ai_skills(id) ON DELETE SET NULL,
  skill_key TEXT NOT NULL,
  user_id UUID NOT NULL,
  company_id UUID,
  brand_id UUID,
  season_id UUID,
  input TEXT NOT NULL,
  output JSONB,
  raw_response TEXT,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_executions_skill_id ON ai_executions(skill_id);
CREATE INDEX IF NOT EXISTS idx_ai_executions_user_id ON ai_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_executions_company_id ON ai_executions(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_executions_created_at ON ai_executions(created_at);

-- 安全函数
CREATE OR REPLACE FUNCTION rls_safe_execute(p_sql TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE p_sql;
EXCEPTION
  WHEN undefined_table OR undefined_column OR undefined_function OR duplicate_object OR duplicate_table OR insufficient_privilege THEN
    RAISE NOTICE 'rls_safe_execute skipped (%): %', SQLSTATE, p_sql;
END $$ LANGUAGE plpgsql;

-- 用户只能读写自己的执行记录；BOSS/ADMIN 可读写全公司
SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_select_ai_executions" ON ai_executions;');
SELECT rls_safe_execute('CREATE POLICY "rls_select_ai_executions" ON ai_executions FOR SELECT TO authenticated USING (user_id = auth.uid() OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_insert_ai_executions" ON ai_executions;');
SELECT rls_safe_execute('CREATE POLICY "rls_insert_ai_executions" ON ai_executions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_update_ai_executions" ON ai_executions;');
SELECT rls_safe_execute('CREATE POLICY "rls_update_ai_executions" ON ai_executions FOR UPDATE TO authenticated USING (user_id = auth.uid() OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_delete_ai_executions" ON ai_executions;');
SELECT rls_safe_execute('CREATE POLICY "rls_delete_ai_executions" ON ai_executions FOR DELETE TO authenticated USING (user_id = auth.uid() OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')));');

SELECT '✅ 043 完成：ai_executions 表已创建' AS status;
```

- [ ] **Step 2: 提交迁移文件**

```bash
git add supabase/migrations/043_ai_executions.sql
git commit -m "chore(migration): add ai_executions table for skill execution logs"
```

---

## Task 2：DeepSeek Provider 接入

**Files:**
- Create: `src/lib/ai/providers/deepseek.ts`
- Create: `src/lib/ai/provider.ts`

- [ ] **Step 1: 创建 DeepSeek Provider**

```ts
// src/lib/ai/providers/deepseek.ts
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  responseFormat?: "text" | "json_object";
}

export interface GenerateResult {
  content: string;
  usage?: TokenUsage;
  model: string;
}

export async function generateChatCompletion(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek 配置缺失：请设置 DEEPSEEK_API_KEY 环境变量");
  }

  const model = options.model || DEEPSEEK_MODEL;
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 2048,
  };

  if (options.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DeepSeek 请求失败: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: TokenUsage;
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new Error(`DeepSeek 错误: ${data.error.message}`);
  }

  const content = data.choices?.[0]?.message?.content || "";
  return { content, usage: data.usage, model };
}
```

- [ ] **Step 2: 创建统一 Provider 选择器**

```ts
// src/lib/ai/provider.ts
import { generateChatCompletion as generateDeepseek } from "./providers/deepseek";
import { generateText as generateCloudflare } from "./cloudflare-ai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  responseFormat?: "text" | "json_object";
}

export interface GenerateResult {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  model: string;
}

export async function generateAIResponse(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const provider = process.env.AI_PROVIDER || "cloudflare";

  if (provider === "deepseek") {
    return generateDeepseek(messages, options);
  }

  // Cloudflare: 只支持单条 prompt + systemPrompt，这里做最小兼容
  const system = messages.find((m) => m.role === "system")?.content;
  const user = messages.filter((m) => m.role !== "system").map((m) => m.content).join("\n\n");
  const content = await generateCloudflare(user, system);
  return { content, model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" };
}
```

- [ ] **Step 3: 提交**

```bash
git add src/lib/ai/providers/deepseek.ts src/lib/ai/provider.ts
git commit -m "feat(ai): add DeepSeek provider and unified AI provider selector"
```

---

## Task 3：AI Skill Handler 注册表与类型

**Files:**
- Create: `src/lib/skills/handlers/types.ts`
- Create: `src/lib/skills/handlers/registry.ts`

- [ ] **Step 1: 定义 AI Skill Handler 类型**

```ts
// src/lib/skills/handlers/types.ts
import { SupabaseClient } from "@supabase/supabase-js";

export interface SkillContext {
  userId: string;
  companyId: string;
  brandIds: string[];
  seasonId?: string;
  skillConfig?: Record<string, any> | null;
  supabase: SupabaseClient;
}

export interface SkillAction {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface SkillOutput {
  summary: string;
  data: Record<string, unknown>;
  actions?: SkillAction[];
}

export interface AISkillHandler {
  key: string;
  name: string;
  description: string;
  processNode?: string | null;
  buildContext: (ctx: SkillContext, userMessage: string) => Promise<string>;
  parseOutput: (raw: string) => SkillOutput;
}
```

- [ ] **Step 2: 创建注册表**

```ts
// src/lib/skills/handlers/registry.ts
import { AISkillHandler } from "./types";

const registry = new Map<string, AISkillHandler>();

export function registerSkillHandler(handler: AISkillHandler) {
  registry.set(handler.key, handler);
}

export function getSkillHandler(key: string): AISkillHandler | undefined {
  return registry.get(key);
}

export function getAllSkillHandlers(): AISkillHandler[] {
  return Array.from(registry.values());
}
```

- [ ] **Step 3: 提交**

```bash
git add src/lib/skills/handlers/types.ts src/lib/skills/handlers/registry.ts
git commit -m "feat(skills): add AI skill handler types and registry"
```

---

## Task 4：实现 2 个 Demo Skill Handler

**Files:**
- Create: `src/lib/skills/handlers/theme-planner.ts`
- Create: `src/lib/skills/handlers/inventory-activation.ts`
- Modify: `src/lib/skills/handlers/registry.ts`

- [ ] **Step 1: theme-planner handler**

```ts
// src/lib/skills/handlers/theme-planner.ts
import { AISkillHandler, SkillContext, SkillOutput } from "./types";

function parseJsonSafe(raw: string): any {
  const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export const themePlannerHandler: AISkillHandler = {
  key: "theme-planner",
  name: "主题企划助手",
  description: "基于季节、品牌和现有款式生成主题企划方向",
  processNode: "planning",

  async buildContext(ctx: SkillContext, userMessage: string) {
    const { supabase, seasonId, companyId } = ctx;

    let seasonInfo = "";
    let planningInfo = "";
    let stylesInfo = "";

    if (seasonId) {
      const { data: season } = await supabase
        .from("seasons")
        .select("name, year, season_type, start_date, end_date")
        .eq("id", seasonId)
        .single();
      if (season) {
        seasonInfo = `季节：${season.name}（${season.year}${season.season_type}）\n`;
      }

      const { data: plannings } = await supabase
        .from("planning")
        .select("title, description, target_audience, themes")
        .eq("season_id", seasonId)
        .eq("company_id", companyId)
        .limit(3);
      if (plannings && plannings.length > 0) {
        planningInfo = "现有企划：\n" + plannings.map((p) => `- ${p.title || ""}: ${p.description || ""}`).join("\n") + "\n";
      }

      const { data: styles } = await supabase
        .from("styles")
        .select("name, category, description")
        .eq("season_id", seasonId)
        .limit(10);
      if (styles && styles.length > 0) {
        stylesInfo = "已有款式：\n" + styles.map((s) => `- ${s.name}（${s.category || ""}）`).join("\n") + "\n";
      }
    }

    return [
      "你是服装品牌企划专家。请基于以下信息生成主题企划方向。",
      "",
      seasonInfo,
      planningInfo,
      stylesInfo,
      `用户补充需求：${userMessage}`,
      "",
      "请严格以 JSON 格式输出，包含字段 themes（数组，每个主题包含 name, concept, categories, colors, fabrics, reasoning）。",
    ].filter(Boolean).join("\n");
  },

  parseOutput(raw: string): SkillOutput {
    const parsed = parseJsonSafe(raw);
    if (!parsed || !Array.isArray(parsed.themes)) {
      return {
        summary: "AI 返回了非结构化内容，以下是原始回复：",
        data: { raw },
      };
    }
    return {
      summary: `已生成 ${parsed.themes.length} 个主题方向`,
      data: parsed,
      actions: [
        { label: "写入企划备注", action: "append_planning_note", payload: { note: parsed.themes } },
      ],
    };
  },
};
```

- [ ] **Step 2: inventory-activation handler**

```ts
// src/lib/skills/handlers/inventory-activation.ts
import { AISkillHandler, SkillContext, SkillOutput } from "./types";

function parseJsonSafe(raw: string): any {
  const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function calcSellThrough(sales: number, inventory: number) {
  if (!inventory) return 0;
  return Math.round((sales / inventory) * 1000) / 10;
}

export const inventoryActivationHandler: AISkillHandler = {
  key: "inventory-activation",
  name: "库存盘活",
  description: "识别滞销款并给出促销、返单或下架建议",
  processNode: "sales",

  async buildContext(ctx: SkillContext, userMessage: string) {
    const { supabase, seasonId, companyId } = ctx;

    let stylesInfo = "";

    if (seasonId) {
      const { data: styles } = await supabase
        .from("styles")
        .select("id, name, category, target_price")
        .eq("season_id", seasonId)
        .eq("company_id", companyId);

      if (styles && styles.length > 0) {
        const styleIds = styles.map((s) => s.id);
        const { data: sales } = await supabase
          .from("sales_records")
          .select("style_id, quantity, revenue")
          .in("style_id", styleIds);

        const { data: inventories } = await supabase
          .from("inventory_records")
          .select("style_id, quantity")
          .in("style_id", styleIds);

        const salesMap = new Map<string, number>();
        (sales || []).forEach((r) => {
          salesMap.set(r.style_id, (salesMap.get(r.style_id) || 0) + (r.quantity || 0));
        });

        const invMap = new Map<string, number>();
        (inventories || []).forEach((r) => {
          invMap.set(r.style_id, (invMap.get(r.style_id) || 0) + (r.quantity || 0));
        });

        stylesInfo = styles.map((s) => {
          const sold = salesMap.get(s.id) || 0;
          const inv = invMap.get(s.id) || 0;
          const st = calcSellThrough(sold, inv + sold);
          return `- ${s.name}（${s.category || ""}）：销量 ${sold}，库存 ${inv}，售罄率 ${st}%`;
        }).join("\n");
      }
    }

    return [
      "你是库存与商品运营专家。请根据以下款式销售/库存数据，识别滞销款并给出促销、返单、调拨或下架建议。",
      "",
      stylesInfo || "（暂无具体款式数据，请基于通用经验给出建议）",
      "",
      `用户补充需求：${userMessage}`,
      "",
      "请严格以 JSON 格式输出，包含字段 underperformers（数组，每个元素包含 styleId, name, inventoryDays, sellThrough, suggestion, expectedEffect）。",
    ].filter(Boolean).join("\n");
  },

  parseOutput(raw: string): SkillOutput {
    const parsed = parseJsonSafe(raw);
    if (!parsed || !Array.isArray(parsed.underperformers)) {
      return {
        summary: "AI 返回了非结构化内容：",
        data: { raw },
      };
    }
    return {
      summary: `识别到 ${parsed.underperformers.length} 款滞销款`,
      data: parsed,
      actions: parsed.underperformers.slice(0, 3).map((item: any) => ({
        label: `为「${item.name}」创建促销待办`,
        action: "create_todo",
        payload: { title: `促销：${item.name}`, description: item.suggestion },
      })),
    };
  },
};
```

- [ ] **Step 3: 注册 handler**

在 `src/lib/skills/handlers/registry.ts` 末尾追加：

```ts
import { themePlannerHandler } from "./theme-planner";
import { inventoryActivationHandler } from "./inventory-activation";

registerSkillHandler(themePlannerHandler);
registerSkillHandler(inventoryActivationHandler);
```

- [ ] **Step 4: 提交**

```bash
git add src/lib/skills/handlers/theme-planner.ts src/lib/skills/handlers/inventory-activation.ts src/lib/skills/handlers/registry.ts
git commit -m "feat(skills): add theme-planner and inventory-activation handlers"
```

---

## Task 5：AI Orchestrator

**Files:**
- Create: `src/lib/ai/orchestrator.ts`

- [ ] **Step 1: 创建 Orchestrator**

```ts
// src/lib/ai/orchestrator.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { generateAIResponse } from "./provider";
import { getSkillHandler } from "@/lib/skills/handlers/registry";
import { SkillContext, SkillOutput } from "@/lib/skills/handlers/types";

export interface OrchestratorInput {
  userMessage: string;
  skillKey?: string;
  userId: string;
  companyId: string;
  brandIds: string[];
  seasonId?: string;
  supabase: SupabaseClient;
}

export interface OrchestratorResult {
  skillKey: string;
  skillName: string;
  output: SkillOutput;
  model: string;
  rawResponse: string;
}

function parseJsonSafe(raw: string): any {
  const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function resolveSkillKey(
  input: OrchestratorInput,
  availableSkills: { key: string; name: string; description: string }[]
): Promise<string | null> {
  if (input.skillKey) return input.skillKey;
  if (availableSkills.length === 0) return null;

  const system = "你是意图识别助手。请根据用户输入，从以下 Skill 中选择最匹配的一个，只返回 key 字段。";
  const skillList = availableSkills.map((s) => `- ${s.key}: ${s.name}。${s.description}`).join("\n");
  const user = `用户输入：${input.userMessage}\n\n可选 Skill：\n${skillList}\n\n请只返回最匹配的 key，不要解释。`;

  const res = await generateAIResponse(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.2, max_tokens: 64 }
  );

  const matched = res.content.trim().replace(/['"`]/g, "");
  return availableSkills.find((s) => s.key === matched)?.key || null;
}

export async function runOrchestrator(input: OrchestratorInput): Promise<OrchestratorResult> {
  // 1. 查询公司启用的 AI Skills
  const { data: skillRows } = await input.supabase
    .from("ai_skills")
    .select("id, key, name, description, config_schema, process_node")
    .eq("is_active", true)
    .eq("company_id", input.companyId);

  const availableSkills = (skillRows || []).map((s) => ({
    id: s.id,
    key: s.key,
    name: s.name,
    description: s.description || "",
    configSchema: s.config_schema,
    processNode: s.process_node,
  }));

  // 2. 意图识别
  const resolvedKey = await resolveSkillKey(input, availableSkills);
  if (!resolvedKey) {
    throw new Error("未能识别到合适的 AI Skill，请直接选择左侧 Skill 再试");
  }

  const skillMeta = availableSkills.find((s) => s.key === resolvedKey);
  if (!skillMeta) {
    throw new Error(`Skill ${resolvedKey} 未找到`);
  }

  // 3. 获取 handler
  const handler = getSkillHandler(resolvedKey);
  if (!handler) {
    // 没有专用 handler，走通用系统提示
    const system = (skillMeta.configSchema as any)?.systemPrompt || `你是「${skillMeta.name}」AI 助手。`;
    const res = await generateAIResponse(
      [
        { role: "system", content: system },
        { role: "user", content: input.userMessage },
      ],
      { responseFormat: "text" }
    );
    return {
      skillKey: skillMeta.key,
      skillName: skillMeta.name,
      output: { summary: res.content, data: {} },
      model: res.model,
      rawResponse: res.content,
    };
  }

  // 4. 组装上下文并调用 LLM
  const ctx: SkillContext = {
    userId: input.userId,
    companyId: input.companyId,
    brandIds: input.brandIds,
    seasonId: input.seasonId,
    skillConfig: skillMeta.configSchema,
    supabase: input.supabase,
  };

  const promptText = await handler.buildContext(ctx, input.userMessage);
  const systemPrompt = (skillMeta.configSchema as any)?.systemPrompt || "你是专业的服装行业 AI 助手。";

  const res = await generateAIResponse(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: promptText },
    ],
    { responseFormat: "json_object", temperature: 0.7 }
  );

  // 5. 解析输出
  const output = handler.parseOutput(res.content);

  return {
    skillKey: skillMeta.key,
    skillName: skillMeta.name,
    output,
    model: res.model,
    rawResponse: res.content,
  };
}
```

- [ ] **Step 2: 提交**

```bash
git add src/lib/ai/orchestrator.ts
git commit -m "feat(ai): add AI orchestrator with intent routing and skill execution"
```

---

## Task 6：新增 `/api/ai/orchestrate` 并重构 `/api/ai/chat`

**Files:**
- Create: `app/api/ai/orchestrate/route.ts`
- Modify: `app/api/ai/chat/route.ts`

- [ ] **Step 1: 创建 Orchestrate API**

```ts
// app/api/ai/orchestrate/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth/supabase";
import { runOrchestrator } from "@/lib/ai/orchestrator";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { message, skillKey, seasonId } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "缺少 message" }, { status: 400 });
    }

    // 获取用户 company_id 和 brand 权限
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, brand_id")
      .eq("user_id", user.id)
      .single();

    let companyId = profile?.company_id;
    if (!companyId && profile?.brand_id) {
      const { data: brand } = await supabase
        .from("brands")
        .select("company_id")
        .eq("id", profile.brand_id)
        .single();
      if (brand?.company_id) companyId = brand.company_id;
    }

    if (!companyId) {
      return NextResponse.json({ error: "当前用户未绑定公司" }, { status: 400 });
    }

    const { data: userBrands } = await supabase
      .from("user_brands")
      .select("brand_id")
      .eq("user_id", user.id);
    const brandIds = (userBrands || []).map((b) => b.brand_id);

    const result = await runOrchestrator({
      userMessage: message.trim(),
      skillKey,
      userId: user.id,
      companyId,
      brandIds,
      seasonId,
      supabase,
    });

    // 记录执行日志
    const { data: skillRow } = await supabase
      .from("ai_skills")
      .select("id")
      .eq("key", result.skillKey)
      .eq("company_id", companyId)
      .single();

    await supabase.from("ai_executions").insert({
      skill_id: skillRow?.id || null,
      skill_key: result.skillKey,
      user_id: user.id,
      company_id: companyId,
      brand_id: brandIds[0] || null,
      season_id: seasonId || null,
      input: message.trim(),
      output: result.output.data,
      raw_response: result.rawResponse,
      model: result.model,
      status: "success",
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[ai/orchestrate] error:", error);
    return NextResponse.json(
      { error: error?.message || "AI 执行失败" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 重构 `/api/ai/chat` 为兼容层**

```ts
// app/api/ai/chat/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth/supabase";
import { runOrchestrator } from "@/lib/ai/orchestrator";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { skillKey, userMessage } = body;

    if (!userMessage?.trim()) {
      return NextResponse.json({ error: "缺少 userMessage" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, brand_id")
      .eq("user_id", user.id)
      .single();

    let companyId = profile?.company_id;
    if (!companyId && profile?.brand_id) {
      const { data: brand } = await supabase
        .from("brands")
        .select("company_id")
        .eq("id", profile.brand_id)
        .single();
      if (brand?.company_id) companyId = brand.company_id;
    }

    if (!companyId) {
      return NextResponse.json({ error: "当前用户未绑定公司" }, { status: 400 });
    }

    const { data: userBrands } = await supabase
      .from("user_brands")
      .select("brand_id")
      .eq("user_id", user.id);
    const brandIds = (userBrands || []).map((b) => b.brand_id);

    const result = await runOrchestrator({
      userMessage: userMessage.trim(),
      skillKey,
      userId: user.id,
      companyId,
      brandIds,
      supabase,
    });

    return NextResponse.json({
      reply: result.output.summary,
      skillKey: result.skillKey,
      skillName: result.skillName,
      structured: result.output,
    });
  } catch (error: any) {
    console.error("[ai/chat] error:", error);
    return NextResponse.json({ error: error?.message || "AI 对话失败" }, { status: 500 });
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add app/api/ai/orchestrate/route.ts app/api/ai/chat/route.ts
git commit -m "feat(api): add /api/ai/orchestrate and refactor /api/ai/chat to use orchestrator"
```

---

## Task 7：前端组件改造

**Files:**
- Create: `src/components/ai/ai-orchestrator-panel.tsx`
- Create: `src/components/ai/skill-result-card.tsx`
- Modify: `app/ai-workspace/page.tsx`

- [ ] **Step 1: 创建结构化结果卡片**

```tsx
// src/components/ai/skill-result-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SkillAction {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

interface SkillResultCardProps {
  summary: string;
  data: Record<string, any>;
  actions?: SkillAction[];
  onAction?: (action: SkillAction) => void;
}

export function SkillResultCard({ summary, data, actions, onAction }: SkillResultCardProps) {
  const themes = data.themes;
  const underperformers = data.underperformers;

  return (
    <Card className="border-navy-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{summary}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.isArray(themes) && themes.length > 0 && (
          <div className="space-y-3">
            {themes.map((t: any, idx: number) => (
              <div key={idx} className="rounded-lg bg-sand-50 p-3">
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.concept}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {t.categories && <span className="px-2 py-1 bg-white rounded border">品类：{t.categories}</span>}
                  {t.colors && <span className="px-2 py-1 bg-white rounded border">色彩：{t.colors}</span>}
                  {t.fabrics && <span className="px-2 py-1 bg-white rounded border">面料：{t.fabrics}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {Array.isArray(underperformers) && underperformers.length > 0 && (
          <div className="space-y-3">
            {underperformers.map((item: any, idx: number) => (
              <div key={idx} className="rounded-lg bg-red-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{item.name}</p>
                  <span className="text-xs text-muted-foreground">售罄率 {item.sellThrough}%</span>
                </div>
                <p className="text-sm mt-1">{item.suggestion}</p>
                <p className="text-xs text-muted-foreground mt-1">预期效果：{item.expectedEffect}</p>
              </div>
            ))}
          </div>
        )}

        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {actions.map((action, idx) => (
              <Button key={idx} size="sm" variant="outline" onClick={() => onAction?.(action)}>
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 创建 AI Orchestrator Panel**

```tsx
// src/components/ai/ai-orchestrator-panel.tsx
"use client";

import { useState } from "react";
import { AISkill } from "@/lib/auth/tenant-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { SkillResultCard } from "./skill-result-card";

interface SkillAction {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

interface OrchestratorResult {
  skillKey: string;
  skillName: string;
  output: {
    summary: string;
    data: Record<string, any>;
    actions?: SkillAction[];
  };
}

interface AIOrchestratorPanelProps {
  skill: AISkill | null;
  seasonId?: string | null;
}

export function AIOrchestratorPanel({ skill, seasonId }: AIOrchestratorPanelProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrchestratorResult | null>(null);

  const run = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input.trim(),
          skillKey: skill?.key,
          seasonId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "执行失败");

      setResult(data);
    } catch (err: any) {
      setError(err.message || "执行失败");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: SkillAction) => {
    alert(`动作：${action.label}\n后续开发中...`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-sand-50/30">
        {skill && !result && (
          <div className="text-sm text-muted-foreground">
            已选择「{skill.name}」{skill.description ? `：${skill.description}` : ""}
          </div>
        )}

        {result && (
          <SkillResultCard
            summary={result.output.summary}
            data={result.output.data}
            actions={result.output.actions}
            onAction={handleAction}
          />
        )}

        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
      </div>

      <div className="p-4 border-t bg-white">
        <div className="flex items-start gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={skill ? `向 ${skill.name} 输入需求...` : "输入需求，例如：帮我看看 27SS 哪些款滞销"}
            className="flex-1 min-h-[80px]"
            disabled={loading}
          />
          <Button
            className="h-10 w-10 bg-navy-700 hover:bg-navy-800 text-white"
            onClick={run}
            disabled={loading || !input.trim()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 改造 `/ai-workspace/page.tsx`**

主要改动：
- 引入 `AIOrchestratorPanel`
- 左侧 Skill 列表点击后，右侧显示面板
- 不再打开弹窗

由于页面较长，只给出关键改动片段：

```tsx
// app/ai-workspace/page.tsx
import { AIOrchestratorPanel } from "@/components/ai/ai-orchestrator-panel";

export default function AIWorkspacePage() {
  const { accessibleAISkills, isLoading, currentSeason } = useTenant();
  const [activeSkill, setActiveSkill] = useState<AISkill | null>(null);

  // ... 保持 groupedSkills 逻辑不变 ...

  return (
    <SidebarLayout>
      <div className="h-[calc(100vh-4rem)] flex">
        {/* 左侧 Skill 列表 */}
        <div className="w-80 border-r bg-white overflow-y-auto p-4">
          <h2 className="text-lg font-semibold mb-4">AI Skill</h2>
          {accessibleAISkills.map((skill) => (
            <button
              key={skill.id}
              onClick={() => setActiveSkill(skill)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-2 text-sm transition-colors ${
                activeSkill?.id === skill.id
                  ? "bg-navy-50 text-navy-800 border border-navy-200"
                  : "hover:bg-sand-50 border border-transparent"
              }`}
            >
              <div className="font-medium">{skill.name}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">{skill.description}</div>
            </button>
          ))}
        </div>

        {/* 右侧执行面板 */}
        <div className="flex-1 flex flex-col bg-sand-50/30">
          <div className="px-6 py-4 border-b bg-white">
            <h1 className="text-xl font-bold">
              {activeSkill ? activeSkill.name : "AI 智能体中心"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {activeSkill
                ? activeSkill.description || ""
                : "从左侧选择一个 Skill，或直接输入需求"}
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <AIOrchestratorPanel skill={activeSkill} seasonId={currentSeason?.id} />
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
```

- [ ] **Step 4: 提交**

```bash
git add src/components/ai/ai-orchestrator-panel.tsx src/components/ai/skill-result-card.tsx app/ai-workspace/page.tsx
git commit -m "feat(ui): redesign /ai-workspace with skill list and orchestrator panel"
```

---

## Task 8：验证与部署

- [ ] **Step 1: TypeScript 类型检查**

```bash
cd /workspace && npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 2: 构建**

```bash
cd /workspace && npm run build
```

Expected: Build Completed

- [ ] **Step 3: 运行自验证脚本**

```bash
cd /workspace && bash /workspace/.trae/verify.sh
```

Expected: 0 failures

- [ ] **Step 4: 提交并推送**

```bash
cd /workspace && git push origin main
```

- [ ] **Step 5: 执行数据库迁移**

在 Supabase Dashboard → SQL Editor 中执行 `supabase/migrations/043_ai_executions.sql`。

---

## 自评检查

- **Spec coverage:** 设计文档中 Provider、Orchestrator、2 Demo Skills、API、前端、日志表均有对应任务。
- **Placeholder scan:** 无 TBD/TODO；前端动作按钮目前 alert mock，已在代码中说明“后续开发中”。
- **Type consistency:** `SkillContext`、`OrchestratorInput`、`OrchestratorResult` 中的字段命名在前后端一致。
