import { NextResponse } from "next/server";
import { RoleLevel } from "@/lib/auth/rbac";
import { SupabaseClient } from "@supabase/supabase-js";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

const LOGO_BUCKET = "company-logos";

// 上传公司 Logo
export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { data: profile } = await supabase
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

    await createBucketIfNotExists(supabase);

    const { error } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(fileName, file, {
        cacheControl: "86400",
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      console.error("公司 Logo 上传失败:", error);
      return NextResponse.json({ error: "上传失败" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl, path: fileName });
  } catch (error) {
    console.error("公司 Logo 上传异常:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}

async function createBucketIfNotExists(supabase: SupabaseClient): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === LOGO_BUCKET);

  if (!bucketExists) {
    await supabase.storage.createBucket(LOGO_BUCKET, {
      public: true,
      fileSizeLimit: 2097152,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    });
  }
}
