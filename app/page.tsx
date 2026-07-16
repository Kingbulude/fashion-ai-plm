"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Info,
  Sparkles,
} from "lucide-react";

const NODE_SIZE = 80;
const NODE_RADIUS = NODE_SIZE / 2;

const MAIN_NODES = [
  { id: "planning", name: "企划", icon: "📋", color: "bg-blue-500", route: "/planning", x: 80 },
  { id: "design", name: "设计", icon: "🎨", color: "bg-purple-500", route: "/styles", x: 200 },
  { id: "sampling", name: "打样", icon: "✂️", color: "bg-amber-500", route: "/styles", x: 320 },
  { id: "testing", name: "测款", icon: "🎯", color: "bg-pink-500", route: "/ai", x: 440 },
  { id: "production", name: "大货", icon: "🏭", color: "bg-green-500", route: "/production", x: 560 },
  { id: "qc", name: "质检", icon: "✅", color: "bg-cyan-500", route: "/styles", x: 680 },
  { id: "inventory", name: "入库", icon: "📦", color: "bg-indigo-500", route: "/styles", x: 800 },
  { id: "sales", name: "销售", icon: "💰", color: "bg-emerald-500", route: "/sales", x: 920 },
  { id: "aftersales", name: "售后", icon: "🔄", color: "bg-slate-500", route: "/aftersales", x: 1040 },
];

const PARALLEL_NODE = { id: "procurement", name: "物料采购", icon: "🛒", color: "bg-slate-400", route: "/styles", x: 380, y: 200 };

const CANVAS_WIDTH = 1160;
const CANVAS_HEIGHT = 320;
const MAIN_Y = 80;

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
        const [planningRes, stylesRes, salesRes, aftersalesRes] = await Promise.all([
          fetch("/api/planning").catch(() => ({ json: async () => [] })),
          fetch("/api/styles").catch(() => ({ json: async () => [] })),
          fetch("/api/sales").catch(() => ({ json: async () => ({ sales: [] }) })),
          fetch("/api/aftersales").catch(() => ({ json: async () => ({ records: [] }) })),
        ]);

        const planning = await planningRes.json();
        const styles = await stylesRes.json();
        const salesData = await salesRes.json();
        const aftersalesData = await aftersalesRes.json();

        const stylesList = Array.isArray(styles) ? styles : [];

        const statuses: Record<string, ProcessStatus> = {
          planning: { id: "planning", status: planning?.length > 0 ? "completed" : "pending", count: planning?.length || 0 },
          design: { id: "design", status: stylesList.length > 0 ? "completed" : "pending", count: stylesList.length },
          sampling: { id: "sampling", status: stylesList.some((s: any) => s.samplingStatus === "completed") ? "completed" : stylesList.some((s: any) => s.samplingStatus === "in_progress") ? "in_progress" : "pending", count: stylesList.filter((s: any) => s.samplingStatus).length },
          testing: { id: "testing", status: stylesList.some((s: any) => s.aiTestResult) ? "completed" : "pending", count: stylesList.filter((s: any) => s.aiTestResult).length },
          procurement: { id: "procurement", status: "pending", count: 0 },
          production: { id: "production", status: "pending", count: 0 },
          qc: { id: "qc", status: "pending", count: 0 },
          inventory: { id: "inventory", status: "pending", count: 0 },
          sales: { id: "sales", status: salesData?.sales?.length > 0 ? "completed" : "pending", count: salesData?.sales?.length || 0 },
          aftersales: { id: "aftersales", status: aftersalesData?.records?.length > 0 ? "completed" : "pending", count: aftersalesData?.records?.length || 0 },
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

  const handleNodeClick = (node: typeof MAIN_NODES[0] & { y?: number }) => {
    router.push(node.route);
  };

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

  // 计算箭头起点/终点（考虑节点半径）
  const arrowPos = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;
    return {
      x1: x1 + nx * NODE_RADIUS,
      y1: y1 + ny * NODE_RADIUS,
      x2: x2 - nx * NODE_RADIUS,
      y2: y2 - ny * NODE_RADIUS,
    };
  };

  // 主路径箭头
  const mainArrows = [];
  for (let i = 0; i < MAIN_NODES.length - 1; i++) {
    const from = MAIN_NODES[i];
    const to = MAIN_NODES[i + 1];
    mainArrows.push(arrowPos(from.x, MAIN_Y, to.x, MAIN_Y));
  }

  // 并行箭头：sampling -> procurement
  const parallelArrow1 = arrowPos(320, MAIN_Y, PARALLEL_NODE.x, PARALLEL_NODE.y);
  // 并行箭头：procurement -> production
  const parallelArrow2 = arrowPos(PARALLEL_NODE.x, PARALLEL_NODE.y, 560, MAIN_Y);
  // 反馈回路：aftersales -> planning（弯曲虚线）
  const feedbackPath = () => {
    const startX = 1040;
    const startY = MAIN_Y - NODE_RADIUS;
    const endX = 80;
    const endY = MAIN_Y - NODE_RADIUS;
    const midY = startY - 40;
    return `M ${startX} ${startY} Q ${(startX + endX) / 2} ${midY} ${endX} ${endY}`;
  };

  const renderNode = (node: typeof MAIN_NODES[0] & { y?: number }, customY?: number) => {
    const status = processStatuses[node.id];
    const isActive = activeNodeId === node.id;
    const isCompleted = status?.status === "completed";
    const y = customY ?? MAIN_Y;

    return (
      <div
        key={node.id}
        onClick={() => handleNodeClick(node)}
        className="absolute cursor-pointer transition-all duration-300 hover:scale-110"
        style={{
          left: node.x - NODE_RADIUS,
          top: y - NODE_RADIUS,
          width: NODE_SIZE,
          height: NODE_SIZE,
        }}
      >
        <div
          className={`w-full h-full rounded-full flex flex-col items-center justify-center shadow-lg transition-all ${
            isCompleted
              ? "bg-green-500 text-white"
              : isActive
              ? `${node.color} text-white ring-4 ring-blue-300 ring-opacity-50`
              : `${node.color} text-white`
          }`}
        >
          <span className="text-xl mb-0.5">{node.icon}</span>
          <span className="font-bold text-sm">{node.name}</span>
        </div>
        {status && status.count > 0 && (
          <div className="absolute -top-1 -right-1">
            <Badge className="bg-white text-slate-600 border border-slate-200 text-xs">
              {status.count}
            </Badge>
          </div>
        )}
      </div>
    );
  };

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">StyleForge 智能调度中心</h1>
            <p className="text-muted-foreground">全链路工序管理 · 点击节点进入工作区</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            <Sparkles className="h-4 w-4 mr-2" />
            数据看板
          </Button>
        </div>

        <div className="flex items-center gap-6 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-red-500 rounded"></div>
            <span className="text-muted-foreground">关键路径</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-slate-400 border-dashed border-t border-slate-400"></div>
            <span className="text-muted-foreground">并行工序</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-amber-500 border-dashed border-t border-amber-500"></div>
            <span className="text-muted-foreground">反馈回路</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-muted-foreground">当前进行中</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中...
          </div>
        ) : (
          <>
            <Card className="border-0 shadow-lg mb-8 overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <div
                    className="relative"
                    style={{
                      width: CANVAS_WIDTH,
                      height: CANVAS_HEIGHT,
                      minWidth: CANVAS_WIDTH,
                    }}
                  >
                    {/* SVG 箭头层 - 固定尺寸，与容器像素完美匹配 */}
                    <svg
                      width={CANVAS_WIDTH}
                      height={CANVAS_HEIGHT}
                      style={{ position: "absolute", top: 0, left: 0, zIndex: 1, pointerEvents: "none" }}
                    >
                      <defs>
                        <marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                        </marker>
                        <marker id="arrowhead-gray" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                        </marker>
                        <marker id="arrowhead-amber" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
                        </marker>
                      </defs>

                      {/* 关键路径箭头（红色实线） */}
                      {mainArrows.map((a, i) => (
                        <line
                          key={`main-${i}`}
                          x1={a.x1}
                          y1={a.y1}
                          x2={a.x2}
                          y2={a.y2}
                          stroke="#ef4444"
                          strokeWidth={3}
                          markerEnd="url(#arrowhead-red)"
                        />
                      ))}

                      {/* 并行路径箭头（灰色虚线） */}
                      <line
                        x1={parallelArrow1.x1}
                        y1={parallelArrow1.y1}
                        x2={parallelArrow1.x2}
                        y2={parallelArrow1.y2}
                        stroke="#94a3b8"
                        strokeWidth={2}
                        strokeDasharray="8 4"
                        markerEnd="url(#arrowhead-gray)"
                      />
                      <line
                        x1={parallelArrow2.x1}
                        y1={parallelArrow2.y1}
                        x2={parallelArrow2.x2}
                        y2={parallelArrow2.y2}
                        stroke="#94a3b8"
                        strokeWidth={2}
                        strokeDasharray="8 4"
                        markerEnd="url(#arrowhead-gray)"
                      />

                      {/* 反馈回路：售后 → 企划（琥珀色虚线弧线） */}
                      <path
                        d={feedbackPath()}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="8 4"
                        markerEnd="url(#arrowhead-amber)"
                      />
                    </svg>

                    {/* 节点层 */}
                    <div className="relative" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, zIndex: 2 }}>
                      {MAIN_NODES.map((node) => renderNode(node))}
                      {renderNode(PARALLEL_NODE as any, PARALLEL_NODE.y)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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

            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">使用提示</p>
                  <p className="text-xs text-amber-600 mt-1">
                    点击任意工序节点进入对应工作区。红色箭头表示关键路径（决定总工期），灰色虚线表示可并行工序，琥珀色虚线表示售后复盘反馈回路。
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
