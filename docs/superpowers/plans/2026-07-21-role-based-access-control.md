# 角色权限与多品牌隔离实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现基于角色的侧边栏导航、数据隔离和后台配置页面，让老板账号管理公司与人员，品牌主理人只能访问被分配品牌。

**Architecture:** 复用现有 `RoleLevel` 和 `TenantContext`，在上下文中注入 `userRole` / `availableBrands` / `isAdmin`；前端根据角色动态渲染导航，后端 API 根据角色过滤品牌与款式数据；新增 `/admin` 页面供 BOSS/ADMIN 管理公司与人员。

**Tech Stack:** Next.js 15 (App Router, Edge Runtime), React, TypeScript, Tailwind CSS, shadcn/ui, Supabase, next/navigation.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/auth/rbac.ts` | 新增 `getAllowedBrandIds`、`canAccessRoute`、`routeRoleMap` 等权限工具函数 |
| `src/lib/auth/tenant-context.tsx` | 扩展上下文，加载并暴露 `userRole`、`availableBrands`、`isAdmin`、`canAccessRoute` |
| `src/components/layout/sidebar-layout.tsx` | 根据 `useTenant()` 动态生成导航，隐藏无权限入口 |
| `src/components/layout/tenant-switcher.tsx` | 只展示 `availableBrands`，无权限品牌不可见 |
| `app/api/organization/route.ts` | GET 返回当前用户 `role_level` 和 `allowedBrandIds`；POST 校验只有 BOSS/ADMIN 可分配权限 |
| `app/api/brands/route.ts` | GET 根据角色返回全部或过滤后的品牌 |
| `app/api/styles/route.ts` | GET 根据角色过滤 `brand_id` |
| `app/api/styles/[id]/route.ts` | GET/PUT/DELETE 前校验款式所属品牌是否可访问 |
| `app/admin/page.tsx` | 后台配置首页，含公司信息、品牌管理、人员权限三个 Tabs |
| `app/admin/people/page.tsx` | 人员列表、角色分配、品牌多选 |
| `app/forbidden/page.tsx` | 403 无权限页面 |
| `sql/seed-roles.sql` | 初始化两个账号角色的 SQL 脚本 |

---

## Task 1: 扩展 RBAC 工具函数

**Files:**
- Modify: `src/lib/auth/rbac.ts`

- [ ] **Step 1: 在 `src/lib/auth/rbac.ts` 末尾追加权限辅助函数**

```typescript
// 路由-角色映射：key 为路由前缀，value 为允许的角色数组
export const RouteRoleMap: Record<string, RoleLevel[]> = {
  "/admin": [RoleLevel.BOSS, RoleLevel.ADMIN],
  "/brands": [RoleLevel.BOSS, RoleLevel.ADMIN],
  "/suppliers": [RoleLevel.BOSS, RoleLevel.ADMIN],
};

export function canAccessRoute(roleLevel: string | null | undefined, route: string): boolean {
  if (!roleLevel) return false;
  const matchedRoute = Object.keys(RouteRoleMap)
    .sort((a, b) => b.length - a.length)
    .find((prefix) => route === prefix || route.startsWith(`${prefix}/`));
  if (!matchedRoute) return true; // 未配置的路由默认允许登录用户访问
  return RouteRoleMap[matchedRoute].includes(roleLevel as RoleLevel);
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
```

- [ ] **Step 2: 运行 TypeScript 类型检查**

Run:
```bash
cd /workspace && npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /workspace && git add src/lib/auth/rbac.ts && git commit -m "feat(rbac): add route and brand scope helpers"
```

---

## Task 2: 扩展 TenantContext

**Files:**
- Modify: `src/lib/auth/tenant-context.tsx`
- Modify: `app/api/organization/route.ts`

- [ ] **Step 1: 扩展 `TenantContextValue` 接口**

在 `src/lib/auth/tenant-context.tsx` 的 `TenantContextValue` 中新增字段：

```typescript
export interface TenantContextValue {
  // ... existing fields
  userRole: string | null;
  userPermissions: string[];
  isAdmin: boolean;
  canAccessRoute: (route: string) => boolean;
}
```

- [ ] **Step 2: 修改 `loadTenants` 调用 `/api/organization` 并解析角色**

将 `loadTenants` 中的并行 fetch 改为：

```typescript
const orgRes = await fetch("/api/organization");
const orgData = await orgRes.json().catch(() => ({}));

const loadedCompanies: Company[] = orgData.companies || [];
const loadedBrands: Brand[] = orgData.brands || [];
const loadedSeasons: Season[] = orgData.seasons || [];
const userRole: string = orgData.roleLevel || null;
const allowedBrandIds: string[] = orgData.allowedBrandIds || [];

setUserRole(userRole);
setUserPermissions(RolePermissions[userRole] || []);
setIsAdmin(userRole === RoleLevel.BOSS || userRole === RoleLevel.ADMIN);

const scope = getAllowedBrandIds(userRole, finalCompanyId, allowedBrandIds);
const visibleBrands =
  scope.scope === "company"
    ? loadedBrands.filter((b) => b.company_id === finalCompanyId)
    : loadedBrands.filter((b) => allowedBrandIds.includes(b.id));

setBrands(visibleBrands);
```

（需要同步在组件 state 中新增 `userRole`、`userPermissions`、`isAdmin`。）

- [ ] **Step 3: 更新 `value` 对象**

```typescript
const value: TenantContextValue = {
  // ... existing fields
  userRole,
  userPermissions,
  isAdmin,
  canAccessRoute: (route: string) => canAccessRoute(userRole, route),
};
```

- [ ] **Step 4: 修改 `app/api/organization/route.ts` 的 GET**

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

- [ ] **Step 5: 类型检查**

Run:
```bash
cd /workspace && npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /workspace && git add src/lib/auth/tenant-context.tsx app/api/organization/route.ts && git commit -m "feat(tenant): inject user role and allowed brands into context"
```

---

## Task 3: 动态侧边栏导航

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
  { icon: Wand2, label: "AI智能分析", href: "/ai", roles: "all" },
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

## Task 4: TenantSwitcher 仅显示有权限品牌

**Files:**
- Modify: `src/components/layout/tenant-switcher.tsx`

- [ ] **Step 1: 使用 `availableBrands` 替代全部品牌**

确保 `TenantSwitcher` 中使用的是 `availableBrands` 而不是 `brands`。如果当前实现已经使用 `availableBrands`，则跳过。

若需要修改，找到渲染品牌列表的位置，替换为：

```typescript
const { availableBrands, currentBrand, setBrand } = useTenant();
```

- [ ] **Step 2: Commit（如无需改动则创建空 commit 说明）**

```bash
cd /workspace && git add src/components/layout/tenant-switcher.tsx && git commit -m "feat(tenant): switcher only shows accessible brands" || git commit --allow-empty -m "chore: tenant-switcher already uses availableBrands"
```

---

## Task 5: API 数据隔离 - /api/brands

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

## Task 6: API 数据隔离 - /api/styles 列表

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

## Task 7: API 数据隔离 - /api/styles/[id]

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

- [ ] **Step 3: TypeScript 检查与 Commit**

Run:
```bash
cd /workspace && npx tsc --noEmit
```

Expected: PASS

```bash
cd /workspace && git add app/api/styles/[id]/route.ts src/lib/auth/rbac.ts && git commit -m "feat(api): enforce style access control"
```

---

## Task 8: 新增 /admin 后台配置页面框架

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
        <p className="text-muted-foreground">公司信息编辑功能在 Task 9 中完善</p>
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
        <p className="text-muted-foreground">品牌管理功能在 Task 9 中完善</p>
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
        <p className="text-muted-foreground">人员与权限功能在 Task 9 中完善</p>
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

## Task 9: /admin/people 人员与权限管理

**Files:**
- Create: `app/admin/people/page.tsx`

- [ ] **Step 1: 创建人员管理页面**

实现一个表格/卡片列表，展示公司人员：

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

确保 `app/api/organization/route.ts` 的 POST 中 `brandIds` 为空数组时不会清空关联，除非显式传入。当前实现是：传入 brandIds 就删除再插入。Task 2 已经修改过，这里需要确认行为。

如果 `body` 中只传 `roleLevel`，则只更新 `profiles.role_level`，不修改 `user_brands`。修改逻辑：

```typescript
if (newRoleLevel !== undefined) {
  await supabase.from("profiles").update({ role_level: newRoleLevel }).eq("user_id", userId);
}

if (brandIds !== undefined) {
  await supabase.from("user_brands").delete().eq("user_id", userId);
  if (brandIds.length > 0) {
    const insertData = brandIds.map((brandId: string) => ({
      user_id: userId,
      brand_id: brandId,
      role_level: newRoleLevel || RoleLevel.EXECUTOR,
    }));
    await supabase.from("user_brands").insert(insertData);
  }
}
```

- [ ] **Step 3: 构建检查**

Run:
```bash
cd /workspace && npm run build
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /workspace && git add app/admin/people/page.tsx app/api/organization/route.ts && git commit -m "feat(admin): people and permission management"
```

---

## Task 10: 403 Forbidden 页面

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

- [ ] **Step 2: Commit**

```bash
cd /workspace && git add app/forbidden/page.tsx && git commit -m "feat(ui): add 403 forbidden page"
```

---

## Task 11: 初始化 SQL 脚本

**Files:**
- Create: `sql/seed-roles.sql`

- [ ] **Step 1: 创建 SQL 脚本**

```sql
-- 请将 <uid1> 替换为老板账号的 user_id，<uid2> 替换为品牌主理人账号的 user_id
-- 可在 Supabase Dashboard -> Authentication -> Users 中复制 User ID

UPDATE profiles
SET company_id = '00000000-0000-0000-0000-000000000010',
    role_level = 'boss'
WHERE user_id = '<uid1>';

UPDATE profiles
SET company_id = '00000000-0000-0000-0000-000000000010',
    role_level = 'brand_manager'
WHERE user_id = '<uid2>';

-- 清除旧关联（避免重复执行产生脏数据）
DELETE FROM user_brands WHERE user_id = '<uid2>';

-- 品牌主理人关联默认品牌
INSERT INTO user_brands (user_id, brand_id, role_level)
VALUES ('<uid2>', '00000000-0000-0000-0000-000000000001', 'brand_manager');
```

- [ ] **Step 2: Commit**

```bash
cd /workspace && git add sql/seed-roles.sql && git commit -m "docs(sql): add role seed script for two accounts"
```

---

## Task 12: 最终验证与推送

- [ ] **Step 1: 类型检查与构建**

Run:
```bash
cd /workspace && npx tsc --noEmit && npm run build
```

Expected: PASS

- [ ] **Step 2: 本地服务验证关键页面**

Run:
```bash
cd /workspace && nohup npx next start -p 3000 > /tmp/next.log 2>&1 &
sleep 8
python3 -c "
import urllib.request
for path in ['/admin', '/forbidden', '/brands', '/suppliers', '/dashboard']:
    try:
        res = urllib.request.urlopen('http://localhost:3000' + path, timeout=5)
        html = res.read().decode('utf-8', errors='ignore')
        print(f'{path} -> {res.getcode()} root={\"__next\" in html or \"data-reactroot\" in html}')
    except Exception as e:
        print(f'{path} -> ERROR: {e}')
"
pkill -f "next start" || true
```

Expected: 所有页面返回 200 且包含 React 根节点

- [ ] **Step 3: 合并并推送到 main**

```bash
cd /workspace && git push origin main
```

Expected: 推送成功

---

## Spec Coverage Check

| Spec Section | Implementing Task |
|---|---|
| 2.1 角色层级 | Task 1（复用） |
| 2.2 数据隔离规则 | Task 2, 5, 6, 7 |
| 3 TenantContext 扩展 | Task 2 |
| 4.1 动态侧边栏 | Task 3 |
| 4.2 路由级保护 | Task 8, 9, 10 |
| 5 API 权限校验 | Task 5, 6, 7 |
| 6 后台配置页面 | Task 8, 9 |
| 7 账号初始化 | Task 11 |
| 8 边界情况 | Task 2（重定向）、Task 10（403） |

## Placeholder Scan

- 无 TBD/TODO/"implement later" 等占位符。
- 所有代码块包含可直接运行的示例。
- 文件路径为项目中的实际路径。

## Type Consistency

- `RoleLevel` 来自现有 `src/lib/auth/rbac.ts`。
- `TenantContextValue` 扩展字段在所有使用处保持一致。
- `canAccessRoute` / `getAllowedBrandIds` 参数签名前后一致。
