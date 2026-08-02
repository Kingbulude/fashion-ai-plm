"use client";

// tldraw 本体必须动态加载（含大量 window/document 副作用）
// 此文件被 dynamic() 导入，允许直接顶层引入 tldraw

import { useEffect, useRef } from "react";
import {
  Tldraw,
  createTLStore,
  defaultShapeUtils,
  type Editor,
  type TLShape,
} from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import type { BoardCanvasShapeMeta, TldrawBoardProps } from "./tldraw-board";

type InternalProps = Pick<
  TldrawBoardProps,
  "boardId" | "initialItems" | "onShapeMetaChange"
>;

const STORAGE_KEY_PREFIX = "styleforge:tldraw:board:";

export function TldrawCanvasInternal({
  boardId,
  initialItems,
  onShapeMetaChange,
}: InternalProps) {
  const storeRef = useRef<ReturnType<typeof createTLStore> | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const injectedRef = useRef(false);

  if (!storeRef.current) {
    // 读取本地缓存（用于兜底保留用户 canvas 布局）
    let existing: string | null = null;
    try {
      existing =
        typeof window !== "undefined"
          ? window.localStorage.getItem(STORAGE_KEY_PREFIX + boardId)
          : null;
    } catch {
      /* ignore */
    }
    storeRef.current = createTLStore({
      shapeUtils: defaultShapeUtils,
      ...(existing
        ? (() => {
            try {
              const snapshot = JSON.parse(existing);
              return { initialData: snapshot } as any;
            } catch {
              return undefined;
            }
          })()
        : undefined),
    });
  }

  // 挂载后：把 initialItems 通过 editor 注入为 shape（仅首次）
  useEffect(() => {
    if (!editorRef.current || injectedRef.current) return;
    const editor = editorRef.current;
    const items = initialItems ?? [];
    if (items.length === 0) {
      injectedRef.current = true;
      return;
    }

    try {
      const shapes: TLShape[] = [] as TLShape[];
      const pageId = editor.getCurrentPageId();
      items.forEach((item, idx) => {
        const x = item.x ?? 160 + (idx % 4) * 360;
        const y = item.y ?? 120 + Math.floor(idx / 4) * 280;
        const meta: BoardCanvasShapeMeta = {
          boardId,
          boardItemId: item.id,
          tags: item.tags ?? [],
          sourceType: item.sourceType ?? "upload",
          sourceUrl: item.sourceUrl ?? undefined,
          category: item.category ?? undefined,
        };

        if (item.imageUrl) {
          shapes.push({
            id: `shape:${item.id || `auto-${idx}`}` as any,
            type: "image",
            x,
            y,
            isLocked: false,
            opacity: 1,
            rotation: 0,
            props: {
              w: 320,
              h: 220,
              assetId: null,
              name: item.title || "",
              description: item.description || "",
              playing: true,
              url: item.imageUrl,
            },
            parentId: pageId as any,
            index: String.fromCharCode(97 + idx).repeat(2) as any,
            meta: meta as any,
          } as any);
        } else {
          shapes.push({
            id: `shape:${item.id || `auto-${idx}`}` as any,
            type: "note",
            x,
            y,
            isLocked: false,
            opacity: 1,
            rotation: 0,
            props: {
              color: "yellow",
              text:
                (item.title || "") +
                (item.description ? `\n${item.description}` : ""),
              size: "m",
              fontSizeAdjustment: 0,
            },
            parentId: pageId as any,
            index: String.fromCharCode(97 + idx).repeat(2) as any,
            meta: meta as any,
          } as any);
        }
      });

      if (shapes.length > 0) {
        editor.createShapes(shapes as any);
        try {
          (editor as any).zoomToFit({ padding: 40 });
        } catch {
          // 兼容不同版本
        }
      }
    } catch (e) {
      console.warn("[tldraw] inject initial shapes failed:", e);
    }
    injectedRef.current = true;
  }, [initialItems, boardId]);

  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;

    // 监听 shape 变更 -> 回调 + localStorage 快照
    let first = true;
    const listener = () => {
      if (first) {
        first = false;
        return;
      }
      try {
        const snapshot = store.getStoreSnapshot();
        const json = JSON.stringify(snapshot);
        try {
          window.localStorage.setItem(STORAGE_KEY_PREFIX + boardId, json);
        } catch {
          /* ignore */
        }
      } catch {
        /* ignore */
      }
      if (!onShapeMetaChange || !editorRef.current) return;
      const editor = editorRef.current;
      const selectedIds = editor.getSelectedShapeIds();
      for (const id of selectedIds) {
        const shape = editor.getShape(id as any);
        if (!shape) continue;
        const meta = (shape.meta ?? {}) as any;
        onShapeMetaChange({
          boardId,
          shapeId: String(shape.id),
          shapeType: String(shape.type),
          event: "update",
          boardItemId: meta?.boardItemId as string | undefined,
          tags: meta?.tags as string[] | undefined,
          sourceType: meta?.sourceType as string | undefined,
          sourceUrl: meta?.sourceUrl as string | undefined,
          category: meta?.category as string | undefined,
        });
      }
    };

    // tldraw listen 返回 off 函数（回调参数形式）
    const off = store.listen(listener as any, {
      source: "user",
      scope: "all",
    } as any);
    return () => {
      try {
        (off as any)?.();
      } catch {
        /* ignore */
      }
    };
  }, [boardId, onShapeMetaChange]);

  return (
    <div className="w-full h-full min-h-[640px] border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
      <Tldraw
        store={storeRef.current}
        hideUi={false}
        onMount={(editor) => {
          editorRef.current = editor;
        }}
      />
    </div>
  );
}
