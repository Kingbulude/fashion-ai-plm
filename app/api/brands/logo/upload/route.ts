import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel } from "@/lib/auth/rbac";

export const runtime = "edge";

const LOGO_BUCKET = "brand-logos";

export async function POST(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role_level, company_id")
      .eq("user_id", session.user.id)
      .single();

    if (profile?.role_level !== RoleLevel.BOSS && profile?.role_level !== RoleLevel.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const brandId = formData.get("brandId") as string;

    if (!file || !brandId) {
      return NextResponse.json({ error: "缺少文件或品牌ID" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (!["png", "jpg", "jpeg", "webp", "gif"].includes(fileExt || "")) {
      return NextResponse.json({ error: "不支持的文件格式" }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "文件大小不能超过 2MB" }, { status: 400 });
    }

    const fileName = `${brandId}/${Date.now()}.${fileExt}`;

    await createBucketIfNotExists();

    const { error } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(fileName, file, {
        cacheControl: "86400",
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json({ error: "上传失败" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl, path: fileName });
  } catch (error) {
    console.error("Logo upload error:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}

async function createBucketIfNotExists(): Promise<void> {
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
