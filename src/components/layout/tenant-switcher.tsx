"use client";

import { useTenant } from "@/lib/auth/tenant-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown, Sparkles, Calendar, Loader2, AlertCircle } from "lucide-react";

export function TenantSwitcher() {
  const {
    currentCompany,
    currentBrand,
    currentSeason,
    availableBrands,
    availableSeasons,
    setBrand,
    setSeason,
    isLoading,
    error,
  } = useTenant();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载上下文...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600">
        <AlertCircle className="h-4 w-4" />
        上下文加载失败，使用默认值
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-lg p-1">
      {/* 公司 - 当前只读展示，多公司切换是后期功能 */}
      <div className="flex items-center gap-1.5 px-2 py-1 text-sm text-slate-600">
        <Building2 className="h-4 w-4 text-slate-400" />
        <span className="font-medium">{currentCompany?.name || "未选择公司"}</span>
      </div>

      <div className="h-4 w-px bg-slate-200" />

      {/* 品牌切换器 */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 px-2 py-1 text-sm hover:bg-slate-100 rounded transition-colors">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="font-medium text-slate-700">{currentBrand?.name || "选择品牌"}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>切换品牌</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableBrands.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-slate-400">暂无可用品牌</div>
          ) : (
            availableBrands.map((brand) => (
              <DropdownMenuItem
                key={brand.id}
                onClick={() => setBrand(brand.id)}
                className={currentBrand?.id === brand.id ? "bg-amber-50" : ""}
              >
                <div className="flex items-center gap-2">
                  {brand.logo_url ? (
                    <img src={brand.logo_url} alt={brand.name} className="h-5 w-5 rounded" />
                  ) : (
                    <div className="h-5 w-5 rounded bg-gradient-to-br from-amber-400 to-orange-500" />
                  )}
                  <span className="font-medium">{brand.name}</span>
                  {currentBrand?.id === brand.id && (
                    <span className="ml-auto text-xs text-amber-600">当前</span>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-4 w-px bg-slate-200" />

      {/* 季节切换器 */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 px-2 py-1 text-sm hover:bg-slate-100 rounded transition-colors">
          <Calendar className="h-4 w-4 text-cyan-500" />
          <span className="font-medium text-slate-700">
            {currentSeason?.name || "选择季节"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>切换季节</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableSeasons.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-slate-400">
              {currentBrand ? "该品牌暂无季节数据" : "请先选择品牌"}
            </div>
          ) : (
            <>
              <DropdownMenuItem
                onClick={() => setSeason(null)}
                className={!currentSeason ? "bg-cyan-50" : ""}
              >
                <span>全部季节</span>
                {!currentSeason && <span className="ml-auto text-xs text-cyan-600">当前</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {availableSeasons.map((season) => (
                <DropdownMenuItem
                  key={season.id}
                  onClick={() => setSeason(season.id)}
                  className={currentSeason?.id === season.id ? "bg-cyan-50" : ""}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-medium">{season.name}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        season.status === "active"
                          ? "bg-green-100 text-green-700"
                          : season.status === "locked"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {season.status === "active" ? "进行中" : season.status === "locked" ? "已锁定" : "已归档"}
                    </span>
                    {currentSeason?.id === season.id && (
                      <span className="ml-auto text-xs text-cyan-600">当前</span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
