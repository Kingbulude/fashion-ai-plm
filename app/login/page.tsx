"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/auth/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, User, Lock } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirect, setRedirect] = useState("/dashboard");
  
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
    
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError) {
      if (authError.message.includes("email") && authError.message.includes("confirmed")) {
        setError("邮箱尚未验证，请检查邮箱完成验证后再登录。");
      } else {
        setError("邮箱或密码错误，请重试。");
      }
    } else {
      router.push(redirect);
    }
    
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError("");
    
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
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center">
              <span className="text-white text-2xl font-bold">SF</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">StyleForge</CardTitle>
          <CardDescription>服装AI全链路品牌自研系统</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
          <Button 
            className="w-full" 
            onClick={handleLogin}
            disabled={loading || !email || !password}
          >
            {loading ? "登录中..." : "登录"}
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleSignUp}
            disabled={loading || !email || !password}
          >
            {loading ? "注册中..." : "注册"}
          </Button>
        </CardContent>
      </Card>
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
