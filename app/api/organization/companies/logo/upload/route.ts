import { NextResponse } from "next/server";
import { RoleLevel } from "@/lib/auth/rbac";
import { SupabaseClient } from "@supabase/supabase-js";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { getServiceRoleClient, isServiceRoleConfigured } from "@/lib/db/client";

export const runtime = "edge";

const LOGO_BUCKET = "company-logos";

// 上传公司 Logo
export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;

    // 鉴权：仅 BOSS/ADMIN 可上传
    const { data: profile } = await ctx.supabase
      .from("profiles")
      .select("role_level, company_id")
      .eq("user_id", ctx.user.id)
      .single();

    if (profile?.role_level !== RoleLevel.BOSS && profile?.role_level !== RoleLevel.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!profile.company_id) {
      return NextResponse.json({ error: "当前用户未绑定公司" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "缺少文件" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (!["png", "jpg", "jpeg", "webp", "gif"].includes(fileExt || "")) {
      return NextResponse.json({ error: "不支持的文件格式" }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "文件大小不能超过 2MB" }, { status: 400 });
    }

    const fileName = `${profile.company_id}/${Date.now()}.${fileExt}`;

    // Storage 创建 bucket / 上传需要 service role 权限
    const adminSupabase = getServiceRoleClient();
    if (!isServiceRoleConfigured) {
      console.error("[company-logo-upload] SUPABASE_SERVICE_ROLE_KEY 未配置，无法上传 Logo");
      return NextResponse.json(
        { error: "Service role key 未配置", detail: "请配置 SUPABASE_SERVICE_ROLE_KEY 环境变量以使用 Logo 上传功能" },
        { status: 500 }
      );
    }
    await createBucketIfNotExists(adminSupabase);

    const { error } = await adminSupabase.storage
      .from(LOGO_BUCKET)
      .upload(fileName, file, {
        cacheControl: "86400",
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      console.error("公司 Logo 上传失败:", error);
      return NextResponse.json(
        { error: "上传失败", detail: error.message, code: error.name },
        { status: 500 }
      );
    }

    const { data: urlData } = adminSupabase.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl, path: fileName });
  } catch (error: any) {
    console.error("公司 Logo 上传异常:", error);
    return NextResponse.json(
      { error: "上传失败", detail: error?.message || String(error) },
      { status: 500 }
    );
  }
}

async function createBucketIfNotExists(supabase: SupabaseClient): Promise<void> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error("列出 Storage buckets 失败:", listError);
    throw listError;
  }
  const bucketExists = buckets?.some((b) => b.name === LOGO_BUCKET);

  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(LOGO_BUCKET, {
      public: true,
      fileSizeLimit: 2097152,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    });
    if (error) {
      console.error("创建 company-logos bucket 失败:", error);
      throw error;
    }
  }
}
