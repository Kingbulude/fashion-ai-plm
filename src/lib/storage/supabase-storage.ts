// 兼容层：原有导入 import { uploadFile } from "@/lib/storage/supabase-storage" 保持可用
// 底层已切换到统一 StorageProvider（通过 STORAGE_PROVIDER 切换 R2 / Supabase）
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  uploadFile as unifiedUploadFile,
  getFileUrl as unifiedGetFileUrl,
  deleteFile as unifiedDeleteFile,
  createBucketIfNotExists as unifiedCreateBucket,
} from "./index";

const BUCKET_NAME = "design-assets";

export async function uploadFile(
  file: File,
  path: string,
  client?: SupabaseClient
): Promise<{ url: string; path: string }> {
  return unifiedUploadFile(file, path, client, { bucket: BUCKET_NAME });
}

export async function getFileUrl(
  path: string,
  client?: SupabaseClient
): Promise<string> {
  return unifiedGetFileUrl(path, client, { bucket: BUCKET_NAME });
}

export async function deleteFile(
  path: string,
  client?: SupabaseClient
): Promise<void> {
  return unifiedDeleteFile(path, client, { bucket: BUCKET_NAME });
}

export async function createBucketIfNotExists(
  client?: SupabaseClient
): Promise<void> {
  void client;
  return unifiedCreateBucket(BUCKET_NAME);
}
