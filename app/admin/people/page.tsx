"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Pencil, Shield, Loader2, Building2 } from "lucide-react";
import { RoleLevel, RoleLevelLabels } from "@/lib/auth/rbac";

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  company_id: string;
}

interface Profile {
  user_id: string;
  name: string;
  avatar_url: string | null;
  role: string;
  role_level: string;
  company_id: string;
  brand_id: string | null;
}

interface UserBrand {
  user_id: string;
  brand_id: string;
  role_level: string;
}

interface OrganizationData {
  company: { id: string; name: string } | null;
  brands: Brand[];
  profiles: Profile[];
  userBrands: UserBrand[];
  roleLabels: Record<string, string>;
}

const roleLevelOptions = [
  RoleLevel.BOSS,
  RoleLevel.ADMIN,
  RoleLevel.BRAND_MANAGER,
  RoleLevel.PROCESS_OWNER,
  RoleLevel.EXECUTOR,
];

export default function AdminPeoplePage() {
  const [data, setData] = useState<OrganizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoleLevel, setEditRoleLevel] = useState<string>(RoleLevel.EXECUTOR);
  const [editBrandIds, setEditBrandIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/organization");
      const json = await res.json();
      setData({
        company: json.company || null,
        brands: json.brands || [],
        profiles: json.profiles || [],
        userBrands: json.userBrands || [],
        roleLabels: json.roleLabels || RoleLevelLabels,
      });
    } catch (error) {
      console.error("Failed to fetch organization:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUserBrands = (userId: string) => {
    if (!data) return [];
    return data.userBrands.filter((ub) => ub.user_id === userId);
  };

  const handleEdit = (profile: Profile) => {
    setEditingUser(profile);
    setEditName(profile.name || "");
    setEditRoleLevel(profile.role_level || RoleLevel.EXECUTOR);
    setEditBrandIds(getUserBrands(profile.user_id).map((ub) => ub.brand_id));
    setDialogOpen(true);
  };

  const toggleBrand = (brandId: string) => {
    setEditBrandIds((prev) =>
      prev.includes(brandId) ? prev.filter((id) => id !== brandId) : [...prev, brandId]
    );
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await fetch("/api/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.user_id,
          name: editName.trim(),
          roleLevel: editRoleLevel,
          brandIds: editBrandIds,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        await fetchOrganization();
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Failed to save user:", err);
        alert(err.error || "保存失败");
      }
    } catch (error) {
      console.error("Failed to save user:", error);
      alert("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[2400px] mx-auto">
        {/* 顶部标题栏 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl gradient-navy flex items-center justify-center shadow-premium">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">人员与权限</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-13">
              管理公司成员、角色层级和品牌访问范围
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-32 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            加载中...
          </div>
        ) : (
          <Card className="card-premium">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2 section-title !before:hidden">
                <Shield className="h-4 w-4 text-navy-700" />
                成员列表
                <Badge variant="secondary" className="ml-2">
                  {(data?.profiles || []).length} 人
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-3 px-4 font-medium">成员</th>
                      <th className="py-3 px-4 font-medium">角色层级</th>
                      <th className="py-3 px-4 font-medium">可访问品牌</th>
                      <th className="py-3 px-4 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.profiles || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-muted-foreground">
                          暂无成员
                        </td>
                      </tr>
                    ) : (
                      (data?.profiles || []).map((profile) => {
                        const userBrands = getUserBrands(profile.user_id);
                        const brandNames = userBrands
                          .map((ub) => data?.brands.find((b) => b.id === ub.brand_id)?.name)
                          .filter(Boolean);

                        return (
                          <tr
                            key={profile.user_id}
                            className="border-b border-border/50 hover:bg-sand-50/50 transition-colors"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 rounded-full border-2 border-white shadow-sm">
                                  {profile.avatar_url ? (
                                    <AvatarImage src={profile.avatar_url} alt={profile.name} />
                                  ) : (
                                    <AvatarFallback className="bg-gradient-to-br from-navy-600 to-terracotta-400 text-white text-xs">
                                      {(profile.name || "?").charAt(0)}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div>
                                  <p className="font-medium text-foreground">{profile.name || "未命名"}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {profile.user_id}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Badge
                                variant={
                                  profile.role_level === RoleLevel.BOSS || profile.role_level === RoleLevel.ADMIN
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {data?.roleLabels[profile.role_level] || profile.role_level}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-wrap gap-1.5">
                                {brandNames.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">未分配品牌</span>
                                ) : (
                                  brandNames.map((name, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs font-normal">
                                      {name}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(profile)}
                              >
                                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                编辑
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 编辑对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>编辑成员权限</DialogTitle>
              <DialogDescription>
                修改 {editingUser?.name || "该成员"} 的姓名、角色层级和可访问品牌
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label htmlFor="user-name">姓名</Label>
                <Input
                  id="user-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="请输入姓名"
                />
              </div>

              <div className="space-y-2">
                <Label>角色层级</Label>
                <div className="grid grid-cols-2 gap-2">
                  {roleLevelOptions.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setEditRoleLevel(role)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left ${
                        editRoleLevel === role
                          ? "border-navy-300 bg-navy-50 text-navy-800"
                          : "border-border bg-card hover:bg-sand-50"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          editRoleLevel === role ? "bg-navy-600" : "bg-slate-300"
                        }`}
                      />
                      {data?.roleLabels[role] || RoleLevelLabels[role]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  可访问品牌
                </Label>
                <div className="flex flex-wrap gap-2">
                  {(data?.brands || []).map((brand) => {
                    const selected = editBrandIds.includes(brand.id);
                    return (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => toggleBrand(brand.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                          selected
                            ? "bg-navy-700 text-white border-navy-700"
                            : "bg-card border-border text-muted-foreground hover:bg-sand-50"
                        }`}
                      >
                        {selected ? "✓ " : ""}
                        {brand.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  BOSS/ADMIN 自动拥有全部品牌权限，此处选择主要影响其他角色
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-navy-700 hover:bg-navy-800 text-white">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarLayout>
  );
}
