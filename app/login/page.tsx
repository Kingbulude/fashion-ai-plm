"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/auth/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, User, Lock, Sparkles, Shirt, Palette, Factory, AlertCircle } from "lucide-react";

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && key && !url.includes("placeholder") && !url.includes("your-project-id"));
};

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirect, setRedirect] = useState("/");
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams) {
      setRedirect(searchParams.get("redirect") || "/dashboard");
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user?.email_confirmed_at) {
        router.push(redirect);
      } else if (event === "PASSWORD_RECOVERY") {
        setSuccess("密码重置链接已发送，请检查邮箱。");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams, router, redirect]);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        const message = authError.message.toLowerCase();
        if (message.includes("rate limit")) {
          setError("操作过于频繁，请稍等 1 分钟后再试。");
        } else if (message.includes("email") && message.includes("confirmed")) {
          setError("邮箱尚未验证，请检查邮箱完成验证后再登录。");
        } else if (message.includes("invalid login credentials")) {
          setError("邮箱或密码错误，请确认后重试。");
        } else {
          setError(authError.message || "邮箱或密码错误，请重试。");
        }
      } else if (data?.user) {
        router.push(redirect);
      } else {
        setError("登录失败，请检查邮箱是否已完成验证。");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请检查网络或环境变量配置。");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (password.length < 6) {
      setError("密码长度至少为 6 位。");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (authError) {
        const message = authError.message.toLowerCase();
        if (message.includes("rate limit")) {
          setError("操作过于频繁，请稍等 1 分钟后再试。");
        } else if (message.includes("already registered")) {
          setError("该邮箱已注册，请直接登录。");
        } else {
          setError(authError.message);
        }
      } else {
        setSuccess("注册成功！请检查邮箱并点击验证链接，验证后再登录。");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败，请检查网络或环境变量配置。");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Shirt, title: "款式管理", desc: "全生命周期款式档案" },
    { icon: Palette, title: "AI设计", desc: "智能标签与色彩提取" },
    { icon: Factory, title: "生产协同", desc: "工艺包与BOM一体化" },
  ];

  return (
    <div className="min-h-screen w-full flex bg-sand-50">
      {/* 左侧品牌区 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-terracotta-500/20 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-navy-500/10 to-transparent" />
        <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-terracotta-400/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-navy-400/10 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl gradient-navy flex items-center justify-center shadow-premium border border-white/10">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">StyleForge</h1>
              <p className="text-sm text-sand-200/70">服装AI全链路品牌管理系统</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            从设计到上市
            <br />
            <span className="bg-gradient-to-r from-terracotta-300 to-sand-200 bg-clip-text text-transparent">
              一站式款式管理
            </span>
          </h2>
          <p className="text-sand-200/80 text-lg mb-12 max-w-md">
            轻资产服装品牌的全链路解决方案，让每一款产品从创意到落地都清晰可控。
          </p>
          
          <div className="space-y-5">
            {features.map((feature, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-terracotta-400 to-terracotta-600 flex items-center justify-center flex-shrink-0 shadow-premium">
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium">{feature.title}</h3>
                  <p className="text-sand-200/70 text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md border border-border/60 shadow-premium bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl gradient-navy flex items-center justify-center shadow-premium">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">StyleForge</h1>
                <p className="text-xs text-muted-foreground">服装AI全链路品牌管理系统</p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight mb-2">欢迎回来</h2>
              <p className="text-muted-foreground">登录您的账号继续管理款式</p>
            </div>

            {!isSupabaseConfigured() && (
              <Alert className="mb-6 bg-amber-50 border-amber-200 text-amber-800">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription>
                  请配置 <code className="px-1 py-0.5 bg-black/10 rounded text-xs">.env.local</code> 文件中的 Supabase 环境变量，否则登录功能无法正常工作。
                </AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mb-6 bg-emerald-50 border-emerald-200 text-emerald-800">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">邮箱</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="请输入密码"
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
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-8">
              <Button 
                className="w-full h-11 font-semibold bg-navy-700 hover:bg-navy-800 text-white shadow-premium transition-all"
                onClick={handleLogin}
                disabled={loading || !email || !password}
              >
                {loading ? "登录中..." : "登录"}
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-11 font-semibold border-border hover:bg-sand-50 transition-all"
                onClick={handleSignUp}
                disabled={loading || !email || !password}
              >
                {loading ? "注册中..." : "注册新账号"}
              </Button>
              {error?.includes("未验证") && email && (
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const { error: resendError } = await supabase.auth.resend({
                        type: "signup",
                        email,
                      });
                      if (resendError) {
                        setError(resendError.message);
                      } else {
                        setSuccess("验证邮件已重新发送，请检查邮箱。");
                        setError("");
                      }
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "发送失败，请稍后重试。");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full py-2 text-sm text-navy-700 hover:text-navy-800 hover:underline transition-colors"
                >
                  重新发送验证邮件
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <LoginForm />
    </Suspense>
  );
}
