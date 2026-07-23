"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Building2, Users, Calendar, Lock, Unlock, Trash2, Pencil, Loader2 } from "lucide-react";
import { RoleLevel, RoleLevelLabels } from "@/lib/auth/rbac";

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  company_id: string;
}

interface UserProfile {
  user_id: string;
  name: string;
  avatar_url: string | null;
  role: string;
  role_level: string;
  brand_id: string | null;
}

interface UserBrand {
  user_id: string;
  brand_id: string;
  role_level: string;
}

interface Season {
  id: string;
  brand_id: string;
  name: string;
  season_type: string;
  year: number;
  status: string;
  start_date: string;
  end_date: string;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [userBrands, setUserBrands] = useState<UserBrand[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [loading, setLoading] = useState(true);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editName, setEditName] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orgRes, brandsRes] = await Promise.all([
        fetch("/api/organization"),
        fetch("/api/brands"),
      ]);
      const orgData = await orgRes.json();
      const brandsData = await brandsRes.json();

      setBrands(brandsData || []);
      setProfiles(orgData.profiles || []);
      setUserBrands(orgData.userBrands || []);
      if (brandsData && brandsData.length > 0) {
        setSelectedBrand(brandsData[0]);
        fetchSeasons(brandsData[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasons = async (brandId: string) => {
    try {
      const res = await fetch(`/api/seasons?brand_id=${brandId}`);
      const data = await res.json();
      setSeasons(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch seasons:", error);
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBrandName }),
      });
      if (res.ok) {
        setNewBrandName("");
        setShowNewBrand(false);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create brand:", error);
    }
  };

  const handleEditClick = (brand: Brand) => {
    setEditingBrand(brand);
    setEditName(brand.name || "");
    setEditLogoUrl(brand.logo_url || "");
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingBrand || !editName.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/brands/${editingBrand.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          logo_url: editLogoUrl.trim() || null,
        }),
      });
      if (res.ok) {
        setEditDialogOpen(false);
        setEditingBrand(null);
        setEditName("");
        setEditLogoUrl("");
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "保存失败");
      }
    } catch (error) {
      console.error("Failed to update brand:", error);
      alert("保存失败");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!window.confirm("确定要删除该品牌吗？删除后不可恢复，关联数据也会被清除。")) {
      return;
    }
    try {
      const res = await fetch(`/api/brands/${brandId}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedBrand?.id === brandId) {
          setSelectedBrand(null);
          setSeasons([]);
        }
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "删除失败");
      }
    } catch (error) {
      console.error("Failed to delete brand:", error);
      alert("删除失败");
    }
  };

  const handleAssignRole = async (userId: string, roleLevel: string, brandIds: string[]) => {
    try {
      await fetch("/api/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          roleLevel,
          brandIds,
        }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to assign role:", error);
    }
  };

  const handleToggleSeasonLock = async (seasonId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "locked" : "active";
    try {
      await fetch("/api/seasons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: seasonId, status: newStatus }),
      });
      if (selectedBrand) {
        fetchSeasons(selectedBrand.id);
      }
    } catch (error) {
      console.error("Failed to toggle season:", error);
    }
  };

  const getUserBrands = (userId: string) => {
    return userBrands.filter(ub => ub.user_id === userId);
  };

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[2400px] mx-auto">
        {/* 顶部标题栏 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg gradient-navy flex items-center justify-center shadow-premium">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">品牌管理</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-10">管理品牌、用户角色和季次配置</p>
          </div>
          <Button onClick={() => setShowNewBrand(!showNewBrand)} className="bg-navy-700 hover:bg-navy-800 text-white">
            <Plus className="h-4 w-4 mr-2" />
            新建品牌
          </Button>
        </div>

        {showNewBrand && (
          <Card className="card-premium mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-end gap-4">
                <div className="flex-1 space-y-2 w-full">
                  <Label htmlFor="brand-name" className="font-medium">品牌名称</Label>
                  <Input
                    id="brand-name"
                    value={newBrandName}
                    onChange={e => setNewBrandName(e.target.value)}
                    placeholder="例如：TEPNIX步戌"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleCreateBrand} className="bg-navy-700 hover:bg-navy-800 text-white">创建</Button>
                  <Button variant="outline" onClick={() => setShowNewBrand(false)}>取消</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="py-32 text-center text-muted-foreground">加载中...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 品牌列表 */}
            <Card className="card-premium">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 section-title !before:hidden">
                  <Building2 className="h-4 w-4 text-navy-700" />
                  品牌列表
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {brands.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">暂无品牌</p>
                ) : (
                  brands.map(brand => (
                    <div
                      key={brand.id}
                      className={`group p-3 rounded-xl cursor-pointer transition-all border ${
                        selectedBrand?.id === brand.id
                          ? "bg-navy-50 border-navy-200 shadow-sm"
                          : "bg-sand-50/40 border-transparent hover:border-border hover:bg-sand-50"
                      }`}
                      onClick={() => {
                        setSelectedBrand(brand);
                        fetchSeasons(brand.id);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy-600 to-terracotta-400 flex items-center justify-center text-white font-bold shadow-sm">
                          {(brand.name || "?").charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{brand.name || "未命名品牌"}</p>
                          <p className="text-xs text-muted-foreground">
                            {getUserBrandsCount(brand.id)} 人关联
                          </p>
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(brand);
                            }}
                          >
                            <Pencil className="h-4 w-4 text-navy-700" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBrand(brand.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* 季次管理 */}
            <Card className="card-premium">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 section-title !before:hidden">
                  <Calendar className="h-4 w-4 text-navy-700" />
                  {selectedBrand ? `${selectedBrand.name} - 季次` : "季次管理"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!selectedBrand ? (
                  <p className="text-sm text-muted-foreground text-center py-4">请选择品牌</p>
                ) : seasons.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">暂无季次</p>
                ) : (
                  seasons.map(season => (
                    <div key={season.id} className="p-3 rounded-xl border border-border bg-sand-50/40">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-foreground">{season.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleSeasonLock(season.id, season.status)}
                          className="h-8 text-xs"
                        >
                          {season.status === "active" ? (
                            <><Unlock className="h-3 w-3 mr-1 text-emerald-600" /><span className="text-emerald-700">可编辑</span></>
                          ) : (
                            <><Lock className="h-3 w-3 mr-1 text-terracotta-500" /><span className="text-terracotta-600">已锁定</span></>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {season.start_date} ~ {season.end_date}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* 用户管理 */}
            <Card className="card-premium">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 section-title !before:hidden">
                  <Users className="h-4 w-4 text-navy-700" />
                  用户角色
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                {profiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">暂无用户</p>
                ) : (
                  profiles.map(profile => {
                    const ubList = getUserBrands(profile.user_id);
                    return (
                      <div key={profile.user_id} className="p-3 rounded-xl border border-border bg-sand-50/40">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="h-9 w-9 rounded-full border-2 border-white shadow-sm">
                            {profile.avatar_url ? (
                              <AvatarImage src={profile.avatar_url} alt={profile.name || ""} />
                            ) : (
                              <AvatarFallback className="bg-gradient-to-br from-navy-600 to-terracotta-400 text-white text-xs">
                                {(profile.name || "?").charAt(0)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{profile.name || "未命名"}</p>
                            <p className="text-xs text-muted-foreground">
                              {ubList.length} 个品牌关联
                            </p>
                          </div>
                        </div>
                        <select
                          value={profile.role_level}
                          onChange={e => {
                            const brandIds = ubList.map(ub => ub.brand_id);
                            handleAssignRole(profile.user_id, e.target.value, brandIds);
                          }}
                          className="w-full h-9 text-xs px-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {Object.entries(RoleLevelLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 编辑品牌弹窗 */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>编辑品牌</DialogTitle>
              <DialogDescription>修改品牌名称和 Logo 地址</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-brand-name">品牌名称</Label>
                <Input
                  id="edit-brand-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="例如：TEPNIX步戌"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-brand-logo">Logo URL</Label>
                <Input
                  id="edit-brand-logo"
                  value={editLogoUrl}
                  onChange={(e) => setEditLogoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={editSaving}>
                取消
              </Button>
              <Button onClick={handleSaveEdit} disabled={editSaving || !editName.trim()} className="bg-navy-700 hover:bg-navy-800 text-white">
                {editSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarLayout>
  );

  function getUserBrandsCount(brandId: string) {
    return userBrands.filter(ub => ub.brand_id === brandId).length;
  }
}
