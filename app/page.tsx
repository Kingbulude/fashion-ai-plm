"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const NODE_SIZE = 80;
const NODE_RADIUS = NODE_SIZE / 2;

const NODES = [
  { id: "planning", name: "企划", icon: "📋", color: "bg-blue-500", route: "/planning", x: 100, y: 160 },
  { id: "design", name: "设计", icon: "🎨", color: "bg-purple-500", route: "/styles", x: 260, y: 160 },
  { id: "sampling", name: "打样", icon: "✂️", color: "bg-amber-500", route: "/styles", x: 420, y: 160 },
  { id: "testing", name: "测款", icon: "🎯", color: "bg-pink-500", route: "/ai", x: 580, y: 80 },
  { id: "procurement", name: "采购", icon: "🛒", color: "bg-orange-500", route: "/styles", x: 580, y: 240 },
  { id: "stocking", name: "备货", icon: "📦", color: "bg-indigo-500", route: "/styles", x: 740, y: 240 },
  { id: "sales", name: "销售", icon: "💰", color: "bg-emerald-500", route: "/sales", x: 900, y: 160 },
  { id: "aftersales", name: "售后", icon: "🔄", color: "bg-slate-500", route: "/aftersales", x: 1060, y: 160 },
];

const LINKS_DEF = [
  { from: "planning", to: "design", type: "critical" },
  { from: "design", to: "sampling", type: "critical" },
  { from: "sampling", to: "testing", type: "parallel" },
  { from: "sampling", to: "procurement", type: "parallel" },
  { from: "testing", to: "procurement", type: "parallel" },
  { from: "procurement", to: "stocking", type: "parallel" },
  { from: "testing", to: "sales", type: "parallel" },
  { from: "stocking", to: "sales", type: "parallel" },
  { from: "sales", to: "aftersales", type: "critical" },
  { from: "aftersales", to: "planning", type: "feedback" },
];

const CANVAS_WIDTH = 1180;
const CANVAS_HEIGHT = 340;

interface ProcessLink {
  id: string;
  from_node: string;
  to_node: string;
  link_type: string;
  duration_hours: number;
  deadline: string | null;
  work_content: string;
  deliverables: string;
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<ProcessLink[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ProcessLink | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [editForm, setEditForm] = useState({
    duration_hours: 0,
    deadline: "",
    work_content: "",
    deliverables: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/process-links");
      const data = await res.json();
      setLinks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch links", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const getNodePos = (id: string) => {
    const node = NODES.find(n => n.id === id);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  const getLink = (from: string, to: string) => {
    return links.find(l => l.from_node === from && l.to_node === to);
  };

  const handleArrowClick = (from: string, to: string) => {
    const link = getLink(from, to);
    if (link) {
      setEditingLink(link);
      setEditForm({
        duration_hours: link.duration_hours || 0,
        deadline: link.deadline || "",
        work_content: link.work_content || "",
        deliverables: link.deliverables || "",
      });
      setEditDialogOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingLink) return;
    setSaving(true);
    try {
      const res = await fetch("/api/process-links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingLink.id,
          duration_hours: Number(editForm.duration_hours) || 0,
          deadline: editForm.deadline || null,
          work_content: editForm.work_content,
          deliverables: editForm.deliverables,
        }),
      });
      if (!res.ok) throw new Error("保存失败");
      showToast("success", "更新成功");
      setEditDialogOpen(false);
      fetchLinks();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleNodeClick = (node: typeof NODES[0]) => {
    router.push(node.route);
  };

  const renderArrow = (fromId: string, toId: string, type: string) => {
    const from = getNodePos(fromId);
    const to = getNodePos(toId);
    const link = getLink(fromId, toId);
    const linkId = `${fromId}-${toId}`;

    const isCritical = type === "critical";
    const isFeedback = type === "feedback";
    const isParallel = type === "parallel";

    const strokeColor = isCritical ? "#ef4444" : isFeedback ? "#f59e0b" : "#94a3b8";
    const strokeWidth = isCritical ? 2.5 : 1.5;
    const dashArray = isCritical ? "0" : "6 4";

    const hours = link?.duration_hours || 0;
    const label = hours > 0 ? `${hours}h` : "";
    const labelWidth = label ? Math.max(48, label.length * 10 + 16) : 0;
    const labelHeight = 22;

    const markerId = `arrowhead-${linkId}`;

    // Global arrow marker for small, clean arrowheads
    const ArrowMarker = (
      <defs key={`defs-${linkId}`}>
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <polygon points="0 0, 8 3, 0 6" fill={strokeColor} />
        </marker>
      </defs>
    );

    // Helper: draw label pill above given point
    const renderLabel = (cx: number, cy: number, clickable: boolean = true) => (
      <g
        key={`label-${linkId}`}
        className={clickable ? "cursor-pointer" : ""}
        onClick={clickable ? () => handleArrowClick(fromId, toId) : undefined}
      >
        <rect
          x={cx - labelWidth / 2 - 4}
          y={cy - labelHeight / 2 - 4}
          width={labelWidth + 8}
          height={labelHeight + 8}
          fill="transparent"
        />
        <rect
          x={cx - labelWidth / 2}
          y={cy - labelHeight / 2}
          width={labelWidth}
          height={labelHeight}
          rx={labelHeight / 2}
          fill="white"
          stroke={strokeColor}
          strokeWidth={1.5}
          className="hover:fill-slate-50 transition-colors"
        />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontSize={12}
          fill={strokeColor}
          fontWeight={600}
          className="pointer-events-none select-none"
        >
          {label}
        </text>
      </g>
    );

    // Critical path: straight horizontal line with label above
    if (isCritical) {
      const y = from.y;
      const x1 = from.x + NODE_RADIUS;
      const x2 = to.x - NODE_RADIUS - 4;
      const midX = (x1 + x2) / 2;
      const labelY = y - 22;

      return (
        <g key={linkId}>
          {ArrowMarker}
          <line
            x1={x1}
            y1={y}
            x2={x2}
            y2={y}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            markerEnd={`url(#${markerId})`}
            className="cursor-pointer"
            onClick={() => handleArrowClick(fromId, toId)}
          />
          {label && renderLabel(midX, labelY)}
        </g>
      );
    }

    // Feedback loop: arc over the top
    if (isFeedback) {
      const startX = from.x;
      const startY = from.y - NODE_RADIUS;
      const endX = to.x;
      const endY = to.y - NODE_RADIUS;
      const topY = 24;
      const midX = (startX + endX) / 2;

      return (
        <g key={linkId}>
          {ArrowMarker}
          <path
            d={`M ${startX} ${startY}
                L ${startX} ${topY + 24}
                Q ${startX} ${topY} ${startX + 28} ${topY}
                L ${endX - 28} ${topY}
                Q ${endX} ${topY} ${endX} ${topY + 24}
                L ${endX} ${endY - 2}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            markerEnd={`url(#${markerId})`}
            className="cursor-pointer"
            onClick={() => handleArrowClick(fromId, toId)}
          />
          {label && renderLabel(midX, topY)}
        </g>
      );
    }

    // Parallel connections (vertical/horizontal combinations)
    // Connect from node edge to node edge, mostly orthogonal or straight diagonal
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    // Determine start/end points on node edges
    let sx = from.x;
    let sy = from.y;
    let ex = to.x;
    let ey = to.y;

    if (dy < 0) {
      sy = from.y - NODE_RADIUS;
      ey = to.y + NODE_RADIUS;
    } else if (dy > 0) {
      sy = from.y + NODE_RADIUS;
      ey = to.y - NODE_RADIUS;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      sx = dx > 0 ? from.x + NODE_RADIUS : from.x - NODE_RADIUS;
      ex = dx > 0 ? to.x - NODE_RADIUS : to.x + NODE_RADIUS;
    }

    // For vertical connector between testing and procurement
    if (fromId === "testing" && toId === "procurement") {
      const startX = from.x;
      const startY = from.y + NODE_RADIUS;
      const endX = to.x;
      const endY = to.y - NODE_RADIUS - 4;
      const labelX = startX + 34;
      const labelY = (startY + endY) / 2;

      return (
        <g key={linkId}>
          {ArrowMarker}
          <line
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            markerEnd={`url(#${markerId})`}
            className="cursor-pointer"
            onClick={() => handleArrowClick(fromId, toId)}
          />
          {label && renderLabel(labelX, labelY)}
        </g>
      );
    }

    // Standard diagonal/horizontal parallel line
    const midX = (sx + ex) / 2;
    const midY = (sy + ey) / 2;
    const labelOffsetY = -18;

    return (
      <g key={linkId}>
        {ArrowMarker}
        <line
          x1={sx}
          y1={sy}
          x2={ex}
          y2={ey}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          markerEnd={`url(#${markerId})`}
          className="cursor-pointer"
          onClick={() => handleArrowClick(fromId, toId)}
        />
        {label && renderLabel(midX, midY + labelOffsetY)}
      </g>
    );
  };

  const getNodeName = (id: string) => NODES.find(n => n.id === id)?.name || id;

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">StyleForge 智能调度中心</h1>
            <p className="text-muted-foreground">全链路工序管理 · 点击节点进入工作区 · 点击工时标签编辑</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            <Sparkles className="h-4 w-4 mr-2" />
            数据看板
          </Button>
        </div>

        <div className="flex items-center gap-6 mb-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500 border-t-2 border-red-500"></div>
            <span className="text-muted-foreground">关键路径</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0 border-t-2 border-dashed border-slate-400"></div>
            <span className="text-muted-foreground">并行工序</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0 border-t-2 border-dashed border-amber-500"></div>
            <span className="text-muted-foreground">反馈回路</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 rounded-full bg-white border-2 border-slate-400 text-[11px] text-slate-600 font-semibold leading-none">40h</div>
            <span className="text-muted-foreground">工时标签（点击编辑）</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中...
          </div>
        ) : (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardContent className="p-0 pt-2">
              <div className="overflow-x-auto">
                <div
                  className="relative"
                  style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, minWidth: CANVAS_WIDTH }}
                >
                  <svg
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
                  >
                    {LINKS_DEF.map(link => renderArrow(link.from, link.to, link.type))}
                  </svg>

                  <div className="relative" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, zIndex: 2 }}>
                    {NODES.map(node => (
                      <div
                        key={node.id}
                        onClick={() => handleNodeClick(node)}
                        className="absolute cursor-pointer transition-all duration-300 hover:scale-110"
                        style={{
                          left: node.x - NODE_RADIUS,
                          top: node.y - NODE_RADIUS,
                          width: NODE_SIZE,
                          height: NODE_SIZE,
                        }}
                      >
                        <div
                          className={`w-full h-full rounded-full flex flex-col items-center justify-center shadow-lg ${node.color} text-white`}
                        >
                          <span className="text-xl mb-0.5">{node.icon}</span>
                          <span className="font-bold text-sm">{node.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                编辑工序：{editingLink && `${getNodeName(editingLink.from_node)} → ${getNodeName(editingLink.to_node)}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>工时（小时）</Label>
                  <Input
                    type="number"
                    value={editForm.duration_hours}
                    onChange={e => setEditForm({ ...editForm, duration_hours: Number(e.target.value) })}
                    placeholder="例如：40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>截止日期</Label>
                  <Input
                    type="date"
                    value={editForm.deadline}
                    onChange={e => setEditForm({ ...editForm, deadline: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>需要完成的工作内容</Label>
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editForm.work_content}
                  onChange={e => setEditForm({ ...editForm, work_content: e.target.value })}
                  placeholder="描述该工序需要完成的具体工作..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>给下一个工序的交付清单</Label>
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editForm.deliverables}
                  onChange={e => setEditForm({ ...editForm, deliverables: e.target.value })}
                  placeholder="列出该工序完成后需要交付给下一工序的内容..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {toast && (
          <div className="fixed top-6 right-6 z-50 max-w-sm">
            <div className={`px-4 py-3 rounded-lg shadow-lg border flex items-start gap-3 bg-white ${toast.type === "success" ? "border-green-200" : "border-red-200"}`}>
              {toast.type === "success" ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />}
              <div className="flex-1">
                <p className="text-sm font-medium">{toast.type === "success" ? "操作成功" : "操作失败"}</p>
                <p className="text-xs text-muted-foreground">{toast.message}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}