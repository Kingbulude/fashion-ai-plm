"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { apiFetch, type HttpError } from "./api-fetch";

// ============================================================
// Styles（款式）
// ============================================================
export interface StyleRecord {
  id: string;
  style_no: string;
  name: string;
  season?: string | null;
  category?: string | null;
  status?: string;
  target_cost?: string | number | null;
  actual_cost?: string | number | null;
  description?: string | null;
  company_id?: string | null;
  brand_id?: string | null;
  season_id?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

const STYLES_KEY = ["styles"] as const;

export function useStyles(
  options?: Omit<UseQueryOptions<StyleRecord[], HttpError>, "queryKey" | "queryFn">
) {
  return useQuery<StyleRecord[], HttpError>({
    queryKey: STYLES_KEY,
    queryFn: () => apiFetch<StyleRecord[]>("/api/styles"),
    ...options,
  });
}

export function useStyle(
  id: string | null | undefined,
  options?: Omit<
    UseQueryOptions<StyleRecord, HttpError>,
    "queryKey" | "queryFn" | "enabled"
  >
) {
  return useQuery<StyleRecord, HttpError>({
    queryKey: [...STYLES_KEY, id] as const,
    queryFn: () => apiFetch<StyleRecord>(`/api/styles/${id}`),
    enabled: Boolean(id),
    ...options,
  });
}

export function useCreateStyle(
  options?: UseMutationOptions<StyleRecord, HttpError, Partial<StyleRecord>>
) {
  const qc = useQueryClient();
  return useMutation<StyleRecord, HttpError, Partial<StyleRecord>>({
    mutationFn: (body) =>
      apiFetch<StyleRecord>("/api/styles", { method: "POST", body }),
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: STYLES_KEY });
      (options as any)?.onSuccess?.(...args);
    },
    ...(options as any),
  });
}

export function useUpdateStyle(
  options?: UseMutationOptions<
    StyleRecord,
    HttpError,
    { id: string; body: Partial<StyleRecord> }
  >
) {
  const qc = useQueryClient();
  return useMutation<
    StyleRecord,
    HttpError,
    { id: string; body: Partial<StyleRecord> }
  >({
    mutationFn: ({ id, body }) =>
      apiFetch<StyleRecord>(`/api/styles/${id}`, { method: "PUT", body }),
    onSuccess: (...args: any[]) => {
      const vars = args[1] as { id: string } | undefined;
      qc.invalidateQueries({ queryKey: STYLES_KEY });
      if (vars?.id) qc.invalidateQueries({ queryKey: [...STYLES_KEY, vars.id] });
      (options as any)?.onSuccess?.(...args);
    },
    ...(options as any),
  });
}

// ============================================================
// Planning（企划）
// ============================================================
export interface PlanningRecord {
  id: string;
  season: string;
  theme: string;
  category?: string | null;
  target_cost?: string | number | null;
  timeline?: string | null;
  ai_trend_analysis?: string | null;
  inspiration_tags?: unknown;
  company_id?: string | null;
  brand_id?: string | null;
  season_id?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

const PLANNING_KEY = ["planning"] as const;

export function usePlanningList(
  options?: Omit<
    UseQueryOptions<PlanningRecord[], HttpError>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<PlanningRecord[], HttpError>({
    queryKey: PLANNING_KEY,
    queryFn: () => apiFetch<PlanningRecord[]>("/api/planning"),
    ...options,
  });
}

export function useCreatePlanning(
  options?: UseMutationOptions<
    PlanningRecord,
    HttpError,
    Partial<PlanningRecord>
  >
) {
  const qc = useQueryClient();
  return useMutation<PlanningRecord, HttpError, Partial<PlanningRecord>>({
    mutationFn: (body) =>
      apiFetch<PlanningRecord>("/api/planning", { method: "POST", body }),
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: PLANNING_KEY });
      (options as any)?.onSuccess?.(...args);
    },
    ...(options as any),
  });
}

// ============================================================
// Inspiration Boards（灵感板）
// ============================================================
export interface InspirationBoardRecord {
  id: string;
  title: string;
  description?: string | null;
  company_id: string;
  brand_id?: string | null;
  season_id?: string | null;
  theme_tags?: string[];
  cover_image_url?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

const INSPIRATION_BOARDS_KEY = ["inspiration-boards"] as const;

export function useInspirationBoards(
  options?: Omit<
    UseQueryOptions<InspirationBoardRecord[], HttpError>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<InspirationBoardRecord[], HttpError>({
    queryKey: INSPIRATION_BOARDS_KEY,
    queryFn: () =>
      apiFetch<InspirationBoardRecord[]>("/api/inspiration-boards"),
    ...options,
  });
}

export function useCreateInspirationBoard(
  options?: UseMutationOptions<
    InspirationBoardRecord,
    HttpError,
    Partial<InspirationBoardRecord>
  >
) {
  const qc = useQueryClient();
  return useMutation<
    InspirationBoardRecord,
    HttpError,
    Partial<InspirationBoardRecord>
  >({
    mutationFn: (body) =>
      apiFetch<InspirationBoardRecord>("/api/inspiration-boards", {
        method: "POST",
        body,
      }),
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: INSPIRATION_BOARDS_KEY });
      (options as any)?.onSuccess?.(...args);
    },
    ...(options as any),
  });
}

// ============================================================
// Brands / Seasons / Suppliers / Sales 基础查询
// ============================================================
const BRANDS_KEY = ["brands"] as const;
const SEASONS_KEY = ["seasons"] as const;
const SUPPLIERS_KEY = ["suppliers"] as const;
const SALES_KEY = ["sales"] as const;
const TODOS_KEY = ["todos"] as const;

export function useBrands(
  options?: Omit<UseQueryOptions<any[], HttpError>, "queryKey" | "queryFn">
) {
  return useQuery<any[], HttpError>({
    queryKey: BRANDS_KEY,
    queryFn: () => apiFetch<any[]>("/api/brands"),
    ...options,
  });
}

export function useSeasons(
  brandId?: string | null,
  options?: Omit<UseQueryOptions<any[], HttpError>, "queryKey" | "queryFn" | "enabled"> & {
    enabled?: boolean;
  }
) {
  const { enabled: _enabled, ...rest } = (options ?? {}) as any;
  const resolvedEnabled =
    (options as { enabled?: boolean } | undefined)?.enabled !== undefined
      ? (options as { enabled: boolean }).enabled
      : true;
  return useQuery<any[], HttpError>({
    queryKey: [...SEASONS_KEY, brandId] as const,
    queryFn: () =>
      apiFetch<any[]>(
        `/api/seasons${brandId ? `?brand_id=${encodeURIComponent(brandId)}` : ""}`
      ),
    enabled: resolvedEnabled,
    ...(rest as any),
  });
}

export function useSuppliers(
  options?: Omit<UseQueryOptions<any[], HttpError>, "queryKey" | "queryFn">
) {
  return useQuery<any[], HttpError>({
    queryKey: SUPPLIERS_KEY,
    queryFn: () => apiFetch<any[]>("/api/suppliers"),
    ...options,
  });
}

export function useSalesRecords(
  options?: Omit<UseQueryOptions<any[], HttpError>, "queryKey" | "queryFn">
) {
  return useQuery<any[], HttpError>({
    queryKey: SALES_KEY,
    queryFn: () => apiFetch<any[]>("/api/sales"),
    ...options,
  });
}

export function useTodos(
  options?: Omit<UseQueryOptions<any[], HttpError>, "queryKey" | "queryFn">
) {
  return useQuery<any[], HttpError>({
    queryKey: TODOS_KEY,
    queryFn: () => apiFetch<any[]>("/api/todos"),
    ...options,
  });
}
