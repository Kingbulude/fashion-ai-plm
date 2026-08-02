// StorageProvider 统一接口
// 目标：通过单一 STORAGE_PROVIDER 环境变量在"Supabase Storage"与"Cloudflare R2"之间切换，
// 所有业务路由走同一套 upload/delete/getUrl API，不关心底层实现。

export type StorageDriver = "supabase" | "r2";

export interface UploadOptions {
  contentType?: string;
  /** seconds */
  cacheControl?: number;
  upsert?: boolean;
  /** 可选：限制扩展名，白名单（小写，不含点），例如 ['png','jpg','webp'] */
  allowedExts?: string[];
  /** 单文件大小上限（字节） */
  maxSizeBytes?: number;
}

export interface UploadResult {
  /** 可公网访问的 URL */
  url: string;
  /** 对象在 bucket 内的相对路径，供 delete 复用 */
  path: string;
}

export interface StorageProvider {
  readonly driver: StorageDriver;

  /**
   * 上传文件
   * @param file    浏览器 File / Node Blob 或等效对象
   * @param objectPath  bucket 内路径（不含 bucket 名），例如 "styles/123/abc.jpg"
   *                    或仅有前缀目录（无文件名），此时根据 file.name 自动补齐
   * @param bucketName  bucket 名，例如 "design-assets" / "brand-logos"
   */
  upload(
    file: Blob & { name?: string },
    objectPath: string,
    bucketName: string,
    options?: UploadOptions
  ): Promise<UploadResult>;

  /** 删除对象 */
  delete(objectPath: string, bucketName: string): Promise<void>;

  /** 获取公网访问 URL（R2 一般为 {PUBLIC_BASE_URL}/{bucket}/{path}） */
  getPublicUrl(objectPath: string, bucketName: string): string;

  /** 确保 bucket 存在（无则创建）。R2 下通常通过 CLI/Terraform 预创建，这里作为 no-op + 日志告警。 */
  ensureBucket(bucketName: string): Promise<void>;
}

export type FileValidationError = {
  kind: "type" | "size";
  message: string;
};

/** 简单的客户端/服务端通用校验 */
export function validateUpload(
  file: Blob & { name?: string },
  opts: UploadOptions
): FileValidationError | null {
  if (opts.allowedExts && file.name) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !opts.allowedExts.includes(ext)) {
      return { kind: "type", message: `不支持的文件格式，允许：${opts.allowedExts.join(", ")}` };
    }
  }
  if (opts.maxSizeBytes && file.size > opts.maxSizeBytes) {
    return {
      kind: "size",
      message: `文件过大（${Math.round(file.size / 1024)}KB），上限 ${Math.round(opts.maxSizeBytes / 1024)}KB`,
    };
  }
  return null;
}
