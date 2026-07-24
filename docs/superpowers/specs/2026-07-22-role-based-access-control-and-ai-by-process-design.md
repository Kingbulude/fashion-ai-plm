# 角色权限、多品牌隔离与 AI 按工序重构设计方案

> **替代说明：** 本文档替代 `2026-07-21-role-based-access-control-design.md`，基于进一步沟通后的完整理解重新整理。

---

## 1. 背景与目标

### 1.1 项目定位

这是一个服装行业全链路管理系统，覆盖从企划、设计、打样、测款、采购、生产/备货、销售到售后的完整业务流程。系统的长期目标是让 AI 深度嵌入每个工序的每个执行环节：关键岗位配备 AI 秘书，每道工序配备总管 AI，每个执行环节配备专门的 AI skill，最终实现部分环节由 AI 自动执行并产出结果清单给下一环节使用。

### 1.2 当前问题

1. 老板账号与品牌主理人账号看到完全相同的侧边栏和页面。
2. 品牌主理人无法被限制只能访问被分配的品牌。
3. 缺少统一的后台配置入口，老板无法在公司层面管理品牌、人员、工序角色、主管类型和 AI skill。
4. 现有 "AI 智能分析" 页面过于笼统，不符合"AI 按工序拆分"的长期愿景。

### 1.3 设计目标

1. 建立**纵向层级 + 横向工序角色**的二维权限模型。
2. 实现多品牌隔离：老板/管理员看全公司品牌，其他角色只看被分配品牌。
3. 实现工序主管类型后台可配置，每个主管负责一段连续工序。
4. 重构 AI 入口，让 AI skill 按工序和角色动态呈现。
5. 提供完整的后台配置页面，支持公司信息、品牌、人员、工序角色、主管类型、AI skill 的管理。
6. 先把 2 个已注册账号配置为老板和品牌主理人，让系统能跑起来并验证隔离效果。

### 1.4 设计原则

- **地基优先**：不赶进度，先把数据模型、权限计算、API 隔离做透。
- **角色驱动**：页面可见性由角色决定，不依赖手动勾选页面。
- **可扩展**：新增工序、角色、AI skill 应尽量通过后台配置完成，少改代码。
- **数据隔离**：所有 API 都必须按公司和品牌过滤，不能信任前端参数。
- **AI 融入工序**：AI 不是独立模块，而是嵌入到各工序页面和 AI 智能体中心。

---

## 2. 核心概念

### 2.1 纵向层级（RoleLevel）

纵向层级决定"管理权限"和"操作权限"，是公司管理维度的等级。

| 层级 | key | 说明 |
|---|---|---|
| 老板 | `boss` | 全公司、全品牌、全工序、后台配置、可管理所有账号 |
| 公司管理员 | `admin` | 同老板，但**不能修改 BOSS 账号** |
| 品牌主理人 | `brand_manager` | 被分配品牌内的全部工序页面和数据 |
| 工序主管 | `process_owner` | 被分配的"工序段"内的全部页面和数据，可查看/审批下属工作 |
| 执行者 | `executor` | 仅横向角色对应的工序页面，只能处理自己负责的任务 |

### 2.2 横向工序角色（ProcessRole）

横向角色决定"能进入哪些工序页面"和"能使用哪些 AI skill"。一个账号可以拥有多个横向角色，权限取并集。

| 角色 key | 显示名 | 所属工序节点 | 默认可见页面 | 可用 AI skills |
|---|---|---|---|---|
| `planner` | 企划师 | `planning` | `/planning` | 企划总管 AI、需求趋势收集 AI、主题企划 AI、设计企划 AI… |
| `designer` | 设计师 | `design` | `/design`, `/styles` | 设计总管 AI、款式设计 AI、图案设计 AI、面料企划 AI… |
| `sampling_master` | 打样师 | `sampling` | `/styles` | 打样总管 AI、样衣制作 AI、样衣评审 AI… |
| `testing_specialist` | 测款师 | `testing` | `/ai-review`, `/styles` | 测款总管 AI、市场测试 AI、接受度评估 AI… |
| `procurement_specialist` | 采购师 | `procurement` | `/suppliers`, `/styles` | 采购总管 AI、供应商匹配 AI、下单建议 AI… |
| `production_coordinator` | 生产跟单/QC | `stocking` | `/production` | 生产总管 AI、生产排期 AI、QC 检查 AI… |
| `sales` | 销售 | `sales` | `/sales`, `/analytics` | 销售总管 AI、销售预测 AI… |
| `aftersales` | 售后 | `aftersales` | `/aftersales` | 售后总管 AI、退换货分析 AI… |
| `finance` | 财务 | - | `/analytics` | 经营分析 AI、成本核算 AI… |

说明：
- 横向角色只决定"能进哪些页面"和"能用什么 AI"，不决定页面内的操作权限。
- 页面内操作权限（编辑、删除、审批、导出）由纵向层级决定。
- QC 属于 `stocking`（备货/生产）工序，不单独设工序节点。

### 2.3 工序主管类型（ProcessOwnerScope）

工序主管类型后台可配置，定义一种主管负责哪一段连续工序。

| 主管类型 key | 名称 | 覆盖工序段 | 责任边界 |
|---|---|---|---|
| `design_lead` | 设计主管 | `planning → design → sampling` | 从企划到打样完成，把"可生产的样衣"交付出去 |
| `product_lead` | 产品主管 | `sampling → testing → procurement → stocking` | 从打样到大货生产前，把"可下单生产的产品"交付出去 |
| `operations_lead` | 运营主管 | `testing → sales` | 从测款到销售，把"可销售的商品"交付出去 |
| `aftersales_lead` | 售后主管 | `aftersales` | 售后问题处理与交付 |

一个 `process_owner` 纵向层级的用户必须关联一个主管类型。主管类型自动授予该工序段内所有横向角色对应的页面权限和 AI skill 权限。

### 2.4 AI Skill 体系

AI skill 分为三类：

1. **个人 AI 秘书**：为关键岗位配备（如设计主管秘书、品牌主理人秘书），负责统筹、分配任务、跟踪进度。
2. **工序总管 AI**：每道工序一个（如企划总管 AI、设计总管 AI），管理该工序下所有执行环节。
3. **执行环节 AI Skill**：具体执行步骤（如需求趋势收集、主题企划、款式设计、样衣制作、市场测试…），未来部分环节可自动执行并产出结果清单。

AI skill 通过 `process_role_ai_skills` 和 `process_owner_scope_ai_skills` 与角色/主管类型绑定，实现"不同角色看到不同 AI 工具"。

---

## 3. 数据模型

### 3.1 现有表变更

#### `profiles`

| 字段 | 类型 | 说明 |
|---|---|---|
| `user_id` | uuid | 主键，对应 Supabase auth user |
| `company_id` | uuid | 所属公司 |
| `role_level` | text | 纵向层级：boss/admin/brand_manager/process_owner/executor |
| `name` | text | 显示名 |
| `avatar_url` | text | 头像 URL |
| `email` | text | 邮箱 |
| `created_at` / `updated_at` | timestamp | - |

说明：`brand_id` 字段如存在，建议废弃，品牌关联统一走 `user_brands` 表。

#### `user_brands`（已存在）

| 字段 | 类型 | 说明 |
|---|---|---|
| `user_id` | uuid | 用户 |
| `brand_id` | uuid | 品牌 |
| `role_level` | text | 冗余字段，表示在该品牌下的角色，可选 |
| `created_at` | timestamp | - |

说明：该表决定用户能访问哪些品牌。BOSS/ADMIN 不依赖此表，直接返回公司下全部品牌。

### 3.2 新增表

#### `process_roles`（横向工序角色）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | 主键 |
| `key` | text | 唯一标识，如 `designer` |
| `name` | text | 显示名，如 "设计师" |
| `description` | text | 说明 |
| `process_node` | text | 所属工序节点：planning/design/sampling/testing/procurement/stocking/sales/aftersales |
| `route_permissions` | jsonb | 该角色可访问的路由及权限，如 `{"/design": ["view", "edit"], "/styles": ["view"]}` |
| `is_active` | boolean | 是否启用 |
| `created_at` / `updated_at` | timestamp | - |

#### `user_process_roles`（用户 ↔ 横向角色关联）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | 主键 |
| `user_id` | uuid | 用户 |
| `process_role_id` | uuid | 横向角色 |
| `brand_id` | uuid | 可选，为空表示全公司 |
| `assigned_by` | uuid | 分配人 |
| `assigned_at` | timestamp | 分配时间 |

#### `process_owner_scopes`（工序主管类型）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | 主键 |
| `key` | text | 唯一标识，如 `design_lead` |
| `name` | text | 显示名，如 "设计主管" |
| `description` | text | 说明 |
| `process_nodes` | text[] | 覆盖的工序节点数组 |
| `is_active` | boolean | 是否启用 |
| `created_at` / `updated_at` | timestamp | - |

#### `user_process_owner_scopes`（用户 ↔ 主管类型关联）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | 主键 |
| `user_id` | uuid | 用户 |
| `scope_id` | uuid | 主管类型 |
| `brand_id` | uuid | 可选，为空表示全公司 |
| `assigned_by` | uuid | 分配人 |
| `assigned_at` | timestamp | - |

#### `ai_skills`（AI Skill 定义）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | 主键 |
| `key` | text | 唯一标识，如 `design_master_ai` |
| `name` | text | 显示名，如 "设计总管 AI" |
| `description` | text | 说明 |
| `skill_type` | text | 类型：`personal_assistant` / `process_master` / `execution` |
| `process_node` | text | 所属工序节点，可选 |
| `config_schema` | jsonb | 配置 schema，可选 |
| `entry_route` | text | 入口路由，如 `/ai-workspace/design` |
| `is_active` | boolean | 是否启用 |
| `created_at` / `updated_at` | timestamp | - |

#### `process_role_ai_skills`（横向角色 ↔ AI Skill）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | 主键 |
| `process_role_id` | uuid | 横向角色 |
| `ai_skill_id` | uuid | AI skill |

#### `process_owner_scope_ai_skills`（主管类型 ↔ AI Skill）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | 主键 |
| `scope_id` | uuid | 主管类型 |
| `ai_skill_id` | uuid | AI skill |

---

## 4. 权限计算规则

### 4.1 页面可见性

用户可访问路由集合 = 通用路由 ∪ 纵向层级路由 ∪ 横向角色路由 ∪ 主管类型路由

#### 通用路由（所有登录用户可见）

- `/dashboard` 工作台
- `/` 智能调度

#### 纵向层级路由

| 纵向层级 | 可访问路由 |
|---|---|
| `boss` | 全部路由 |
| `admin` | 全部路由 |
| `brand_manager` | 全部工序页面 + AI 智能体中心 |
| `process_owner` | 主管类型覆盖工序段对应的全部页面 + AI 智能体中心 |
| `executor` | 仅横向角色对应的页面 + AI 智能体中心 |

#### 横向角色路由

由 `process_roles.route_permissions` 定义，取用户所有横向角色的并集。

#### 主管类型路由

由 `process_owner_scopes.process_nodes` 推导：覆盖的每个工序节点对应的页面都可见。

### 4.2 操作权限

操作权限由纵向层级决定：

| 纵向层级 | 操作权限 |
|---|---|
| `boss` | view, edit, delete, export, assign, approve |
| `admin` | view, assign |
| `brand_manager` | view, edit, export, approve |
| `process_owner` | view, edit, export, approve（在工序段内） |
| `executor` | view, edit（仅自己负责的数据） |

说明：横向角色不赋予操作权限，只决定能进哪些页面。

### 4.3 数据隔离

1. 所有 API 必须按 `company_id` 隔离。
2. BOSS/ADMIN：返回公司下全部品牌数据。
3. BRAND_MANAGER：返回 `user_brands` 关联品牌数据。
4. PROCESS_OWNER：返回 `user_brands` 关联品牌数据 ∩ 主管类型覆盖工序段的数据。
5. EXECUTOR：返回 `user_brands` 关联品牌数据 ∩ 横向角色对应工序的数据。

### 4.4 AI Skill 可见性

用户可用 AI skill 集合 = 横向角色 AI skill 并集 ∪ 主管类型 AI skill。

- BOSS/ADMIN/BRAND_MANAGER：默认可见全部 AI skill（可后台配置例外）。
- PROCESS_OWNER：可见主管类型绑定的 AI 秘书 skill + 覆盖工序段的总管 AI skills。
- EXECUTOR：可见横向角色绑定的 AI skills。

---

## 5. AI 按工序重构设计

### 5.1 现有 AI 页面替换

- 现有 `/ai` "AI 智能分析" 页面将重构为 `/ai-workspace` "AI 智能体中心"。
- 原 `/ai-review` "AI 审核中心" 保留，作为测款/审核环节的专用入口。

### 5.2 AI 智能体中心结构

```
/ai-workspace
├── 我的 AI 秘书          # 关键岗位秘书（主管、品牌主理人）
├── 企划 AI
│   ├── 企划总管 AI
│   ├── 需求趋势收集 AI
│   ├── 主题企划 AI
│   └── 设计企划 AI
├── 设计 AI
│   ├── 设计总管 AI
│   ├── 款式设计 AI
│   ├── 图案设计 AI
│   └── 面料企划 AI
├── 打样 AI
├── 测款 AI
├── 采购 AI
├── 生产/备货 AI
├── 销售 AI
└── 售后 AI
```

每个用户进入 `/ai-workspace` 后，只显示自己有权限的工序模块和 AI skill。

### 5.3 AI Skill 与页面嵌入

除了在 `/ai-workspace` 集中展示，各工序页面也应嵌入对应的 AI 助手：

- `/planning`：右侧或底部嵌入"企划总管 AI"面板
- `/design`：嵌入"设计总管 AI"面板
- `/styles`：根据当前款式所处工序，显示对应环节的 AI 建议
- `/production`：嵌入"生产总管 AI"和"QC AI"面板

### 5.4 AI Skill 执行结果清单

每个执行环节 AI skill 执行后产出结构化结果：

```json
{
  "skill_id": "theme_planning_ai",
  "output_type": "theme_plan",
  "data": {
    "themes": [...],
    "color_palette": [...],
    "fabrics": [...]
  },
  "next_process_node": "design",
  "handoff_checklist": [...]
}
```

结果清单进入下一环节的数据源，实现工序间 AI 协同。

---

## 6. 前端架构

### 6.1 TenantContext 扩展

`TenantContextValue` 需暴露：

```typescript
export interface TenantContextValue {
  // 现有字段
  currentCompany: Company | null;
  currentBrand: Brand | null;
  companies: Company[];
  brands: Brand[];              // 原始品牌列表
  availableBrands: Brand[];     // 用户可见品牌
  seasons: Season[];
  setCompany: (id: string) => void;
  setBrand: (id: string) => void;
  setSeason: (id: string) => void;
  
  // 新增字段
  userRole: string | null;                    // 纵向层级
  userPermissions: Permission[];              // 操作权限列表
  processRoles: ProcessRole[];                // 当前用户横向角色
  processOwnerScope: ProcessOwnerScope | null; // 主管类型
  accessibleRoutes: string[];                 // 可访问路由列表
  accessibleAISkills: AISkill[];              // 可用 AI skills
  isAdmin: boolean;                           // BOSS 或 ADMIN
  isBoss: boolean;                            // BOSS
  canAccessRoute: (route: string) => boolean;
  canPerform: (action: Permission, resource?: string) => boolean;
}
```

### 6.2 动态侧边栏

导航项定义包含所需角色条件：

```typescript
interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  requiredRoleLevels?: RoleLevel[];      // 需要的纵向层级
  requiredProcessNodes?: ProcessNode[];  // 需要的工序节点
  adminOnly?: boolean;                   // 仅 BOSS/ADMIN
  aiEntry?: boolean;                     // 是否为 AI 入口
}
```

过滤逻辑：
1. `adminOnly` 为 true 时，仅 `isAdmin` 可见。
2. `requiredRoleLevels` 存在时，当前 `userRole` 必须在列表中。
3. `requiredProcessNodes` 存在时，用户横向角色或主管类型覆盖的工序节点必须包含其中之一。
4. 未配置条件的导航项，所有登录用户可见。

### 6.3 路由守卫

- 页面级：在页面组件顶部使用 `useTenant()` 检查，无权限时渲染 `<ForbiddenPage />`。
- API 级：每个 API 根据 session 查询用户角色和品牌权限，返回 403/401。
- 未来：通过 Next.js Middleware 统一拦截 `/admin/*` 等敏感路由。

---

## 7. API 设计

### 7.1 `/api/organization`

**GET**
- 返回当前用户的公司、品牌、人员、角色标签、主管类型、AI skills。
- BOSS/ADMIN 返回全公司人员，其他角色返回 403（非管理员不应调用）。

**POST**
- 更新人员信息：纵向层级、品牌关联、横向角色、主管类型。
- 仅 BOSS/ADMIN 可调用。
- BOSS 不能被 ADMIN 修改。

### 7.2 `/api/process-roles`

**GET**：列出所有 `process_roles`。
**POST**：创建/更新工序角色（仅 BOSS/ADMIN）。

### 7.3 `/api/process-owner-scopes`

**GET**：列出所有 `process_owner_scopes`。
**POST**：创建/更新主管类型（仅 BOSS/ADMIN）。

### 7.4 `/api/ai-skills`

**GET**：列出所有 `ai_skills`。
**POST**：创建/更新 AI skill（仅 BOSS/ADMIN）。

### 7.5 业务 API 改造

所有业务 API（`/api/brands`、`/api/styles`、`/api/suppliers`、`/api/production`、`/api/seasons` 等）都需要：

1. 获取当前 session 和用户 `company_id`、`role_level`。
2. 计算可访问品牌 ID 列表。
3. 查询时附加 `company_id = ?` 和 `brand_id IN (...)` 条件。
4. 单条资源读取时校验该资源所属品牌是否在可访问列表。
5. 写操作校验纵向层级是否有编辑/删除/审批权限。

---

## 8. 后台配置页面 /admin

后台配置页面仅 BOSS/ADMIN 可访问，包含以下标签页：

### 8.1 公司信息

- 显示/编辑公司名称、LOGO、行业、规模等。

### 8.2 品牌管理

- 列表展示公司下所有品牌。
- 新增品牌、编辑品牌名称、归档/启用品牌。
- 设置默认品牌。

### 8.3 人员与权限

- 列表展示公司下所有 `profiles`。
- 为每个用户设置：
  - 纵向层级
  - 可访问品牌（多选）
  - 横向工序角色（多选）
  - 工序主管类型（仅当纵向层级为 process_owner 时显示）
- 保存时同步更新 `profiles`、`user_brands`、`user_process_roles`、`user_process_owner_scopes`。

### 8.4 工序角色管理

- 列表展示所有 `process_roles`。
- 新增/编辑角色：名称、所属工序节点、可见页面、可用 AI skills。

### 8.5 主管类型管理

- 列表展示所有 `process_owner_scopes`。
- 新增/编辑主管类型：名称、覆盖工序段、可用 AI 秘书 skill。

### 8.6 AI Skill 管理

- 列表展示所有 `ai_skills`。
- 新增/编辑 AI skill：名称、类型、所属工序、入口路由、配置 schema。
- 绑定到横向角色或主管类型。

---

## 9. 两个账号初始化

将 Supabase auth 中已注册的两个用户设置为公司/品牌/角色：

```sql
-- 老板账号
UPDATE profiles
SET company_id = '00000000-0000-0000-0000-000000000010',
    role_level = 'boss',
    name = 'BOSS'
WHERE user_id = '5c337a05-2e8b-4675-8543-d60c59902cf8';

-- 品牌主理人账号
UPDATE profiles
SET company_id = '00000000-0000-0000-0000-000000000010',
    role_level = 'brand_manager',
    name = '品牌主理人'
WHERE user_id = '19546527-536a-4e72-a033-4745afec2495';

-- 清除旧关联（避免重复执行产生脏数据）
DELETE FROM user_brands WHERE user_id = '19546527-536a-4e72-a033-4745afec2495';

-- 品牌主理人关联默认品牌 TEPNIX步戌
INSERT INTO user_brands (user_id, brand_id, role_level)
VALUES ('19546527-536a-4e72-a033-4745afec2495', '00000000-0000-0000-0000-000000000001', 'brand_manager');
```

后续所有人员/角色/品牌分配都通过 `/admin` 页面完成，无需再写 SQL。

---

## 10. 实施阶段规划

由于本次设计范围较大，建议分四个阶段实施，每个阶段都能独立运行和验证。

### 阶段一：基础 RBAC + 多品牌隔离

目标：让 2 个账号能正常登录并看到不同的内容。

- 扩展 `TenantContext`，注入 `userRole`、`availableBrands`、`isAdmin`。
- 扩展 RBAC 工具函数：`getAllowedBrandIds`、`canAccessRoute`。
- 动态侧边栏：BOSS/ADMIN 看到"品牌管理、供应商、后台配置"，其他角色看不到。
- API 数据隔离：`/api/brands`、`/api/styles` 等按角色过滤。
- 新增 `/admin` 页面框架（公司信息、品牌管理、人员权限三个基础标签）。
- 新增 `/forbidden` 403 页面。
- 执行 SQL 初始化 2 个账号。

### 阶段二：横向工序角色 + 角色驱动导航

目标：实现"一个账号多个角色"，不同角色看到不同页面。

- 新增 `process_roles` 表并初始化默认角色。
- 新增 `user_process_roles` 关联表。
- 扩展 `TenantContext` 暴露 `processRoles`、`accessibleRoutes`。
- 重写侧边栏过滤逻辑：根据 `processRoles` 决定显示哪些工序页面。
- `/admin` 增加"工序角色管理"和"人员-角色分配"功能。
- 业务页面（`/planning`、`/design`、`/styles`、`/production` 等）根据角色过滤展示内容。

### 阶段三：工序主管类型 + 工序段权限

目标：实现"设计主管/产品主管/运营主管/售后主管"的工序段管理。

- 新增 `process_owner_scopes` 表并初始化 4 个主管类型。
- 新增 `user_process_owner_scopes` 关联表。
- 扩展 `TenantContext` 暴露 `processOwnerScope`。
- 权限计算支持"主管类型覆盖工序段"。
- `/admin` 增加"主管类型管理"和"人员-主管类型分配"功能。
- 在款式/任务等数据中增加工序节点字段，支持按工序段过滤。

### 阶段四：AI 按工序重构 + AI Skill 权限

目标：把 AI 真正按工序和执行环节拆分。

- 新增 `ai_skills`、`process_role_ai_skills`、`process_owner_scope_ai_skills` 表。
- 重构 `/ai` 为 `/ai-workspace` "AI 智能体中心"。
- 各工序页面嵌入对应 AI 助手面板。
- 实现 AI skill 执行结果清单数据结构。
- `/admin` 增加"AI Skill 管理"功能。

---

## 11. 边界情况与错误处理

1. **用户无 `company_id`**：进入 onboarding 页面，提示联系管理员。
2. **用户有公司但无品牌权限**：显示"未被分配到任何品牌，请联系管理员"。
3. **用户访问无权限页面**：显示 403 禁止访问页，提供返回工作台按钮。
4. **URL 中 `brandId` 不在可访问列表**：自动重定向到第一个可访问品牌。
5. **BOSS 账号被 ADMIN 修改**：API 返回 403，提示"无权修改老板账号"。
6. **PROCESS_OWNER 未配置主管类型**：提示"请联系管理员配置主管类型"。
7. **EXECUTOR 无横向角色**：只能看通用页面，无法进入任何工序页面。

---

## 12. 后续可扩展

1. Next.js Middleware 统一路由拦截。
2. 按钮级权限控制（隐藏/禁用无权限操作按钮）。
3. 操作审计日志记录权限变更。
4. 品牌级季节权限隔离。
5. AI skill 的自动执行编排与工作流引擎。
