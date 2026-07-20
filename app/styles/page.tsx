// 款式开发中心 - 商品开发协同核心
// 支持三视图：网格 / 看板 / 表格
// 多品牌上下文自动隔离数据

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/lib/auth/tenant-context";
import { useApi } from "@/lib/api/use-api";
import {
  Plus,
  Loader2,
  Search,
  Shirt,
  Image as ImageIcon,
  LayoutGrid,
  Kanban,
  Table as TableIcon,
  ChevronRight,
  AlertCircle,
  Filter,
} from "lucide-react";

// 11 个状态配置（对应 state machine）
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; progress: number }> = {
  planning: { label: "企划中", bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", progress: 10 },
  designing: { label: "设计中", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", progress: 25 },
  designed: { label: "设计定稿", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", progress: 35 },
  sampling: { label: "打样中", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", progress: 50 },
  sampled: { label: "封样", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", progress: 65 },
  producing: { label: "生产中", bg: "bg-green-50", text: "text-green-700", border: "border-green-200", progress: 80 },
  produced: { label: "已生产", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", progress: 90 },
  selling: { label: "销售中", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", progress: 95 },
  sold: { label: "销售结束", bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", progress: 100 },
  reviewing: { label: "复盘中", bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", progress: 100 },
  archived: { label: "已归档", bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200", progress: 100 },
};

// 看板视图展示的核心 7 个状态（精简版）
const KANBAN_STAGES = [
  { key: "planning", label: "企划中", color: "slate" },
  { key: "designing", label: "设计中", color: "blue" },
  { key: "sampling", label: "打样中", color: "amber" },
  { key: "sampled", label: "封样", color: "yellow" },
  { key: "producing", label: "生产中", color: "green" },
  { key: "produced", label: "已生产", color: "emerald" },
  { key: "selling", label: "销售中", color: "purple" },
];

const KANBAN_COLOR_MAP: Record<string, { header: string; border: string }> = {
  slate: { header: "bg-slate-100 border-slate-200", border: "border-slate-200" },
  blue: { header: "bg-blue-100 border-blue-200", border: "border-blue-200" },
  amber: { header: "bg-amber-100 border-amber-200", border: "border-amber-200" },
  yellow: { header: "bg-yellow-100 border-yellow-200", border: "border-yellow-200" },
  green: { header: "bg-green-100 border-green-200", border: "border-green-200" },
  emerald: { header: "bg-emerald-100 border-emerald-200", border: "border-emerald-200" },
  purple: { header: "bg-purple-100 border-purple-200", border: "border-purple-200" },
};

type ViewMode = "grid" | "kanban" | "table";

export default function StylesPage() {
  const { currentBrand, currentSeason } = useTenant();
  const api = useApi();
  const router = useRouter();

  const [allStyles, setAllStyles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"updated_at" | "created_at" | "style_no">("updated_at");

  // 加载款式数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get<any>("/api/styles");
        // 兼容两种返回格式
        const styles = Array.isArray(res) ? res : res.data || [];
        setAllStyles(styles);
      } catch (err) {
        console.error("获取款式失败:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBrand?.id, currentSeason?.id]);

  // 分类选项
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of allStyles) {
      if (s.category) set.add(s.category);
    }
    return Array.from(set);
  }, [allStyles]);

  // 阶段统计
  const stageStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const s of allStyles) {
      stats[s.status] = (stats[s.status] || 0) + 1;
    }
    return stats;
  }, [allStyles]);

  // 过滤后的款式
  const filteredStyles = useMemo(() => {
    let result = allStyles;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) => (s.name || "").toLowerCase().includes(q) || (s.style_no || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (categoryFilter) {
      result = result.filter((s) => s.category === categoryFilter);
    }
    // 排序
    result = [...result].sort((a, b) => {
      if (sortBy === "style_no") {
        return (a.style_no || "").localeCompare(b.style_no || "");
      }
      const av = new Date(a[sortBy] || 0).getTime();
      const bv = new Date(b[sortBy] || 0).getTime();
      return bv - av;
    });
    return result;
  }, [allStyles, search, statusFilter, categoryFilter, sortBy]);

  const handleStyleClick = (id: string) => {
    router.push(`/styles/${id}`);
  };

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">款式开发中心</h1>
            <p className="text-sm text-slate-500">
              {currentBrand ? (
                <>
                  <span className="font-medium text-slate-700">{currentBrand.name}</span>
                  {currentSeason && <span className="mx-2">·</span>}
                  {currentSeason && <span>{currentSeason.name}</span>}
                  <span className="mx-2">·</span>
                  <span>共 {allStyles.length} 个款式</span>
                </>
              ) : (
                "加载中..."
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* 视图切换 */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setView("kanban")}
                className={`p-1.5 rounded transition-colors ${
                  view === "kanban" ? "bg-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
                title="看板视图"
              >
                <Kanban className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 rounded transition-colors ${
                  view === "grid" ? "bg-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
                title="网格视图"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("table")}
                className={`p-1.5 rounded transition-colors ${
                  view === "table" ? "bg-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
                title="表格视图"
              >
                <TableIcon className="h-4 w-4" />
              </button>
            </div>
            <Button asChild>
              <Link href="/styles/new">
                <Plus className="h-4 w-4 mr-1.5" />
                新建款式
              </Link>
            </Button>
          </div>
        </div>

        {/* 阶段快速筛选条 */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setStatusFilter(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              !statusFilter
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            全部 ({allStyles.length})
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = stageStats[key] || 0;
            if (count === 0) return null;
            const isActive = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isActive
                    ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-offset-1 ring-slate-300`
                    : `${cfg.bg} ${cfg.text} ${cfg.border} hover:shadow-sm`
                }`}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* 搜索和筛选栏 */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="搜索款号或名称..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {categories.length > 0 && (
            <select
              value={categoryFilter || ""}
              onChange={(e) => setCategoryFilter(e.target.value || null)}
              className="h-9 px-3 rounded-md border border-slate-200 text-sm bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">全品类</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 px-3 rounded-md border border-slate-200 text-sm bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="updated_at">按更新时间</option>
            <option value="created_at">按创建时间</option>
            <option value="style_no">按款号</option>
          </select>

          {(statusFilter || categoryFilter || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter(null);
                setCategoryFilter(null);
                setSearch("");
              }}
            >
              清除筛选
            </Button>
          )}

          <div className="ml-auto text-sm text-slate-500">
            显示 <span className="font-semibold text-slate-700">{filteredStyles.length}</span> / {allStyles.length}
          </div>
        </div>

        {/* 主体内容 */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            加载款式数据...
          </div>
        ) : allStyles.length === 0 ? (
          <EmptyState onCreate={() => router.push("/styles/new")} hasBrand={!!currentBrand} />
        ) : filteredStyles.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Filter className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">没有匹配的款式</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setStatusFilter(null);
                setCategoryFilter(null);
                setSearch("");
              }}
            >
              清除筛选
            </Button>
          </div>
        ) : view === "kanban" ? (
          <KanbanView
            styles={statusFilter ? filteredStyles : allStyles}
            onStyleClick={handleStyleClick}
            activeStatus={statusFilter}
          />
        ) : view === "grid" ? (
          <GridView styles={filteredStyles} onStyleClick={handleStyleClick} />
        ) : (
          <TableView styles={filteredStyles} onStyleClick={handleStyleClick} />
        )}
      </div>
    </SidebarLayout>
  );
}

// ============== 看板视图 ==============
function KanbanView({
  styles,
  onStyleClick,
  activeStatus,
}: {
  styles: any[];
  onStyleClick: (id: string) => void;
  activeStatus: string | null;
}) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {KANBAN_STAGES.map((stage) => {
          const stageStyles = styles.filter((s) => s.status === stage.key);
          const colors = KANBAN_COLOR_MAP[stage.color];
          const isActiveColumn = activeStatus === stage.key;
          return (
            <div
              key={stage.key}
              className={`w-72 flex-shrink-0 rounded-xl border ${colors.border} bg-white ${
                isActiveColumn ? "ring-2 ring-offset-1 ring-slate-300" : ""
              }`}
            >
              {/* 列头 */}
              <div className={`px-3 py-2.5 border-b ${colors.header} rounded-t-xl flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{stage.label}</span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {stageStyles.length}
                  </Badge>
                </div>
              </div>

              {/* 卡片列表 */}
              <div className="p-2 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                {stageStyles.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">无款式</div>
                ) : (
                  stageStyles.map((style) => (
                    <StyleCardMini key={style.id} style={style} onClick={() => onStyleClick(style.id)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 看板小卡片
function StyleCardMini({ style, onClick }: { style: any; onClick: () => void }) {
  const cfg = STATUS_CONFIG[style.status] || STATUS_CONFIG.planning;
  const costOverrun = style.target_cost && style.actual_cost && style.actual_cost > style.target_cost;
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer p-2.5 group"
    >
      <div className="flex items-start justify-between mb-1.5">
        <p className="text-sm font-medium text-slate-800 truncate flex-1">{style.name}</p>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </div>
      <p className="text-xs text-slate-500 mb-2">{style.style_no}</p>
      {style.coverImage || style.cover_image ? (
        <div className="aspect-video bg-slate-100 rounded mb-2 overflow-hidden">
          <img
            src={style.coverImage || style.cover_image}
            alt={style.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}
      <div className="flex items-center gap-1.5 flex-wrap">
        {style.category && (
          <Badge variant="outline" className="text-[10px] h-4 px-1">
            {style.category}
          </Badge>
        )}
        {style.target_cost && (
          <span className={`text-[10px] ${costOverrun ? "text-red-600 font-semibold" : "text-slate-500"}`}>
            ¥{style.target_cost}
            {style.actual_cost && (
              <span className={costOverrun ? "text-red-600" : "text-slate-400"}>
                {" "}/ ¥{style.actual_cost}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// ============== 网格视图 ==============
function GridView({ styles, onStyleClick }: { styles: any[]; onStyleClick: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {styles.map((style) => (
        <StyleCardLarge key={style.id} style={style} onClick={() => onStyleClick(style.id)} />
      ))}
    </div>
  );
}

function StyleCardLarge({ style, onClick }: { style: any; onClick: () => void }) {
  const cfg = STATUS_CONFIG[style.status] || STATUS_CONFIG.planning;
  const costOverrun = style.target_cost && style.actual_cost && style.actual_cost > style.target_cost;
  return (
    <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-all overflow-hidden" onClick={onClick}>
      <div className="aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative">
        {style.coverImage || style.cover_image ? (
          <img
            src={style.coverImage || style.cover_image}
            alt={style.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="h-12 w-12 text-slate-300" />
        )}
        <Badge className={`absolute top-2 left-2 ${cfg.bg} ${cfg.text} border-0`}>{cfg.label}</Badge>
        {costOverrun && (
          <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1" title="成本超支">
            <AlertCircle className="h-3 w-3" />
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <p className="font-semibold text-sm text-slate-800 truncate">{style.name}</p>
        <p className="text-xs text-slate-500 mt-0.5 mb-2">{style.style_no}</p>
        <div className="flex items-center justify-between">
          {style.category && (
            <Badge variant="outline" className="text-[10px] h-4">
              {style.category}
            </Badge>
          )}
          {style.target_cost && (
            <span className={`text-xs ${costOverrun ? "text-red-600 font-semibold" : "text-slate-600"}`}>
              ¥{style.target_cost}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============== 表格视图 ==============
function TableView({ styles, onStyleClick }: { styles: any[]; onStyleClick: (id: string) => void }) {
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs text-slate-500">
              <th className="px-4 py-3 font-medium">款号</th>
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">品类</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium text-right">目标成本</th>
              <th className="px-4 py-3 font-medium text-right">实际成本</th>
              <th className="px-4 py-3 font-medium">更新时间</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {styles.map((style) => {
              const cfg = STATUS_CONFIG[style.status] || STATUS_CONFIG.planning;
              const costOverrun =
                style.target_cost && style.actual_cost && style.actual_cost > style.target_cost;
              return (
                <tr
                  key={style.id}
                  onClick={() => onStyleClick(style.id)}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{style.style_no}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded bg-slate-100 flex-shrink-0 overflow-hidden">
                        {style.coverImage || style.cover_image ? (
                          <img
                            src={style.coverImage || style.cover_image}
                            alt={style.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-slate-300 m-1.5" />
                        )}
                      </div>
                      <span className="font-medium text-slate-800 truncate">{style.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{style.category || "-"}</td>
                  <td className="px-4 py-3">
                    <Badge className={`${cfg.bg} ${cfg.text} border-0`}>{cfg.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {style.target_cost ? `¥${style.target_cost}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {style.actual_cost ? (
                      <span className={costOverrun ? "text-red-600 font-semibold" : "text-slate-700"}>
                        ¥{style.actual_cost}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(style.updated_at).toLocaleDateString("zh-CN", {
                      month: "numeric",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ============== 空状态 ==============
function EmptyState({ onCreate, hasBrand }: { onCreate: () => void; hasBrand: boolean }) {
  return (
    <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
      <Shirt className="h-16 w-16 text-slate-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-slate-700 mb-2">
        {hasBrand ? "还没有款式" : "请先选择品牌"}
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        {hasBrand
          ? "从第一个款式开始你的产品开发"
          : "在右上角的品牌切换器中选择一个品牌"}
      </p>
      {hasBrand && (
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          创建第一个款式
        </Button>
      )}
    </div>
  );
}
