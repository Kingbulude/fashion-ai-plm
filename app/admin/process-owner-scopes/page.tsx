"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { AdminPageContainer, AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Shield,
} from "lucide-react";

interface ProcessOwnerScope {
  id: string;
  key: string;
  name: string;
  description: string | null;
  process_nodes: string[];
  is_active: boolean;
}

const processNodeOptions = [
  { value: "planning", label: "企划" },
  { value: "design", label: "设计" },
  { value: "sampling", label: "打样" },
  { value: "testing", label: "测款" },
  { value: "procurement", label: "采购" },
  { value: "stocking", label: "备货/生产" },
  { value: "sales", label: "销售" },
  { value: "aftersales", label: "售后" },
];

export default function AdminProcessOwnerScopesPage() {
  const [scopes, setScopes] = useState<ProcessOwnerScope[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScope, setEditingScope] = useState<ProcessOwnerScope | null>(null);

  const [formKey, setFormKey] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formNodes, setFormNodes] = useState<string[]>([]);

  useEffect(() => {
    fetchScopes();
  }, []);

  const fetchScopes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/process-owner-scopes");
      const data = await res.json();
      if (Array.isArray(data)) {
        setScopes(data);
      }
    } catch (error) {
      console.error("Failed to fetch process owner scopes:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormKey("");
    setFormName("");
    setFormDescription("");
    setFormNodes([]);
  };

  const handleAdd = () => {
    setEditingScope(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (scope: ProcessOwnerScope) => {
    setEditingScope(scope);
    setFormKey(scope.key);
    setFormName(scope.name);
    setFormDescription(scope.description || "");
    setFormNodes(scope.process_nodes || []);
    setDialogOpen(true);
  };

  const toggleNode = (node: string) => {
    setFormNodes((prev) =>
      prev.includes(node) ? prev.filter((n) => n !== node) : [...prev, node]
    );
  };

  const handleSave = async () => {
    if (!formKey.trim() || !formName.trim() || formNodes.length === 0) {
      alert("请填写完整信息并至少选择一个工序节点");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/process-owner-scopes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingScope?.id,
          key: formKey.trim(),
          name: formName.trim(),
          description: formDescription.trim() || null,
          process_nodes: formNodes,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        resetForm();
        await fetchScopes();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "保存失败");
      }
    } catch (error) {
      console.error("Failed to save process owner scope:", error);
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (scope: ProcessOwnerScope) => {
    if (!confirm(`确定要删除主管类型「${scope.name}」吗？`)) return;
    try {
      const res = await fetch(`/api/process-owner-scopes?id=${scope.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchScopes();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "删除失败");
      }
    } catch (error) {
      console.error("Failed to delete process owner scope:", error);
      alert("删除失败");
    }
  };

  return (
    <SidebarLayout>
      <AdminPageContainer>
        <AdminPageHeader
          title="工序主管类型"
          description="配置工序段主管（设计主管、产品主管、运营主管、售后主管）及其负责的工序范围"
          icon={Layers}
          backHref="/admin"
          backLabel="返回后台配置"
          action={
            <Button onClick={handleAdd} className="bg-navy-700 hover:bg-navy-800 text-white">
              <Plus className="h-4 w-4 mr-2" />
              新增主管类型
            </Button>
          }
        />

        <AdminSectionCard title="主管类型列表" titleIcon={Shield}>
          {loading ? (
              <div className="py-20 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                加载中...
              </div>
            ) : scopes.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                暂无主管类型，点击右上角新增
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-3 px-4 font-medium">标识</th>
                      <th className="py-3 px-4 font-medium">名称</th>
                      <th className="py-3 px-4 font-medium">负责工序段</th>
                      <th className="py-3 px-4 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scopes.map((scope) => (
                      <tr
                        key={scope.id}
                        className="border-b border-border/50 hover:bg-sand-50/50 transition-colors"
                      >
                        <td className="py-4 px-4 font-mono text-xs text-muted-foreground">
                          {scope.key}
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium">{scope.name}</p>
                            {scope.description && (
                              <p className="text-xs text-muted-foreground">{scope.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {(scope.process_nodes || []).length === 0 ? (
                              <span className="text-xs text-muted-foreground">未配置</span>
                            ) : (
                              scope.process_nodes.map((node) => (
                                <Badge key={node} variant="secondary" className="text-xs font-normal">
                                  {processNodeOptions.find((n) => n.value === node)?.label || node}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(scope)}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1.5" />
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/5"
                              onClick={() => handleDelete(scope)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              删除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSectionCard>

        {/* 新增/编辑对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingScope ? "编辑主管类型" : "新增主管类型"}</DialogTitle>
              <DialogDescription>
                配置主管类型标识、名称和负责的工序段范围
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scope-key">标识 key</Label>
                  <Input
                    id="scope-key"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    placeholder="如：design_lead"
                    disabled={!!editingScope}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scope-name">名称</Label>
                  <Input
                    id="scope-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="如：设计主管"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope-description">描述</Label>
                <Input
                  id="scope-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="简要说明该主管类型负责的工序段"
                />
              </div>

              <div className="space-y-2">
                <Label>负责工序段（多选）</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {processNodeOptions.map((node) => {
                    const selected = formNodes.includes(node.value);
                    return (
                      <button
                        key={node.value}
                        type="button"
                        onClick={() => toggleNode(node.value)}
                        className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                          selected
                            ? "border-navy-300 bg-navy-50 text-navy-800"
                            : "border-border bg-card hover:bg-sand-50"
                        }`}
                      >
                        {selected ? "✓ " : ""}
                        {node.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-navy-700 hover:bg-navy-800 text-white">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminPageContainer>
    </SidebarLayout>
  );
}
