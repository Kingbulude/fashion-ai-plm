"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { AdminPageContainer, AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenant } from "@/lib/auth/tenant-context";
import { Building2, Loader2, Save, CheckCircle2 } from "lucide-react";

export default function AdminCompanyPage() {
  const { currentCompany, refresh } = useTenant();
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentCompany) {
      setName(currentCompany.name || "");
      setLogoUrl(currentCompany.logo_url || "");
    }
  }, [currentCompany?.id, currentCompany?.name, currentCompany?.logo_url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany?.id) {
      setError("当前未绑定公司");
      return;
    }

    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      const res = await fetch(`/api/organization/companies/${currentCompany.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          logoUrl: logoUrl.trim() || null,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "保存失败");
        return;
      }

      setSuccess(true);
      await refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("保存公司信息失败:", err);
      setError("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarLayout>
      <AdminPageContainer>
        <AdminPageHeader
          title="公司信息"
          description="修改集团/公司名称与 Logo，修改后顶部导航会同步更新。"
          icon={Building2}
          backHref="/admin"
          backLabel="返回后台配置"
        />

        <AdminSectionCard title="基本信息" titleIcon={Building2}>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              公司信息已保存
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="company-name">集团 / 公司名称</Label>
              <Input
                id="company-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入公司名称"
                disabled={!currentCompany}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-logo">Logo URL（可选）</Label>
              <Input
                id="company-logo"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                disabled={!currentCompany}
              />
              <p className="text-xs text-muted-foreground">
                留空则不显示 Logo。支持任意公开图片地址。
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={saving || !currentCompany || !name.trim()}
                className="bg-navy-700 hover:bg-navy-800 text-white"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                保存
              </Button>
            </div>
          </form>
        </AdminSectionCard>
      </AdminPageContainer>
    </SidebarLayout>
  );
}
