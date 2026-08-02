import { NextResponse } from "next/server";
import { RoleLevel } from "@/lib/auth/rbac";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import {
  getStorageProvider,
  validateUpload,
  resolveStorageDriver,
} from "@/lib/storage";

export const runtime = "edge";

const LOGO_BUCKET = "brand-logos";
const ALLOWED_EXTS = ["png", "jpg", "jpeg", "webp", "gif"];
const MAX_SIZE = 2 * 1024 * 1024;

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

    if (
      profile?.role_level !== RoleLevel.BOSS &&
      profile?.role_level !== RoleLevel.ADMIN
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const brandId = formData.get("brandId") as string;

    if (!file || !brandId) {
      return NextResponse.json(
        { error: "缺少文件或品牌ID" },
        { status: 400 }
      );
    }

    const vErr = validateUpload(file, {
      allowedExts: ALLOWED_EXTS,
      maxSizeBytes: MAX_SIZE,
    });
    if (vErr) {
      return NextResponse.json({ error: vErr.message }, { status: 400 });
    }

    const storage = getStorageProvider(supabase as any);
    await storage.ensureBucket(LOGO_BUCKET);

    const result = await storage.upload(file, `${brandId}/`, LOGO_BUCKET, {
      contentType: file.type,
      cacheControl: 86400,
      upsert: true,
      allowedExts: ALLOWED_EXTS,
      maxSizeBytes: MAX_SIZE,
    });

    return NextResponse.json({
      url: result.url,
      path: result.path,
      driver: resolveStorageDriver(),
    });
  } catch (error) {
    console.error("Logo upload error:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
