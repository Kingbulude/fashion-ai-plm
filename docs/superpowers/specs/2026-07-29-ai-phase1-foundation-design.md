# Phase 1：AI 基座设计文档

## 1. 目标

让系统具备统一调用大模型（DeepSeek）并根据用户自然语言意图调度 AI Skill 的能力。Phase 1 不追求覆盖所有工序，只把“调度中枢 + Provider + 2 个 Demo Skill”跑通。

## 2. 范围

**包含：**
- DeepSeek Provider 接入（统一 Provider 接口）
- AI Orchestrator：意图识别 + Skill 路由 + 上下文组装 + 执行 + 结构化输出
- `/ai-workspace` 页面改版：左侧 Skill 列表 + 右侧对话/执行区
- 2 个可运行的 Demo Skill：
  - `theme-planner`（主题企划助手）
  - `inventory-activation`（库存盘活）
- `ai_skills` 表中的 `config_schema` 生效，用于存储每个 Skill 的系统提示
- 执行结果写入 `ai_executions` 事件表，为后续数据闭环打基础

**不包含：**
- 多轮复杂对话记忆
- 外部工具调用（如电商平台、飞书）
- 人工审批流
- 全工序所有 Skill 的完整实现

## 3. 架构

```
用户输入（自然语言）
    ↓
AI Orchestrator (/api/ai/orchestrate)
    ↓
意图识别 → 选择 Skill → 组装上下文 → 调用 DeepSeek Provider
    ↓
Skill Handler 解析输出 → 返回结构化结果
    ↓
前端渲染（文本/卡片/一键动作）
    ↓
写入 ai_executions 日志
```

## 4. 核心组件

### 4.1 Provider 层

新增 `src/lib/ai/providers/deepseek.ts`，实现统一接口：

```ts
interface GenerateOptions {
  model?: string;        // 默认 "deepseek-chat"
  temperature?: number;  // 默认 0.7
  responseFormat?: "text" | "json_object";
  tools?: Tool[];
}

async function generateChatCompletion(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: GenerateOptions
): Promise<{ content: string; usage?: TokenUsage }>
```

同时保留现有 `src/lib/ai/cloudflare-ai.ts`，通过环境变量 `AI_PROVIDER=deepseek|cloudflare` 切换。

### 4.2 Orchestrator 层

新增 `src/lib/ai/orchestrator.ts`：

```ts
async function runSkillOrchestrator(input: {
  userMessage: string;
  skillKey?: string;      // 如果用户直接点了某个 Skill，直接指定
  sessionContext: { companyId: string; brandIds: string[]; seasonId?: string; userId: string };
}): Promise<SkillResult>
```

内部流程：
1. 如果 `skillKey` 已指定，直接路由到该 Skill
2. 否则调用轻量级意图识别模型，从公司当前已启用的 Skill 中选择最匹配的一个
3. 读取该 Skill 的 `config_schema.systemPrompt`
4. 根据 Skill 的 `process_node` 从数据库抓取相关上下文（如企划表、销售表）
5. 组装 messages，调用 Provider
6. 解析返回，校验 JSON Schema（如 Skill 要求 JSON）
7. 返回 `{ skillKey, skillName, output, actions, rawMessages }`

### 4.3 Skill Handler 层

新增 `src/lib/skills/handlers/`：
- `theme-planner.ts`：读取当前季节企划数据，调用 LLM 生成主题方向
- `inventory-activation.ts`：读取当前季节款式销量/库存，识别滞销款并给出建议

每个 Handler 的标准接口：

```ts
export interface SkillHandler {
  key: string;
  buildContext: (ctx: SkillContext) => Promise<string>;
  parseOutput: (raw: string) => SkillOutput;
}
```

### 4.4 API 层

新增/修改：
- `app/api/ai/orchestrate/route.ts`：接收 `{ message, skillKey?, seasonId? }`，返回 SkillResult
- 保留 `app/api/ai/chat/route.ts`，但内部改为调用 Orchestrator（避免前端同时维护两套接口）

### 4.5 前端层

修改 `app/ai-workspace/page.tsx`：
- 左侧边栏：展示当前用户可用的 AI Skill 列表（从 `/api/ai-skills` 获取）
- 右侧主区域：
  - 顶部：当前选中的 Skill 名称和描述
  - 中部：对话/结果区
  - 底部：输入框
- 结果渲染支持：
  - Markdown 文本
  - 结构化卡片（滞销款列表 + 建议动作按钮）

## 5. 数据流

### 5.1 初始化默认 Skill

`/api/ai-skills` GET 已在上一版实现：公司下无 Skill 时自动从 `ai_skills` 表初始化。

### 5.2 执行一次 Skill

1. 用户进入 `/ai-workspace`
2. 前端请求 `/api/ai-skills` 拿到可用 Skill 列表
3. 用户点击「库存盘活」或输入自然语言
4. 前端 POST `/api/ai/orchestrate`
5. Orchestrator 识别 Skill → 读取 `config_schema` → 抓取数据 → 调用 DeepSeek
6. 返回结果，前端渲染
7. 后端将 `{ skill_key, input, output, user_id, created_at }` 写入 `ai_executions`

## 6. 数据表

沿用现有 `ai_skills` 表，新增/复用 `ai_executions` 表。

`ai_executions` 结构：

```sql
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
```

如果表已存在（由 `008_ai_architecture.sql` 创建），通过迁移补齐缺失字段。

## 7. 默认启用的 2 个 Demo Skill

### 7.1 theme-planner

- **输入：** 当前季节 ID、用户补充描述
- **上下文：** 该季节的 planning 记录、已有款式列表
- **输出：** `{ themes: [{ name, concept, categories, colors, fabrics, reasoning }] }`
- **前端动作：** 一键“写入企划备注”

### 7.2 inventory-activation

- **输入：** 当前季节 ID、滞销天数阈值（默认 60 天）
- **上下文：** 该季节款式的销售记录、库存记录
- **输出：** `{ underperformers: [{ styleId, name, inventoryDays, sellThrough, suggestion, expectedEffect }] }`
- **前端动作：** 一键“创建促销待办”

## 8. 环境变量

新增/使用：

```bash
# AI Provider 切换：deepseek | cloudflare
AI_PROVIDER=deepseek

# DeepSeek
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-chat

# Cloudflare（已有）
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
```

## 9. 权限

- `/api/ai/orchestrate`：所有已登录用户可调用
- Orchestrator 内部根据用户 `company_id` 过滤 Skill 和数据
- `ai_executions` 写入时记录 `user_id` 和 `company_id`

## 10. 错误处理

| 场景 | 处理 |
|---|---|
| DeepSeek API 超时/失败 | 返回 500 + `detail: "AI 服务暂时不可用"` |
| 意图识别无法匹配 Skill | 返回默认的「通用问答」回复，提示用户选择 Skill |
| Skill 输出不是合法 JSON | 记录 raw_response，返回错误提示 |
| 公司下无启用 Skill | 自动初始化默认 Skill 后重试 |

## 11. 验收标准

- [ ] 在 `/ai-workspace` 能看到左侧 Skill 列表（至少 theme-planner 和 inventory-activation）
- [ ] 点击 Skill 后，能输入参数并拿到结构化结果
- [ ] 输入自然语言（如“帮我看看 27SS 哪些款滞销”），系统能自动调用 inventory-activation
- [ ] 结果中包含可执行的一键动作按钮（即使当前只 mock 动作）
- [ ] `ai_executions` 表中能查到每次执行记录
- [ ] `npx tsc --noEmit` 和 `npm run build` 通过

## 12. 后续（Phase 2）依赖

Phase 2 将基于 Phase 1 的 Orchestrator，把“销售/库存 → 企划反馈”闭环做深，包括：
- 把 `inventory-activation` 的结果回写到 planning 备注
- 根据售后退货数据驱动下一季企划
