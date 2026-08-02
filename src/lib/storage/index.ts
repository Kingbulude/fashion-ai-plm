// StorageProvider 工厂 + 导出
// 使用方式：import { getStorageProvider } from "@/lib/storage";
// 环境变量控制：
//   STORAGE_PROVIDER = "r2" | "supabase"（默认 supabase，向后兼容）
import type {
  StorageProvider,
  StorageDriver,
  UploadOptions,
  UploadResult,
} from "./types";
import { validateUpload, type FileValidationError } from "./types";
import { createR2StorageProvider, isR2Configured } from "./r2-provider";
import { createSupabaseStorageProvider } from "./supabase-provider";
import type { SupabaseClient } from "@supabase/supabase-js";

export {
  validateUpload,
  type UploadOptions,
  type UploadResult,
  type StorageProvider,
  type StorageDriver,
  type FileValidationError,
};

export { isR2Configured } from "./r2-provider";

let _cached: StorageProvider | null = null;
let _cachedDriver: StorageDriver | null = null;

export function resolveStorageDriver(): StorageDriver {
  const env = (process.env.STORAGE_PROVIDER || "supabase").toLowerCase();
  if (env === "r2") return "r2";
  if (env === "supabase") return "supabase";
  // 未配置 R2 凭证时强制回退
  return "supabase";
}

export function getStorageProvider(
  fallback?: SupabaseClient
): StorageProvider {
  const driver = resolveStorageDriver();
  if (_cached && _cachedDriver === driver) return _cached;

  let provider: StorageProvider;
  if (driver === "r2" && isR2Configured()) {
    provider = createR2StorageProvider() as StorageProvider;
  } else {
    provider = createSupabaseStorageProvider(fallback);
  }
  _cached = provider;
  _cachedDriver = driver;
  return provider;
}

// 便捷 API（保留原有函数签名，向后兼容旧的 supabase-storage.ts）
const DEFAULT_BUCKET = "design-assets";

export async function uploadFile(
  file: Blob & { name?: string },
  path: string,
  _deprecatedClient?: SupabaseClient,
  opts?: Omit<UploadOptions, "contentType"> & { bucket?: string }
): Promise<UploadResult> {
  const bucket = opts?.bucket || DEFAULT_BUCKET;
  return getStorageProvider().upload(file, path, bucket, {
    contentType: file instanceof File ? file.type : undefined,
    ...opts,
  });
}

export async function getFileUrl(
  path: string,
  _deprecatedClient?: SupabaseClient,
  opts?: { bucket?: string }
): Promise<string> {
  const bucket = opts?.bucket || DEFAULT_BUCKET;
  return getStorageProvider().getPublicUrl(path, bucket);
}

export async function deleteFile(
  path: string,
  _deprecatedClient?: SupabaseClient,
  opts?: { bucket?: string }
): Promise<void> {
  const bucket = opts?.bucket || DEFAULT_BUCKET;
  await getStorageProvider().delete(path, bucket);
}

export async function createBucketIfNotExists(
  bucketName: string = DEFAULT_BUCKET
): Promise<void> {
  await getStorageProvider().ensureBucket(bucketName);
}
