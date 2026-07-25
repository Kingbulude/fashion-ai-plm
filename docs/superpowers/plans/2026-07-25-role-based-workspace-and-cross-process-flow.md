# 岗位差异化工作台与跨工序信息自动流转 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让每个工序岗位（设计/打样/采购/生产/销售/售后）看到专属工作台，款式状态变更时系统和AI自动把信息传递给下一个工序岗位。

**Architecture:** 三层架构 —— ①工作台配置层（定义每个岗位看什么模块）②角色感知API层（根据用户工序角色过滤数据）③跨工序事件流转层（修复状态变更事件发射，自动为下一工序生成待办）。复用已有的状态机、Pipeline、事件总线、负责人解析系统，不新建并行体系。

**Tech Stack:** Next.js 15 Edge Runtime, Supabase, 事件总线, Pipeline Runner, React

---

## 背景与现状分析

### 已具备的基础（可直接复用）

| 系统 | 文件 | 说明 |
|------|------|------|
| 角色层级 | `src/lib/auth/rbac.ts` | 5级纵向角色（BOSS/ADMIN/BRAND_MANAGER/PROCESS_OWNER/EXECUTOR） |
| 工序角色 | `src/lib/auth/tenant-context.tsx` | 横向工序角色 `processRoles`，8个工序节点 |
| 款式状态机 | `src/lib/workflow/style-state-machine.ts` | 11个状态、13条转换规则、`autoCreateTodo` 配置 |
| 状态转换服务 | `src/lib/workflow/style-transition.ts` | `transitionStyle()` 5步流程，已实现自动建待办+指派负责人 |
| 负责人解析 | `src/lib/workflow/responsible-user.ts` | 三级回退找工序负责人 |
| 事件总线 | `src/lib/events/emitter.ts` | 进程内事件，多处理器、错误隔离 |
| Pipeline系统 | `src/lib/pipeline/` | 3个Pipeline已运行，支持pause_confirm/pause_approve |
| 工作台API | `app/api/workspace/route.ts` | 聚合6大数据板块，但**无角色过滤** |

### 关键缺口（本计划修复）

1. **工作台API无角色感知** —— 所有角色看到完全相同的数据
2. **`STYLE_STATUS_CHANGED` 事件从未发射** —— `transitionStyle()` 成功后不emit事件，跨工序联动断裂
3. **多个事件无订阅者** —— `ORDER_SUGGESTION_READY`/`PROCUREMENT_CREATED`等发射后无人处理
4. **工作台前端无条件渲染** —— 不根据 `processRoles` 切换模块
5. **PUT /styles/[id] 绕过状态机** —— 直接改status不触发转换流程（本计划不修这个，属独立问题）

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/lib/workspace/workspace-config.ts` | **新增**：定义每个工序岗位的工作台模块配置 |
| `app/api/workspace/route.ts` | **修改**：根据用户角色和工序返回差异化数据 |
| `src/lib/workflow/style-transition.ts` | **修改**：状态转换成功后发射 `STYLE_STATUS_CHANGED` 事件 |
| `src/lib/events/handlers/style-status-change-handler.ts` | **新增**：监听状态变更，为下一工序自动生成待办 |
| `src/lib/events/handlers/index.ts` | **新增**：事件处理器注册中心 |
| `app/dashboard/page.tsx` | **修改**：根据 `processRoles` 动态渲染模块 |
| `src/components/workspace/design-workspace.tsx` | **新增**：设计岗位工作台组件 |
| `src/components/workspace/sampling-workspace.tsx` | **新增**：打样岗位工作台组件 |
| `src/components/workspace/procurement-workspace.tsx` | **新增**：采购岗位工作台组件 |
| `src/components/workspace/production-workspace.tsx` | **新增**：生产岗位工作台组件 |
| `src/components/workspace/sales-workspace.tsx` | **新增**：销售岗位工作台组件 |
| `src/components/workspace/aftersales-workspace.tsx` | **新增**：售后岗位工作台组件 |
| `src/components/workspace/manager-workspace.tsx` | **新增**：管理层工作台组件（现有工作台逻辑迁移） |
| `src/components/workspace/shared-modules.tsx` | **新增**：共享模块（待办卡片、风险预警卡片等可复用组件） |

---

## Phase 1: 工作台配置层 + 角色感知API

### Task 1: 定义工作台模块配置

**Files:**
- Create: `src/lib/workspace/workspace-config.ts`

- [ ] **Step 1: 创建配置文件**

```typescript
// src/lib/workspace/workspace-config.ts
import { ProcessNode, RoleLevel } from "@/lib/auth/rbac";

// 工作台模块类型
export type WorkspaceModuleType =
  | "kpi"        // KPI卡片
  | "todo"       // 待办列表
  | "pipeline"   // 流水线
  | "risk"       // 风险预警
  | "recent"     // 最近款式
  | "ai"         // AI工具
  | "custom";    // 自定义组件

// 工作台模块定义
export interface WorkspaceModule {
  id: string;
  type: WorkspaceModuleType;
  title: string;
  // 该模块适用的工序节点列表，["*"] 表示所有工序
  processNodes: string[];
  // 该模块适用的角色层级
  roles: string[];
  // 数据过滤：款式状态过滤
  styleStatusFilter?: string[];
  // 待办类型过滤
  todoTypeFilter?: string[];
  // 风险类型过滤
  riskTypeFilter?: string[];
}

// 每个工序岗位的工作台配置
export interface WorkspaceConfig {
  // 顶部KPI卡片（最多4个）
  kpiModules: WorkspaceModule[];
  // 主内容区模块（左列）
  leftModules: WorkspaceModule[];
  // 主内容区模块（右列）
  rightModules: WorkspaceModule[];
  // 底部模块
  bottomModules: WorkspaceModule[];
}

// 管理层工作台配置（BOSS/ADMIN/BRAND_MANAGER）
export const MANAGER_WORKSPACE: WorkspaceConfig = {
  kpiModules: [
    { id: "style-overview", type: "kpi", title: "款式概览", processNodes: ["*"], roles: ["boss", "admin", "brand_manager"] },
    { id: "pending-todos", type: "kpi", title: "待办事项", processNodes: ["*"], roles: ["boss", "admin", "brand_manager"] },
    { id: "high-risk", type: "kpi", title: "高风险", processNodes: ["*"], roles: ["boss", "admin", "brand_manager"] },
  ],
  leftModules: [
    { id: "today-todos", type: "todo", title: "今日待办", processNodes: ["*"], roles: ["boss", "admin", "brand_manager"] },
  ],
  rightModules: [
    { id: "full-pipeline", type: "pipeline", title: "款式流水线", processNodes: ["*"], roles: ["boss", "admin", "brand_manager"] },
  ],
  bottomModules: [
    { id: "recent-styles", type: "recent", title: "最近款式", processNodes: ["*"], roles: ["boss", "admin", "brand_manager"] },
    { id: "ai-tools", type: "ai", title: "AI 工具", processNodes: ["*"], roles: ["boss", "admin", "brand_manager"] },
  ],
};

// 设计岗位工作台
export const DESIGN_WORKSPACE: WorkspaceConfig = {
  kpiModules: [
    { id: "design-pending", type: "kpi", title: "待设计", processNodes: ["design"], roles: ["executor", "process_owner"], styleStatusFilter: ["planning", "designing"] },
    { id: "design-done", type: "kpi", title: "设计完成", processNodes: ["design"], roles: ["executor", "process_owner"], styleStatusFilter: ["designed", "sampling"] },
    { id: "design-revision", type: "kpi", title: "待修改", processNodes: ["design"], roles: ["executor", "process_owner"], todoTypeFilter: ["design_revision"] },
  ],
  leftModules: [
    { id: "design-tasks", type: "todo", title: "我的设计任务", processNodes: ["design"], roles: ["executor", "process_owner"], todoTypeFilter: ["design", "design_revision"] },
  ],
  rightModules: [
    { id: "design-styles", type: "recent", title: "我负责的款式", processNodes: ["design"], roles: ["executor", "process_owner"], styleStatusFilter: ["planning", "designing", "designed"] },
  ],
  bottomModules: [
    { id: "ai-tools", type: "ai", title: "设计 AI 工具", processNodes: ["design"], roles: ["executor", "process_owner"] },
  ],
};

// 打样岗位工作台
export const SAMPLING_WORKSPACE: WorkspaceConfig = {
  kpiModules: [
    { id: "sampling-pending", type: "kpi", title: "待打样", processNodes: ["sampling"], roles: ["executor", "process_owner"], styleStatusFilter: ["designed", "sampling"] },
    { id: "sampling-done", type: "kpi", title: "封样完成", processNodes: ["sampling"], roles: ["executor", "process_owner"], styleStatusFilter: ["sampled"] },
    { id: "sampling-overdue", type: "kpi", title: "打样超时", processNodes: ["sampling"], roles: ["executor", "process_owner"], riskTypeFilter: ["sampling_overdue"] },
  ],
  leftModules: [
    { id: "sampling-tasks", type: "todo", title: "打样任务", processNodes: ["sampling"], roles: ["executor", "process_owner"], todoTypeFilter: ["sampling"] },
  ],
  rightModules: [
    { id: "sampling-styles", type: "recent", title: "打样中款式", processNodes: ["sampling"], roles: ["executor", "process_owner"], styleStatusFilter: ["designed", "sampling", "sampled"] },
  ],
  bottomModules: [
    { id: "ai-tools", type: "ai", title: "打样 AI 工具", processNodes: ["sampling"], roles: ["executor", "process_owner"] },
  ],
};

// 采购岗位工作台
export const PROCUREMENT_WORKSPACE: WorkspaceConfig = {
  kpiModules: [
    { id: "procurement-pending", type: "kpi", title: "待采购", processNodes: ["procurement"], roles: ["executor", "process_owner"], styleStatusFilter: ["sampled", "producing"] },
    { id: "procurement-done", type: "kpi", title: "采购完成", processNodes: ["procurement"], roles: ["executor", "process_owner"] },
    { id: "procurement-overdue", type: "kpi", title: "采购逾期", processNodes: ["procurement"], roles: ["executor", "process_owner"], riskTypeFilter: ["procurement_overdue"] },
  ],
  leftModules: [
    { id: "procurement-tasks", type: "todo", title: "采购任务", processNodes: ["procurement"], roles: ["executor", "process_owner"], todoTypeFilter: ["procurement"] },
  ],
  rightModules: [
    { id: "procurement-styles", type: "recent", title: "采购中款式", processNodes: ["procurement"], roles: ["executor", "process_owner"], styleStatusFilter: ["sampled", "producing"] },
  ],
  bottomModules: [
    { id: "ai-tools", type: "ai", title: "采购 AI 工具", processNodes: ["procurement"], roles: ["executor", "process_owner"] },
  ],
};

// 生产岗位工作台
export const PRODUCTION_WORKSPACE: WorkspaceConfig = {
  kpiModules: [
    { id: "production-pending", type: "kpi", title: "待生产", processNodes: ["stocking"], roles: ["executor", "process_owner"], styleStatusFilter: ["sampled", "producing"] },
    { id: "production-done", type: "kpi", title: "生产完成", processNodes: ["stocking"], roles: ["executor", "process_owner"], styleStatusFilter: ["produced"] },
    { id: "production-risk", type: "kpi", title: "生产风险", processNodes: ["stocking"], roles: ["executor", "process_owner"], riskTypeFilter: ["production_delay"] },
  ],
  leftModules: [
    { id: "production-tasks", type: "todo", title: "生产任务", processNodes: ["stocking"], roles: ["executor", "process_owner"], todoTypeFilter: ["production"] },
  ],
  rightModules: [
    { id: "production-styles", type: "recent", title: "生产中款式", processNodes: ["stocking"], roles: ["executor", "process_owner"], styleStatusFilter: ["producing", "produced"] },
  ],
  bottomModules: [
    { id: "ai-tools", type: "ai", title: "生产 AI 工具", processNodes: ["stocking"], roles: ["executor", "process_owner"] },
  ],
};

// 销售岗位工作台
export const SALES_WORKSPACE: WorkspaceConfig = {
  kpiModules: [
    { id: "sales-active", type: "kpi", title: "在售款式", processNodes: ["sales"], roles: ["executor", "process_owner"], styleStatusFilter: ["selling", "sold"] },
    { id: "sales-revenue", type: "kpi", title: "本周销售", processNodes: ["sales"], roles: ["executor", "process_owner"] },
    { id: "inventory-alert", type: "kpi", title: "库存预警", processNodes: ["sales"], roles: ["executor", "process_owner"], riskTypeFilter: ["inventory_low"] },
  ],
  leftModules: [
    { id: "sales-tasks", type: "todo", title: "销售任务", processNodes: ["sales"], roles: ["executor", "process_owner"], todoTypeFilter: ["sales", "listing"] },
  ],
  rightModules: [
    { id: "sales-styles", type: "recent", title: "在售款式", processNodes: ["sales"], roles: ["executor", "process_owner"], styleStatusFilter: ["selling", "sold"] },
  ],
  bottomModules: [
    { id: "ai-tools", type: "ai", title: "销售 AI 工具", processNodes: ["sales"], roles: ["executor", "process_owner"] },
  ],
};

// 售后岗位工作台
export const AFTERSALES_WORKSPACE: WorkspaceConfig = {
  kpiModules: [
    { id: "aftersales-pending", type: "kpi", title: "待处理售后", processNodes: ["aftersales"], roles: ["executor", "process_owner"], todoTypeFilter: ["aftersales"] },
    { id: "aftersales-return-rate", type: "kpi", title: "退货率", processNodes: ["aftersales"], roles: ["executor", "process_owner"] },
    { id: "aftersales-quality", type: "kpi", title: "质量投诉", processNodes: ["aftersales"], roles: ["executor", "process_owner"], riskTypeFilter: ["quality_complaint"] },
  ],
  leftModules: [
    { id: "aftersales-tasks", type: "todo", title: "售后任务", processNodes: ["aftersales"], roles: ["executor", "process_owner"], todoTypeFilter: ["aftersales", "return", "exchange"] },
  ],
  rightModules: [
    { id: "aftersales-styles", type: "recent", title: "售后关注款式", processNodes: ["aftersales"], roles: ["executor", "process_owner"], styleStatusFilter: ["selling", "sold", "reviewing"] },
  ],
  bottomModules: [
    { id: "ai-tools", type: "ai", title: "售后 AI 工具", processNodes: ["aftersales"], roles: ["executor", "process_owner"] },
  ],
};

// 工序节点 → 工作台配置映射
export const WORKSPACE_CONFIG_MAP: Record<string, WorkspaceConfig> = {
  [ProcessNode.PLANNING]: MANAGER_WORKSPACE,      // 企划岗位用管理层配置
  [ProcessNode.DESIGN]: DESIGN_WORKSPACE,
  [ProcessNode.SAMPLING]: SAMPLING_WORKSPACE,
  [ProcessNode.TESTING]: MANAGER_WORKSPACE,        // 测款暂用管理层配置
  [ProcessNode.PROCUREMENT]: PROCUREMENT_WORKSPACE,
  [ProcessNode.STOCKING]: PRODUCTION_WORKSPACE,
  [ProcessNode.SALES]: SALES_WORKSPACE,
  [ProcessNode.AFTERSALES]: AFTERSALES_WORKSPACE,
};

// 根据用户角色和工序获取工作台配置
export function getWorkspaceConfig(
  userRole: string | null,
  processRoles: { process_node: string }[]
): WorkspaceConfig {
  // 管理层 → 全局看板
  if (userRole === RoleLevel.BOSS || userRole === RoleLevel.ADMIN || userRole === RoleLevel.BRAND_MANAGER) {
    return MANAGER_WORKSPACE;
  }

  // 执行者/工序负责人 → 取第一个工序的工作台配置
  if (processRoles.length > 0) {
    const node = processRoles[0].process_node;
    return WORKSPACE_CONFIG_MAP[node] || MANAGER_WORKSPACE;
  }

  // 兜底
  return MANAGER_WORKSPACE;
}
```

- [ ] **Step 2: 类型检查**

Run: `cd /workspace && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /workspace && git add src/lib/workspace/workspace-config.ts
git commit -m "feat(workspace): 定义岗位差异化工作台模块配置"
```

---

### Task 2: 重构工作台API为角色感知

**Files:**
- Modify: `app/api/workspace/route.ts`

- [ ] **Step 1: 读取现有 workspace API**

Run: `cd /workspace && cat app/api/workspace/route.ts`

- [ ] **Step 2: 添加角色感知参数**

在 `GET` handler 开头，从请求头读取用户角色和工序信息：

```typescript
// 在现有 brandId/seasonId 解析之后，添加角色解析
const headerRole = request.headers.get("x-user-role") || "";
const headerProcessNodes = request.headers.get("x-process-nodes") || "";

// 解析工序节点列表
const processNodes = headerProcessNodes
  ? headerProcessNodes.split(",").filter(Boolean)
  : [];

// 判断是否管理层
const isManager = ["boss", "admin", "brand_manager"].includes(headerRole);
```

- [ ] **Step 3: 添加数据过滤逻辑**

在现有数据查询后，根据角色过滤：

```typescript
// 根据角色过滤款式
function filterStylesByRole(
  styles: any[],
  isManager: boolean,
  processNodes: string[]
): any[] {
  if (isManager) return styles; // 管理层看全部

  // 执行者只看到自己工序相关的款式
  const statusMap: Record<string, string[]> = {
    design: ["planning", "designing", "designed"],
    sampling: ["designed", "sampling", "sampled"],
    procurement: ["sampled", "producing"],
    stocking: ["producing", "produced"],
    sales: ["selling", "sold"],
    aftersales: ["selling", "sold", "reviewing"],
  };

  const allowedStatuses = processNodes.flatMap(
    (node) => statusMap[node] || []
  );

  if (allowedStatuses.length === 0) return styles;
  return styles.filter((s) => allowedStatuses.includes(s.status));
}

// 根据角色过滤待办
function filterTodosByRole(
  todos: any[],
  isManager: boolean,
  processNodes: string[]
): any[] {
  if (isManager) return todos;
  // 执行者只看到分配给自己的待办（或自己工序相关的）
  // 这里用 target_table + 类型做粗过滤，后续可扩展 assigned_to 精确匹配
  return todos; // 暂时返回全部，待 todo 表有 process_node 字段后精确过滤
}

// 根据角色过滤风险
function filterRisksByRole(
  risks: any[],
  isManager: boolean,
  processNodes: string[]
): any[] {
  if (isManager) return risks;

  const riskTypeMap: Record<string, string[]> = {
    design: ["cost_overrun"],
    sampling: ["sampling_overdue"],
    procurement: ["procurement_overdue", "procurement_due_soon"],
    stocking: ["production_delay"],
    sales: ["inventory_low"],
    aftersales: ["quality_complaint", "return_high"],
  };

  const allowedTypes = processNodes.flatMap(
    (node) => riskTypeMap[node] || []
  );

  if (allowedTypes.length === 0) return risks;
  return risks.filter((r) => {
    // risk.type 可能是 "warning"/"error"，risk 的标题或 targetTable 做匹配
    return allowedTypes.some((t) => r.title?.includes(t) || r.targetTable?.includes(t));
  });
}
```

- [ ] **Step 4: 在返回数据中加入角色配置**

```typescript
// 在返回 JSON 前，加入工作台配置
import { getWorkspaceConfig } from "@/lib/workspace/workspace-config";

const workspaceConfig = getWorkspaceConfig(headerRole, processNodes.map((n) => ({ process_node: n })));

return NextResponse.json({
  ...existingData,
  workspaceConfig, // 返回模块配置，前端用来决定渲染哪些模块
  userRole: headerRole,
  processNodes,
  isManager,
});
```

- [ ] **Step 5: 类型检查**

Run: `cd /workspace && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /workspace && git add app/api/workspace/route.ts src/lib/workspace/workspace-config.ts
git commit -m "feat(workspace): API根据角色返回差异化数据"
```

---

## Phase 2: 跨工序事件自动流转

### Task 3: 修复状态转换的事件发射

**Files:**
- Modify: `src/lib/workflow/style-transition.ts`

- [ ] **Step 1: 读取现有 transitionStyle 函数**

Run: `cd /workspace && cat src/lib/workflow/style-transition.ts`

- [ ] **Step 2: 在 transitionStyle 成功后发射事件**

在 `transitionStyle` 函数中，第4步（写操作日志）之后、第5步（创建待办）之前，添加事件发射：

```typescript
// 在文件顶部添加导入
import { emit } from "@/lib/events/emitter";
import { EventType } from "@/lib/events/types";
import { getTransitionResponsibleNode } from "./style-state-machine";

// 在 transitionStyle 函数中，操作日志写入之后添加：
// 5. 发射状态变更事件（跨工序信息流转的关键）
const responsibleNode = getTransitionResponsibleNode(transition);
emit(EventType.STYLE_STATUS_CHANGED, {
  styleId,
  brandId,
  fromStatus: currentStatus,
  toStatus: input.toStatus,
  event: input.event,
  comment: input.comment,
  responsibleNode,    // 负责的工序节点
  operatorId: input.userId,
  timestamp: new Date().toISOString(),
});
```

- [ ] **Step 3: 确认 EventType.STYLE_STATUS_CHANGED 已定义**

Run: `cd /workspace && grep "STYLE_STATUS_CHANGED" src/lib/events/types.ts`

Expected: 已存在定义（调研确认已定义但未被发射）

- [ ] **Step 4: 类型检查**

Run: `cd /workspace && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /workspace && git add src/lib/workflow/style-transition.ts
git commit -m "fix(workflow): 状态转换成功后发射STYLE_STATUS_CHANGED事件"
```

---

### Task 4: 创建跨工序自动待办生成处理器

**Files:**
- Create: `src/lib/events/handlers/style-status-change-handler.ts`
- Create: `src/lib/events/handlers/index.ts`

- [ ] **Step 1: 创建事件处理器**

```typescript
// src/lib/events/handlers/style-status-change-handler.ts
import { EventHandler } from "@/lib/events/types";
import { EventType } from "@/lib/events/types";
import { getSupabaseClient } from "@/lib/db/client";
import { resolveResponsibleUserByNode } from "@/lib/workflow/responsible-user";
import { statusToProcessNode, STYLE_TRANSITIONS } from "@/lib/workflow/style-state-machine";

// 状态变更 → 为下一工序自动生成待办
export const styleStatusChangeHandler: EventHandler = {
  event: EventType.STYLE_STATUS_CHANGED,
  priority: 10,
  async handle(event) {
    const { styleId, brandId, fromStatus, toStatus, event: transitionEvent, responsibleNode } = event.payload;

    // 1. 找到对应的转换规则
    const transition = STYLE_TRANSITIONS.find(
      (t) => t.from === fromStatus && t.to === toStatus
    );
    if (!transition?.autoCreateTodo) return;

    // 2. 解析下一工序负责人
    const nextNode = statusToProcessNode(toStatus);
    if (!nextNode) return;

    const supabase = getSupabaseClient();
    const { data: style } = await supabase
      .from("styles")
      .select("name, style_no")
      .eq("id", styleId)
      .single();

    // 3. 解析负责人
    const responsible = await resolveResponsibleUserByNode(
      nextNode,
      brandId,
      event.payload.companyId
    );

    // 4. 创建待办（如果还没有相同的pending待办）
    const { data: existing } = await supabase
      .from("todos")
      .select("id")
      .eq("target_table", "styles")
      .eq("target_id", styleId)
      .eq("status", "pending")
      .ilike("title", transition.autoCreateTodo)
      .limit(1);

    if (existing && existing.length > 0) return; // 已存在，不重复创建

    await supabase.from("todos").insert({
      title: transition.autoCreateTodo,
      description: `款式「${style?.name || styleId}」已进入${toStatus}阶段，需要您处理`,
      type: "task",
      priority: "high",
      status: "pending",
      target_table: "styles",
      target_id: styleId,
      assigned_to: responsible?.userId || event.payload.operatorId,
      brand_id: brandId,
      company_id: event.payload.companyId,
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3天截止
    });
  },
};
```

- [ ] **Step 2: 创建处理器注册中心**

```typescript
// src/lib/events/handlers/index.ts
import { styleStatusChangeHandler } from "./style-status-change-handler";
import { registerHandler } from "@/lib/events/emitter";

let initialized = false;

export function registerEventHandlers() {
  if (initialized) return;
  initialized = true;

  registerHandler(styleStatusChangeHandler);
  // 后续可注册更多处理器
}
```

- [ ] **Step 3: 在 pipeline registry 中初始化**

修改 `src/lib/pipeline/registry.ts`，在末尾添加：

```typescript
import { registerEventHandlers } from "@/lib/events/handlers";

// 在现有初始化逻辑之后
registerEventHandlers();
```

- [ ] **Step 4: 类型检查**

Run: `cd /workspace && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /workspace && git add src/lib/events/handlers/
git commit -m "feat(events): 状态变更自动为下一工序生成待办"
```

---

## Phase 3: 岗位专属工作台组件

### Task 5: 创建共享模块组件

**Files:**
- Create: `src/components/workspace/shared-modules.tsx`

- [ ] **Step 1: 创建可复用的工作台模块组件**

```tsx
// src/components/workspace/shared-modules.tsx
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Clock, ArrowRight, Plus, Box, Loader2, Check,
  TrendingUp, ListTodo, ShieldAlert, ChevronRight,
} from "lucide-react";

// KPI 卡片（可复用）
export function KpiCard({
  title, value, subtitle, icon: Icon, color, href, highlight,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: any;
  color: "navy" | "terracotta" | "red" | "green" | "blue";
  href?: string;
  highlight?: boolean;
}) {
  const colorMap = {
    navy: { iconBg: "bg-navy-100", iconText: "text-navy-600", ring: "ring-navy-200 bg-navy-50/40" },
    terracotta: { iconBg: "bg-terracotta-100", iconText: "text-terracotta-600", ring: "ring-terracotta-200 bg-terracotta-50/40" },
    red: { iconBg: "bg-red-50", iconText: "text-red-600", ring: "ring-red-200 bg-red-50/40" },
    green: { iconBg: "bg-emerald-50", iconText: "text-emerald-600", ring: "ring-emerald-200 bg-emerald-50/40" },
    blue: { iconBg: "bg-blue-50", iconText: "text-blue-600", ring: "ring-blue-200 bg-blue-50/40" },
  };
  const c = colorMap[color];

  const content = (
    <Card className={`card-premium transition-all ${highlight ? `ring-2 ${c.ring}` : ""} ${href ? "hover:shadow-lg cursor-pointer" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${c.iconBg}`}>
            <Icon className={`h-5 w-5 ${c.iconText}`} />
          </div>
          <p className="data-value">{value}</p>
        </div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

// 待办列表卡片（可复用）
export function TodoListCard({
  title, todos, onComplete, completingId, href, emptyText = "暂无待办",
}: {
  title: string;
  todos: any[];
  onComplete?: (id: string) => void;
  completingId?: string | null;
  href?: string;
  emptyText?: string;
}) {
  return (
    <Card className="card-premium">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-terracotta-500" />
            {title}
            {todos.length > 0 && <Badge className="ml-1 bg-terracotta-100 text-terracotta-600">{todos.length}</Badge>}
          </CardTitle>
          {href && (
            <Button variant="outline" size="sm" asChild>
              <Link href={href}>查看全部</Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {todos.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{emptyText}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todos.slice(0, 8).map((todo: any) => (
              <div key={todo.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-sand-50 transition-all">
                {onComplete && (
                  <button
                    onClick={() => onComplete(todo.id)}
                    disabled={completingId === todo.id}
                    className="flex-shrink-0 h-5 w-5 rounded-md border-2 border-border hover:border-emerald-500 transition-colors flex items-center justify-center"
                  >
                    {completingId === todo.id ? <Loader2 className="h-3 w-3 animate-spin text-emerald-600" /> : <Check className="h-3 w-3 text-transparent" />}
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{todo.title}</p>
                  {todo.description && <p className="text-xs text-muted-foreground truncate">{todo.description}</p>}
                  {todo.dueDate && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(todo.dueDate).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 款式列表卡片（可复用）
export function StyleListCard({
  title, styles, href, emptyText = "暂无款式",
}: {
  title: string;
  styles: any[];
  href?: string;
  emptyText?: string;
}) {
  return (
    <Card className="card-premium">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-navy-500" />
            {title}
          </CardTitle>
          {href && (
            <Button variant="outline" size="sm" asChild>
              <Link href={href}>查看全部</Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {styles.length === 0 ? (
          <div className="py-10 text-center">
            <Box className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{emptyText}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {styles.slice(0, 6).map((style: any) => (
              <Link
                key={style.id}
                href={`/styles/${style.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-terracotta-200 hover:shadow-sm transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{style.name}</p>
                  <p className="text-xs text-muted-foreground">{style.styleNo}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-terracotta-500 transition-all" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 类型检查**

Run: `cd /workspace && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /workspace && git add src/components/workspace/shared-modules.tsx
git commit -m "feat(workspace): 创建可复用的工作台共享模块组件"
```

---

### Task 6: 创建设计岗位工作台组件

**Files:**
- Create: `src/components/workspace/design-workspace.tsx`

- [ ] **Step 1: 创建设计岗位工作台**

```tsx
// src/components/workspace/design-workspace.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Palette, CheckCircle2, AlertCircle, Wand2 } from "lucide-react";
import { KpiCard, TodoListCard, StyleListCard } from "./shared-modules";
import { useTenant, AISkill } from "@/lib/auth/tenant-context";

export function DesignWorkspace({ workspace, onCompleteTodo, completingTodoId }: {
  workspace: any;
  onCompleteTodo: (id: string) => void;
  completingTodoId: string | null;
}) {
  const { accessibleAISkills } = useTenant();
  const aiSkills = accessibleAISkills.filter(
    (s) => s.process_node === "design"
  );

  const designTodos = (workspace?.todos || []).filter((t: any) =>
    t.title?.includes("设计") || t.title?.includes("上传") || t.title?.includes("修改")
  );

  const designStyles = (workspace?.recentStyles || []).filter((s: any) =>
    ["planning", "designing", "designed"].includes(s.status)
  );

  const pendingCount = designStyles.filter((s: any) => s.status === "planning" || s.status === "designing").length;
  const doneCount = designStyles.filter((s: any) => s.status === "designed").length;
  const revisionCount = designTodos.filter((t: any) => t.title?.includes("修改")).length;

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <KpiCard title="待设计" value={pendingCount} subtitle="待设计/设计中款式" icon={Palette} color="blue" href="/styles?status=planning,designing" />
        <KpiCard title="设计完成" value={doneCount} subtitle="已可进入打样" icon={CheckCircle2} color="green" href="/styles?status=designed" />
        <KpiCard title="待修改" value={revisionCount} subtitle="需要修改的设计" icon={AlertCircle} color="terracotta" highlight={revisionCount > 0} />
      </div>

      {/* 主内容 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodoListCard
          title="我的设计任务"
          todos={designTodos}
          onComplete={onCompleteTodo}
          completingId={completingTodoId}
          href="/todos"
          emptyText="暂无设计任务"
        />
        <StyleListCard
          title="我负责的款式"
          styles={designStyles}
          href="/styles?status=planning,designing,designed"
          emptyText="暂无相关款式"
        />
      </div>

      {/* AI 工具 */}
      {aiSkills.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {aiSkills.map((skill) => (
            <Link
              key={skill.id}
              href={skill.entry_route || "#"}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-navy-200 hover:shadow-md transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-navy-100 text-navy-600 group-hover:bg-navy-200 transition-colors">
                <Wand2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{skill.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{skill.description || "AI 智能体"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 类型检查**

Run: `cd /workspace && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /workspace && git add src/components/workspace/design-workspace.tsx
git commit -m "feat(workspace): 创建设计岗位工作台组件"
```

---

### Task 7-11: 创建其他岗位工作台组件

**Files:**
- Create: `src/components/workspace/sampling-workspace.tsx`
- Create: `src/components/workspace/procurement-workspace.tsx`
- Create: `src/components/workspace/production-workspace.tsx`
- Create: `src/components/workspace/sales-workspace.tsx`
- Create: `src/components/workspace/aftersales-workspace.tsx`

**模式与 Task 6 相同**，每个组件：
1. 从 workspace 数据中过滤本工序相关的款式和待办
2. KPI 卡片展示本工序的关键指标
3. 左列待办 + 右列款式列表
4. 底部展示本工序的 AI 工具

**过滤逻辑**：
- **打样**: `status in [designed, sampling, sampled]`，待办含"打样"
- **采购**: `status in [sampled, producing]`，待办含"采购"
- **生产**: `status in [producing, produced]`，待办含"生产"
- **销售**: `status in [selling, sold]`，待办含"上架"/"销售"
- **售后**: `status in [selling, sold, reviewing]`，待办含"售后"/"退货"/"换货"

每个 Task 完成后：类型检查 + Commit。

---

### Task 12: 创建管理层工作台组件（迁移现有逻辑）

**Files:**
- Create: `src/components/workspace/manager-workspace.tsx`

- [ ] **Step 1: 将现有 dashboard/page.tsx 的内容迁移到组件**

把 Task 优化后的工作台布局（合并KPI、风险预警上移、横向流水线）封装为 `ManagerWorkspace` 组件，接收相同的 props。

- [ ] **Step 2: 类型检查 + Commit**

```bash
cd /workspace && git add src/components/workspace/manager-workspace.tsx
git commit -m "feat(workspace): 创建管理层工作台组件"
```

---

## Phase 4: 工作台页面路由

### Task 13: 重构 dashboard 页面为角色路由器

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: 重写 dashboard 页面**

```tsx
// app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { useTenant } from "@/lib/auth/tenant-context";
import { useApi } from "@/lib/api/use-api";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, AlertTriangle, Plus } from "lucide-react";
import Link from "next/link";
import { getWorkspaceConfig } from "@/lib/workspace/workspace-config";
import { ManagerWorkspace } from "@/components/workspace/manager-workspace";
import { DesignWorkspace } from "@/components/workspace/design-workspace";
import { SamplingWorkspace } from "@/components/workspace/sampling-workspace";
import { ProcurementWorkspace } from "@/components/workspace/procurement-workspace";
import { ProductionWorkspace } from "@/components/workspace/production-workspace";
import { SalesWorkspace } from "@/components/workspace/sales-workspace";
import { AftersalesWorkspace } from "@/components/workspace/aftersales-workspace";

export default function DashboardPage() {
  const { currentBrand, currentSeason, currentCompany, userRole, processRoles } = useTenant();
  const api = useApi();

  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completingTodoId, setCompletingTodoId] = useState<string | null>(null);

  const loadWorkspace = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await api.get<any>("/api/workspace");
      setWorkspace(data);
    } catch (err: any) {
      setError(err?.message || "加载失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadWorkspace(); }, [currentBrand?.id, currentSeason?.id]);

  const handleCompleteTodo = async (todoId: string) => {
    try {
      setCompletingTodoId(todoId);
      await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      await loadWorkspace(true);
    } finally {
      setCompletingTodoId(null);
    }
  };

  // 根据角色决定渲染哪个工作台
  const renderWorkspace = () => {
    if (loading) return <LoadingState />;
    if (error) return <ErrorState error={error} onRetry={() => loadWorkspace()} />;

    const isManager = ["boss", "admin", "brand_manager"].includes(userRole || "");
    if (isManager) {
      return <ManagerWorkspace workspace={workspace} onCompleteTodo={handleCompleteTodo} completingTodoId={completingTodoId} />;
    }

    const processNode = processRoles[0]?.process_node;
    switch (processNode) {
      case "design": return <DesignWorkspace workspace={workspace} onCompleteTodo={handleCompleteTodo} completingTodoId={completingTodoId} />;
      case "sampling": return <SamplingWorkspace workspace={workspace} onCompleteTodo={handleCompleteTodo} completingTodoId={completingTodoId} />;
      case "procurement": return <ProcurementWorkspace workspace={workspace} onCompleteTodo={handleCompleteTodo} completingTodoId={completingTodoId} />;
      case "stocking": return <ProductionWorkspace workspace={workspace} onCompleteTodo={handleCompleteTodo} completingTodoId={completingTodoId} />;
      case "sales": return <SalesWorkspace workspace={workspace} onCompleteTodo={handleCompleteTodo} completingTodoId={completingTodoId} />;
      case "aftersales": return <AftersalesWorkspace workspace={workspace} onCompleteTodo={handleCompleteTodo} completingTodoId={completingTodoId} />;
      default: return <ManagerWorkspace workspace={workspace} onCompleteTodo={handleCompleteTodo} completingTodoId={completingTodoId} />;
    }
  };

  return (
    <SidebarLayout>
      <div className="max-w-[1800px] mx-auto space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">工作台</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {currentBrand ? (
                <>
                  <span className="font-medium text-foreground">{currentBrand.name}</span>
                  {currentSeason && <><span className="mx-2 text-border">·</span><span>{currentSeason.name}</span></>}
                </>
              ) : "加载品牌上下文中..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadWorkspace(true)} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white" asChild>
              <Link href="/planning"><Plus className="h-4 w-4 mr-1.5" />新建企划</Link>
            </Button>
          </div>
        </div>

        {renderWorkspace()}
      </div>
    </SidebarLayout>
  );
}
```

- [ ] **Step 2: 类型检查**

Run: `cd /workspace && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 构建验证**

Run: `cd /workspace && npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /workspace && git add app/dashboard/page.tsx
git commit -m "feat(workspace): 工作台页面根据角色动态渲染专属组件"
```

---

## Spec Coverage Check

| 需求 | 实现任务 |
|------|----------|
| 每个岗位看到不同的工作台 | Task 1（配置）+ Task 6-12（组件）+ Task 13（路由） |
| 设计岗位专属内容 | Task 6 |
| 销售运营岗位专属内容 | Task 10 |
| 售后岗位专属内容 | Task 11 |
| 采购岗位专属内容 | Task 8 |
| 生产岗位专属内容 | Task 9 |
| 打样岗位专属内容 | Task 7 |
| 信息自动传递 | Task 3（事件发射）+ Task 4（自动待办） |
| 系统和AI根据上传内容传递 | Task 3+4 复用已有Pipeline系统 |

## Type Consistency

- `WorkspaceConfig` / `WorkspaceModule` 在 Task 1 定义，Task 2 和 Task 13 使用
- `ProcessNode` 枚举来自 `src/lib/auth/rbac.ts`，所有任务一致使用
- 共享模块组件 props 在 Task 5 定义，Task 6-12 一致使用
- 事件 payload 结构在 Task 3 发射，Task 4 消费，字段名一致
