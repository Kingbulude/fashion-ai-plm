"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface DraggableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
}

export function DraggableDialog({ open, onOpenChange, title, children }: DraggableDialogProps) {
  const [position, setPosition] = useState({ x: 200, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setPosition({ x: 200, y: 150 });
    }
  }, [open]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: position.x + e.clientX - dragStart.x,
        y: position.y + e.clientY - dragStart.y,
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, position, dragStart]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col"
        style={{
          position: "absolute",
          left: position.x,
          top: position.y,
          transform: "none",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 cursor-move select-none flex-shrink-0"
          onMouseDown={handleMouseDown}
        >
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}