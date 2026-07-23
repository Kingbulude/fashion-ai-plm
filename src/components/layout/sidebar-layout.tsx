"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/auth/supabase";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
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

  const { isAdmin, userRole, processRoles, accessibleRoutes, processOwnerScope } = useTenant();

  // 优先使用 TenantContext 的权限判断，如果失败则 fallback 到 /api/profile 的角色
  const isBossOrAdmin =
    isAdmin ||
    userRole === RoleLevel.BOSS ||
    userRole === RoleLevel.ADMIN ||
    profile.roleLevel === RoleLevel.BOSS ||
    profile.roleLevel === RoleLevel.ADMIN;

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
            <div className="w-10 h-10 rounded-xl gradient-navy flex items-center justify-center flex-shrink-0 shadow-premium">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-bold text-sm truncate text-foreground">{profile.brandName}</h1>
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
          {navItems.map((item, index) => {
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
          })}
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
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground">
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
    </div>
  );
}
