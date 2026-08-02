// Cloudflare R2 StorageProvider 实现
// R2 兼容 AWS S3 REST API。为了 Edge Runtime 友好、避免拉 AWS SDK，这里用纯 WebCrypto 手动实现 S3 v4 签名。
// 注意：R2 的 S3 endpoint 形如：{ACCOUNT_ID}.r2.cloudflarestorage.com
//       公网访问需要：1) 为 R2 bucket 绑定自定义域名（r2.dev 或自有域名）；2) 或通过 Cloudflare Worker 代理签名访问（推荐）
// 参考：https://developers.cloudflare.com/r2/api/s3/api/

import type {
  StorageProvider,
  UploadOptions,
  UploadResult,
} from "./types";

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** 自定义域名前缀（可选），如 "https://cdn.example.com"，未设置则用 {bucket}.{account}.r2.dev */
  publicBaseUrl?: string;
  /** 绑定的 r2.dev 子域名，形如 https://<sub>.r2.dev 。优先级低于 publicBaseUrl */
  r2DevBaseUrl?: string;
  /** 默认所在区域，通常 auto 即可 */
  region?: string;
}

function readConfig(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
    r2DevBaseUrl: process.env.R2_DEV_BASE_URL,
    region: process.env.R2_REGION || "auto",
  };
}

export function isR2Configured(): boolean {
  return readConfig() !== null;
}

// ---------------------- S3 Signature V4（Edge 兼容，基于 WebCrypto） ----------------------

async function sha256(input: Uint8Array | string): Promise<Uint8Array> {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const buf = await crypto.subtle.digest(
    "SHA-256",
    data as unknown as ArrayBuffer
  );
  return new Uint8Array(buf);
}

function hex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
  const imported = await crypto.subtle.importKey(
    "raw",
    key as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    imported,
    new TextEncoder().encode(data)
  );
  return new Uint8Array(sig);
}

function isoDate(d: Date): { ymd: string; amz: string } {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return { ymd: `${y}${m}${day}`, amz: `${y}${m}${day}T${hh}${mm}${ss}Z` };
}

/** 为 S3 REST 请求生成 Authorization header + 必要的 x-amz-* headers。
 *  这里仅实现 PUT object / DELETE object，简化 scope。
 */
async function signS3Request(params: {
  method: "PUT" | "DELETE";
  bucket: string;
  key: string;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  now: Date;
  headers: Record<string, string>;
  payloadSha256Hex: string;
}): Promise<Record<string, string>> {
  const { ymd, amz } = isoDate(params.now);
  const service = "s3";
  const host = `${params.accountId}.r2.cloudflarestorage.com`;

  const canonicalHeaders: Record<string, string> = {
    host,
    "x-amz-content-sha256": params.payloadSha256Hex,
    "x-amz-date": amz,
    ...params.headers,
  };
  // S3 v4: lowercase, sort by key, strip duplicates (last wins ok)
  const headerKeys = Object.keys(canonicalHeaders)
    .map((k) => k.toLowerCase())
    .sort();
  const signedHeadersString = headerKeys.join(";");
  const canonicalHeaderString = headerKeys
    .map((k) => `${k}:${(canonicalHeaders as any)[k].trim()}\n`)
    .join("");

  const encodedKey = encodeURIComponent(params.key);
  const canonicalUri = `/${params.bucket}/${encodedKey}`;
  const canonicalQueryString = "";
  const canonicalRequest = [
    params.method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaderString,
    signedHeadersString,
    params.payloadSha256Hex,
  ].join("\n");

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${ymd}/${params.region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amz,
    credentialScope,
    hex(await sha256(canonicalRequest)),
  ].join("\n");

  const kDate = await hmacSha256(
    new TextEncoder().encode(`AWS4${params.secretAccessKey}`),
    ymd
  );
  const kRegion = await hmacSha256(kDate, params.region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = hex(await hmacSha256(kSigning, stringToSign));

  const authorization = `${algorithm} Credential=${params.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersString}, Signature=${signature}`;

  const outHeaders: Record<string, string> = { ...canonicalHeaders, Authorization: authorization };
  return outHeaders;
}

// ---------------------- Provider 实现 ----------------------

class R2StorageProvider implements StorageProvider {
  readonly driver = "r2" as const;

  private _config: R2Config;
  constructor(config: R2Config) {
    this._config = config;
  }

  getPublicUrl(objectPath: string, bucketName: string): string {
    const safe = objectPath.replace(/^\/+/, "");
    const base = this._config.publicBaseUrl || this._config.r2DevBaseUrl || "";
    if (base) {
      return `${base.replace(/\/+$/, "")}/${encodeURIComponent(bucketName)}/${encodeURI(safe).replace(/%2F/g, "/")}`;
    }
    // Fallback: S3 URL（R2 S3 endpoint 默认不是公开可访问的，需要 r2.dev 或自定义域名）
    return `https://${this._config.accountId}.r2.cloudflarestorage.com/${encodeURIComponent(bucketName)}/${encodeURI(safe).replace(/%2F/g, "/")}`;
  }

  async ensureBucket(_bucketName: string): Promise<void> {
    // R2 bucket 需要在 Cloudflare Dashboard / Wrangler / Terraform 中提前创建。
    // 这里不做自动创建，避免 S3 CreateBucket 兼容问题以及权限泄露。
  }

  async upload(
    file: Blob & { name?: string },
    objectPath: string,
    bucketName: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const safePath = buildObjectPath(objectPath, file);
    const cfg = this._config;
    const region = cfg.region || "auto";
    const now = new Date();

    const bytes = new Uint8Array(await file.arrayBuffer());
    const payloadHash = hex(await sha256(bytes));

    const extraHeaders: Record<string, string> = {};
    if (options?.contentType) extraHeaders["content-type"] = options.contentType;
    if (options?.cacheControl) extraHeaders["cache-control"] = `public, max-age=${options.cacheControl}`;

    const signed = await signS3Request({
      method: "PUT",
      bucket: bucketName,
      key: safePath,
      accountId: cfg.accountId,
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
      region,
      now,
      headers: extraHeaders,
      payloadSha256Hex: payloadHash,
    });

    const url = `https://${cfg.accountId}.r2.cloudflarestorage.com/${encodeURIComponent(bucketName)}/${encodeURI(safePath).replace(/%2F/g, "/")}`;

    const resp = await fetch(url, {
      method: "PUT",
      headers: signed as any,
      body: bytes,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`R2 upload failed: HTTP ${resp.status} ${text}`);
    }
    return { url: this.getPublicUrl(safePath, bucketName), path: safePath };
  }

  async delete(objectPath: string, bucketName: string): Promise<void> {
    const safePath = objectPath.replace(/^\/+/, "");
    const cfg = this._config;
    const region = cfg.region || "auto";
    const now = new Date();
    const emptyHash = hex(await sha256(""));

    const signed = await signS3Request({
      method: "DELETE",
      bucket: bucketName,
      key: safePath,
      accountId: cfg.accountId,
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
      region,
      now,
      headers: {},
      payloadSha256Hex: emptyHash,
    });

    const url = `https://${cfg.accountId}.r2.cloudflarestorage.com/${encodeURIComponent(bucketName)}/${encodeURI(safePath).replace(/%2F/g, "/")}`;
    const resp = await fetch(url, {
      method: "DELETE",
      headers: signed as any,
    });
    if (!resp.ok && resp.status !== 404) {
      const text = await resp.text().catch(() => "");
      throw new Error(`R2 delete failed: HTTP ${resp.status} ${text}`);
    }
  }
}

function buildObjectPath(objectPath: string, file: Blob & { name?: string }): string {
  let path = objectPath.replace(/^\/+/, "");
  // 如果路径看起来是个目录（尾部 / 或没有扩展名），则按 file 名自动补齐
  if (path.endsWith("/") || !/\.[a-zA-Z0-9]+$/.test(path)) {
    const fileExt = file.name?.split(".").pop()?.toLowerCase() || "bin";
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sep = path.endsWith("/") ? "" : "/";
    path = `${path}${sep}${stamp}.${fileExt}`;
  }
  return path;
}

export function createR2StorageProvider(
  config?: Partial<R2Config>
): StorageProvider | null {
  const base = readConfig();
  if (!base) return null;
  const merged: R2Config = { ...base, ...config };
  if (!merged.accountId || !merged.accessKeyId || !merged.secretAccessKey) return null;
  return new R2StorageProvider(merged);
}
