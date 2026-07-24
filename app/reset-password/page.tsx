"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/auth/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Mail, Lock, ArrowLeft, CheckCircle } from "lucide-react";

function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkRecoveryState = async () => {
      const type = searchParams?.get("type");
      const { data } = await supabase.auth.getSession();
      
      if (data.session?.user) {
        setIsRecovery(true);
        setEmail(data.session.user.email || "");
        setChecking(false);
        return;
      }

      if (type === "recovery") {
        setIsRecovery(true);
        setChecking(false);
        return;
      }

      setChecking(false);
    };
    checkRecoveryState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        if (session?.user?.email) {
          setEmail(session.user.email);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleSendResetEmail = async () => {
    if (!email) {
      setError("请输入邮箱地址。");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        const message = resetError.message.toLowerCase();
        if (message.includes("rate limit")) {
          setError("操作过于频繁，请稍等 1 分钟后再试。");
        } else if (message.includes("user not found")) {
          setError("该邮箱未注册，请检查邮箱是否正确。");
        } else {
          setError(resetError.message || "发送失败，请稍后重试。");
        }
      } else {
        setSuccess("重置密码邮件已发送，请检查邮箱并点击链接重置密码。");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败，请检查网络或环境变量配置。");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (password.length < 6) {
      setError("密码长度至少为 6 位。");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message || "密码更新失败，请稍后重试。");
      } else {
        setSuccess("密码重置成功！正在跳转到登录页...");
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "密码更新失败，请检查网络。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-sand-50 p-6">
      <Card className="w-full max-w-md border border-border/60 shadow-premium bg-white/80 backdrop-blur-sm">
        <CardContent className="p-8">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            返回登录
          </button>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-2">
              {isRecovery ? "设置新密码" : "重置密码"}
            </h2>
            <p className="text-muted-foreground">
              {isRecovery
                ? "请输入您的新密码"
                : "输入您的邮箱，我们将发送重置密码链接"}
            </p>
          </div>

          {success && (
            <Alert className="mb-6 bg-emerald-50 border-emerald-200 text-emerald-800">
              <CheckCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {checking ? (
            <div className="py-8 text-center text-muted-foreground">
              <div className="animate-pulse">验证链接中...</div>
            </div>
          ) : !isRecovery ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-card"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  className="w-full h-11 font-semibold bg-navy-700 hover:bg-navy-800 text-white shadow-premium transition-all"
                  onClick={handleSendResetEmail}
                  disabled={loading || !email}
                >
                  {loading ? "发送中..." : "发送重置链接"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* 当前账号信息 */}
              {email && (
                <div className="flex items-center gap-3 p-3 bg-sand-50 rounded-xl border border-sand-100">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">正在重置密码的账号</p>
                    <p className="text-sm font-semibold text-foreground truncate">{email}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">新密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="请输入新密码（至少6位）"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-card"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">确认新密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="请再次输入新密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-card"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  className="w-full h-11 font-semibold bg-navy-700 hover:bg-navy-800 text-white shadow-premium transition-all"
                  onClick={handleUpdatePassword}
                  disabled={loading || !password || !confirmPassword}
                >
                  {loading ? "重置中..." : "确认重置密码"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
