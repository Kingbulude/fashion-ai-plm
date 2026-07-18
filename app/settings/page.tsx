"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Check, Loader2, User, Briefcase, Building2, AlertCircle } from "lucide-react";

interface ProfileData {
  name: string;
  avatarUrl: string | null;
  role: string;
  brandName: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData>({
    name: "小芳",
    avatarUrl: null,
    role: "设计师",
    brandName: "TEPNIX步戌",
  });
  const [editName, setEditName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | "">("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (data) {
        setProfile({
          name: data.name || "小芳",
          avatarUrl: data.avatarUrl || null,
          role: data.role || "设计师",
          brandName: data.brandName || "TEPNIX步戌",
        });
        setEditName(data.name || "小芳");
      }
    } catch (error) {
      console.error("Failed to fetch profile");
    }
  };

  const handleSaveProfile = async () => {
    setSaveMessage("");
    setSaveStatus("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName || "小芳",
          avatarUrl: profile.avatarUrl,
        }),
      });
      if (res.ok) {
        setSaveStatus("success");
        setSaveMessage("保存成功");
        setProfile(prev => ({ ...prev, name: editName || "小芳" }));
        setTimeout(() => {
          setSaveMessage("");
          setSaveStatus("");
        }, 3000);
      } else {
        setSaveStatus("error");
        setSaveMessage("保存失败，请重试");
        setTimeout(() => {
          setSaveMessage("");
          setSaveStatus("");
        }, 3000);
      }
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage("保存失败，请检查网络");
      setTimeout(() => {
        setSaveMessage("");
        setSaveStatus("");
      }, 3000);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        setProfile(prev => ({ ...prev, avatarUrl: base64Data }));
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Failed to upload avatar");
      setUploading(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">个人设置</h1>
            <p className="text-muted-foreground">管理您的个人资料和偏好设置</p>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl">个人资料</CardTitle>
            <p className="text-sm text-muted-foreground">更新您的个人信息</p>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* 头像区域 */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <Avatar className="h-28 w-28 rounded-full border-4 border-white shadow-lg shadow-slate-200 overflow-hidden">
                  {profile.avatarUrl ? (
                    <AvatarImage src={profile.avatarUrl} alt={profile.name} className="object-cover rounded-full w-full h-full" />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl font-semibold rounded-full w-full h-full">
                      {profile.name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <label className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-all shadow-md hover:scale-110 border-4 border-white">
                  <Upload className="h-5 w-5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
                {uploading && (
                  <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-3">点击图标更换头像</p>
            </div>

            {/* 表单区域 */}
            <div className="space-y-6">
              {/* 姓名 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="name">姓名</Label>
                </div>
                <Input
                  id="name"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="请输入您的姓名"
                  className="h-11 px-4"
                />
              </div>

              {/* 职位权限 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <Label>职位权限</Label>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{profile.role}</p>
                    <p className="text-xs text-slate-400">由管理员分配，无法修改</p>
                  </div>
                </div>
              </div>

              {/* 所属品牌 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <Label>所属品牌</Label>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{profile.brandName}</p>
                    <p className="text-xs text-slate-400">品牌信息由管理员配置</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              {saveMessage && (
                <div className={`flex items-center gap-2 text-sm ${saveStatus === "success" ? "text-green-600" : "text-red-600"} mr-auto`}>
                  {saveStatus === "success" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {saveMessage}
                </div>
              )}
              <Button variant="outline" onClick={fetchProfile} className="h-10 px-6">
                取消
              </Button>
              <Button onClick={handleSaveProfile} disabled={uploading} className="h-10 px-8">
                {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                保存更改
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
