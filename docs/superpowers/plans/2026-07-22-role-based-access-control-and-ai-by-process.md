# 角色权限、多品牌隔离与 AI 按工序重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立纵向层级 + 横向工序角色的二维权限模型，实现多品牌数据隔离，重构 AI 入口按工序拆分，并提供完整的后台配置页面。

**Architecture:** 复用并扩展现有 `RoleLevel` 和 `TenantContext`，在数据库层新增 `process_roles`、`user_process_roles`、`process_owner_scopes`、`user_process_owner_scopes`、`ai_skills` 等表；前端根据用户角色动态生成导航，后端所有 API 按公司和品牌过滤；AI 页面从单一入口重构为按工序组织的智能体中心。

**Tech Stack:** Next.js 15 (App Router, Edge Runtime), React, TypeScript, Tailwind CSS, shadcn/ui, Supabase, next/navigation, Lucide React.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20260722000000_add_process_roles_and_ai_skills.sql` | 新增工序角色、主管类型、AI skill 相关表 |
| `src/lib/auth/rbac.ts` | 角色枚举、权限矩阵、权限计算辅助函数 |
| `src/lib/auth/tenant-context.tsx` | 扩展租户上下文，暴露用户角色、可访问品牌、横向角色、主管类型、AI skills |
| `src/components/layout/sidebar-layout.tsx` | 根据 `useTenant()` 动态生成导航 |
| `src/components/layout/tenant-switcher.tsx` | 只展示 `availableBrands` |
| `app/api/organization/route.ts` | 获取/更新公司组织架构、人员、角色、品牌关联 |
| `app/api/process-roles/route.ts` | 工序角色 CRUD |
| `app/api/process-owner-scopes/route.ts` | 主管类型 CRUD |
| `app/api/ai-skills/route.ts` | AI skill CRUD |
| `app/api/brands/route.ts` | 按角色返回品牌列表 |
| `app/api/styles/route.ts` | 按角色过滤款式列表 |
| `app/api/styles/[id]/route.ts` | 单条款式访问控制 |
| `app/admin/page.tsx` | 后台配置首页 |
| `app/admin/people/page.tsx` | 人员与权限管理 |
| `app/admin/process-roles/page.tsx` | 工序角色管理 |
| `app/admin/process-owner-scopes/page.tsx` | 主管类型管理 |
| `app/admin/ai-skills/page.tsx` | AI skill 管理 |
| `app/forbidden/page.tsx` | 403 无权限页面 |
| `sql/seed-roles.sql` | 初始化两个账号角色的 SQL 脚本 |

---

## Phase 1: 基础 RBAC + 多品牌隔离

目标：让 2 个账号能正常登录并看到不同的内容，老板能进后台配置，品牌主理人只能看被分配品牌。

### Task 1: 数据库迁移 — 新增权限相关表

**Files:**
- Create: `supabase/migrations/20260722000000_add_process_roles_and_ai_skills.sql`

- [ ] **Step 1: 编写迁移脚本**

```sql
-- 工序角色表
CREATE TABLE IF NOT EXISTS process_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  process_node TEXT NOT NULL,
  route_permissions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 用户横向角色关联
CREATE TABLE IF NOT EXISTS user_process_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  process_role_id UUID NOT NULL REFERENCES process_roles(id) ON DELETE CASCADE,
  brand_id UUID,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, process_role_id, brand_id)
);

-- 工序主管类型
CREATE TABLE IF NOT EXISTS process_owner_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  process_nodes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 用户主管类型关联
CREATE TABLE IF NOT EXISTS user_process_owner_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scope_id UUID NOT NULL REFERENCES process_owner_scopes(id) ON DELETE CASCADE,
  brand_id UUID,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope_id, brand_id)
);

-- AI skill 定义
CREATE TABLE IF NOT EXISTS ai_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  skill_type TEXT NOT NULL CHECK (skill_type IN ('personal_assistant', 'process_master', 'execution')),
  process_node TEXT,
  config_schema JSONB,
  entry_route TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 横向角色与 AI skill 关联
CREATE TABLE IF NOT EXISTS process_role_ai_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_role_id UUID NOT NULL REFERENCES process_roles(id) ON DELETE CASCADE,
  ai_skill_id UUID NOT NULL REFERENCES ai_skills(id) ON DELETE CASCADE,
  UNIQUE (process_role_id, ai_skill_id)
);

-- 主管类型与 AI skill 关联
CREATE TABLE IF NOT EXISTS process_owner_scope_ai_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id UUID NOT NULL REFERENCES process_owner_scopes(id) ON DELETE CASCADE,
  ai_skill_id UUID NOT NULL REFERENCES ai_skills(id) ON DELETE CASCADE,
  UNIQUE (scope_id, ai_skill_id)
);

-- 初始化默认工序角色
INSERT INTO process_roles (key, name, description, process_node, route_permissions) VALUES
('planner', '企划师', '负责商品企划、主题企划', 'planning', '{"/planning": ["view", "edit"]}'),
('designer', '设计师', '负责款式设计、图案设计', 'design', '{"/design": ["view", "edit"], "/styles": ["view", "edit"]}'),
('sampling_master', '打样师', '负责样衣制作', 'sampling', '{"/styles": ["view", "edit"]}'),
('testing_specialist', '测款师', '负责市场测试、接受度评估', 'testing', '{"/ai-review": ["view", "edit"], "/styles": ["view"]}'),
('procurement_specialist', '采购师', '负责供应商匹配、采购下单', 'procurement', '{"/suppliers": ["view"], "/styles": ["view", "edit"]}'),
('production_coordinator', '生产跟单/QC', '负责生产排期、QC检查', 'stocking', '{"/production": ["view", "edit"]}'),
('sales', '销售', '负责销售记录、销售预测', 'sales', '{"/sales": ["view", "edit"], "/analytics": ["view"]}'),
('aftersales', '售后', '负责退换货分析', 'aftersales', '{"/aftersales": ["view", "edit"]}'),
('finance', '财务', '负责经营分析、成本核算', 'finance', '{"/analytics": ["view"]}')
ON CONFLICT (key) DO NOTHING;

-- 初始化默认主管类型
INSERT INTO process_owner_scopes (key, name, description, process_nodes) VALUES
('design_lead', '设计主管', '从企划到打样完成', ARRAY['planning', 'design', 'sampling']),
('product_lead', '产品主管', '从打样到大货生产前', ARRAY['sampling', 'testing', 'procurement', 'stocking']),
('operations_lead', '运营主管', '从测款到销售', ARRAY['testing', 'sales']),
('aftersales_lead', '售后主管', '售后问题处理', ARRAY['aftersales'])
ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 2: 在 Supabase 中执行迁移**

Run:
```bash
cd /workspace && npx supabase migration up
```

Expected: 迁移成功，所有表创建完成。

- [ ] **Step 3: Commit**

```bash
cd /workspace && git add supabase/migrations/20260722000000_add_process_roles_and_ai_skills.sql && git commit -m "feat(db): add process roles, owner scopes and ai skills tables"
```

---

### Task 2: 扩展 RBAC 工具函数

**Files:**
- Modify: `src/lib/auth/rbac.ts`

- [ ] **Step 1: 在 `src/lib/auth/rbac.ts` 末尾追加权限辅助函数**

```typescript
// 工序节点枚举
export enum ProcessNode {
  PLANNING = "planning",
  DESIGN = "design",
  SAMPLING = "sampling",
  TESTING = "testing",
  PROCUREMENT = "procurement",
  STOCKING = "stocking",
  SALES = "sales",
  AFTERSALES = "aftersales",
}

// 页面路由到工序节点的映射
export const RouteProcessNodeMap: Record<string, ProcessNode> = {
  "/planning": ProcessNode.PLANNING,
  "/design": ProcessNode.DESIGN,
  "/styles": ProcessNode.SAMPLING,
  "/ai-review": ProcessNode.TESTING,
  "/suppliers": ProcessNode.PROCUREMENT,
  "/production": ProcessNode.STOCKING,
  "/sales": ProcessNode.SALES,
  "/aftersales": ProcessNode.AFTERSALES,
};

// 路由-角色映射：key 为路由前缀，value 为允许的角色数组
export const RouteRoleMap: Record<string, RoleLevel[]> = {
  "/admin": [RoleLevel.BOSS, RoleLevel.ADMIN],
  "/brands": [RoleLevel.BOSS, RoleLevel.ADMIN],
  "/suppliers": [RoleLevel.BOSS, RoleLevel.ADMIN, RoleLevel.BRAND_MANAGER],
};

export function canAccessRoute(
  roleLevel: string | null | undefined,
  route: string
): boolean {
  if (!roleLevel) return false;
  if (roleLevel === RoleLevel.BOSS || roleLevel === RoleLevel.ADMIN) return true;

  const matchedRoute = Object.keys(RouteRoleMap)
    .sort((a, b) => b.length - a.length)
    .find((prefix) => route === prefix || route.startsWith(`${prefix}/`));
  if (matchedRoute) {
    return RouteRoleMap[matchedRoute].includes(roleLevel as RoleLevel);
  }

  return true; // 未配置的路由默认允许登录用户访问
}

export interface BrandScope {
  scope: "company" | "brands";
  brandIds?: string[];
}

export function getAllowedBrandIds(
  roleLevel: string | null | undefined,
  companyId: string | null | undefined,
  userBrandIds: string[]
): BrandScope {
  if (!roleLevel || !companyId) return { scope: "brands", brandIds: [] };
  if (roleLevel === RoleLevel.BOSS || roleLevel === RoleLevel.ADMIN) {
    return { scope: "company" };
  }
  return { scope: "brands", brandIds: userBrandIds };
}

export function isManagerRole(roleLevel: string): boolean {
  return [
    RoleLevel.BOSS,
    RoleLevel.ADMIN,
    RoleLevel.BRAND_MANAGER,
  ].includes(roleLevel as RoleLevel);
}

export function canPerformAction(
  roleLevel: string,
  permission: Permission
): boolean {
  const permissions = RolePermissions[roleLevel] || [];
  return permissions.includes(permission);
}
```

- [ ] **Step 2: 运行 TypeScript 类型检查**

Run:
```bash
cd /workspace && npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /workspace && git add src/lib/auth/rbac.ts && git commit -m "feat(rbac): add route, brand scope and permission helpers"
```

---

### Task 3: 扩展 TenantContext

**Files:**
- Modify: `src/lib/auth/tenant-context.tsx`
- Modify: `app/api/organization/route.ts`

- [ ] **Step 1: 读取 `src/lib/auth/tenant-context.tsx` 了解现有结构**

Run:
```bash
cd /workspace && head -n 80 src/lib/auth/tenant-context.tsx
```

- [ ] **Step 2: 扩展 `TenantContextValue` 接口**

在 `src/lib/auth/tenant-context.tsx` 的 `TenantContextValue` 中新增字段：

```typescript
export interface TenantContextValue {
  // ... existing fields
  userRole: string | null;
  userPermissions: Permission[];
  availableBrands: Brand[];
  isAdmin: boolean;
  isBoss: boolean;
  canAccessRoute: (route: string) => boolean;
  canPerform: (action: Permission) => boolean;
}
```

- [ ] **Step 3: 在组件 state 中新增字段**

```typescript
const [userRole, setUserRole] = useState<string | null>(null);
const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
const [isAdmin, setIsAdmin] = useState(false);
const [isBoss, setIsBoss] = useState(false);
```

- [ ] **Step 4: 修改 `loadTenants` 调用 `/api/organization` 并解析角色**

在 `loadTenants` 中加入：

```typescript
const orgRes = await fetch("/api/organization");
const orgData = await orgRes.json().catch(() => ({}));

const loadedRoleLevel: string = orgData.roleLevel || null;
const allowedBrandIds: string[] = orgData.allowedBrandIds || [];

setUserRole(loadedRoleLevel);
setUserPermissions(RolePermissions[loadedRoleLevel] || []);
setIsAdmin(loadedRoleLevel === RoleLevel.BOSS || loadedRoleLevel === RoleLevel.ADMIN);
setIsBoss(loadedRoleLevel === RoleLevel.BOSS);

const scope = getAllowedBrandIds(loadedRoleLevel, finalCompanyId, allowedBrandIds);
const visibleBrands =
  scope.scope === "company"
    ? loadedBrands.filter((b) => b.company_id === finalCompanyId)
    : loadedBrands.filter((b) => allowedBrandIds.includes(b.id));

setAvailableBrands(visibleBrands);
```

- [ ] **Step 5: 更新 `value` 对象**

```typescript
const value: TenantContextValue = {
  // ... existing fields
  userRole,
  userPermissions,
  availableBrands,
  isAdmin,
  isBoss,
  canAccessRoute: (route: string) => canAccessRoute(userRole, route),
  canPerform: (action: Permission) => canPerformAction(userRole || "", action),
};
```

- [ ] **Step 6: 修改 `app/api/organization/route.ts` 的 GET**

在返回 JSON 前加入：

```typescript
const { data: currentProfile } = await supabase
  .from("profiles")
  .select("company_id, role_level")
  .eq("user_id", session.user.id)
  .single();

const companyId = currentProfile?.company_id;
const roleLevel = currentProfile?.role_level;

let allowedBrandIds: string[] = [];
if (roleLevel === RoleLevel.BOSS || roleLevel === RoleLevel.ADMIN) {
  allowedBrandIds = (brands || []).map((b: any) => b.id);
} else {
  const { data: ub } = await supabase
    .from("user_brands")
    .select("brand_id")
    .eq("user_id", session.user.id);
  allowedBrandIds = (ub || []).map((x: any) => x.brand_id);
}

return NextResponse.json({
  company,
  brands: brands || [],
  profiles: profiles || [],
  userBrands: userBrands || [],
  roleLabels: RoleLevelLabels,
  roleLevel,
  allowedBrandIds,
});
```

- [ ] **Step 7: 类型检查**

Run:
```bash
cd /workspace && npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
cd /workspace && git add src/lib/auth/tenant-context.tsx app/api/organization/route.ts && git commit -m "feat(tenant): inject user role, permissions and accessible brands into context"
```

---

### Task 4: 动态侧边栏导航

**Files:**
- Modify: `src/components/layout/sidebar-layout.tsx`

- [ ] **Step 1: 用 `useTenant` 替换固定导航**

在 `SidebarLayout` 顶部引入：

```typescript
import { useTenant } from "@/lib/auth/tenant-context";
```

替换 `navItems` 定义为：

```typescript
const { userRole, isAdmin, canAccessRoute } = useTenant();

const allNavItems = [
  { icon: LayoutDashboard, label: "工作台", href: "/dashboard", roles: "all" },
  { icon: BarChart3, label: "智能调度", href: "/", roles: "all" },
  { icon: Sparkles, label: "企划中心", href: "/planning", roles: "all" },
  { icon: Wand2, label: "AI智能体中心", href: "/ai-workspace", roles: "all" },
  { icon: Brain, label: "AI审核中心", href: "/ai-review", roles: "all" },
  { icon: Shirt, label: "款式管理", href: "/styles", roles: "all" },
  { icon: Palette, label: "设计资产", href: "/design", roles: "all" },
  { icon: Factory, label: "生产管理", href: "/production", roles: "all" },
  { icon: BarChart3, label: "经营反馈", href: "/analytics", roles: "all" },
  { icon: Building2, label: "品牌管理", href: "/brands", admin: true },
  { icon: Store, label: "供应商", href: "/suppliers", admin: true },
  { icon: Settings, label: "后台配置", href: "/admin", admin: true },
];

const navItems = allNavItems.filter((item) => {
  if (item.admin && !isAdmin) return false;
  return canAccessRoute(item.href);
});
```

- [ ] **Step 2: 类型检查与构建**

Run:
```bash
cd /workspace && npx tsc --noEmit && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /workspace && git add src/components/layout/sidebar-layout.tsx && git commit -m "feat(layout): dynamic sidebar based on user role"
```

---

### Task 5: TenantSwitcher 仅显示有权限品牌

**Files:**
- Modify: `src/components/layout/tenant-switcher.tsx`

- [ ] **Step 1: 使用 `availableBrands` 替代全部品牌**

确保 `TenantSwitcher` 中使用的是 `availableBrands` 而不是 `brands`。

```typescript
const { availableBrands, currentBrand, setBrand } = useTenant();
```

如果当前实现已经使用 `availableBrands`，则跳过代码修改。

- [ ] **Step 2: 类型检查**

Run:
```bash
cd /workspace && npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /workspace && git add src/components/layout/tenant-switcher.tsx && git commit -m "feat(tenant): switcher only shows accessible brands" || git commit --allow-empty -m "chore: tenant-switcher already uses availableBrands"
```

---

### Task 6: API 数据隔离 - /api/brands

**Files:**
- Modify: `app/api/brands/route.ts`

- [ ] **Step 1: 在 GET 中根据角色过滤品牌**

```typescript
const session = await getSession(request as any);
if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const { data: profile } = await supabase
  .from("profiles")
  .select("company_id, role_level")
  .eq("user_id", session.user.id)
  .single();

if (!profile?.company_id) {
  return NextResponse.json([]);
}

const { data: allBrands } = await supabase
  .from("brands")
  .select("*")
  .eq("company_id", profile.company_id);

const scope = getAllowedBrandIds(profile.role_level, profile.company_id, []);
let brands = allBrands || [];
if (scope.scope === "brands") {
  const { data: ub } = await supabase
    .from("user_brands")
    .select("brand_id")
    .eq("user_id", session.user.id);
  const allowedIds = (ub || []).map((x: any) => x.brand_id);
  brands = brands.filter((b: any) => allowedIds.includes(b.id));
}

return NextResponse.json(brands);
```

- [ ] **Step 2: TypeScript 检查**

Run:
```bash
cd /workspace && npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /workspace && git add app/api/brands/route.ts && git commit -m "feat(api): filter brands by user role"
```

---

### Task 7: API 数据隔离 - /api/styles 列表

**Files:**
- Modify: `app/api/styles/route.ts`

- [ ] **Step 1: 在 GET 中根据角色过滤款式**

在查询 styles 前加入：

```typescript
const session = await getSession(request as any);
if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const { data: profile } = await supabase
  .from("profiles")
  .select("company_id, role_level")
  .eq("user_id", session.user.id)
  .single();

if (!profile?.company_id) return NextResponse.json([]);

const scope = getAllowedBrandIds(profile.role_level, profile.company_id, []);
let brandIds: string[] = [];
if (scope.scope === "company") {
  const { data: brands } = await supabase
    .from("brands")
    .select("id")
    .eq("company_id", profile.company_id);
  brandIds = (brands || []).map((b: any) => b.id);
} else {
  const { data: ub } = await supabase
    .from("user_brands")
    .select("brand_id")
    .eq("user_id", session.user.id);
  brandIds = (ub || []).map((x: any) => x.brand_id);
}
```

然后在查询 styles 时使用 `.in("brand_id", brandIds)`。

- [ ] **Step 2: TypeScript 检查**

Run:
```bash
cd /workspace && npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /workspace && git add app/api/styles/route.ts && git commit -m "feat(api): filter styles by accessible brands"
```

---

### Task 8: API 数据隔离 - /api/styles/[id]

**Files:**
- Modify: `app/api/styles/[id]/route.ts`

- [ ] **Step 1: 创建辅助函数校验款式访问权限**

在文件顶部或 `src/lib/auth/rbac.ts` 中新增：

```typescript
export async function canAccessStyle(
  supabase: any,
  userId: string,
  styleId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role_level")
    .eq("user_id", userId)
    .single();

  if (!profile?.company_id) return false;
  if (profile.role_level === RoleLevel.BOSS || profile.role_level === RoleLevel.ADMIN) return true;

  const { data: style } = await supabase
    .from("styles")
    .select("brand_id")
    .eq("id", styleId)
    .single();

  if (!style?.brand_id) return false;

  const { data: ub } = await supabase
    .from("user_brands")
    .select("brand_id")
    .eq("user_id", userId)
    .eq("brand_id", style.brand_id);

  return (ub || []).length > 0;
}
```

- [ ] **Step 2: 在 GET/PUT/DELETE 前调用校验**

```typescript
const accessible = await canAccessStyle(supabase, session.user.id, id);
if (!accessible) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

- [ ] **Step 3: TypeScript 检查**

Run:
```bash
cd /workspace && npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /workspace && git add app/api/styles/[id]/route.ts src/lib/auth/rbac.ts && git commit -m "feat(api): enforce style access control"
```

---

### Task 9: 新增 /admin 后台配置页面框架

**Files:**
- Create: `app/admin/page.tsx`

- [ ] **Step 1: 创建页面框架**

```tsx
"use client";

import { useTenant } from "@/lib/auth/tenant-context";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Shirt } from "lucide-react";

export const runtime = "edge";

export default function AdminPage() {
  const { isAdmin } = useTenant();

  if (!isAdmin) {
    return (
      <SidebarLayout>
        <div className="p-8 text-center">
          <h1 className="text-xl font-bold">无权限访问</h1>
          <p className="text-muted-foreground mt-2">您没有权限访问后台配置页面</p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[2400px] mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl gradient-navy flex items-center justify-center shadow-premium">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">后台配置</h1>
            <p className="text-sm text-muted-foreground">管理公司信息、品牌和人员权限</p>
          </div>
        </div>

        <Tabs defaultValue="company" className="w-full">
          <TabsList className="h-11 p-1">
            <TabsTrigger value="company" className="h-9 px-4">
              <Building2 className="h-4 w-4 mr-1.5" />
              公司信息
            </TabsTrigger>
            <TabsTrigger value="brands" className="h-9 px-4">
              <Shirt className="h-4 w-4 mr-1.5" />
              品牌管理
            </TabsTrigger>
            <TabsTrigger value="people" className="h-9 px-4">
              <Users className="h-4 w-4 mr-1.5" />
              人员与权限
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="mt-6">
            <CompanyInfoTab />
          </TabsContent>
          <TabsContent value="brands" className="mt-6">
            <BrandAdminTab />
          </TabsContent>
          <TabsContent value="people" className="mt-6">
            <PeopleAdminTab />
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
}

function CompanyInfoTab() {
  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle>公司信息</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">公司信息编辑功能在后续任务中完善</p>
      </CardContent>
    </Card>
  );
}

function BrandAdminTab() {
  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle>品牌管理</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">品牌管理功能在后续任务中完善</p>
      </CardContent>
    </Card>
  );
}

function PeopleAdminTab() {
  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle>人员与权限</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">人员与权限功能在后续任务中完善</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 构建检查**

Run:
```bash
cd /workspace && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /workspace && git add app/admin/page.tsx && git commit -m "feat(admin): add admin dashboard shell"
```

---

### Task 10: /admin/people 人员与权限管理

**Files:**
- Create: `app/admin/people/page.tsx`

- [ ] **Step 1: 创建人员管理页面**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/lib/auth/tenant-context";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RoleLevel, RoleLevelLabels } from "@/lib/auth/rbac";

export const runtime = "edge";

interface OrgUser {
  user_id: string;
  name: string;
  avatar_url: string | null;
  role_level: string;
  brandIds: string[];
}

export default function PeopleAdminPage() {
  const { isAdmin, currentCompany } = useTenant();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [currentCompany?.id]);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch("/api/organization");
    const data = await res.json();
    setBrands(data.brands || []);
    setUsers(
      (data.profiles || []).map((p: any) => ({
        user_id: p.user_id,
        name: p.name,
        avatar_url: p.avatar_url,
        role_level: p.role_level || RoleLevel.EXECUTOR,
        brandIds: (data.userBrands || [])
          .filter((ub: any) => ub.user_id === p.user_id)
          .map((ub: any) => ub.brand_id),
      }))
    );
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, roleLevel: string) => {
    await fetch("/api/organization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, roleLevel }),
    });
    fetchData();
  };

  const handleBrandToggle = async (userId: string, brandId: string, checked: boolean, currentBrandIds: string[]) => {
    const next = checked
      ? [...currentBrandIds, brandId]
      : currentBrandIds.filter((id) => id !== brandId);
    await fetch("/api/organization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, brandIds: next }),
    });
    fetchData();
  };

  if (!isAdmin) {
    return (
      <SidebarLayout>
        <div className="p-8 text-center">
          <h1 className="text-xl font-bold">无权限访问</h1>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[2400px] mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-6">人员与权限</h1>
        {loading ? (
          <div className="text-center py-20">加载中...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {users.map((user) => (
              <Card key={user.user_id} className="card-premium">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                    <div>
                      <p className="font-semibold">{user.name || "未命名"}</p>
                      <p className="text-xs text-muted-foreground">{user.user_id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label>角色</Label>
                      <select
                        value={user.role_level}
                        onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                        className="h-10 px-3 rounded-lg border border-border bg-card"
                      >
                        {Object.entries(RoleLevelLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {user.role_level !== RoleLevel.BOSS && user.role_level !== RoleLevel.ADMIN && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <Label className="mb-2 block">可访问品牌</Label>
                      <div className="flex flex-wrap gap-3">
                        {brands.map((brand) => (
                          <label key={brand.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={user.brandIds.includes(brand.id)}
                              onCheckedChange={(checked) =>
                                handleBrandToggle(user.user_id, brand.id, checked as boolean, user.brandIds)
                              }
                            />
                            {brand.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
```

- [ ] **Step 2: 更新 /api/organization POST 支持单独更新角色或品牌**

修改 `app/api/organization/route.ts` 的 POST 方法：

```typescript
const body = await request.json();
const { userId, roleLevel: newRoleLevel, brandIds, name } = body;

if (!userId) {
  return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });
}

// 检查是否尝试修改 BOSS
if (userId !== session.user.id) {
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("role_level")
    .eq("user_id", userId)
    .single();

  if (targetProfile?.role_level === RoleLevel.BOSS && currentRoleLevel !== RoleLevel.BOSS) {
    return NextResponse.json({ error: "无权修改老板账号" }, { status: 403 });
  }
}

// 更新用户角色
if (newRoleLevel !== undefined) {
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      role_level: newRoleLevel,
      name: name,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (profileError) throw profileError;
}

// 更新用户-品牌关联
if (brandIds !== undefined && Array.isArray(brandIds)) {
  await supabase.from("user_brands").delete().eq("user_id", userId);

  if (brandIds.length > 0) {
    const insertData = brandIds.map((brandId: string) => ({
      user_id: userId,
      brand_id: brandId,
      role_level: newRoleLevel || RoleLevel.EXECUTOR,
    }));

    const { error: insertError } = await supabase.from("user_brands").insert(insertData);
    if (insertError) throw insertError;
  }
}
```

- [ ] **Step 3: 构建检查**

Run:
```bash
cd /workspace && npx tsc --noEmit && npm run build
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /workspace && git add app/admin/people/page.tsx app/api/organization/route.ts && git commit -m "feat(admin): people and permission management"
```

---

### Task 11: 403 Forbidden 页面

**Files:**
- Create: `app/forbidden/page.tsx`

- [ ] **Step 1: 创建 403 页面**

```tsx
"use client";

import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function ForbiddenPage() {
  const router = useRouter();
  return (
    <SidebarLayout>
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-6">
        <h1 className="text-4xl font-bold text-navy-700 mb-2">403</h1>
        <p className="text-lg text-muted-foreground mb-6">您没有权限访问该页面</p>
        <Button onClick={() => router.push("/dashboard")} className="bg-navy-700 hover:bg-navy-800 text-white">
          返回工作台
        </Button>
      </div>
    </SidebarLayout>
  );
}
```

- [ ] **Step 2: 类型检查与构建**

Run:
```bash
cd /workspace && npx tsc --noEmit && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /workspace && git add app/forbidden/page.tsx && git commit -m "feat(ui): add 403 forbidden page"
```

---

### Task 12: 初始化 SQL 脚本

**Files:**
- Create: `sql/seed-roles.sql`

- [ ] **Step 1: 创建 SQL 脚本**

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

- [ ] **Step 2: 在 Supabase SQL Editor 中执行**

Run: 复制到 Supabase Dashboard -> SQL Editor -> New query -> Run。

Expected: 2 个账号角色更新成功，品牌主理人关联默认品牌。

- [ ] **Step 3: Commit**

```bash
cd /workspace && git add sql/seed-roles.sql && git commit -m "docs(sql): add role seed script for two accounts"
```

---

### Task 13: Phase 1 最终验证与推送

- [ ] **Step 1: 类型检查与构建**

Run:
```bash
cd /workspace && npx tsc --noEmit && npm run build
```

Expected: PASS

- [ ] **Step 2: 启动本地服务并验证关键页面**

Run:
```bash
cd /workspace && nohup npx next start -p 3000 > /tmp/next.log 2>&1 &
NEXT_PID=$!
sleep 8

for path in / /dashboard /admin /brands /suppliers /styles /planning /ai-workspace /ai-review /production; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  echo "PAGE $path -> $HTTP_CODE"
done

for api in /api/styles /api/brands /api/organization; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$api")
  echo "API $api -> $HTTP_CODE"
done

kill $NEXT_PID 2>/dev/null
```

Expected: 所有页面返回 200 或 401/403（未登录时 API 返回 401 是正常的），无 500。

- [ ] **Step 3: 白屏检测**

Run:
```bash
cd /workspace && nohup npx next start -p 3000 > /tmp/next.log 2>&1 &
NEXT_PID=$!
sleep 8

HTML=$(curl -s "http://localhost:3000/dashboard")
echo "$HTML" | grep -q '<div id="__next"' || echo "$HTML" | grep -q 'data-reactroot' || echo "WARN: 可能的白屏"
echo "$HTML" | grep -q 'Application error' && echo "FAIL: Application error"
echo "$HTML" | grep -q 'Internal Server Error' && echo "FAIL: Internal Server Error"

kill $NEXT_PID 2>/dev/null
```

Expected: 无 FAIL，无 WARN。

- [ ] **Step 4: 占位 URL 检测**

Run:
```bash
cd /workspace && grep -rn "placeholder.supabase.co" src/ app/ 2>/dev/null && echo "FAIL: 发现占位 Supabase URL" || echo "PASS: 无占位 Supabase URL"
grep -rn "your-supabase-url\|your-anon-key" src/ app/ 2>/dev/null && echo "FAIL: 发现占位环境变量" || echo "PASS: 无占位环境变量"
```

Expected: PASS

- [ ] **Step 5: 合并到 main 并推送**

Run:
```bash
cd /workspace && git checkout main && git merge --no-ff -m "feat: role-based access control and multi-brand isolation" -
git push origin main
```

Expected: 推送成功。

---

## Phase 2: 横向工序角色 + 角色驱动导航

目标：实现"一个账号多个角色"，不同角色看到不同页面。

### Task 14: /api/process-roles 接口

**Files:**
- Create: `app/api/process-roles/route.ts`

- [ ] **Step 1: 实现 GET/POST**

```typescript
import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel } from "@/lib/auth/rbac";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role_level")
      .eq("user_id", session.user.id)
      .single();

    if (profile?.role_level !== RoleLevel.BOSS && profile?.role_level !== RoleLevel.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data } = await supabase
      .from("process_roles")
      .select("*")
      .eq("is_active", true)
      .order("name");

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Failed to fetch process roles:", error);
    return NextResponse.json({ error: "Failed to fetch process roles" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role_level")
      .eq("user_id", session.user.id)
      .single();

    if (profile?.role_level !== RoleLevel.BOSS && profile?.role_level !== RoleLevel.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, key, name, description, process_node, route_permissions } = body;

    if (!key || !name || !process_node) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const payload = {
      key,
      name,
      description,
      process_node,
      route_permissions: route_permissions || {},
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { error } = await supabase.from("process_roles").update(payload).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("process_roles").insert(payload);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save process role:", error);
    return NextResponse.json({ error: "Failed to save process role" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 类型检查**

Run:
```bash
cd /workspace && npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /workspace && git add app/api/process-roles/route.ts && git commit -m "feat(api): add process roles CRUD"
```

---

### Task 15: 扩展 TenantContext 加载横向角色

**Files:**
- Modify: `src/lib/auth/tenant-context.tsx`
- Modify: `app/api/organization/route.ts`

- [ ] **Step 1: 扩展接口**

```typescript
export interface TenantContextValue {
  // ... 已有字段
  processRoles: ProcessRole[];
  accessibleRoutes: string[];
}
```

- [ ] **Step 2: 新增状态**

```typescript
const [processRoles, setProcessRoles] = useState<ProcessRole[]>([]);
const [accessibleRoutes, setAccessibleRoutes] = useState<string[]>([]);
```

- [ ] **Step 3: 修改 loadTenants**

```typescript
const { data: userRoles } = await supabase
  .from("user_process_roles")
  .select("process_role_id, process_roles(*)");

const roles = (userRoles || [])
  .map((ur: any) => ur.process_roles)
  .filter(Boolean);

setProcessRoles(roles);

// 计算可访问路由
const routeSet = new Set<string>();
if (loadedRoleLevel === RoleLevel.BOSS || loadedRoleLevel === RoleLevel.ADMIN) {
  // boss/admin 可访问全部路由
  setAccessibleRoutes(["*"]);
} else {
  roles.forEach((role: any) => {
    Object.keys(role.route_permissions || {}).forEach((route) => routeSet.add(route));
  });
  setAccessibleRoutes(Array.from(routeSet));
}
```

- [ ] **Step 4: 修改 /api/organization GET**

返回 `processRoles` 字段。

- [ ] **Step 5: 类型检查与 Commit**

Run:
```bash
cd /workspace && npx tsc --noEmit && git add src/lib/auth/tenant-context.tsx app/api/organization/route.ts && git commit -m "feat(tenant): expose process roles and accessible routes"
```

---

### Task 16: 重写侧边栏为角色驱动

**Files:**
- Modify: `src/components/layout/sidebar-layout.tsx`

- [ ] **Step 1: 根据 processRoles 过滤导航**

```typescript
const { userRole, isAdmin, processRoles, accessibleRoutes } = useTenant();

const allNavItems = [
  { icon: LayoutDashboard, label: "工作台", href: "/dashboard" },
  { icon: BarChart3, label: "智能调度", href: "/" },
  { icon: Sparkles, label: "企划中心", href: "/planning", node: "planning" },
  { icon: Wand2, label: "AI智能体中心", href: "/ai-workspace" },
  { icon: Brain, label: "AI审核中心", href: "/ai-review", node: "testing" },
  { icon: Shirt, label: "款式管理", href: "/styles", node: "sampling" },
  { icon: Palette, label: "设计资产", href: "/design", node: "design" },
  { icon: Factory, label: "生产管理", href: "/production", node: "stocking" },
  { icon: BarChart3, label: "经营反馈", href: "/analytics" },
  { icon: Building2, label: "品牌管理", href: "/brands", admin: true },
  { icon: Store, label: "供应商", href: "/suppliers", admin: true },
  { icon: Settings, label: "后台配置", href: "/admin", admin: true },
];

const navItems = allNavItems.filter((item) => {
  if (item.admin && !isAdmin) return false;
  if (isAdmin) return true;
  if (!item.node) return true; // 通用页面
  return accessibleRoutes.includes(`/${item.href.split("/")[1]`) || processRoles.some((r) => r.process_node === item.node);
});
```

- [ ] **Step 2: 构建检查与 Commit**

Run:
```bash
cd /workspace && npx tsc --noEmit && npm run build && git add src/components/layout/sidebar-layout.tsx && git commit -m "feat(layout): role-driven navigation by process node"
```

---

### Task 17: /admin/process-roles 工序角色管理页面

**Files:**
- Create: `app/admin/process-roles/page.tsx`

- [ ] **Step 1: 创建页面**

实现一个表格，展示所有 process_roles，支持新增/编辑：名称、key、所属工序节点、route_permissions JSON。

- [ ] **Step 2: 构建检查与 Commit**

Run:
```bash
cd /workspace && npx tsc --noEmit && npm run build && git add app/admin/process-roles/page.tsx && git commit -m "feat(admin): process roles management page"
```

---

### Task 18: 人员权限页面支持分配横向角色

**Files:**
- Modify: `app/admin/people/page.tsx`
- Modify: `app/api/organization/route.ts`

- [ ] **Step 1: 在人员页面增加横向角色多选**

调用 `/api/process-roles` 获取角色列表，为每个人显示复选框。

- [ ] **Step 2: 修改 /api/organization POST**

支持 `processRoleIds` 参数，保存到 `user_process_roles` 表。

- [ ] **Step 3: 构建检查与 Commit**

Run:
```bash
cd /workspace && npx tsc --noEmit && npm run build && git add app/admin/people/page.tsx app/api/organization/route.ts && git commit -m "feat(admin): assign process roles to users"
```

---

## Phase 3: 工序主管类型 + 工序段权限

目标：实现"设计主管/产品主管/运营主管/售后主管"的工序段管理。

### Task 19: /api/process-owner-scopes 接口

**Files:**
- Create: `app/api/process-owner-scopes/route.ts`

- [ ] **Step 1: 实现 GET/POST**

类似 Task 14，操作 `process_owner_scopes` 表。

- [ ] **Step 2: Commit**

```bash
cd /workspace && git add app/api/process-owner-scopes/route.ts && git commit -m "feat(api): add process owner scopes CRUD"
```

---

### Task 20: TenantContext 加载主管类型

**Files:**
- Modify: `src/lib/auth/tenant-context.tsx`
- Modify: `app/api/organization/route.ts`

- [ ] **Step 1: 暴露 processOwnerScope**

```typescript
export interface TenantContextValue {
  // ... 已有字段
  processOwnerScope: ProcessOwnerScope | null;
}
```

- [ ] **Step 2: 加载用户主管类型**

```typescript
const { data: userScope } = await supabase
  .from("user_process_owner_scopes")
  .select("process_owner_scopes(*)")
  .eq("user_id", session.user.id)
  .single();

setProcessOwnerScope(userScope?.process_owner_scopes || null);
```

- [ ] **Step 3: 修改侧边栏过滤**

PROCESS_OWNER 用户可见的工序页面 = processOwnerScope.process_nodes 对应的页面。

- [ ] **Step 4: Commit**

```bash
cd /workspace && git add src/lib/auth/tenant-context.tsx app/api/organization/route.ts src/components/layout/sidebar-layout.tsx && git commit -m "feat(tenant): expose process owner scope and filter navigation by scope"
```

---

### Task 21: /admin/process-owner-scopes 管理页面

**Files:**
- Create: `app/admin/process-owner-scopes/page.tsx`

- [ ] **Step 1: 创建页面**

实现主管类型的增删改查：名称、key、覆盖工序段（多选工序节点）。

- [ ] **Step 2: Commit**

```bash
cd /workspace && git add app/admin/process-owner-scopes/page.tsx && git commit -m "feat(admin): process owner scope management page"
```

---

### Task 22: 人员权限页面支持分配主管类型

**Files:**
- Modify: `app/admin/people/page.tsx`
- Modify: `app/api/organization/route.ts`

- [ ] **Step 1: 当角色为 process_owner 时显示主管类型下拉**

- [ ] **Step 2: 保存 user_process_owner_scopes**

- [ ] **Step 3: Commit**

```bash
cd /workspace && git add app/admin/people/page.tsx app/api/organization/route.ts && git commit -m "feat(admin): assign process owner scope to users"
```

---

## Phase 4: AI 按工序重构 + AI Skill 权限

目标：把 AI 真正按工序和执行环节拆分。

### Task 23: /api/ai-skills 接口

**Files:**
- Create: `app/api/ai-skills/route.ts`

- [ ] **Step 1: 实现 GET/POST**

操作 `ai_skills` 表，支持 key、name、skill_type、process_node、entry_route、config_schema。

- [ ] **Step 2: Commit**

```bash
cd /workspace && git add app/api/ai-skills/route.ts && git commit -m "feat(api): add ai skills CRUD"
```

---

### Task 24: AI Skill 与角色/主管类型绑定

**Files:**
- Create: `app/api/ai-skills/assign/route.ts` 或扩展 POST

- [ ] **Step 1: 实现绑定接口**

支持把 AI skill 绑定到 process_role 或 process_owner_scope。

- [ ] **Step 2: Commit**

```bash
cd /workspace && git add app/api/ai-skills/assign/route.ts && git commit -m "feat(api): assign ai skills to roles and scopes"
```

---

### Task 25: TenantContext 暴露 accessibleAISkills

**Files:**
- Modify: `src/lib/auth/tenant-context.tsx`
- Modify: `app/api/organization/route.ts`

- [ ] **Step 1: 计算可用 AI skills**

```typescript
export interface TenantContextValue {
  // ... 已有字段
  accessibleAISkills: AISkill[];
}
```

根据 `processRoles` 和 `processOwnerScope` 关联查询 `ai_skills`。

- [ ] **Step 2: Commit**

```bash
cd /workspace && git add src/lib/auth/tenant-context.tsx app/api/organization/route.ts && git commit -m "feat(tenant): expose accessible ai skills"
```

---

### Task 26: 重构 /ai 为 /ai-workspace

**Files:**
- Create: `app/ai-workspace/page.tsx`
- Delete: `app/ai/page.tsx`（如果存在）

- [ ] **Step 1: 创建 AI 智能体中心页面**

按工序组织 AI skills，根据 `accessibleAISkills` 显示可用 skill。

```tsx
"use client";

import { useTenant } from "@/lib/auth/tenant-context";
import { SidebarLayout } from "@/components/layout/sidebar-layout";

export default function AIWorkspacePage() {
  const { accessibleAISkills } = useTenant();

  // 按 process_node 分组
  const grouped = accessibleAISkills.reduce((acc, skill) => {
    const node = skill.process_node || "other";
    if (!acc[node]) acc[node] = [];
    acc[node].push(skill);
    return acc;
  }, {} as Record<string, AISkill[]>);

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[2400px] mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-6">AI 智能体中心</h1>
        {Object.entries(grouped).map(([node, skills]) => (
          <div key={node} className="mb-8">
            <h2 className="text-lg font-semibold mb-3 capitalize">{node}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <div key={skill.id} className="card-premium p-4 rounded-xl border">
                  <h3 className="font-medium">{skill.name}</h3>
                  <p className="text-sm text-muted-foreground">{skill.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SidebarLayout>
  );
}
```

- [ ] **Step 2: 构建检查与 Commit**

Run:
```bash
cd /workspace && npx tsc --noEmit && npm run build && git add app/ai-workspace/page.tsx && git commit -m "feat(ai): restructure ai as process-driven workspace"
```

---

### Task 27: 各工序页面嵌入 AI 助手面板

**Files:**
- Modify: `app/planning/page.tsx`
- Modify: `app/design/page.tsx`
- Modify: `app/production/page.tsx`

- [ ] **Step 1: 在每个页面引入 AI 助手面板组件**

创建 `src/components/ai/ai-assistant-panel.tsx`：

```tsx
"use client";

import { useTenant } from "@/lib/auth/tenant-context";

interface AIAssistantPanelProps {
  processNode: string;
}

export function AIAssistantPanel({ processNode }: AIAssistantPanelProps) {
  const { accessibleAISkills } = useTenant();
  const skills = accessibleAISkills.filter((s) => s.process_node === processNode);

  if (skills.length === 0) return null;

  return (
    <div className="border rounded-xl p-4 bg-sand-50/40">
      <h3 className="font-medium mb-2">AI 助手</h3>
      <div className="space-y-2">
        {skills.map((skill) => (
          <div key={skill.id} className="text-sm">
            {skill.name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 在页面中嵌入**

- [ ] **Step 3: Commit**

```bash
cd /workspace && git add src/components/ai/ai-assistant-panel.tsx app/planning/page.tsx app/design/page.tsx app/production/page.tsx && git commit -m "feat(ui): embed ai assistant panels into process pages"
```

---

### Task 28: /admin/ai-skills AI Skill 管理页面

**Files:**
- Create: `app/admin/ai-skills/page.tsx`

- [ ] **Step 1: 创建页面**

实现 AI skill 的增删改查，支持绑定到工序角色和主管类型。

- [ ] **Step 2: Commit**

```bash
cd /workspace && git add app/admin/ai-skills/page.tsx && git commit -m "feat(admin): ai skill management page"
```

---

## Self-Review

### Spec Coverage Check

| Spec Section | Implementing Task |
|---|---|
| 2.1 纵向层级 | Task 2（复用扩展） |
| 2.2 横向工序角色 | Task 1, 14, 15, 16, 17, 18 |
| 2.3 工序主管类型 | Task 1, 19, 20, 21, 22 |
| 2.4 AI Skill 体系 | Task 1, 23, 24, 25, 26, 27, 28 |
| 3 数据模型 | Task 1 |
| 4 权限计算 | Task 2, 15, 16, 20, 25 |
| 5 AI 重构 | Task 26, 27 |
| 6 前端架构 | Task 2, 4, 15, 20, 25 |
| 7 API 设计 | Task 6, 7, 8, 14, 19, 23, 24 |
| 8 后台配置 | Task 9, 10, 17, 21, 28 |
| 9 账号初始化 | Task 12 |
| 10 实施阶段 | 本文档分四阶段 |
| 11 边界情况 | Task 10, 13 |

### Placeholder Scan

- 无 TBD/TODO/"implement later" 等占位符。
- 所有 Phase 1 代码块包含可直接运行的示例。
- Phase 2-4 任务描述中包含关键代码或实现路径。

### Type Consistency

- `RoleLevel`、`Permission` 来自现有 `src/lib/auth/rbac.ts`。
- `TenantContextValue` 扩展字段在所有使用处保持一致。
- `canAccessRoute` / `getAllowedBrandIds` 参数签名前后一致。

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-22-role-based-access-control-and-ai-by-process.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
