"use client";

// 轻量 API fetch 工具
// 统一处理 Content-Type、响应解析、错误抛出，供 React Query queryFn 复用

export type ApiError = {
  error?: string;
  message?: string;
  status?: number;
};

export class HttpError extends Error {
  status: number;
  data: ApiError;

  constructor(status: number, data: ApiError) {
    super(data.error || data.message || `HTTP ${status}`);
    this.status = status;
    this.data = data;
    this.name = "HttpError";
  }
}

export type JsonBody = Record<string, unknown> | unknown[];

export type ApiInit = Omit<RequestInit, "body"> & {
  body?: RequestInit["body"] | JsonBody | null;
};

export async function apiFetch<T = unknown>(
  input: string,
  init?: ApiInit
): Promise<T> {
  const rawBody = init?.body;
  const headers = new Headers(init?.headers);

  let finalBody: BodyInit | null | undefined;
  if (
    rawBody !== undefined &&
    rawBody !== null &&
    typeof rawBody === "object" &&
    !(rawBody instanceof FormData) &&
    !(rawBody instanceof Blob) &&
    !(rawBody instanceof ArrayBuffer) &&
    !ArrayBuffer.isView(rawBody) &&
    !(rawBody instanceof ReadableStream) &&
    !(rawBody instanceof URLSearchParams)
  ) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    finalBody = JSON.stringify(rawBody);
  } else {
    finalBody = rawBody as BodyInit | null | undefined;
  }

  const { body: _ignored, ...restInit } = (init ?? {}) as RequestInit;

  const res = await fetch(input, {
    ...restInit,
    headers,
    body: finalBody,
    credentials: "include",
  });

  const text = await res.text();
  let data: T | ApiError;
  try {
    data = text ? (JSON.parse(text) as T) : (undefined as unknown as T);
  } catch {
    data = { error: text || "Invalid JSON response" } as unknown as T;
  }

  if (!res.ok) {
    throw new HttpError(res.status, (data as ApiError) || {});
  }

  return data as T;
}
