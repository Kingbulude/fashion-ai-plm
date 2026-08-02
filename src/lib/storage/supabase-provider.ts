// Supabase Storage Provider 实现
import type {
  StorageProvider,
  UploadOptions,
  UploadResult,
} from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleClient } from "@/lib/db/client";

class SupabaseStorageProvider implements StorageProvider {
  readonly driver = "supabase" as const;

  private _fallbackClient?: SupabaseClient;

  constructor(fallbackClient?: SupabaseClient) {
    this._fallbackClient = fallbackClient;
  }

  private getClient(): SupabaseClient {
    try {
      // 优先使用 service role，避免 bucket 管理/上传受 RLS 限制
      return getServiceRoleClient() ?? (this._fallbackClient as any);
    } catch {
      return this._fallbackClient as SupabaseClient;
    }
  }

  getPublicUrl(objectPath: string, bucketName: string): string {
    const sb = this.getClient();
    const { data } = (sb as any)?.storage
      ?.from(bucketName)
      ?.getPublicUrl(objectPath);
    return data?.publicUrl ?? "";
  }

  async ensureBucket(bucketName: string): Promise<void> {
    const sb = this.getClient();
    if (!sb?.storage) return;
    try {
      const { data: buckets } = await sb.storage.listBuckets();
      if (buckets?.some((b: any) => b.name === bucketName)) return;
      const { error } = await sb.storage.createBucket(bucketName, {
        public: true,
      });
      if (error) console.warn("[SupabaseStorage] 创建 bucket 失败:", error);
    } catch (e) {
      console.warn("[SupabaseStorage] ensureBucket 出错:", e);
    }
  }

  async upload(
    file: Blob & { name?: string },
    objectPath: string,
    bucketName: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const sb = this.getClient();
    const path = buildObjectPath(objectPath, file);

    const { error } = await sb.storage
      .from(bucketName)
      .upload(path, file as File, {
        cacheControl: String(options?.cacheControl ?? 3600),
        upsert: options?.upsert ?? false,
        contentType: options?.contentType,
      } as any);
    if (error) {
      throw new Error(`Supabase upload 失败: ${error.message || String(error)}`);
    }
    return { url: this.getPublicUrl(path, bucketName), path };
  }

  async delete(objectPath: string, bucketName: string): Promise<void> {
    const sb = this.getClient();
    const { error } = await sb.storage.from(bucketName).remove([objectPath]);
    if (error) {
      throw new Error(`Supabase delete 失败: ${error.message || String(error)}`);
    }
  }
}

function buildObjectPath(objectPath: string, file: Blob & { name?: string }): string {
  let path = objectPath.replace(/^\/+/, "");
  if (path.endsWith("/") || !/\.[a-zA-Z0-9]+$/.test(path)) {
    const fileExt = file.name?.split(".").pop()?.toLowerCase() || "bin";
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sep = path.endsWith("/") ? "" : "/";
    path = `${path}${sep}${stamp}.${fileExt}`;
  }
  return path;
}

export function createSupabaseStorageProvider(
  fallbackClient?: SupabaseClient
): StorageProvider {
  return new SupabaseStorageProvider(fallbackClient);
}
