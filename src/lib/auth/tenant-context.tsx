// 全局租户上下文 - 集团多品牌隔离的核心
// 用法：在 layout 中包裹 <TenantProvider>，子组件用 useTenant() 获取当前品牌/季节

"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface Company {
  id: string;
  name: string;
  logo_url?: string;
}

export interface Brand {
  id: string;
  name: string;
  logo_url?: string;
  company_id: string;
}

export interface Season {
  id: string;
  name: string;
  brand_id: string;
  season_type: "SS" | "FW";
  year: number;
  status: "active" | "locked" | "archived";
  start_date: string;
  end_date: string;
}

export interface TenantContextValue {
  // 当前上下文
  currentCompany: Company | null;
  currentBrand: Brand | null;
  currentSeason: Season | null;
  availableBrands: Brand[];
  availableSeasons: Season[];

  // 切换操作
  setBrand: (brandId: string) => void;
  setSeason: (seasonId: string | null) => void;
  setCompany: (companyId: string) => void;

  // 状态
  isLoading: boolean;
  error: string | null;

  // 工具
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | null>(null);

const STORAGE_KEYS = {
  BRAND: "fashion_plm_current_brand_id",
  SEASON: "fashion_plm_current_season_id",
  COMPANY: "fashion_plm_current_company_id",
};

// 默认公司（与 SQL 迁移 011 中的 ID 对应）
const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000010";
const DEFAULT_BRAND_ID = "00000000-0000-0000-0000-000000000001";

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [currentBrandId, setCurrentBrandId] = useState<string | null>(null);
  const [currentSeasonId, setCurrentSeasonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. 加载可用的公司/品牌/季节
  const loadTenants = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 并行获取公司、品牌、季节
      const [companiesRes, brandsRes, seasonsRes] = await Promise.all([
        fetch("/api/organization/companies").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/organization/brands").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/organization/seasons").then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      const loadedCompanies: Company[] = companiesRes.data || [];
      const loadedBrands: Brand[] = brandsRes.data || [];
      const loadedSeasons: Season[] = seasonsRes.data || [];

      setCompanies(loadedCompanies);
      setBrands(loadedBrands);
      setSeasons(loadedSeasons);

      // 2. 确定当前选中的 ID（优先级：URL > localStorage > 默认）
      const urlCompanyId = searchParams.get("companyId");
      const urlBrandId = searchParams.get("brandId");
      const urlSeasonId = searchParams.get("seasonId");

      const storedCompanyId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.COMPANY) : null;
      const storedBrandId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.BRAND) : null;
      const storedSeasonId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.SEASON) : null;

      // 公司选择
      const finalCompanyId =
        urlCompanyId ||
        storedCompanyId ||
        (loadedCompanies.length > 0 ? loadedCompanies[0].id : DEFAULT_COMPANY_ID);

      // 品牌选择（必须属于所选公司）
      const brandsInCompany = loadedBrands.filter((b) => b.company_id === finalCompanyId);
      const finalBrandId =
        urlBrandId ||
        storedBrandId ||
        (brandsInCompany.length > 0 ? brandsInCompany[0].id : DEFAULT_BRAND_ID);

      // 季节选择（必须属于所选品牌，且 active）
      const seasonsInBrand = loadedSeasons.filter(
        (s) => s.brand_id === finalBrandId && s.status === "active"
      );
      const finalSeasonId =
        urlSeasonId ||
        storedSeasonId ||
        (seasonsInBrand.length > 0 ? seasonsInBrand[0].id : null);

      setCurrentCompanyId(finalCompanyId);
      setCurrentBrandId(finalBrandId);
      setCurrentSeasonId(finalSeasonId);

      // 持久化到 localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEYS.COMPANY, finalCompanyId);
        localStorage.setItem(STORAGE_KEYS.BRAND, finalBrandId);
        if (finalSeasonId) {
          localStorage.setItem(STORAGE_KEYS.SEASON, finalSeasonId);
        }
      }
    } catch (err) {
      console.error("加载租户上下文失败:", err);
      setError(err instanceof Error ? err.message : "加载失败");
      // 使用默认值
      setCurrentCompanyId(DEFAULT_COMPANY_ID);
      setCurrentBrandId(DEFAULT_BRAND_ID);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  // 3. 同步当前选择到 URL（让用户可以分享/刷新恢复）
  useEffect(() => {
    if (isLoading || !currentBrandId) return;

    const params = new URLSearchParams(searchParams.toString());
    if (currentBrandId) params.set("brandId", currentBrandId);
    if (currentSeasonId) params.set("seasonId", currentSeasonId);
    if (currentCompanyId) params.set("companyId", currentCompanyId);

    const newSearch = params.toString();
    const currentSearch = searchParams.toString();
    if (newSearch !== currentSearch) {
      router.replace(`${pathname}?${newSearch}`, { scroll: false });
    }
  }, [currentBrandId, currentSeasonId, currentCompanyId, isLoading, pathname, router, searchParams]);

  // 4. 切换操作
  const setCompany = useCallback((companyId: string) => {
    setCurrentCompanyId(companyId);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.COMPANY, companyId);
    }
    // 切换公司后，重置品牌和季节
    setCurrentBrandId(null);
    setCurrentSeasonId(null);
  }, []);

  const setBrand = useCallback((brandId: string) => {
    setCurrentBrandId(brandId);
    setCurrentSeasonId(null); // 切换品牌时重置季节
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.BRAND, brandId);
      localStorage.removeItem(STORAGE_KEYS.SEASON);
    }
  }, []);

  const setSeason = useCallback((seasonId: string | null) => {
    setCurrentSeasonId(seasonId);
    if (typeof window !== "undefined") {
      if (seasonId) {
        localStorage.setItem(STORAGE_KEYS.SEASON, seasonId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.SEASON);
      }
    }
  }, []);

  // 5. 计算当前选中的对象
  const currentCompany = useMemo(
    () => companies.find((c) => c.id === currentCompanyId) || null,
    [companies, currentCompanyId]
  );

  const currentBrand = useMemo(
    () => brands.find((b) => b.id === currentBrandId) || null,
    [brands, currentBrandId]
  );

  const currentSeason = useMemo(
    () => seasons.find((s) => s.id === currentSeasonId) || null,
    [seasons, currentSeasonId]
  );

  const availableBrands = useMemo(
    () => brands.filter((b) => !currentCompanyId || b.company_id === currentCompanyId),
    [brands, currentCompanyId]
  );

  const availableSeasons = useMemo(
    () => seasons.filter((s) => s.brand_id === currentBrandId),
    [seasons, currentBrandId]
  );

  const value: TenantContextValue = {
    currentCompany,
    currentBrand,
    currentSeason,
    availableBrands,
    availableSeasons,
    setCompany,
    setBrand,
    setSeason,
    isLoading,
    error,
    refresh: loadTenants,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant 必须在 TenantProvider 内使用");
  }
  return ctx;
}

// 工具：获取当前上下文的 API 请求头（供 fetch 使用）
export function getTenantHeaders(tenant: TenantContextValue): Record<string, string> {
  return {
    "x-company-id": tenant.currentCompany?.id || "",
    "x-brand-id": tenant.currentBrand?.id || "",
    "x-season-id": tenant.currentSeason?.id || "",
  };
}

// 工具：把当前上下文附加到 API URL（备选方案）
export function withTenantParams(tenant: TenantContextValue, url: string): string {
  const params = new URLSearchParams();
  if (tenant.currentCompany?.id) params.set("companyId", tenant.currentCompany.id);
  if (tenant.currentBrand?.id) params.set("brandId", tenant.currentBrand.id);
  if (tenant.currentSeason?.id) params.set("seasonId", tenant.currentSeason.id);

  const separator = url.includes("?") ? "&" : "?";
  return params.toString() ? `${url}${separator}${params.toString()}` : url;
}
