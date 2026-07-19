"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Check, Loader2, User, Briefcase, Building2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/auth/supabase";

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

  // 获取当前用户的 access_token
  const getAccessToken = async (): Promise<string | null> => {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch (e) {
      console.error("Failed to get access token:", e);
      return null;
    }
  };

  const fetchProfile = async () => {
    try {
      const token = await getAccessToken();
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
      const token = await getAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: editName || "小芳",
          avatarUrl: profile.avatarUrl,
        }),
      });
      if (res.ok) {
        setSaveStatus("success");
        setSaveMessage("保存成功");
        setProfile(prev => ({ ...prev, name: editName || "小芳" }));
        // 通知侧边栏等其他组件刷新个人资料
        window.dispatchEvent(new Event("profile-updated"));
        setTimeout(() => {
          setSaveMessage("");
          setSaveStatus("");
        }, 3000);
      } else {
        let errorMsg = "保存失败，请重试";
        try {
          const errData = await res.json();
          if (errData?.detail) {
            errorMsg = `保存失败：${errData.detail}`;
          } else if (errData?.error) {
            errorMsg = `保存失败：${errData.error}`;
          }
        } catch (e) {
          // ignore
        }
        setSaveStatus("error");
        setSaveMessage(errorMsg);
        setTimeout(() => {
          setSaveMessage("");
          setSaveStatus("");
        }, 5000);
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
      const compressedImage = await compressImage(file, 200, 0.8);
      setProfile(prev => ({ ...prev, avatarUrl: compressedImage }));
    } catch (error) {
      console.error("Failed to upload avatar:", error);
    } finally {
      setUploading(false);
    }
  };

  const compressImage = (file: File, maxSize: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas not supported"));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("File read failed"));
      reader.readAsDataURL(file);
    });
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
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-transparent -mx-6 -mb-6 px-6 pb-6">
              {saveMessage && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  saveStatus === "success" 
                    ? "bg-green-50 text-green-700 border border-green-200" 
                    : "bg-red-50 text-red-700 border border-red-200"
                } mr-auto shadow-sm`}>
                  {saveStatus === "success" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  {saveMessage}
                </div>
              )}
              <Button 
                variant="outline" 
                onClick={fetchProfile} 
                className="h-11 px-7 rounded-xl font-medium text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
              >
                取消
              </Button>
              <Button 
                onClick={handleSaveProfile} 
                disabled={uploading} 
                className="h-11 px-8 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
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
