"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Building2, Users, Calendar, Lock, Unlock } from "lucide-react";
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

  const loadingState = (
    <div className="py-32 text-center text-muted-foreground">加载中...</div>
  );

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">品牌管理</h1>
            <p className="text-muted-foreground">管理品牌、用户角色和季次配置</p>
          </div>
          <Button onClick={() => setShowNewBrand(!showNewBrand)}>
            <Plus className="h-4 w-4 mr-2" />
            新建品牌
          </Button>
        </div>

        {showNewBrand && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="brand-name">品牌名称</Label>
                  <Input
                    id="brand-name"
                    value={newBrandName}
                    onChange={e => setNewBrandName(e.target.value)}
                    placeholder="例如：TEPNIX步戌"
                  />
                </div>
                <Button onClick={handleCreateBrand}>创建</Button>
                <Button variant="outline" onClick={() => setShowNewBrand(false)}>取消</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          loadingState
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 品牌列表 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
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
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedBrand?.id === brand.id
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-slate-50 border border-transparent"
                      }`}
                      onClick={() => {
                        setSelectedBrand(brand);
                        fetchSeasons(brand.id);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {brand.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{brand.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getUserBrandsCount(brand.id)} 人关联
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* 季次管理 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
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
                    <div key={season.id} className="p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{season.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleSeasonLock(season.id, season.status)}
                        >
                          {season.status === "active" ? (
                            <><Unlock className="h-3 w-3 mr-1" />可编辑</>
                          ) : (
                            <><Lock className="h-3 w-3 mr-1" />已锁定</>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  用户角色
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                {profiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">暂无用户</p>
                ) : (
                  profiles.map(profile => {
                    const ubList = getUserBrands(profile.user_id);
                    return (
                      <div key={profile.user_id} className="p-3 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="h-8 w-8">
                            {profile.avatar_url ? (
                              <AvatarImage src={profile.avatar_url} alt={profile.name} />
                            ) : (
                              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                                {profile.name.charAt(0)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{profile.name}</p>
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
                          className="w-full h-8 text-xs px-2 rounded-md border border-slate-200 bg-white"
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
      </div>
    </SidebarLayout>
  );

  function getUserBrandsCount(brandId: string) {
    return userBrands.filter(ub => ub.brand_id === brandId).length;
  }
}
