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
} from "lucide-react";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

interface UserProfile {
  name: string;
  avatarUrl: string | null;
  role: string;
  brandName: string;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: "小芳",
    avatarUrl: null,
    role: "设计师",
    brandName: "TEPNIX步戌",
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
  }, [router]);

  // 监听个人资料更新事件
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
        setProfile({
          name: data.name || "小芳",
          avatarUrl: data.avatarUrl || null,
          role: data.role || "设计师",
          brandName: data.brandName || "TEPNIX步戌",
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

  const navItems = [
    { icon: LayoutDashboard, label: "工作台", href: "/dashboard" },
    { icon: BarChart3, label: "智能调度", href: "/" },
    { icon: Sparkles, label: "企划中心", href: "/planning" },
    { icon: Wand2, label: "AI智能分析", href: "/ai" },
    { icon: Brain, label: "AI审核中心", href: "/ai-review" },
    { icon: Shirt, label: "款式管理", href: "/styles" },
    { icon: Palette, label: "设计资产", href: "/design" },
    { icon: Factory, label: "生产管理", href: "/production" },
    { icon: Building2, label: "品牌管理", href: "/brands" },
    { icon: BarChart3, label: "经营反馈", href: "/analytics" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside
        className={`${collapsed ? "w-16" : "w-48"} bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0`}
      >
        <div className="h-16 flex items-center px-4 border-b border-slate-200">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-bold text-sm truncate">{profile.brandName}</h1>
                <p className="text-xs text-muted-foreground truncate">全链路管理</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item, index) => (
            <Button
              key={index}
              variant={isActive(item.href) ? "secondary" : "ghost"}
              className={`w-full justify-start ${collapsed ? "px-2" : "px-3"} h-10`}
              onClick={() => router.push(item.href)}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="ml-3 text-sm">{item.label}</span>}
            </Button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200">
          {!collapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="relative">
                    <Avatar className="h-9 w-9 rounded-full overflow-hidden">
                      {profile.avatarUrl ? (
                        <AvatarImage src={profile.avatarUrl} alt={profile.name} className="object-cover rounded-full w-full h-full" />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-full w-full h-full">
                          {profile.name.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{profile.name}</p>
                    <p className="text-[10px] text-slate-400">{profile.role}</p>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 py-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">{profile.name}</p>
                  <p className="text-xs text-slate-500">{profile.role}</p>
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
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative p-1 cursor-pointer">
                  <Avatar className="h-9 w-9 rounded-full">
                    {profile.avatarUrl ? (
                      <AvatarImage src={profile.avatarUrl} alt={profile.name} className="object-cover rounded-full" />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-full">
                        {profile.name.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="h-4 w-4 mr-2" />
                  设置
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  退出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {/* 全局品牌/季节上下文栏 - 按文档要求必须常驻 */}
        <div className="h-14 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
          <TenantSwitcher />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
