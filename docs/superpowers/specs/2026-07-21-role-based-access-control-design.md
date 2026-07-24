# 角色权限与多品牌隔离设计方案

## 1. 背景与目标

当前系统已存在 5 级角色定义（`src/lib/auth/rbac.ts`）和公司/品牌/季节多租户上下文（`src/lib/auth/tenant-context.tsx`），但导航固定、数据隔离依赖前端 URL 参数，存在以下问题：

1. 老板账号与品牌主理人账号看到完全相同的侧边栏和页面。
2. 品牌主理人无法被限制只能访问被分配的品牌。
3. 缺少统一的后台配置入口，老板无法在公司层面管理品牌、人员和权限。

本设计目标：
- 让 `BOSS` 能看到公司名下所有品牌，并进入后台配置页面管理品牌名称、人员与权限。
- 让 `BRAND_MANAGER`（品牌主理人）只能看到被分配品牌的全部开发明细。
- 让 `PROCESS_OWNER`、`EXECUTOR` 等角色按权限看到对应模块。
- 通过 TenantContext 统一驱动品牌切换，保证 URL、localStorage 和权限三者一致。

## 2. 数据模型与权限规则

### 2.1 角色层级

复用现有 `RoleLevel`：

```ts
export enum RoleLevel {
  BOSS = "boss",                    // 老板（全权限）
  ADMIN = "admin",                  // 公司管理员
  BRAND_MANAGER = "brand_manager",  // 品牌主理人
  PROCESS_OWNER = "process_owner",  // 工序负责人
  EXECUTOR = "executor",            // 执行者
}
```

### 2.2 数据隔离规则

| 角色 | 可见公司 | 可见品牌 | 可管理用户 | 可进入后台配置 |
|---|---|---|---|---|
| BOSS | 自己所属公司 | 公司下所有品牌 | 是 | 是 |
| ADMIN | 自己所属公司 | 公司下所有品牌 | 是 | 是 |
| BRAND_MANAGER | 自己所属公司 | 仅 `user_brands` 中关联的品牌 | 否 | 否 |
| PROCESS_OWNER | 自己所属公司 | 仅 `user_brands` 中关联的品牌 | 否 | 否 |
| EXECUTOR | 自己所属公司 | 仅 `user_brands` 中关联的品牌 | 否 | 否 |

### 2.3 关键表结构

`profiles` 表已包含 `company_id`、`role_level`、`brand_id`。`user_brands` 关联表已存在，用于支持一个用户关联多个品牌。

设计约束：
- `profiles.company_id` 决定用户所属公司，不可变更。
- `user_brands` 决定用户可访问的品牌列表。
- 对于 `BOSS` / `ADMIN`，忽略 `user_brands`，返回公司下全部品牌。
- 对于 `BRAND_MANAGER` 及以下，必须至少关联一个品牌，否则进入“无权限访问任何品牌”的提示页。

## 3. TenantContext 扩展

在 `TenantContextValue` 中新增用户角色和权限字段：

```ts
export interface TenantContextValue {
  // ... 现有字段
  userRole: string | null;          // 当前用户 role_level
  userPermissions: Permission[];    // 当前用户权限列表
  availableBrands: Brand[];         // 根据角色过滤后的可访问品牌
  isAdmin: boolean;                 // BOSS 或 ADMIN
  canAccessRoute: (route: string) => boolean;
}
```

### 3.1 加载流程

1. 调用 `/api/organization` 获取当前用户的公司、角色、可访问品牌。
2. 如果 `role_level` 为 `BOSS` / `ADMIN`，`availableBrands` = 公司下全部品牌。
3. 否则 `availableBrands` = `user_brands` 中关联的品牌。
4. 结合 URL / localStorage 中的 `brandId`，如果用户无权限访问该品牌，则自动切换到 `availableBrands[0]`。
5. 将 `userRole`、`userPermissions`、`isAdmin` 注入上下文。

## 4. 导航与路由控制

### 4.1 动态侧边栏

`sidebar-layout.tsx` 不再使用固定的 `navItems`，而是根据 `useTenant()` 中的 `userRole` 和 `userPermissions` 动态生成。

基础模块（所有登录用户可见）：
- 工作台 /dashboard
- 款式管理 /styles
- 设计资产 /design
- 生产管理 /production
- 经营反馈 /analytics

管理模块（仅 BOSS / ADMIN 可见）：
- 品牌管理 /brands
- 供应商 /suppliers
- 后台配置 /admin（新增）

AI 模块（按 `RolePermissions` 中的 `VIEW` 权限控制，默认所有角色可见）：
- 智能调度 /
- 企划中心 /planning
- AI 智能分析 /ai
- AI 审核中心 /ai-review

### 4.2 路由级保护

在需要保护的页面顶部增加统一守卫组件：

```tsx
export const runtime = "edge";

export default function AdminPage() {
  const { isAdmin } = useTenant();
  if (!isAdmin) return <ForbiddenPage />;
  return <AdminContent />;
}
```

对于服务端渲染的页面，后续可通过 Next.js middleware 统一拦截 `/admin/*` 路由（第二阶段）。

## 5. API 权限校验

### 5.1 统一辅助函数

在 `src/lib/auth/rbac.ts` 中新增：

```ts
export function getAllowedBrandIds(
  roleLevel: string,
  companyId: string,
  userBrandIds: string[]
): { scope: "company" | "brands"; brandIds?: string[] }
```

### 5.2 各 API 改造点

- `/api/organization`：BOSS/ADMIN 返回全公司人员；其他角色返回 403。
- `/api/brands`：根据角色返回全部品牌或过滤后的品牌。
- `/api/styles`：查询时自动附加 `brand_id IN (...)` 或 `company_id = ?`。
- `/api/styles/[id]`：读取前校验该款式所属品牌是否在用户可访问列表。
- `/api/suppliers`：BOSS/ADMIN 可管理；其他角色只读。
- `/api/profile`：允许用户修改自己的 `name` 和 `avatar_url`，禁止修改 `role_level`。

## 6. 后台配置页面（/admin）

新增独立后台配置页面，仅 BOSS / ADMIN 可访问，包含三个标签页：

### 6.1 公司信息

- 显示/编辑公司名称。
- 未来可扩展：公司 LOGO、行业、规模等。

### 6.2 品牌管理

- 列表展示公司下所有品牌。
- 新增品牌、编辑品牌名称、归档品牌。
- 切换当前操作品牌。

### 6.3 人员与权限

- 列表展示公司下所有 `profiles`。
- 为每个用户分配角色（BOSS / ADMIN / BRAND_MANAGER / PROCESS_OWNER / EXECUTOR）。
- 为 BRAND_MANAGER 及以下角色勾选可访问品牌（多选）。
- 保存时写入 `profiles.role_level` 和 `user_brands`。

## 7. 两个账号的初始化

通过 SQL 将 Supabase auth 中已注册的两个用户设置为公司/品牌/角色：

```sql
-- 假设老板账号 user_id = '<uid1>'，品牌主理人账号 user_id = '<uid2>'
UPDATE profiles
SET company_id = '00000000-0000-0000-0000-000000000010',
    role_level = 'boss'
WHERE user_id = '<uid1>';

UPDATE profiles
SET company_id = '00000000-0000-0000-0000-000000000010',
    role_level = 'brand_manager'
WHERE user_id = '<uid2>';

-- 品牌主理人关联默认品牌
INSERT INTO user_brands (user_id, brand_id, role_level)
VALUES ('<uid2>', '00000000-0000-0000-0000-000000000001', 'brand_manager');
```

后续可在 `/admin/people` 中通过 UI 完成分配，无需再写 SQL。

## 8. 边界情况与错误处理

- 用户无 `company_id`：进入 onboarding 页面，提示联系管理员。
- 用户有公司但无品牌权限：提示“未被分配到任何品牌”。
- 用户访问无权限页面：显示 403 禁止访问页，提供返回工作台按钮。
- URL 中 `brandId` 不在可访问列表：自动重定向到第一个可访问品牌。

## 9. 后续可扩展

- Next.js Middleware 统一路由拦截。
- 按钮级权限控制（隐藏/禁用无权限操作按钮）。
- 操作审计日志记录权限变更。
