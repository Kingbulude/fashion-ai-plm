"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Upload,
  Check,
  Loader2,
  User,
  Briefcase,
  Building2,
  AlertCircle,
  Mail,
  Lock,
  Key,
  Bell,
  Palette,
  Globe,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { supabase } from "@/lib/auth/supabase";

interface ProfileData {
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  brandName: string;
}

const STORAGE_KEYS = {
  NOTIFICATIONS: "sf_settings_notifications",
  THEME: "sf_settings_theme",
  LANGUAGE: "sf_settings_language",
};

const DEFAULT_NOTIFICATIONS = {
  todoReminder: true,
  aiResult: true,
  alerts: true,
  weeklyReport: false,
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData>({
    name: "用户",
    email: "",
    avatarUrl: null,
    role: "",
    brandName: "",
  });
  const [editName, setEditName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | "">("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState(DEFAULT_NOTIFICATIONS);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [language, setLanguage] = useState("zh-CN");

  // 初始化：读取本地持久化偏好
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedNotif = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (savedNotif) {
        setNotifPrefs({ ...DEFAULT_NOTIFICATIONS, ...JSON.parse(savedNotif) });
      }
    } catch (e) {
      console.error("读取通知偏好失败:", e);
    }

    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as "light" | "dark" | "system" | null;
      if (savedTheme) {
        setTheme(savedTheme);
        applyTheme(savedTheme);
      }
    } catch (e) {
      console.error("读取主题设置失败:", e);
    }

    try {
      const savedLanguage = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
      if (savedLanguage) {
        setLanguage(savedLanguage);
        applyLanguage(savedLanguage);
      }
    } catch (e) {
      console.error("读取语言设置失败:", e);
    }
  }, []);

  const applyTheme = (nextTheme: "light" | "dark" | "system") => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = nextTheme === "dark" || (nextTheme === "system" && prefersDark);
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const applyLanguage = (lang: string) => {
    if (typeof window === "undefined") return;
    document.documentElement.lang = lang;
  };

  const saveNotifications = (next: typeof DEFAULT_NOTIFICATIONS) => {
    setNotifPrefs(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(next));
    }
    setSaveStatus("success");
    setSaveMessage("通知偏好已保存");
    setTimeout(() => {
      setSaveMessage("");
      setSaveStatus("");
    }, 2000);
  };

  const saveTheme = (nextTheme: "light" | "dark" | "system") => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.THEME, nextTheme);
    }
  };

  const saveLanguage = (lang: string) => {
    setLanguage(lang);
    applyLanguage(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    }
    setSaveStatus("success");
    setSaveMessage("语言已切换");
    setTimeout(() => {
      setSaveMessage("");
      setSaveStatus("");
    }, 2000);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

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
          name: data.name || "用户",
          email: data.email || "",
          avatarUrl: data.avatarUrl || null,
          role: data.role || "",
          brandName: data.brandName || "",
        });
        setEditName(data.name || "用户");
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
          name: editName || "用户",
          avatarUrl: profile.avatarUrl,
        }),
      });
      if (res.ok) {
        setSaveStatus("success");
        setSaveMessage("保存成功");
        await fetchProfile();
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
      if (compressedImage.length > 500 * 1024) {
        setSaveStatus("error");
        setSaveMessage("头像过大，请尝试选择更小的图片");
        setUploading(false);
        return;
      }
      setProfile((prev) => ({ ...prev, avatarUrl: compressedImage }));
      await saveProfileWithAvatar(compressedImage);
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      setSaveStatus("error");
      setSaveMessage("头像处理失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  const saveProfileWithAvatar = async (avatarUrl: string) => {
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
          name: editName || "用户",
          avatarUrl,
        }),
      });
      if (res.ok) {
        setSaveStatus("success");
        setSaveMessage("头像已保存");
        await fetchProfile();
        window.dispatchEvent(new Event("profile-updated"));
        setTimeout(() => {
          setSaveMessage("");
          setSaveStatus("");
        }, 3000);
      } else {
        let errorMsg = "头像保存失败";
        try {
          const errData = await res.json();
          if (errData?.detail) errorMsg = `头像保存失败：${errData.detail}`;
          else if (errData?.error) errorMsg = `头像保存失败：${errData.error}`;
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
      setSaveMessage("头像保存失败，请检查网络");
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

  const handleChangePassword = async () => {
    if (!oldPassword) {
      setSaveStatus("error");
      setSaveMessage("请输入当前密码");
      return;
    }
    if (newPassword.length < 6) {
      setSaveStatus("error");
      setSaveMessage("新密码长度至少为 6 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSaveStatus("error");
      setSaveMessage("两次输入的新密码不一致");
      return;
    }

    setPasswordLoading(true);
    setSaveMessage("");
    setSaveStatus("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setSaveStatus("error");
        setSaveMessage(error.message || "密码修改失败");
      } else {
        setSaveStatus("success");
        setSaveMessage("密码修改成功");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setSaveMessage("");
          setSaveStatus("");
        }, 3000);
      }
    } catch (err) {
      setSaveStatus("error");
      setSaveMessage("密码修改失败，请检查网络");
    } finally {
      setPasswordLoading(false);
    }
  };

  const notifItems = [
    {
      key: "todoReminder" as const,
      title: "待办提醒",
      description: "接收新待办分配和截止提醒",
    },
    {
      key: "aiResult" as const,
      title: "AI 分析结果通知",
      description: "AI 测款、售后分析等结果推送",
    },
    {
      key: "alerts" as const,
      title: "缺料/逾期预警",
      description: "物料缺料和生产订单逾期提醒",
    },
    {
      key: "weeklyReport" as const,
      title: "邮件周报",
      description: "每周一接收经营数据汇总邮件",
    },
  ];

  const themeOptions: { value: "light" | "dark" | "system"; label: string; icon: React.ElementType }[] = [
    { value: "light", label: "浅色", icon: Sun },
    { value: "dark", label: "深色", icon: Moon },
    { value: "system", label: "跟随系统", icon: Monitor },
  ];

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 h-[calc(100vh-3.5rem)] overflow-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl gradient-navy flex items-center justify-center shadow-premium">
            <User className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">个人设置</h1>
            <p className="text-xs text-muted-foreground">管理您的个人资料和偏好设置</p>
          </div>
        </div>

        {saveMessage && (
          <div
            className={`mb-5 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium max-w-fit ${
              saveStatus === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {saveStatus === "success" ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            {saveMessage}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* 个人资料 */}
          <Card className="card-premium overflow-visible flex flex-col">
            <CardHeader className="pb-4 pt-5 px-6">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-navy-700" />
                个人资料
              </CardTitle>
              <p className="text-xs text-muted-foreground">更新您的个人信息与头像</p>
            </CardHeader>
            <CardContent className="space-y-5 px-6 pb-6 flex-1">
              <div className="flex flex-col items-center">
                <div className="relative group p-1.5 rounded-full bg-gradient-to-br from-navy-100 to-sand-100">
                  <Avatar className="h-20 w-20 rounded-full border-3 border-white shadow-premium overflow-hidden">
                    {profile.avatarUrl ? (
                      <AvatarImage src={profile.avatarUrl} alt={profile.name} className="object-cover rounded-full w-full h-full" />
                    ) : (
                      <AvatarFallback className="gradient-navy text-white text-2xl font-semibold rounded-full w-full h-full">
                        {profile.name.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-navy-700 rounded-full flex items-center justify-center cursor-pointer hover:bg-navy-800 transition-all shadow-premium hover:scale-110 border-2 border-white">
                    <Upload className="h-4 w-4 text-white" />
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center m-1.5">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">点击图标更换头像</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-navy-600" />
                    <Label htmlFor="name" className="text-sm font-medium">
                      姓名
                    </Label>
                  </div>
                  <Input
                    id="name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="请输入您的姓名"
                    className="h-10 px-3 bg-card"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-navy-600" />
                      <Label className="text-sm font-medium">职位权限</Label>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-sand-50 rounded-xl border border-sand-100">
                      <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="h-4 w-4 text-navy-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{profile.role || "未设置"}</p>
                        <p className="text-[10px] text-muted-foreground">由管理员分配</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-navy-600" />
                      <Label className="text-sm font-medium">所属品牌</Label>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-sand-50 rounded-xl border border-sand-100">
                      <div className="w-8 h-8 rounded-lg bg-terracotta-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-terracotta-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{profile.brandName || "未配置"}</p>
                        <p className="text-[10px] text-muted-foreground">由管理员配置</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-navy-600" />
                    <Label className="text-sm font-medium">注册邮箱</Label>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-sand-50 rounded-xl border border-sand-100">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-4 w-4 text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{profile.email || "未设置"}</p>
                      <p className="text-[10px] text-muted-foreground">登录账号</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-auto">
                <Button
                  variant="outline"
                  onClick={fetchProfile}
                  className="h-9 px-4 rounded-lg text-sm font-medium border-border hover:bg-sand-50 transition-all"
                >
                  重置
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={uploading}
                  className="h-9 px-5 rounded-lg text-sm font-semibold bg-navy-700 hover:bg-navy-800 text-white shadow-premium transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {uploading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  保存更改
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 修改密码 */}
          <Card className="card-premium overflow-visible flex flex-col">
            <CardHeader className="pb-4 pt-5 px-6">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4 text-navy-700" />
                修改密码
              </CardTitle>
              <p className="text-xs text-muted-foreground">定期更换密码以保证账号安全</p>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6 flex-1 flex flex-col">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-navy-600" />
                  <Label htmlFor="oldPassword" className="text-sm font-medium">
                    当前密码
                  </Label>
                </div>
                <Input
                  id="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="请输入当前密码"
                  className="h-10 px-3 bg-card"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-navy-600" />
                  <Label htmlFor="newPassword" className="text-sm font-medium">
                    新密码
                  </Label>
                </div>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码（至少6位）"
                  className="h-10 px-3 bg-card"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-navy-600" />
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    确认新密码
                  </Label>
                </div>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码"
                  className="h-10 px-3 bg-card"
                />
              </div>

              <div className="flex justify-end pt-2 mt-auto">
                <Button
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                  className="h-9 px-5 rounded-lg text-sm font-semibold bg-navy-700 hover:bg-navy-800 text-white shadow-premium transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {passwordLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  修改密码
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 通知偏好 */}
          <Card className="card-premium overflow-visible flex flex-col">
            <CardHeader className="pb-4 pt-5 px-6">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-navy-700" />
                通知偏好
              </CardTitle>
              <p className="text-xs text-muted-foreground">自定义您希望接收的消息类型</p>
            </CardHeader>
            <CardContent className="space-y-2 px-6 pb-6 flex-1">
              {notifItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-3 px-3 rounded-xl border border-transparent hover:bg-sand-50/60 hover:border-sand-100 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    checked={notifPrefs[item.key]}
                    onCheckedChange={(checked) =>
                      saveNotifications({
                        ...notifPrefs,
                        [item.key]: checked,
                      })
                    }
                    aria-label={item.title}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 外观与语言 */}
          <Card className="card-premium overflow-visible flex flex-col">
            <CardHeader className="pb-4 pt-5 px-6">
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4 text-navy-700" />
                外观与语言
              </CardTitle>
              <p className="text-xs text-muted-foreground">调整界面主题与显示语言</p>
            </CardHeader>
            <CardContent className="space-y-5 px-6 pb-6 flex-1">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sun className="h-3.5 w-3.5 text-navy-600" />
                  <Label className="text-sm font-medium">主题模式</Label>
                </div>
                <p className="text-xs text-muted-foreground">选择界面显示风格</p>
                <div className="flex flex-wrap gap-2">
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    const active = theme === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => saveTheme(option.value)}
                        className={`flex items-center gap-2 px-4 h-10 rounded-xl border text-sm font-medium transition-all ${
                          active
                            ? "bg-navy-700 text-white border-navy-700 shadow-premium"
                            : "bg-card border-border text-muted-foreground hover:bg-sand-50 hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-navy-600" />
                  <Label className="text-sm font-medium">语言</Label>
                </div>
                <p className="text-xs text-muted-foreground">界面显示语言（切换后下次访问生效）</p>
                <select
                  value={language}
                  onChange={(e) => saveLanguage(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-input bg-card text-sm w-full max-w-xs"
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en">English</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}
