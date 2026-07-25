"use client";

// 工作台共享模块组件
// 提供可复用的 KPI 卡片、待办列表、款式列表等组件

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Box,
  Loader2,
  Check,
  TrendingUp,
  ListTodo,
  ShieldAlert,
  ChevronRight,
  Sparkles,
} from "lucide-react";

// KPI 卡片颜色配置
const KPI_COLOR_MAP: Record<
  string,
  { iconBg: string; iconText: string; ring: string }
> = {
  navy: {
    iconBg: "bg-navy-100",
    iconText: "text-navy-600",
    ring: "ring-navy-200 bg-navy-50/40",
  },
  terracotta: {
    iconBg: "bg-terracotta-100",
    iconText: "text-terracotta-600",
    ring: "ring-terracotta-200 bg-terracotta-50/40",
  },
  red: {
    iconBg: "bg-red-50",
    iconText: "text-red-600",
    ring: "ring-red-200 bg-red-50/40",
  },
  green: {
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
    ring: "ring-emerald-200 bg-emerald-50/40",
  },
  blue: {
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    ring: "ring-blue-200 bg-blue-50/40",
  },
  amber: {
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    ring: "ring-amber-200 bg-amber-50/40",
  },
  purple: {
    iconBg: "bg-purple-50",
    iconText: "text-purple-600",
    ring: "ring-purple-200 bg-purple-50/40",
  },
};

// KPI 卡片
export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  href,
  highlight,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: any;
  color: keyof typeof KPI_COLOR_MAP;
  href?: string;
  highlight?: boolean;
}) {
  const c = KPI_COLOR_MAP[color] || KPI_COLOR_MAP.navy;

  const content = (
    <Card
      className={`card-premium transition-all ${
        highlight ? `ring-2 ${c.ring}` : ""
      } ${href ? "hover:shadow-lg cursor-pointer" : ""}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${c.iconBg}`}>
            <Icon className={`h-5 w-5 ${c.iconText}`} />
          </div>
          <p className="data-value">{value}</p>
        </div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

// 待办列表卡片
export function TodoListCard({
  title,
  todos,
  onComplete,
  completingId,
  href,
  emptyText = "暂无待办",
}: {
  title: string;
  todos: any[];
  onComplete?: (id: string) => void;
  completingId?: string | null;
  href?: string;
  emptyText?: string;
}) {
  return (
    <Card className="card-premium">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-terracotta-500" />
            {title}
            {todos.length > 0 && (
              <Badge className="ml-1 bg-terracotta-100 text-terracotta-600">
                {todos.length}
              </Badge>
            )}
          </CardTitle>
          {href && (
            <Button variant="outline" size="sm" asChild>
              <Link href={href}>查看全部</Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {todos.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{emptyText}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todos.slice(0, 8).map((todo: any) => {
              const isOverdue =
                todo.dueDate &&
                new Date(todo.dueDate) < new Date();
              return (
                <div
                  key={todo.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isOverdue
                      ? "border-destructive/20 bg-destructive/5"
                      : "border-border hover:bg-sand-50"
                  }`}
                >
                  {onComplete && (
                    <button
                      onClick={() => onComplete(todo.id)}
                      disabled={completingId === todo.id}
                      className="flex-shrink-0 h-5 w-5 rounded-md border-2 border-border hover:border-emerald-500 transition-colors flex items-center justify-center"
                    >
                      {completingId === todo.id ? (
                        <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                      ) : (
                        <Check className="h-3 w-3 text-transparent" />
                      )}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {todo.title}
                    </p>
                    {todo.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {todo.description}
                      </p>
                    )}
                    {todo.dueDate && (
                      <p
                        className={`text-xs mt-0.5 flex items-center gap-0.5 ${
                          isOverdue
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {new Date(todo.dueDate).toLocaleDateString("zh-CN", {
                          month: "numeric",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 款式列表卡片
export function StyleListCard({
  title,
  styles,
  href,
  emptyText = "暂无款式",
}: {
  title: string;
  styles: any[];
  href?: string;
  emptyText?: string;
}) {
  return (
    <Card className="card-premium">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-navy-500" />
            {title}
          </CardTitle>
          {href && (
            <Button variant="outline" size="sm" asChild>
              <Link href={href}>查看全部</Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {styles.length === 0 ? (
          <div className="py-10 text-center">
            <Box className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{emptyText}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {styles.slice(0, 6).map((style: any) => (
              <Link
                key={style.id}
                href={`/styles/${style.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-terracotta-200 hover:shadow-sm transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {style.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {style.styleNo}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-terracotta-500 transition-all" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// AI 工具网格
export function AIToolsGrid({
  skills,
  emptyText = "暂无可用 AI 工具",
}: {
  skills: any[];
  emptyText?: string;
}) {
  if (!skills || skills.length === 0) {
    return (
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-navy-500" />
            AI 工具
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">{emptyText}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-premium">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-navy-500" />
          AI 工具
        </CardTitle>
        <CardDescription className="text-xs">
          根据当前角色自动分配的 AI 智能体
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {skills.map((skill: any) => (
            <Link
              key={skill.id}
              href={skill.entry_route || "#"}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-navy-200 hover:shadow-md transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-navy-100 text-navy-600 group-hover:bg-navy-200 transition-colors flex-shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {skill.name}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {skill.description || "AI 智能体"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 风险预警卡片
export function RiskAlertCard({ risks }: { risks: any[] }) {
  if (risks.length === 0) return null;

  const RISK_LEVEL_CONFIG: Record<
    string,
    { label: string; className: string; icon: any }
  > = {
    urgent: {
      label: "紧急",
      className: "bg-red-50 text-red-700 border-red-200",
      icon: ShieldAlert,
    },
    high: {
      label: "高",
      className: "bg-orange-50 text-orange-700 border-orange-200",
      icon: ShieldAlert,
    },
    medium: {
      label: "中",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      icon: ChevronRight,
    },
    low: {
      label: "低",
      className: "bg-sand-100 text-slate-700 border-sand-200",
      icon: ChevronRight,
    },
  };

  return (
    <Card className="card-premium border-terracotta-200 bg-gradient-to-br from-terracotta-50/50 to-orange-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-terracotta-500" />
            风险预警
            <Badge className="ml-1 bg-terracotta-500 text-white hover:bg-terracotta-600">
              {risks.length}
            </Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            实时检测 · 需要关注
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {risks.slice(0, 4).map((risk: any, i: number) => {
            const config = RISK_LEVEL_CONFIG[risk.level] || RISK_LEVEL_CONFIG.low;
            const Icon = config.icon;
            return (
              <Link
                key={i}
                href={risk.styleId ? `/styles/${risk.styleId}` : "#"}
                className={`flex items-center gap-3 p-3 rounded-xl border ${config.className} hover:shadow-md transition-all`}
              >
                <div className="p-1.5 rounded-lg bg-white/60">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">
                      {risk.title}
                    </p>
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 border-current/30 flex-shrink-0"
                    >
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground/70 mt-0.5 truncate">
                    {risk.message}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 opacity-50 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
        {risks.length > 4 && (
          <div className="text-center pt-3 mt-1 border-t border-terracotta-100">
            <Button variant="link" size="sm" asChild>
              <Link href="/todos">查看全部 {risks.length} 个风险</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
