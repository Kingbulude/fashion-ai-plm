// 款式状态机可视化组件
// 11 状态水平流程图，实时高亮当前状态，可点击推进

"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  CircleDot,
  ChevronRight,
  Sparkles,
  Lock,
  AlertCircle,
  Loader2,
  ArrowRight,
  X,
  Check,
} from "lucide-react";

interface StateNode {
  key: string;
  label: string;
  color: string;
  bg: string;
  text: string;
  border: string;
  progress: number;
  emoji: string;
}

const STATE_NODES: StateNode[] = [
  { key: "planning", label: "企划", color: "slate", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", progress: 10, emoji: "📋" },
  { key: "designing", label: "设计", color: "blue", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", progress: 25, emoji: "🎨" },
  { key: "designed", label: "定稿", color: "indigo", bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300", progress: 35, emoji: "✏️" },
  { key: "sampling", label: "打样", color: "amber", bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", progress: 50, emoji: "🧵" },
  { key: "sampled", label: "封样", color: "yellow", bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300", progress: 65, emoji: "✅" },
  { key: "producing", label: "生产", color: "green", bg: "bg-green-100", text: "text-green-700", border: "border-green-300", progress: 80, emoji: "🏭" },
  { key: "produced", label: "入库", color: "emerald", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", progress: 90, emoji: "📦" },
  { key: "selling", label: "销售", color: "purple", bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300", progress: 95, emoji: "🛍️" },
  { key: "sold", label: "售罄", color: "gray", bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300", progress: 100, emoji: "🏁" },
  { key: "reviewing", label: "复盘", color: "pink", bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-300", progress: 100, emoji: "📊" },
  { key: "archived", label: "归档", color: "slate", bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-300", progress: 100, emoji: "🗄️" },
];

interface StyleStateFlowProps {
  styleId: string;
  currentStatus: string;
  availableTransitions: any[];
  completion: any;
  onTransition: (toStatus: string, event: string) => Promise<void>;
}

export function StyleStateFlow({
  styleId,
  currentStatus,
  availableTransitions,
  completion,
  onTransition,
}: StyleStateFlowProps) {
  const [selectedTransition, setSelectedTransition] = useState<any | null>(null);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = STATE_NODES.findIndex((n) => n.key === currentStatus);
  const currentNode = STATE_NODES[currentIndex] || STATE_NODES[0];
  const progress = currentNode.progress;

  // 处理状态推进
  const handleExecute = async () => {
    if (!selectedTransition) return;
    setExecuting(true);
    setError(null);
    try {
      await onTransition(selectedTransition.to, selectedTransition.event);
      setSelectedTransition(null);
    } catch (err: any) {
      setError(err?.message || "状态转换失败");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {/* 顶部进度条 + 当前状态 */}
        <div className={`px-4 py-3 ${currentNode.bg} ${currentNode.text} border-b ${currentNode.border}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentNode.emoji}</span>
              <div>
                <p className="text-xs font-medium opacity-75">当前状态</p>
                <p className="text-lg font-bold">{currentNode.label}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75">整体进度</p>
              <p className="text-lg font-bold">{progress}%</p>
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-white/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 状态机流程图 */}
        <div className="p-4 overflow-x-auto">
          <div className="flex items-center min-w-max">
            {STATE_NODES.map((node, idx) => {
              const isPast = idx < currentIndex;
              const isCurrent = idx === currentIndex;
              const isFuture = idx > currentIndex;
              const isClickable = isCurrent && availableTransitions.length > 0;

              return (
                <div key={node.key} className="flex items-center">
                  {/* 状态节点 */}
                  <button
                    onClick={() => {
                      // 只允许点击当前状态来推进
                      if (isCurrent) {
                        // 显示可用转换
                      }
                    }}
                    disabled={!isCurrent}
                    className={`group flex flex-col items-center transition-all ${
                      isClickable ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    {/* 圆点 */}
                    <div
                      className={`relative w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                        isCurrent
                          ? `${node.bg} ${node.text} ${node.border} ring-4 ring-offset-1 ring-${node.color}-200 scale-110`
                          : isPast
                          ? "bg-green-500 text-white border-green-500"
                          : "bg-slate-50 text-slate-400 border-slate-200"
                      }`}
                    >
                      {isPast ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-base">{node.emoji}</span>
                      )}
                      {isCurrent && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                        </span>
                      )}
                    </div>
                    {/* 标签 */}
                    <p
                      className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                        isCurrent
                          ? "text-slate-900 font-semibold"
                          : isPast
                          ? "text-green-700"
                          : "text-slate-400"
                      }`}
                    >
                      {node.label}
                    </p>
                  </button>

                  {/* 连接线 */}
                  {idx < STATE_NODES.length - 1 && (
                    <div className="w-8 h-0.5 mx-1 relative flex-shrink-0">
                      <div
                        className={`absolute inset-0 ${
                          idx < currentIndex ? "bg-green-500" : "bg-slate-200"
                        }`}
                      />
                      {idx === currentIndex && (
                        <ChevronRight className="absolute -right-1 -top-1.5 h-3 w-3 text-blue-500" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 可用状态转换 */}
        {availableTransitions.length > 0 && (
          <div className="px-4 pb-4">
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <p className="text-xs font-medium text-slate-700">推进到下一阶段</p>
                <Badge variant="secondary" className="text-[10px] h-4">
                  {availableTransitions.length} 个选项
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTransitions.map((t) => {
                  const isSelected = selectedTransition?.event === t.event;
                  return (
                    <Button
                      key={t.event}
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => {
                        setSelectedTransition(t);
                        setError(null);
                      }}
                      className={
                        isSelected
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500"
                          : "hover:border-indigo-300"
                      }
                    >
                      {t.description}
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 选中转换后的详情面板 */}
        {selectedTransition && (
          <div className="border-t border-slate-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  推进到「{STATE_NODES.find((n) => n.key === selectedTransition.to)?.label}」
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  系统会自动校验前置条件，并生成相应待办
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setSelectedTransition(null);
                  setError(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* 必填数据检查 */}
            {selectedTransition.requiredFields && selectedTransition.requiredFields.length > 0 && (
              <div className="mb-3 space-y-1.5">
                <p className="text-xs font-medium text-slate-600">前置条件：</p>
                {selectedTransition.requiredFields.map((field: string) => {
                  const check = checkFieldCompletion(field, completion);
                  return (
                    <div
                      key={field}
                      className={`flex items-center gap-2 text-xs ${
                        check.ok ? "text-green-700" : "text-amber-700"
                      }`}
                    >
                      {check.ok ? (
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      )}
                      <span>{check.label}</span>
                      {check.count > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-4 ml-auto">
                          {check.count}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 自动生成待办提示 */}
            {selectedTransition.autoCreateTodo && (
              <div className="mb-3 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded px-2 py-1.5">
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                <span>状态推进后将自动创建待办：「{selectedTransition.autoCreateTodo}」</span>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="mb-3 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 确认按钮 */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExecute}
                disabled={executing}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
              >
                {executing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    推进中...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    确认推进
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTransition(null)} disabled={executing}>
                取消
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 检查必填字段完成度
function checkFieldCompletion(field: string, completion: any) {
  const FIELD_LABELS: Record<string, string> = {
    style_no: "款号已设置",
    name: "款式名称已设置",
    category: "品类已设置",
    design_assets: "已上传设计资产",
    tech_packs: "已创建工艺包",
    bom_items: "已填写 BOM 清单",
    production_orders: "已创建生产订单",
    procurement_complete: "所有采购已完成",
    inventory_records: "已登记库存",
  };

  const count = completion?.[field] || 0;

  switch (field) {
    case "style_no":
    case "name":
    case "category":
      return { ok: count > 0, label: FIELD_LABELS[field] || field, count };
    case "procurement_complete":
      return {
        ok: count > 0,
        label: `${FIELD_LABELS[field]}（已完成 ${count} 项）`,
        count,
      };
    default:
      return {
        ok: count > 0,
        label: `${FIELD_LABELS[field] || field}（${count} 项）`,
        count,
      };
  }
}
