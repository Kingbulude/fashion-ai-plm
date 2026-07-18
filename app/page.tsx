"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";

const NODE_SIZE = 96;
const NODE_RADIUS = NODE_SIZE / 2;

const NODES = [
  { id: "planning", name: "企划", icon: "📋", color: "bg-blue-500", route: "/planning", x: 110, y: 130, number: 1 },
  { id: "design", name: "设计", icon: "🎨", color: "bg-purple-500", route: "/styles", x: 410, y: 130, number: 2 },
  { id: "sampling", name: "打样", icon: "✂️", color: "bg-amber-500", route: "/styles", x: 710, y: 130, number: 3 },
  { id: "testing", name: "测款", icon: "🎯", color: "bg-pink-500", route: "/ai", x: 1010, y: 130, number: 4 },
  { id: "procurement", name: "采购", icon: "🛒", color: "bg-orange-500", route: "/styles", x: 860, y: 470, number: 5 },
  { id: "stocking", name: "备货", icon: "📦", color: "bg-indigo-500", route: "/styles", x: 1310, y: 470, number: 6 },
  { id: "sales", name: "销售", icon: "💰", color: "bg-emerald-500", route: "/sales", x: 1310, y: 130, number: 7 },
  { id: "aftersales", name: "售后", icon: "🔄", color: "bg-slate-500", route: "/aftersales", x: 1610, y: 130, number: 8 },
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
    const newScale = Math.min(1, containerWidth / CANVAS_WIDTH);
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
      // Ensure all defined links have a record (even if empty)
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
      const res = await fetch("/api/process-links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingLink.id,
          duration_hours: Number(editForm.duration_hours) || 0,
          deadline: editForm.deadline || null,
          work_content: editForm.work_content.filter(item => item.trim()).join("\n"),
          deliverables: editForm.deliverables.filter(item => item.trim()).join("\n"),
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
    const isParallel = type === "parallel";

    const strokeColor = isCritical ? "#ef4444" : isFeedback ? "#f59e0b" : "#94a3b8";
    const strokeWidth = isCritical ? 2.5 : 1.5;
    const dashArray = isCritical ? "0" : "6 4";

    const hours = link?.duration_hours || 0;
    const deadline = link?.deadline;
    const deadlineLabel = deadline
      ? new Date(deadline).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })
      : "";
    const durationLabel = hours > 0 ? `${hours}天` : "";
    // Always keep a minimum width and a placeholder text so labels are visible (and clickable)
    const labelTextForWidth = (deadlineLabel || durationLabel) || "未设置";
    const labelWidth = Math.max(64, labelTextForWidth.length * 11 + 20);
    const labelHeight = 26;

    const markerId = `arrowhead-${linkId}`;

    // Global arrow marker (slightly larger head, same line width)
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

    // Helper: draw dual labels
    // - default mode (horizontal arrow): duration above line, deadline below line
    // - vertical arrow mode: duration on left, deadline on right (both tight to the line)
    // - diagonal mode: rotate entire group so labels align with arrow direction
    // - if no data, show a placeholder label "未设置" so the user can click to edit
    // All texts use dominantBaseline="central" so labels are vertically centered in the rect
    const renderDualLabels = (cx: number, cy: number, rotation: number = 0, perpOffset: number = 18, combined: boolean = false, clickable: boolean = true, isVerticalLine: boolean = false, splitAlongLine: boolean = false) => {
      const hasDeadline = !!deadlineLabel;
      const hasDuration = !!durationLabel;
      const showPlaceholder = !hasDeadline && !hasDuration;
      const displayDuration = showPlaceholder ? "未设置" : durationLabel;
      const displayDeadline = showPlaceholder ? "未设置" : deadlineLabel;
      if (!hasDeadline && !hasDuration && !showPlaceholder) return null;

      const halfW = labelWidth / 2;
      const gap = 3; // small gap between label and line

      // Vertical line: two labels stacked on the right side of the line, tight to the line
      if (isVerticalLine) {
        // Both labels go to the right side of the vertical line, separated vertically
        // (duration above, deadline below) - never crossing the line
        const sideX = cx + gap;
        // Duration rect: top side above the line, rect middle at cy - halfH
        const durRectY = cy - labelHeight - gap;
        const durCenterY = durRectY + labelHeight / 2;
        // Deadline rect: top side just below the line, rect middle at cy + halfH
        const dlRectY = cy + gap;
        const dlCenterY = dlRectY + labelHeight / 2;
        return (
          <g
            key={`label-${linkId}`}
            onClick={clickable ? () => handleArrowClick(fromId, toId) : undefined}
            style={{ cursor: clickable ? "pointer" : "default" }}
          >
            {/* Duration label - same side, above */}
            <g>
              <rect
                x={sideX}
                y={durRectY}
                width={labelWidth}
                height={labelHeight}
                rx={labelHeight / 2}
                fill={isCritical ? "#fef2f2" : "#f8fafc"}
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
            {/* Deadline label - same side, below */}
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

      // Default mode (horizontal/diagonal): rotate entire group so labels align with arrow direction
      // Normalize rotation to keep labels readable (not upside down)
      let normalizedRotation = rotation;
      while (normalizedRotation > 90) normalizedRotation -= 180;
      while (normalizedRotation < -90) normalizedRotation += 180;

      // "Split along line" mode: two labels on opposite sides of the line,
      // both aligned parallel to the line, at the same point along the line.
      // Used for diagonal lines (sampling->procurement, testing->procurement).
      // Reference: two labels straddling the line tightly, parallel to it.
      if (splitAlongLine) {
        // In the rotated coordinate system, the line goes left-to-right (horizontal).
        // duration goes ABOVE the line, deadline goes BELOW the line.
        // Both at the same x position (no along-line offset).
        // perpOffset = labelHeight/2 + small gap, so labels are tight to the line on each side.
        const perpOffset = labelHeight / 2 + 4;   // 13+4=17: half height + small gap
        const durCx = cx;
        const dlCx = cx;
        const durCy = cy - perpOffset;   // duration ABOVE the line (in rotated coords)
        const dlCy = cy + perpOffset;    // deadline BELOW the line (in rotated coords)
        return (
          <g
            key={`label-${linkId}`}
            onClick={clickable ? () => handleArrowClick(fromId, toId) : undefined}
            style={{ cursor: clickable ? "pointer" : "default" }}
          >
            <g transform={`rotate(${normalizedRotation}, ${cx}, ${cy})`}>
              {/* Duration label - above the line, slightly toward "from" */}
              <g>
                <rect
                  x={durCx - halfW}
                  y={durCy - labelHeight / 2}
                  width={labelWidth}
                  height={labelHeight}
                  rx={labelHeight / 2}
                  fill={isCritical ? "#fef2f2" : "#f8fafc"}
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
              {/* Deadline label - below the line, slightly toward "to" */}
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

      // Default mode (horizontal/diagonal): rotate entire group so labels align with arrow direction
      // Duration rect: top side above the line, rect middle at cy - labelHeight/2 - gap
      const durRectY = cy - labelHeight - gap;
      const durCenterY = durRectY + labelHeight / 2;
      // Deadline rect: top side just below the line, rect middle at cy + labelHeight/2 + gap
      const dlRectY = cy + gap;
      const dlCenterY = dlRectY + labelHeight / 2;

      return (
        <g
          key={`label-${linkId}`}
          onClick={clickable ? () => handleArrowClick(fromId, toId) : undefined}
          style={{ cursor: clickable ? "pointer" : "default" }}
        >
          <g transform={`rotate(${normalizedRotation}, ${cx}, ${cy})`}>
            {/* Duration label - above the line */}
            <g>
              <rect
                x={cx - halfW}
                y={durRectY}
                width={labelWidth}
                height={labelHeight}
                rx={labelHeight / 2}
                fill={isCritical ? "#fef2f2" : "#f8fafc"}
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
            {/* Deadline label - below the line */}
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

    // Critical path: straight line (horizontal or diagonal) with label above
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
      // A line is diagonal if both dx and dy are non-zero.
      // Don't require the difference to be large - even a mostly-horizontal line
      // with a small vertical component is a diagonal.
      const isDiagonal = Math.abs(dx) > 0 && Math.abs(dy) > 0;
      // Only use left/right side layout for purely vertical lines (e.g. stocking->sales)
      const useVerticalLayout = isPureVertical;
      // For diagonal lines (sampling->procurement), use "split along line" mode:
      // two labels distributed along the line direction, parallel to the line.
      let labelCx = midX;
      let labelCy = midY;
      let labelRotation = 0;
      let useSplitAlongLine = false;
      if (isDiagonal) {
        const lineDx = ex - sx;
        const lineDy = ey - sy;
        const angleRad = Math.atan2(lineDy, lineDx);
        // Rotate the entire label group to align with the actual line direction
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

    // Feedback loop: right-angle turns over the top
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

    // For diagonal connector between testing and procurement
    if (fromId === "testing" && toId === "procurement") {
      const startX = from.x;
      const startY = from.y + NODE_RADIUS;
      const endX = to.x;
      const endY = to.y - NODE_RADIUS - 4;
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      // Rotate labels to align with the arrow direction (parallel to the line)
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

    // Standard diagonal/horizontal parallel line
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
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">StyleForge 智能调度中心</h1>
            <p className="text-muted-foreground">全链路工序管理 · 点击节点进入工作区 · 点击截止时间编辑</p>
          </div>
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
            <div className="px-2 py-0.5 rounded-full bg-white border-2 border-slate-400 text-[11px] text-slate-600 font-semibold leading-none shadow-sm">07/16</div>
            <span className="text-muted-foreground">截止时间（点击编辑）</span>
          </div>
        </div>

        {loading ? (
          <div className="py-32 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中...
          </div>
        ) : (
          <div className="border-2 border-slate-200 shadow-xl rounded-2xl overflow-hidden bg-white p-8">
            <div
              ref={containerRef}
              className="w-full overflow-hidden"
              style={{ height: CANVAS_HEIGHT * scale }}
            >
              <div
                className="relative"
                style={{
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
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
                      <div
                        className={`w-full h-full rounded-full flex flex-col items-center justify-center shadow-lg ${node.color} text-white`}
                      >
                        <span className="text-2xl mb-0.5">{node.icon}</span>
                        <span className="font-bold text-base">{node.number}.{node.name}</span>
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
                <Label className="text-sm font-medium text-slate-700">截止时间</Label>
                <Input
                  type="date"
                  value={editForm.deadline}
                  onChange={e => setEditForm({ ...editForm, deadline: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">执行天数</Label>
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
              <Label className="text-sm font-medium text-slate-700">工作内容</Label>
              <div className="space-y-2">
                {editForm.work_content.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center flex-shrink-0">
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
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
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
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                添加工作内容
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">交付清单</Label>
              <div className="space-y-2">
                {editForm.deliverables.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs flex items-center justify-center flex-shrink-0">
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
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
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
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                添加交付内容
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
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
                className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                保存
              </Button>
            </div>
          </div>
        </DraggableDialog>

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