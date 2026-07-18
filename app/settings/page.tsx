"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Check, Loader2 } from "lucide-react";

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
        setSaveMessage("保存成功");
        setProfile(prev => ({ ...prev, name: editName || "小芳" }));
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage("保存失败");
        setTimeout(() => setSaveMessage(""), 3000);
      }
    } catch (error) {
      setSaveMessage("保存失败");
      setTimeout(() => setSaveMessage(""), 3000);
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">个人设置</h1>
            <p className="text-muted-foreground">管理您的个人资料和偏好设置</p>
          </div>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>个人资料</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  {profile.avatarUrl ? (
                    <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl font-medium">
                      {profile.name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                  <Upload className="h-4 w-4 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-sm text-muted-foreground">点击图标更换头像</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">姓名</Label>
                <Input
                  id="name"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="请输入您的姓名"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label>职位权限</Label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">{profile.role}</span>
                  <span className="text-xs text-slate-400">(由管理员分配)</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>所属品牌</Label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">{profile.brandName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {saveMessage && (
                <span className={`text-sm ${saveMessage === "保存成功" ? "text-green-600" : "text-red-600"}`}>
                  {saveMessage}
                </span>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={fetchProfile}>
                  取消
                </Button>
                <Button onClick={handleSaveProfile} disabled={uploading}>
                  {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  保存更改
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
