"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { AdminPageContainer, AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenant } from "@/lib/auth/tenant-context";
import { Building2, Loader2, Save, CheckCircle2, Upload, X, ImageIcon } from "lucide-react";

export default function AdminCompanyPage() {
  const { currentCompany, refresh } = useTenant();
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentCompany) {
      setName(currentCompany.name || "");
      setLogoUrl(currentCompany.logo_url || "");
      setPreviewUrl(currentCompany.logo_url || null);
      setSelectedFile(null);
    }
  }, [currentCompany?.id, currentCompany?.name, currentCompany?.logo_url]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setError("仅支持 PNG、JPG、WebP、GIF 格式的图片");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("图片大小不能超过 2MB");
      return;
    }

    setError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearLogo = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setLogoUrl("");
  };

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
      let finalLogoUrl = logoUrl.trim() || null;

      // 如果有新选择的文件，先上传 Logo
      if (selectedFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/organization/companies/logo/upload", {
          method: "POST",
          body: formData,
        });

        const uploadJson = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          setError(uploadJson.error || "Logo 上传失败");
          setSaving(false);
          setUploading(false);
          return;
        }
        finalLogoUrl = uploadJson.url || null;
        setUploading(false);
      }

      const res = await fetch(`/api/organization/companies/${currentCompany.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          logoUrl: finalLogoUrl,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "保存失败");
        return;
      }

      setSelectedFile(null);
      setSuccess(true);
      await refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("保存公司信息失败:", err);
      setError("保存失败，请重试");
    } finally {
      setSaving(false);
      setUploading(false);
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
              <Label>公司 Logo</Label>
              <div className="flex items-start gap-4">
                <div className="relative w-24 h-24 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="公司 Logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <Label
                    htmlFor="company-logo"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-sand-50 cursor-pointer text-sm transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    {selectedFile ? "更换图片" : "上传 Logo"}
                  </Label>
                  <input
                    id="company-logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={!currentCompany}
                  />
                  <p className="text-xs text-muted-foreground">
                    支持 PNG、JPG、WebP、GIF，最大 2MB。
                  </p>
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                      移除 Logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={saving || uploading || !currentCompany || !name.trim()}
                className="bg-navy-700 hover:bg-navy-800 text-white"
              >
                {(saving || uploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                {uploading ? "上传中..." : "保存"}
              </Button>
            </div>
          </form>
        </AdminSectionCard>
      </AdminPageContainer>
    </SidebarLayout>
  );
}
