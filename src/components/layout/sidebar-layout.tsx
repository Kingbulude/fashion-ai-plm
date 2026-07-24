"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/auth/supabase";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  Shirt,
  Palette,
  Factory,
  Settings,
  LogOut,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Wand2,
  User,
  Building2,
  Brain,
  Bell,
  Search,
  Store,
} from "lucide-react";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { useTenant } from "@/lib/auth/tenant-context";
import { RoleLevel, RoleLevelLabels } from "@/lib/auth/rbac";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

interface UserProfile {
  name: string;
  avatarUrl: string | null;
  role: string;
  roleLevel: string | null;
  brandName: string;
}

interface SearchItem {
  label: string;
  href: string;
  icon: React.ElementType;
  keywords: string[];
  admin?: boolean;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: "加载中",
    avatarUrl: null,
    role: "",
    roleLevel: null,
    brandName: "",
  });
  const router = useRouter();
  const pathname = usePathname();

  // 使用 TenantContext 的品牌名称，确保与顶部 TenantSwitcher 保持一致
  const { currentBrand } = useTenant();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
        fetchProfile();
      } else {
        router.push("/login");
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.push("/reset-password");
      }
      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchProfile();
    };
    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/profile", { headers });
      const data = await res.json();
      if (data) {
        const roleLevel = data.roleLevel;
        const displayName = roleLevel ? (RoleLevelLabels[roleLevel] || data.role || "") : (data.role || "");
        setProfile({
          name: data.name || "用户",
          avatarUrl: data.avatarUrl || null,
          role: displayName,
          roleLevel: roleLevel || null,
          brandName: data.brandName || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch profile");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const { isAdmin, userRole, processRoles, accessibleRoutes, processOwnerScope, isLoading } = useTenant();

  // 优先使用 TenantContext 的权限判断，如果失败则 fallback 到 /api/profile 的角色
  const isBossOrAdmin =
    isAdmin ||
    userRole === RoleLevel.BOSS ||
    userRole === RoleLevel.ADMIN ||
    profile.roleLevel === RoleLevel.BOSS ||
    profile.roleLevel === RoleLevel.ADMIN;

  // 全局可搜索页面
  const searchItems: SearchItem[] = [
    { label: "工作台", href: "/dashboard", icon: LayoutDashboard, keywords: ["dashboard", "工作台", "首页"] },
    { label: "智能调度", href: "/", icon: BarChart3, keywords: ["调度", "流程", "工序"] },
    { label: "企划中心", href: "/planning", icon: Sparkles, keywords: ["planning", "企划", "规划"] },
    { label: "AI 智能体中心", href: "/ai-workspace", icon: Wand2, keywords: ["ai", "智能体", "agent"] },
    { label: "AI 审核中心", href: "/ai-review", icon: Brain, keywords: ["审核", "review", "测款"] },
    { label: "款式管理", href: "/styles", icon: Shirt, keywords: ["style", "款式", "服装"] },
    { label: "设计资产", href: "/design", icon: Palette, keywords: ["design", "设计", "资产"] },
    { label: "生产管理", href: "/production", icon: Factory, keywords: ["production", "生产", "备货"] },
    { label: "经营反馈", href: "/analytics", icon: BarChart3, keywords: ["analytics", "经营", "数据", "分析"] },
    { label: "品牌管理", href: "/brands", icon: Building2, keywords: ["brand", "品牌"], admin: true },
    { label: "供应商", href: "/suppliers", icon: Store, keywords: ["supplier", "供应商", "工厂"], admin: true },
    { label: "后台配置", href: "/admin", icon: Settings, keywords: ["admin", "后台", "设置"], admin: true },
    { label: "人员与权限", href: "/admin/people", icon: User, keywords: ["people", "人员", "用户", "权限"], admin: true },
    { label: "工序主管类型", href: "/admin/process-owner-scopes", icon: Settings, keywords: ["主管", "工序主管"] },
    { label: "工序角色", href: "/admin/process-roles", icon: Settings, keywords: ["角色", "工序角色"] },
    { label: "AI Skill 配置", href: "/admin/ai-skills", icon: Sparkles, keywords: ["ai skill", "技能", "智能体配置"], admin: true },
    { label: "待办清单", href: "/todos", icon: LayoutDashboard, keywords: ["todo", "待办", "任务"] },
    { label: "个人设置", href: "/settings", icon: User, keywords: ["settings", "设置", "个人资料"] },
  ];

  const visibleSearchItems = searchItems.filter((item) => {
    if (item.admin && !isBossOrAdmin) return false;
    return true;
  });

  const filteredItems = visibleSearchItems.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.label.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    if (!searchOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredItems.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = filteredItems[selectedIndex];
        if (item) {
          setSearchOpen(false);
          setSearchQuery("");
          router.push(item.href);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, filteredItems, selectedIndex, router]);

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
    if (item.admin && !isBossOrAdmin) return false;

    // BOSS/ADMIN 或通配权限，显示全部
    if (isBossOrAdmin || accessibleRoutes.includes("*")) return true;

    // 未配置 node 的通用页面默认显示
    if (!item.node) return true;

    // 工序负责人按主管类型的 process_nodes 过滤
    if (userRole === RoleLevel.PROCESS_OWNER && processOwnerScope) {
      return processOwnerScope.process_nodes.includes(item.node);
    }

    // 根据横向工序角色的 route_permissions 或 process_node 判断
    const routeAllowed = accessibleRoutes.some((route) => item.href === route || item.href.startsWith(`${route}/`));
    const nodeAllowed = processRoles.some((r) => r.process_node === item.node);

    return routeAllowed || nodeAllowed;
  });

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={`${collapsed ? "w-[72px]" : "w-56"} bg-sidebar border-r border-[var(--sidebar-border)] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex-shrink-0`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-4 border-b border-[var(--sidebar-border)]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-premium overflow-hidden">
              {currentBrand?.logo_url ? (
                <img
                  src={currentBrand.logo_url}
                  alt={currentBrand.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-xl gradient-navy flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-bold text-sm truncate text-foreground">{currentBrand?.name || profile.brandName || "未选择品牌"}</h1>
                <p className="text-[10px] text-muted-foreground truncate tracking-wide uppercase font-medium">全链路管理</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-10 rounded-xl bg-muted/60 animate-pulse"
                />
              ))}
            </div>
          ) : (
            navItems.map((item, index) => {
              const active = isActive(item.href);
              return (
                <button
                  key={index}
                  onClick={() => router.push(item.href)}
                  className={`nav-item w-full ${active ? "active" : ""} ${collapsed ? "justify-center px-2" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className={`h-[18px] w-[18px] flex-shrink-0 ${active ? "text-terracotta-500" : ""}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })
          )}
        </nav>

      </aside>

      <main className="flex-1 overflow-auto">
        {/* Glass header */}
        <div className="h-14 header-glass flex items-center justify-between px-6">
          <TenantSwitcher />
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-2 pr-3 h-9 rounded-lg hover:bg-[var(--sidebar-accent)] transition-colors">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-7 w-7 rounded-full ring-2 ring-white shadow-sm">
                      {profile.avatarUrl ? (
                        <AvatarImage src={profile.avatarUrl} alt={profile.name} className="object-cover rounded-full w-full h-full" />
                      ) : (
                        <AvatarFallback className="gradient-terracotta text-white text-xs font-medium rounded-full w-full h-full">
                          {profile.name.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground leading-tight">{profile.name}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{profile.role}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 py-1">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">{profile.role}</p>
                </div>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="h-4 w-4 mr-2" />
                  设置
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings#profile")}>
                  <User className="h-4 w-4 mr-2" />
                  个人资料
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-[18px] w-[18px]" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground relative">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-terracotta-500 rounded-full ring-2 ring-white" />
            </Button>
          </div>
        </div>
        <div className="p-6 min-h-[calc(100vh-3.5rem)]">{children}</div>
      </main>

      {/* 全局页面搜索 */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4 text-navy-600" />
              全局搜索
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-3">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索页面、功能或关键词..."
              className="h-11"
              autoFocus
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto border-t">
            {filteredItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                未找到与「{searchQuery}」相关的页面
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredItems.map((item, index) => {
                  const Icon = item.icon;
                  const selected = index === selectedIndex;
                  return (
                    <button
                      key={item.href}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery("");
                        router.push(item.href);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        selected ? "bg-navy-50 border border-navy-100" : "hover:bg-sand-50"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selected ? "bg-navy-100" : "bg-sand-100"
                      }`}>
                        <Icon className={`h-4 w-4 ${selected ? "text-navy-700" : "text-navy-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.href}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="px-4 py-2.5 border-t bg-sand-50/50 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>按 Enter 跳转第一个结果</span>
            <span>ESC 关闭</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
