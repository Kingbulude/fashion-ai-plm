"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  RefreshCw,
  ChevronRight,
  Info,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

// 工序定义
const PROCESS_NODES = [
  { id: "planning", name: "企划", icon: "📋", color: "bg-blue-500", route: "/planning", x: 80, y: 100 },
  { id: "design", name: "设计", icon: "🎨", color: "bg-purple-500", route: "/styles", x: 240, y: 100 },
  { id: "sampling", name: "打样", icon: "✂️", color: "bg-amber-500", route: "/styles", x: 400, y: 100 },
  { id: "testing", name: "测款", icon: "🎯", color: "bg-pink-500", route: "/ai", x: 560, y: 100 },
  { id: "production", name: "大货", icon: "🏭", color: "bg-green-500", route: "/production", x: 720, y: 100 },
  { id: "qc", name: "质检", icon: "✅", color: "bg-cyan-500", route: "/styles", x: 720, y: 240 },
  { id: "inventory", name: "入库", icon: "📦", color: "bg-indigo-500", route: "/styles", x: 560, y: 240 },
  { id: "sales", name: "销售", icon: "💰", color: "bg-emerald-500", route: "/sales", x: 400, y: 240 },
  { id: "aftersales", name: "售后", icon: "🔄", color: "bg-slate-500", route: "/aftersales", x: 240, y: 240 },
  { id: "procurement", name: "物料采购", icon: "🛒", color: "bg-slate-400", route: "/styles", x: 400, y: 300, parallel: true },
];

// 连接关系（关键路径）
const CRITICAL_PATHS = [
  { from: "planning", to: "design" },
  { from: "design", to: "sampling" },
  { from: "sampling", to: "testing" },
  { from: "testing", to: "production" },
  { from: "production", to: "qc" },
  { from: "qc", to: "inventory" },
  { from: "inventory", to: "sales" },
  { from: "sales", to: "aftersales" },
];

// 并行路径
const PARALLEL_PATHS = [
  { from: "sampling", to: "procurement" },
  { from: "procurement", to: "production" },
];

interface ProcessStatus {
  id: string;
  status: "pending" | "in_progress" | "completed";
  count: number;
}

export default function HomePage() {
  const router = useRouter();
  const [processStatuses, setProcessStatuses] = useState<Record<string, ProcessStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatuses = async () => {
      setLoading(true);
      try {
        const [planningRes, stylesRes, productionRes, salesRes, aftersalesRes] = await Promise.all([
          fetch("/api/planning").catch(() => ({ json: async () => [] })),
          fetch("/api/styles").catch(() => ({ json: async () => [] })),
          fetch("/api/styles").catch(() => ({ json: async () => [] })),
          fetch("/api/sales").catch(() => ({ json: async () => ({ sales: [] }) })),
          fetch("/api/aftersales").catch(() => ({ json: async () => ({ records: [] }) })),
        ]);

        const planning = await planningRes.json();
        const styles = await stylesRes.json();
        const production = await productionRes.json();
        const salesData = await salesRes.json();
        const aftersalesData = await aftersalesRes.json();

        const stylesList = Array.isArray(styles) ? styles : [];

        // 计算各工序状态
        const statuses: Record<string, ProcessStatus> = {
          planning: {
            id: "planning",
            status: planning?.length > 0 ? "completed" : "pending",
            count: planning?.length || 0,
          },
          design: {
            id: "design",
            status: stylesList.length > 0 ? "completed" : "pending",
            count: stylesList.length,
          },
          sampling: {
            id: "sampling",
            status: stylesList.some((s: any) => s.samplingStatus === "completed") ? "completed" : stylesList.some((s: any) => s.samplingStatus === "in_progress") ? "in_progress" : "pending",
            count: stylesList.filter((s: any) => s.samplingStatus).length,
          },
          testing: {
            id: "testing",
            status: stylesList.some((s: any) => s.aiTestResult) ? "completed" : "pending",
            count: stylesList.filter((s: any) => s.aiTestResult).length,
          },
          procurement: {
            id: "procurement",
            status: "pending",
            count: 0,
          },
          production: {
            id: "production",
            status: "pending",
            count: 0,
          },
          qc: {
            id: "qc",
            status: "pending",
            count: 0,
          },
          inventory: {
            id: "inventory",
            status: "pending",
            count: 0,
          },
          sales: {
            id: "sales",
            status: salesData?.sales?.length > 0 ? "completed" : "pending",
            count: salesData?.sales?.length || 0,
          },
          aftersales: {
            id: "aftersales",
            status: aftersalesData?.records?.length > 0 ? "completed" : "pending",
            count: aftersalesData?.records?.length || 0,
          },
        };

        setProcessStatuses(statuses);
      } catch (err) {
        console.error("Failed to fetch statuses", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatuses();
  }, []);

  const handleNodeClick = (node: typeof PROCESS_NODES[0]) => {
    router.push(node.route);
  };

  const getNodePosition = (id: string) => {
    const node = PROCESS_NODES.find((n) => n.id === id);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  const getNodeById = (id: string) => {
    return PROCESS_NODES.find((n) => n.id === id);
  };

  // 绘制箭头路径
  const renderArrow = (fromId: string, toId: string, isParallel: boolean = false) => {
    const from = getNodePosition(fromId);
    const to = getNodePosition(toId);
    
    const fromNode = getNodeById(fromId);
    const toNode = getNodeById(toId);
    
    // 计算起点和终点（考虑节点大小）
    const nodeRadius = 44;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const startX = from.x + (dx / distance) * nodeRadius;
    const startY = from.y + (dy / distance) * nodeRadius;
    const endX = to.x - (dx / distance) * nodeRadius;
    const endY = to.y - (dy / distance) * nodeRadius;

    const strokeClass = isParallel ? "stroke-slate-300" : "stroke-red-500";
    const strokeDash = isParallel ? "8 4" : "none";
    const strokeWidth = isParallel ? 2 : 3;

    return (
      <g key={`${fromId}-${toId}`}>
        <defs>
          <marker
            id={`arrowhead-${fromId}-${toId}`}
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={isParallel ? "#94a3b8" : "#ef4444"} />
          </marker>
        </defs>
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          className={strokeClass}
          strokeDasharray={strokeDash}
          strokeWidth={strokeWidth}
          markerEnd={`url(#arrowhead-${fromId}-${toId})`}
        />
      </g>
    );
  };

  // 判断当前应该高亮哪个节点（找到第一个未完成的工序）
  const getActiveNodeId = () => {
    const order = ["planning", "design", "sampling", "testing", "production", "qc", "inventory", "sales", "aftersales"];
    for (const id of order) {
      const status = processStatuses[id];
      if (status && status.status !== "completed") {
        return id;
      }
    }
    return null;
  };

  const activeNodeId = getActiveNodeId();

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">StyleForge 智能调度中心</h1>
            <p className="text-muted-foreground">全链路工序管理 · 点击节点进入工作区</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            <Sparkles className="h-4 w-4 mr-2" />
            数据看板
          </Button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-red-500 rounded"></div>
            <span className="text-muted-foreground">关键路径</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-slate-300" style={{ borderStyle: "dashed" }}></div>
            <span className="text-muted-foreground">并行工序</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-muted-foreground">当前进行中</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-200"></div>
            <span className="text-muted-foreground">待开始</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中...
          </div>
        ) : (
          <>
            {/* PERT Network Diagram */}
            <Card className="border-0 shadow-lg mb-8 overflow-hidden">
              <CardContent className="p-0">
                <div className="relative" style={{ height: "400px" }}>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
                    {/* 绘制关键路径箭头 */}
                    {CRITICAL_PATHS.map((path) => renderArrow(path.from, path.to, false))}
                    
                    {/* 绘制并行路径箭头 */}
                    {PARALLEL_PATHS.map((path) => renderArrow(path.from, path.to, true))}
                  </svg>

                  {/* 绘制节点 */}
                  {PROCESS_NODES.map((node) => {
                    const status = processStatuses[node.id];
                    const isActive = activeNodeId === node.id;
                    const isCompleted = status?.status === "completed";
                    const isParallel = node.parallel;

                    return (
                      <div
                        key={node.id}
                        onClick={() => handleNodeClick(node)}
                        className={`absolute cursor-pointer transition-all duration-300 ${
                          isParallel ? "opacity-70" : ""
                        }`}
                        style={{
                          left: node.x - 44,
                          top: node.y - 44,
                        }}
                      >
                        <div
                          className={`w-22 h-22 rounded-full flex flex-col items-center justify-center shadow-lg transition-all ${
                            isCompleted
                              ? "bg-green-500 text-white"
                              : isActive
                              ? `${node.color} text-white animate-pulse ring-4 ring-blue-300 ring-opacity-50`
                              : `${node.color} text-white hover:scale-110`
                          }`}
                          style={{ width: 88, height: 88 }}
                        >
                          <span className="text-2xl mb-1">{node.icon}</span>
                          <span className="font-bold text-sm">{node.name}</span>
                        </div>
                        
                        {/* 状态徽章 */}
                        {status && status.count > 0 && (
                          <div className="absolute -top-1 -right-1">
                            <Badge className="bg-white text-slate-600 border border-slate-200 text-xs">
                              {status.count}
                            </Badge>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <span className="text-xl">📋</span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">企划数</p>
                      <p className="text-lg font-bold">{processStatuses.planning?.count || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-50">
                      <span className="text-xl">🎨</span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">款式数</p>
                      <p className="text-lg font-bold">{processStatuses.design?.count || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50">
                      <span className="text-xl">💰</span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">销售记录</p>
                      <p className="text-lg font-bold">{processStatuses.sales?.count || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-50">
                      <span className="text-xl">🔄</span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">售后记录</p>
                      <p className="text-lg font-bold">{processStatuses.aftersales?.count || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tips */}
            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">使用提示</p>
                  <p className="text-xs text-amber-600 mt-1">
                    点击任意工序节点进入对应工作区。红色箭头表示关键路径（决定总工期），灰色虚线表示可并行工序。
                    当前进行中的工序会闪烁提示。
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}