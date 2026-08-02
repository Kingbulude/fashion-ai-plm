# Fashion AI PLM 重构计划文档

> 创建时间：2026-08-02
> 仓库：https://github.com/Kingbulude/fashion-ai-plm.git
> 基线分支：`main`（已对齐远程最新版本，commit `4e03400`）

---

## 一、开发原则

### 1. 自动推送 GitHub（强制）
- **所有代码更新完成后，必须自动推送到 `origin/main` 分支**，无需用户额外提醒。
- 推送使用已配置的 git credential-store（凭证存储于 `~/.git-credentials`，不在仓库内）。
- 推送前必须通过 `tsc --noEmit` 类型校验，避免推送编译失败的代码。
- 提交信息遵循 Conventional Commits 规范（`feat:` / `fix:` / `refactor:` / `docs:` 等）。
- 单次任务完成 = 一次提交 + 一次推送。不要积攒多个未推送的提交。

### 2. 安全原则
- **严禁在代码、文档、提交信息中写入任何密钥、Token、Service Role Key。**
- 敏感凭证只通过环境变量（`.env.local`）和 git credential-store 传递，`.env*` 已在 `.gitignore` 中。
- 业务 API 请求必须使用 `createServerSupabaseClient(request)`（受 RLS 约束），严禁在普通请求中使用 `dbAdmin`（service_role）。
- `dbAdmin` 仅允许用于：migration / seed / 无用户上下文的后台任务。

### 3. 工程原则
- 优先编辑现有文件，避免文件膨胀。
- 每个任务完成后立即标记 todo 完成，再做下一个。
- 数据库变更通过新增 migration 文件（`supabase/migrations/NNN_xxx.sql`），不修改已执行的 migration。
- 表名以 migration（数据库真相）为准，Drizzle schema 必须与 migration 对齐。

---

## 二、已完成项（远程 main 已实现，无需重复）

| 编号 | 任务 | 实现位置 | 状态 |
|------|------|----------|------|
| P0-2 | RLS 策略重写（撤销 anon、按 brand_id/company_id 隔离） | `supabase/migrations/030_rls_security_lockdown.sql` | ✅ 已完成 |
| P1-1 | 核心业务表加 brand_id/company_id/season_id | `supabase/migrations/011_core_tables_tenant_fields.sql` | ✅ 已完成 |
| P1-7 | 统一 Supabase Client（SSR + createServerSupabaseClient） | `src/lib/db/client.ts` | ✅ 已完成 |
| P0-1 | API 鉴权全覆盖（middleware + require-user） | `middleware.ts` / `src/lib/auth/supabase.ts` | ✅ 已完成 |

---

## 三、待办任务（按优先级排序）

### P0-3 强制 RLS：迁移 API 路由从 dbAdmin → createServerSupabaseClient
**优先级：P0（安全）** | **依赖：P1-7 已完成**

当前仍有 10 个 API 路由文件使用 `dbAdmin`（service_role，绕过 RLS），必须迁移到 `createServerSupabaseClient(request)` 以强制行级安全。

待迁移文件清单：
1. `app/api/colors/route.ts`
2. `app/api/qc-records/route.ts`
3. `app/api/ai/images/route.ts`
4. `app/api/ai/test-results/route.ts`
5. `app/api/ai/analyze-test/[styleId]/route.ts`
6. `app/api/ai/order-suggestion/[styleId]/route.ts`
7. `app/api/ai/marketing-images/route.ts`
8. `app/api/ai/reorder-simulation/[styleId]/route.ts`
9. `app/api/ai/image-redesign/route.ts`
10. `app/api/planning/ai/brand-dna/route.ts`

迁移模式：
```typescript
// Before
import { dbAdmin } from "@/lib/db/client";
export async function GET() {
  const { data } = await dbAdmin.from("colors").select("*");
  return NextResponse.json(data);
}

// After
import { createServerSupabaseClient } from "@/lib/db/client";
export async function GET(request: Request) {
  const supabase = createServerSupabaseClient(request);
  const { data } = await supabase.from("colors").select("*");
  return NextResponse.json(data);
}
```

### P0-4 统一 Schema 表名真相来源
**优先级：P0（数据一致性）**

问题：Drizzle schema 用 `sales_data`，migration 用 `sales_records`，部分 API 查询用 `sales`。表名不一致导致查询失败。

行动：
1. 核实数据库实际表名（以 migration 为准）。
2. 修正 Drizzle schema（`src/lib/db/schema.ts`）中所有不一致的表名。
3. 修正 API 路由中所有错误的表名引用。
4. 新增 migration `012_unify_table_names.sql` 仅做必要的视图/别名兼容（不改物理表名，避免数据迁移风险）。

### P1-2 启用 Drizzle ORM
**优先级：P1（类型安全）**

当前 API 路由大量使用裸字符串 SQL 表名（`supabase.from("styles")`），无类型安全。

行动：
1. 在 `src/lib/db/schema.ts` 完整定义所有业务表 schema（与 migration 对齐）。
2. 引入 Drizzle query builder 封装，逐步替换裸查询。
3. 保留 Supabase client 用于 RLS 鉴权，Drizzle 用于类型化查询构建。

### P1-3 Zod 输入校验
**优先级：P1（健壮性）** | **状态：✅ 已完成**

当前 API 路由直接读取 `request.json()` 不做校验，存在注入和脏数据风险。

行动：
1. 为每个 POST/PUT/PATCH 路由定义 Zod schema。
2. 在路由入口统一 `safeParse`，失败返回 400。
3. 抽取公共校验工具 `src/lib/validation/`。

完成范围：
- 款式 / BOM / 生产 / 采购 / 打样 / 工艺包 / 状态转换 / 供应商 / 销售 / 季次 / 品牌
- 颜色 / 质检 / 库存 / 组织成员分配 / 邀请用户
- AI 对话 / 调度 / 图片生成 / 测试结果 / 建议操作 / 销售预测 / 供应商匹配 / 改款 / 营销图
- 企划及企划 AI 子能力（趋势/定价/色彩/面料/爆款/统筹/对话/趋势分析）
- 灵感板及素材 / 审批 / 待办 / 个人资料 / 设计反馈 / 公司信息 / 定时任务

### P1-4 款式状态机校验
**优先级：P1（业务正确性）**

款式状态流转（draft → design → sample → production → archived）目前无服务端校验，前端可任意绕过。

行动：
1. 在 `src/lib/styles/state-machine.ts` 定义合法状态流转图。
2. 在款式更新 API 中校验状态变更合法性。
3. 非法流转返回 409 Conflict。

### P2 及以后（暂列，本轮不实现）
- P2-1：Cloudflare R2 文件存储替换 Supabase Storage
- P2-2：React Query 状态管理接入
- P2-3：tldraw SDK 灵感板集成
- P3-1：性能监控与日志聚合

---

## 四、执行顺序

```
P0-3（API RLS 迁移）→ P0-4（表名统一）→ tsc 校验 + 推送
  → P1-2（Drizzle）→ P1-3（Zod）→ P1-4（状态机）→ tsc 校验 + 推送
```

每完成一个 P0/P1 任务：
1. 运行 `npx tsc --noEmit` 确保无类型错误。
2. `git add` 相关文件 + `git commit`。
3. `git push origin main` 自动推送。
4. 标记 todo 完成。
