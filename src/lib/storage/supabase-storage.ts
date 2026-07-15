import { supabase } from "@/lib/db/client";

const BUCKET_NAME = "design-assets";

export async function uploadFile(file: File, path: string): Promise<{ url: string; path: string }> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${path}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`上传文件失败: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return { url: urlData.publicUrl, path: fileName };
}

export async function getFileUrl(path: string): Promise<string> {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function deleteFile(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    throw new Error(`删除文件失败: ${error.message}`);
  }
}

export async function createBucketIfNotExists(): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();

  const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10485760,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"],
    });

    if (error) {
      console.error("创建存储桶失败:", error.message);
    }
  }
}
