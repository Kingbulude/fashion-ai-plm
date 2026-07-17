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
  const [loading, setLoading] = useState(false);
  const [redirect, setRedirect] = useState("/");
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams) {
      setRedirect(searchParams.get("redirect") || "/dashboard");
    }
  }, [searchParams]);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes("email") && authError.message.includes("confirmed")) {
          setError("邮箱尚未验证，请检查邮箱完成验证后再登录。");
        } else {
          setError(authError.message || "邮箱或密码错误，请重试。");
        }
      } else {
        router.push(redirect);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请检查网络或环境变量配置。");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError("");

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (authError) {
        setError(authError.message);
      } else {
        setError("注册成功！请检查邮箱完成验证后再登录。");
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
    <div className="min-h-screen w-full flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-blue-500/10 to-transparent" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">StyleForge</h1>
              <p className="text-sm text-slate-400">服装AI全链路品牌管理系统</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            从设计到上市
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              一站式款式管理
            </span>
          </h2>
          <p className="text-slate-400 text-lg mb-12 max-w-md">
            轻资产服装品牌的全链路解决方案，让每一款产品从创意到落地都清晰可控。
          </p>
          
          <div className="space-y-6">
            {features.map((feature, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <Card className="w-full max-w-md border-0 shadow-xl bg-white">
          <CardContent className="p-8">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">StyleForge</h1>
                <p className="text-xs text-muted-foreground">服装AI全链路品牌管理系统</p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">欢迎回来</h2>
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
                    className="pl-10 h-11"
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
                    className="pl-10 pr-10 h-11"
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
                className="w-full h-11 font-medium" 
                onClick={handleLogin}
                disabled={loading || !email || !password}
              >
                {loading ? "登录中..." : "登录"}
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-11 font-medium" 
                onClick={handleSignUp}
                disabled={loading || !email || !password}
              >
                {loading ? "注册中..." : "注册新账号"}
              </Button>
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
