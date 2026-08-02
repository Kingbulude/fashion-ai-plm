"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// 灵感板 items 与 tldraw shape 的映射结构
export interface BoardCanvasShapeMeta {
  boardId: string;
  boardItemId?: string;
  tags?: string[];
  sourceType?: string;
  sourceUrl?: string;
  category?: string;
}

// tldraw SDK 体积大，关闭 SSR，首次挂载动态加载
const TldrawClient = dynamic(
  () =>
    import("./tldraw-canvas-internal").then((m) => m.TldrawCanvasInternal),
  { ssr: false, loading: () => <TldrawSkeleton /> }
);

function TldrawSkeleton() {
  return (
    <div
      aria-hidden
      className="w-full h-full min-h-[520px] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 animate-pulse flex items-center justify-center text-slate-400"
    >
      灵感板画布加载中…
    </div>
  );
}

export interface TldrawBoardProps {
  boardId: string;
  /** 从数据库读取的 items，用于初始化 shape（可选） */
  initialItems?: Array<{
    id: string;
    title?: string | null;
    description?: string | null;
    imageUrl: string | null;
    sourceUrl?: string | null;
    sourceType?: string | null;
    tags?: string[] | null;
    category?: string | null;
    /** 初始化时 canvas 上的位置（可空） */
    x?: number;
    y?: number;
  }>;
  /**
   * 当用户通过画布新增/更新/删除 shape 元信息时回调
   * 可据此同步写入 inspiration_items 表
   */
  onShapeMetaChange?: (
    meta: BoardCanvasShapeMeta & {
      shapeId: string;
      shapeType: string;
      event: "create" | "update" | "delete";
      title?: string;
      description?: string;
      imageUrl?: string;
    }
  ) => void;
  className?: string;
}

/**
 * TldrawBoard — 灵感板画布封装组件
 * 提供：
 * 1. 图片卡片/便签/贴纸/手绘（tldraw 原生支持）
 * 2. 读取 initialItems 初始化内容
 * 3. onShapeMetaChange 回调，允许业务层同步 DB
 */
export function TldrawBoard(props: TldrawBoardProps) {
  const { boardId, initialItems, onShapeMetaChange, className } = props;
  const didInit = useRef(false);
  // 用本地 state 触发子组件 remount（boardId 变化时）
  const [mountKey, setMountKey] = useState(boardId);

  useEffect(() => {
    if (boardId !== mountKey) {
      didInit.current = false;
      setMountKey(boardId);
    }
  }, [boardId, mountKey]);

  return (
    <div className={["relative w-full h-full", className].filter(Boolean).join(" ")}>
      <TldrawClient
        key={mountKey}
        boardId={boardId}
        initialItems={initialItems}
        onShapeMetaChange={onShapeMetaChange}
      />
    </div>
  );
}
