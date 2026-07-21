// 供应商详情页 - 评估体系 + 合作记录

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Star,
  Truck,
  DollarSign,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  Package,
  Edit,
  Loader2,
} from "lucide-react";

const SUPPLIER_TYPES: Record<string, { label: string; color: string }> = {
  fabric: { label: "面料供应商", color: "bg-blue-50 text-blue-700" },
  accessory: { label: "辅料供应商", color: "bg-amber-50 text-amber-700" },
  factory: { label: "加工厂", color: "bg-green-50 text-green-700" },
  printing: { label: "印花/刺绣", color: "bg-purple-50 text-purple-700" },
  dyeing: { label: "染厂", color: "bg-pink-50 text-pink-700" },
  other: { label: "其他", color: "bg-slate-50 text-slate-700" },
};

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchSupplier();
    fetchHistory();
  }, [id]);

  const fetchSupplier = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${id}`);
      if (!res.ok) throw new Error("获取供应商失败");
      const data = await res.json();
      setSupplier(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/suppliers/${id}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      }
    } catch {}
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="py-20 text-center text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          加载供应商信息...
        </div>
      </SidebarLayout>
    );
  }

  if (error || !supplier) {
    return (
      <SidebarLayout>
        <div className="p-6">
          <Button variant="ghost" onClick={() => router.push("/suppliers")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700">{error || "供应商不存在"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    );
  }

  const type = SUPPLIER_TYPES[supplier.type] || SUPPLIER_TYPES.other;

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[1200px] mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold">{supplier.name}</h1>
              <Badge className={`${type.color}`}>{type.label}</Badge>
            </div>
            <p className="text-sm text-slate-500">供应商详情与合作记录</p>
          </div>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            编辑
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：基本信息 + 评估 */}
          <div className="lg:col-span-1 space-y-4">
            {/* 基本信息 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">基本信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{supplier.name}</p>
                    <p className="text-xs text-slate-500">{type.label}</p>
                  </div>
                </div>

                {supplier.contact && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">联系人</p>
                      <p className="text-sm font-medium text-slate-800">{supplier.contact}</p>
                    </div>
                  </div>
                )}

                {supplier.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">联系电话</p>
                      <p className="text-sm font-medium text-slate-800">{supplier.phone}</p>
                    </div>
                  </div>
                )}

                {supplier.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">邮箱</p>
                      <p className="text-sm font-medium text-slate-800">{supplier.email}</p>
                    </div>
                  </div>
                )}

                {supplier.capabilities && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-slate-500 mb-1">能力说明</p>
                    <p className="text-sm text-slate-700">{supplier.capabilities}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 评估指标 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">供应商评估</CardTitle>
                <CardDescription className="text-xs">品质、交期、价格三维评估</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <EvaluationBar label="品质评分" value={supplier.qualityScore || 0} icon={Star} color="amber" />
                <EvaluationBar label="交期评分" value={supplier.deliveryScore || 0} icon={Truck} color="blue" />
                <EvaluationBar label="价格等级" value={supplier.priceLevel ? (supplier.priceLevel === "low" ? 3 : supplier.priceLevel === "medium" ? 2 : 1) : 0} icon={DollarSign} color="green" isLevel />
              </CardContent>
            </Card>
          </div>

          {/* 右侧：合作记录 */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">合作记录</CardTitle>
                <CardDescription className="text-xs">与该供应商的采购、生产合作历史</CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-500">暂无合作记录</p>
                    <p className="text-sm text-slate-400 mt-1">在采购或生产流程中选择该供应商后会自动记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300">
                        <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${item.type === "success" ? "bg-green-50" : item.type === "warning" ? "bg-amber-50" : "bg-slate-50"}`}>
                          {item.type === "success" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : item.type === "warning" ? (
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                          ) : (
                            <Package className="h-4 w-4 text-slate-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-800 text-sm">{item.title}</span>
                            {item.styleName && (
                              <Badge variant="outline" className="text-[10px]">
                                {item.styleName}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{item.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {item.date}
                            </span>
                            {item.amount && (
                              <span className="font-medium text-slate-700">¥{item.amount}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

// 评估条形图
function EvaluationBar({
  label,
  value,
  icon: Icon,
  color,
  isLevel = false,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
  isLevel?: boolean;
}) {
  const colorMap = {
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    green: "bg-green-500",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 text-${color}-500`} />
          <span className="text-xs text-slate-600">{label}</span>
        </div>
        <span className="text-xs font-semibold text-slate-800">
          {isLevel ? (value === 3 ? "低" : value === 2 ? "中" : "高") : `${value}分`}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorMap[color as keyof typeof colorMap]} rounded-full transition-all`}
          style={{ width: `${isLevel ? (value / 3) * 100 : value}%` }}
        />
      </div>
    </div>
  );
}
