import { NextResponse } from "next/server";
import { RoleLevel } from "@/lib/auth/rbac";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import {
  getStorageProvider,
  validateUpload,
  resolveStorageDriver,
  isR2Configured,
} from "@/lib/storage";

export const runtime = "edge";

const LOGO_BUCKET = "company-logos";
const ALLOWED_EXTS = ["png", "jpg", "jpeg", "webp", "gif"];
const MAX_SIZE = 2 * 1024 * 1024;

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

    if (
      profile?.role_level !== RoleLevel.BOSS &&
      profile?.role_level !== RoleLevel.ADMIN
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!profile.company_id) {
      return NextResponse.json(
        { error: "当前用户未绑定公司" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "缺少文件" }, { status: 400 });
    }

    const vErr = validateUpload(file, {
      allowedExts: ALLOWED_EXTS,
      maxSizeBytes: MAX_SIZE,
    });
    if (vErr) {
      return NextResponse.json({ error: vErr.message }, { status: 400 });
    }

    // StorageProvider 内部会自动从 service role / 环境变量取凭证
    const driver = resolveStorageDriver();
    if (driver !== "r2" && !isR2Configured()) {
      // Supabase 模式下无特殊要求
    }

    const storage = getStorageProvider();
    await storage.ensureBucket(LOGO_BUCKET);

    const result = await storage.upload(
      file,
      `${profile.company_id}/`,
      LOGO_BUCKET,
      {
        contentType: file.type,
        cacheControl: 86400,
        upsert: true,
        allowedExts: ALLOWED_EXTS,
        maxSizeBytes: MAX_SIZE,
      }
    );

    return NextResponse.json({
      url: result.url,
      path: result.path,
      driver,
    });
  } catch (error: any) {
    console.error("公司 Logo 上传异常:", error);
    return NextResponse.json(
      { error: "上传失败", detail: error?.message || String(error) },
      { status: 500 }
    );
  }
}
