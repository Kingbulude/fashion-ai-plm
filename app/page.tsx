"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  GitBranch,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/auth/supabase";

const NODE_SIZE = 96;
const NODE_RADIUS = NODE_SIZE / 2;

const NODES = [
  { id: "planning", name: "企划", icon: "📋", route: "/planning", x: 110, y: 130, number: 1 },
  { id: "design", name: "设计", icon: "🎨", route: "/styles", x: 410, y: 130, number: 2 },
  { id: "sampling", name: "打样", icon: "✂️", route: "/styles", x: 710, y: 130, number: 3 },
  { id: "testing", name: "测款", icon: "🎯", route: "/ai", x: 1010, y: 130, number: 4 },
  { id: "procurement", name: "采购", icon: "🛒", route: "/styles", x: 860, y: 470, number: 5 },
  { id: "stocking", name: "备货", icon: "📦", route: "/styles", x: 1310, y: 470, number: 6 },
  { id: "sales", name: "销售", icon: "💰", route: "/sales", x: 1310, y: 130, number: 7 },
  { id: "aftersales", name: "售后", icon: "🔄", route: "/aftersales", x: 1610, y: 130, number: 8 },
];

const LINKS_DEF = [
  { from: "planning", to: "design", type: "critical" },
  { from: "design", to: "sampling", type: "critical" },
  { from: "sampling", to: "testing", type: "critical" },
  { from: "sampling", to: "procurement", type: "critical" },
  { from: "testing", to: "procurement", type: "parallel" },
  { from: "procurement", to: "stocking", type: "critical" },
  { from: "testing", to: "sales", type: "critical" },
  { from: "stocking", to: "sales", type: "critical" },
  { from: "sales", to: "aftersales", type: "critical" },
  { from: "aftersales", to: "planning", type: "feedback" },
];

const CANVAS_WIDTH = 1720;
const CANVAS_HEIGHT = 600;

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
    work_content: [] as string[],
    deliverables: [] as string[],
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const newScale = Math.min(1.08, Math.max(0.65, containerWidth / CANVAS_WIDTH));
    setScale(newScale);
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/process-links");
      const data = await res.json();
      const fetched = Array.isArray(data) ? data : [];
      const existingKeys = new Set(fetched.map((l: ProcessLink) => `${l.from_node}-${l.to_node}`));
      const defaults = LINKS_DEF
        .filter(def => !existingKeys.has(`${def.from}-${def.to}`))
        .map(def => ({
          id: `default-${def.from}-${def.to}`,
          from_node: def.from,
          to_node: def.to,
          link_type: def.type,
          duration_hours: 0,
          deadline: null,
          work_content: "",
          deliverables: "",
        }));
      setLinks([...fetched, ...defaults]);
    } catch (err) {
      console.error("Failed to fetch links", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const [brandName, setBrandName] = useState("TEPNIX步戌");

  useEffect(() => {
    const fetchBrandName = async () => {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (data.brandName) {
          setBrandName(data.brandName);
        }
      } catch (error) {
        console.error("Failed to fetch brand name");
      }
    };
    fetchBrandName();
  }, []);

  const getNodePos = (id: string) => {
    const node = NODES.find(n => n.id === id);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  const getLink = (from: string, to: string) => {
    return links.find(l => l.from_node === from && l.to_node === to);
  };

  const parseLines = (str: string): string[] => {
    if (!str) return [""];
    return str.split("\n").filter(line => line.trim()).map(line => line.trim());
  };

  const handleArrowClick = (from: string, to: string) => {
    const link = getLink(from, to);
    if (link) {
      setEditingLink(link);
      setEditForm({
        duration_hours: link.duration_hours || 0,
        deadline: link.deadline || "",
        work_content: parseLines(link.work_content || ""),
        deliverables: parseLines(link.deliverables || ""),
      });
      setEditDialogOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingLink) return;
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/process-links", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          id: editingLink.id,
          duration_hours: Number(editForm.duration_hours) || 0,
          deadline: editForm.deadline || null,
          work_content: editForm.work_content.filter(item => item.trim()).join("\n"),
          deliverables: editForm.deliverables.filter(item => item.trim()).join("\n"),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || "保存失败");
      }
      showToast("success", "更新成功");
      setEditDialogOpen(false);
      fetchLinks();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const addWorkContent = () => {
    setEditForm({ ...editForm, work_content: [...editForm.work_content, ""] });
  };

  const removeWorkContent = (index: number) => {
    if (editForm.work_content.length <= 1) return;
    const newList = editForm.work_content.filter((_, i) => i !== index);
    setEditForm({ ...editForm, work_content: newList });
  };

  const updateWorkContent = (index: number, value: string) => {
    const newList = [...editForm.work_content];
    newList[index] = value;
    setEditForm({ ...editForm, work_content: newList });
  };

  const addDeliverable = () => {
    setEditForm({ ...editForm, deliverables: [...editForm.deliverables, ""] });
  };

  const removeDeliverable = (index: number) => {
    if (editForm.deliverables.length <= 1) return;
    const newList = editForm.deliverables.filter((_, i) => i !== index);
    setEditForm({ ...editForm, deliverables: newList });
  };

  const updateDeliverable = (index: number, value: string) => {
    const newList = [...editForm.deliverables];
    newList[index] = value;
    setEditForm({ ...editForm, deliverables: newList });
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

    const strokeColor = isCritical ? "#1e3a5f" : isFeedback ? "#e07a5f" : "#85a0c6";
    const strokeWidth = isCritical ? 2.5 : 1.5;
    const dashArray = isCritical ? "0" : "6 4";

    const hours = link?.duration_hours || 0;
    const deadline = link?.deadline;
    const deadlineLabel = deadline
      ? new Date(deadline).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })
      : "";
    const durationLabel = hours > 0 ? `${hours}天` : "";
    const labelTextForWidth = (deadlineLabel || durationLabel) || "未设置";
    const labelWidth = Math.max(64, labelTextForWidth.length * 11 + 20);
    const labelHeight = 26;

    const markerId = `arrowhead-${linkId}`;

    const ArrowMarker = (
      <defs key={`defs-${linkId}`}>
        <marker
          id={markerId}
          markerWidth="12"
          markerHeight="9"
          refX="10"
          refY="4.5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <polygon points="0 0, 12 4.5, 0 9" fill={strokeColor} />
        </marker>
      </defs>
    );

    const renderDualLabels = (cx: number, cy: number, rotation: number = 0, perpOffset: number = 18, combined: boolean = false, clickable: boolean = true, isVerticalLine: boolean = false, splitAlongLine: boolean = false) => {
      const hasDeadline = !!deadlineLabel;
      const hasDuration = !!durationLabel;
      const showPlaceholder = !hasDeadline && !hasDuration;
      const displayDuration = showPlaceholder ? "未设置" : durationLabel;
      const displayDeadline = showPlaceholder ? "未设置" : deadlineLabel;
      if (!hasDeadline && !hasDuration && !showPlaceholder) return null;

      const halfW = labelWidth / 2;
      const gap = 3;

      if (isVerticalLine) {
        const sideX = cx + gap;
        const durRectY = cy - labelHeight - gap;
        const durCenterY = durRectY + labelHeight / 2;
        const dlRectY = cy + gap;
        const dlCenterY = dlRectY + labelHeight / 2;
        return (
          <g
            key={`label-${linkId}`}
            onClick={clickable ? () => handleArrowClick(fromId, toId) : undefined}
            style={{ cursor: clickable ? "pointer" : "default" }}
          >
            <g>
              <rect
                x={sideX}
                y={durRectY}
                width={labelWidth}
                height={labelHeight}
                rx={labelHeight / 2}
                fill={isCritical ? "#eef3f8" : "#f8fafc"}
                stroke={strokeColor}
                strokeWidth={1.5}
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }}
                opacity={showPlaceholder ? 0.6 : 1}
              />
              <text
                x={sideX + halfW}
                y={durCenterY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fill={strokeColor}
                fontWeight={700}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {displayDuration}
              </text>
            </g>
            <g>
              <rect
                x={sideX}
                y={dlRectY}
                width={labelWidth}
                height={labelHeight}
                rx={labelHeight / 2}
                fill="white"
                stroke={strokeColor}
                strokeWidth={1.5}
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}
                className="hover:brightness-95 transition-all"
                opacity={showPlaceholder ? 0.6 : 1}
              />
              <text
                x={sideX + halfW}
                y={dlCenterY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fill={strokeColor}
                fontWeight={700}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {displayDeadline}
              </text>
            </g>
          </g>
        );
      }

      let normalizedRotation = rotation;
      while (normalizedRotation > 90) normalizedRotation -= 180;
      while (normalizedRotation < -90) normalizedRotation += 180;

      if (splitAlongLine) {
        const perpOffset = labelHeight / 2 + 4;
        const durCx = cx;
        const dlCx = cx;
        const durCy = cy - perpOffset;
        const dlCy = cy + perpOffset;
        return (
          <g
            key={`label-${linkId}`}
            onClick={clickable ? () => handleArrowClick(fromId, toId) : undefined}
            style={{ cursor: clickable ? "pointer" : "default" }}
          >
            <g transform={`rotate(${normalizedRotation}, ${cx}, ${cy})`}>
              <g>
                <rect
                  x={durCx - halfW}
                  y={durCy - labelHeight / 2}
                  width={labelWidth}
                  height={labelHeight}
                  rx={labelHeight / 2}
                  fill={isCritical ? "#eef3f8" : "#f8fafc"}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }}
                  opacity={showPlaceholder ? 0.6 : 1}
                />
                <text
                  x={durCx}
                  y={durCy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={12}
                  fill={strokeColor}
                  fontWeight={700}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {displayDuration}
                </text>
              </g>
              <g>
                <rect
                  x={dlCx - halfW}
                  y={dlCy - labelHeight / 2}
                  width={labelWidth}
                  height={labelHeight}
                  rx={labelHeight / 2}
                  fill="white"
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}
                  className="hover:brightness-95 transition-all"
                  opacity={showPlaceholder ? 0.6 : 1}
                />
                <text
                  x={dlCx}
                  y={dlCy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={12}
                  fill={strokeColor}
                  fontWeight={700}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {displayDeadline}
                </text>
              </g>
            </g>
          </g>
        );
      }

      const durRectY = cy - labelHeight - gap;
      const durCenterY = durRectY + labelHeight / 2;
      const dlRectY = cy + gap;
      const dlCenterY = dlRectY + labelHeight / 2;

      return (
        <g
          key={`label-${linkId}`}
          onClick={clickable ? () => handleArrowClick(fromId, toId) : undefined}
          style={{ cursor: clickable ? "pointer" : "default" }}
        >
          <g transform={`rotate(${normalizedRotation}, ${cx}, ${cy})`}>
            <g>
              <rect
                x={cx - halfW}
                y={durRectY}
                width={labelWidth}
                height={labelHeight}
                rx={labelHeight / 2}
                fill={isCritical ? "#eef3f8" : "#f8fafc"}
                stroke={strokeColor}
                strokeWidth={1.5}
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }}
                opacity={showPlaceholder ? 0.6 : 1}
              />
              <text
                x={cx}
                y={durCenterY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fill={strokeColor}
                fontWeight={700}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {displayDuration}
              </text>
            </g>
            <g>
              <rect
                x={cx - halfW}
                y={dlRectY}
                width={labelWidth}
                height={labelHeight}
                rx={labelHeight / 2}
                fill="white"
                stroke={strokeColor}
                strokeWidth={1.5}
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}
                className="hover:brightness-95 transition-all"
                opacity={showPlaceholder ? 0.6 : 1}
              />
              <text
                x={cx}
                y={dlCenterY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fill={strokeColor}
                fontWeight={700}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {displayDeadline}
              </text>
            </g>
          </g>
        </g>
      );
    };

    if (isCritical) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;

      let sx = from.x;
      let sy = from.y;
      let ex = to.x;
      let ey = to.y;

      if (Math.abs(dx) > Math.abs(dy)) {
        sx = dx > 0 ? from.x + NODE_RADIUS : from.x - NODE_RADIUS;
        ex = dx > 0 ? to.x - NODE_RADIUS - 4 : to.x + NODE_RADIUS + 4;
      } else {
        sy = dy > 0 ? from.y + NODE_RADIUS : from.y - NODE_RADIUS;
        ey = dy > 0 ? to.y - NODE_RADIUS - 4 : to.y + NODE_RADIUS + 4;
      }

      const midX = (sx + ex) / 2;
      const midY = (sy + ey) / 2;
      const isPureVertical = dx === 0;
      const isDiagonal = Math.abs(dx) > 0 && Math.abs(dy) > 0;
      const useVerticalLayout = isPureVertical;
      let labelCx = midX;
      let labelCy = midY;
      let labelRotation = 0;
      let useSplitAlongLine = false;
      if (isDiagonal) {
        const lineDx = ex - sx;
        const lineDy = ey - sy;
        const angleRad = Math.atan2(lineDy, lineDx);
        labelRotation = angleRad * 180 / Math.PI;
        useSplitAlongLine = true;
      }

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
            markerEnd={`url(#${markerId})`}
            style={{ cursor: "pointer" }}
            onClick={() => handleArrowClick(fromId, toId)}
          />
          {renderDualLabels(labelCx, labelCy, labelRotation, 18, false, true, useVerticalLayout, useSplitAlongLine)}
        </g>
      );
    }

    if (isFeedback) {
      const startX = from.x;
      const startY = from.y - NODE_RADIUS;
      const endX = to.x;
      const endY = to.y - NODE_RADIUS;
      const topY = 35;
      const midX = (startX + endX) / 2;

      return (
        <g key={linkId}>
          {ArrowMarker}
          <path
            d={`M ${startX} ${startY}
                L ${startX} ${topY}
                L ${endX} ${topY}
                L ${endX} ${endY - 4}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            markerEnd={`url(#${markerId})`}
            style={{ cursor: "pointer" }}
            onClick={() => handleArrowClick(fromId, toId)}
          />
          {renderDualLabels(midX, topY, 0, 18, false)}
        </g>
      );
    }

    const dx = to.x - from.x;
    const dy = to.y - from.y;

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

    if (fromId === "testing" && toId === "procurement") {
      const startX = from.x;
      const startY = from.y + NODE_RADIUS;
      const endX = to.x;
      const endY = to.y - NODE_RADIUS - 4;
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const tdx = endX - startX;
      const tdy = endY - startY;
      const angleRad = Math.atan2(tdy, tdx);
      const angle = angleRad * 180 / Math.PI;

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
            style={{ cursor: "pointer" }}
            onClick={() => handleArrowClick(fromId, toId)}
          />
          {renderDualLabels(midX, midY, angle, 18, false, true, false, true)}
        </g>
      );
    }

    const pmidX = (sx + ex) / 2;
    const pmidY = (sy + ey) / 2;
    const labelOffsetY = -18;
    const pdx = ex - sx;
    const pdy = ey - sy;
    const isPDiagonal = Math.abs(pdx) > 0 && Math.abs(pdy) > 0 && Math.abs(Math.abs(pdx) - Math.abs(pdy)) > 20;
    const pAngle = isPDiagonal ? Math.atan2(pdy, pdx) * 180 / Math.PI : 0;
    const pPerpOffset = isPDiagonal ? 42 : 0;
    const pLabelCy = isPDiagonal ? pmidY : pmidY + labelOffsetY;

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
          style={{ cursor: "pointer" }}
          onClick={() => handleArrowClick(fromId, toId)}
        />
        {renderDualLabels(pmidX, pLabelCy, pAngle, 16, false)}
      </g>
    );
  };

  const getNodeName = (id: string) => NODES.find(n => n.id === id)?.name || id;

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg gradient-navy flex items-center justify-center shadow-premium">
                <GitBranch className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{brandName} 全链路工序图</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-10">全链路工序管理 · 点击节点进入工作区 · 点击截止时间编辑</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-7 px-3 text-xs font-medium border-navy-200 text-navy-700 bg-navy-50/50">
              <Clock className="h-3 w-3 mr-1" />
              实时同步
            </Badge>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-5 text-sm flex-wrap p-3 rounded-xl bg-card border shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-navy-700 rounded-full" />
            <span className="text-muted-foreground text-xs">关键路径</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0 border-t-2 border-dashed border-navy-300 rounded-full" />
            <span className="text-muted-foreground text-xs">并行工序</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0 border-t-2 border-dashed border-terracotta-400 rounded-full" />
            <span className="text-muted-foreground text-xs">反馈回路</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 rounded-full bg-white border border-navy-200 text-[11px] text-navy-700 font-semibold leading-none shadow-sm">07/16</div>
            <span className="text-muted-foreground text-xs">截止时间（点击编辑）</span>
          </div>
        </div>

        {loading ? (
          <div className="py-32 text-center text-muted-foreground flex items-center justify-center gap-2 card-premium">
            <Loader2 className="h-5 w-5 animate-spin" />
            加载工序数据...
          </div>
        ) : (
          <div className="card-premium p-6 lg:p-8 overflow-hidden">
            <div
              ref={containerRef}
              className="w-full overflow-hidden flex items-start justify-center"
              style={{ height: CANVAS_HEIGHT * scale }}
            >
              <div
                className="relative"
                style={{
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                  transform: `scale(${scale})`,
                  transformOrigin: "top center",
                }}
              >
                <svg
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
                >
                  {LINKS_DEF.map(link => renderArrow(link.from, link.to, link.type))}
                </svg>

                <div className="relative" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, zIndex: 2, pointerEvents: "none" }}>
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
                        pointerEvents: "auto",
                      }}
                    >
                      <div className="w-full h-full rounded-2xl flex flex-col items-center justify-center shadow-premium gradient-navy text-white border border-white/10">
                        <span className="text-2xl mb-0.5">{node.icon}</span>
                        <span className="font-bold text-sm">{node.number}.{node.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <DraggableDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          title={`编辑工序：${editingLink && `${getNodeName(editingLink.from_node)} → ${getNodeName(editingLink.to_node)}`}`}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">截止时间</Label>
                <Input
                  type="date"
                  value={editForm.deadline}
                  onChange={e => setEditForm({ ...editForm, deadline: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">执行天数</Label>
                <Input
                  type="number"
                  value={editForm.duration_hours}
                  onChange={e => setEditForm({ ...editForm, duration_hours: Number(e.target.value) })}
                  placeholder="例如：7"
                  className="h-10 w-32"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">工作内容</Label>
              <div className="space-y-2">
                {editForm.work_content.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-navy-100 text-navy-700 text-xs flex items-center justify-center flex-shrink-0 font-semibold">
                      {index + 1}
                    </span>
                    <Input
                      value={item}
                      onChange={e => updateWorkContent(index, e.target.value)}
                      placeholder="输入工作内容..."
                      className="flex-1 h-10"
                    />
                    {editForm.work_content.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeWorkContent(index)}
                        className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addWorkContent}
                className="flex items-center gap-2 text-sm text-navy-700 hover:text-navy-800 hover:bg-navy-50 px-3 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                添加工作内容
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">交付清单</Label>
              <div className="space-y-2">
                {editForm.deliverables.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-terracotta-100 text-terracotta-600 text-xs flex items-center justify-center flex-shrink-0 font-semibold">
                      {index + 1}
                    </span>
                    <Input
                      value={item}
                      onChange={e => updateDeliverable(index, e.target.value)}
                      placeholder="输入交付内容..."
                      className="flex-1 h-10"
                    />
                    {editForm.deliverables.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDeliverable(index)}
                        className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addDeliverable}
                className="flex items-center gap-2 text-sm text-navy-700 hover:text-navy-800 hover:bg-navy-50 px-3 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                添加交付内容
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="h-10 px-6"
              >
                取消
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="h-10 px-6 bg-navy-700 hover:bg-navy-800 text-white"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                保存
              </Button>
            </div>
          </div>
        </DraggableDialog>

        {toast && (
          <div className="fixed top-6 right-6 z-50 max-w-sm">
            <div className={`px-4 py-3 rounded-xl shadow-lg border flex items-start gap-3 bg-card ${toast.type === "success" ? "border-green-200" : "border-red-200"}`}>
              {toast.type === "success" ? <CheckCircle className="h-4 w-4 text-success mt-0.5" /> : <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />}
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
