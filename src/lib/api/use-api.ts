// 全局 API 客户端 - 自动附带租户请求头
// 替代直接调用 fetch，自动从 TenantContext 注入 x-company-id/x-brand-id/x-season-id

"use client";

import { useTenant } from "@/lib/auth/tenant-context";

export function useApi() {
  const tenant = useTenant();

  return {
    get: async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
      const res = await fetch(url, {
        method: "GET",
        ...options,
        headers: {
          ...options.headers,
          "x-company-id": tenant.currentCompany?.id || "",
          "x-brand-id": tenant.currentBrand?.id || "",
          "x-season-id": tenant.currentSeason?.id || "",
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "请求失败" }));
        throw new Error(err.error || `请求失败: ${res.status}`);
      }
      return res.json();
    },
    post: async <T = any>(url: string, body: any, options: RequestInit = {}): Promise<T> => {
      const res = await fetch(url, {
        method: "POST",
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
          "x-company-id": tenant.currentCompany?.id || "",
          "x-brand-id": tenant.currentBrand?.id || "",
          "x-season-id": tenant.currentSeason?.id || "",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "请求失败" }));
        throw new Error(err.error || `请求失败: ${res.status}`);
      }
      return res.json();
    },
    put: async <T = any>(url: string, body: any, options: RequestInit = {}): Promise<T> => {
      const res = await fetch(url, {
        method: "PUT",
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
          "x-company-id": tenant.currentCompany?.id || "",
          "x-brand-id": tenant.currentBrand?.id || "",
          "x-season-id": tenant.currentSeason?.id || "",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "请求失败" }));
        throw new Error(err.error || `请求失败: ${res.status}`);
      }
      return res.json();
    },
    delete: async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
      const res = await fetch(url, {
        method: "DELETE",
        ...options,
        headers: {
          ...options.headers,
          "x-company-id": tenant.currentCompany?.id || "",
          "x-brand-id": tenant.currentBrand?.id || "",
          "x-season-id": tenant.currentSeason?.id || "",
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "请求失败" }));
        throw new Error(err.error || `请求失败: ${res.status}`);
      }
      return res.json();
    },
  };
}
