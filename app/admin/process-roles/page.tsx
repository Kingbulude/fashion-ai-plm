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
  Cpu,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Shield,
} from "lucide-react";

interface ProcessRole {
  id: string;
  key: string;
  name: string;
  description: string | null;
  process_node: string;
  route_permissions: Record<string, string[]>;
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

const routeOptions = [
  { value: "/planning", label: "企划中心" },
  { value: "/design", label: "设计资产" },
  { value: "/styles", label: "款式管理" },
  { value: "/ai-review", label: "AI审核中心" },
  { value: "/suppliers", label: "供应商" },
  { value: "/production", label: "生产管理" },
  { value: "/sales", label: "销售" },
  { value: "/aftersales", label: "售后" },
  { value: "/analytics", label: "经营反馈" },
];

export default function AdminProcessRolesPage() {
  const [roles, setRoles] = useState<ProcessRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ProcessRole | null>(null);

  const [formKey, setFormKey] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formNode, setFormNode] = useState("planning");
  const [formRoutes, setFormRoutes] = useState<string[]>([]);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/process-roles");
      const data = await res.json();
      if (Array.isArray(data)) {
        setRoles(data);
      }
    } catch (error) {
      console.error("Failed to fetch process roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormKey("");
    setFormName("");
    setFormDescription("");
    setFormNode("planning");
    setFormRoutes([]);
  };

  const handleAdd = () => {
    setEditingRole(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (role: ProcessRole) => {
    setEditingRole(role);
    setFormKey(role.key);
    setFormName(role.name);
    setFormDescription(role.description || "");
    setFormNode(role.process_node);
    setFormRoutes(Object.keys(role.route_permissions || {}));
    setDialogOpen(true);
  };

  const toggleRoute = (route: string) => {
    setFormRoutes((prev) =>
      prev.includes(route) ? prev.filter((r) => r !== route) : [...prev, route]
    );
  };

  const handleSave = async () => {
    if (!formKey.trim() || !formName.trim() || !formNode) {
      alert("请填写完整信息");
      return;
    }

    const routePermissions: Record<string, string[]> = {};
    formRoutes.forEach((route) => {
      routePermissions[route] = ["view", "edit"];
    });

    setSaving(true);
    try {
      const res = await fetch("/api/process-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRole?.id,
          key: formKey.trim(),
          name: formName.trim(),
          description: formDescription.trim() || null,
          process_node: formNode,
          route_permissions: routePermissions,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        resetForm();
        await fetchRoles();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "保存失败");
      }
    } catch (error) {
      console.error("Failed to save process role:", error);
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: ProcessRole) => {
    if (!confirm(`确定要删除角色「${role.name}」吗？`)) return;
    try {
      const res = await fetch(`/api/process-roles?id=${role.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchRoles();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "删除失败");
      }
    } catch (error) {
      console.error("Failed to delete process role:", error);
      alert("删除失败");
    }
  };

  return (
    <SidebarLayout>
      <AdminPageContainer>
        <AdminPageHeader
          title="工序角色管理"
          description="配置横向执行角色（企划师、设计师、采购师等）及其可访问页面"
          icon={Cpu}
          backHref="/admin"
          backLabel="返回后台配置"
          action={
            <Button onClick={handleAdd} className="bg-navy-700 hover:bg-navy-800 text-white">
              <Plus className="h-4 w-4 mr-2" />
              新增角色
            </Button>
          }
        />

        <AdminSectionCard title="角色列表" titleIcon={Shield}>
          {loading ? (
              <div className="py-20 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                加载中...
              </div>
            ) : roles.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                暂无工序角色，点击右上角新增
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-3 px-4 font-medium">标识</th>
                      <th className="py-3 px-4 font-medium">名称</th>
                      <th className="py-3 px-4 font-medium">工序节点</th>
                      <th className="py-3 px-4 font-medium">可访问页面</th>
                      <th className="py-3 px-4 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr
                        key={role.id}
                        className="border-b border-border/50 hover:bg-sand-50/50 transition-colors"
                      >
                        <td className="py-4 px-4 font-mono text-xs text-muted-foreground">
                          {role.key}
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium">{role.name}</p>
                            {role.description && (
                              <p className="text-xs text-muted-foreground">{role.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="secondary">
                            {processNodeOptions.find((n) => n.value === role.process_node)?.label || role.process_node}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {Object.keys(role.route_permissions || {}).length === 0 ? (
                              <span className="text-xs text-muted-foreground">无</span>
                            ) : (
                              Object.keys(role.route_permissions).map((route) => (
                                <Badge key={route} variant="outline" className="text-xs font-normal">
                                  {routeOptions.find((r) => r.value === route)?.label || route}
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
                              onClick={() => handleEdit(role)}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1.5" />
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/5"
                              onClick={() => handleDelete(role)}
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
              <DialogTitle>{editingRole ? "编辑工序角色" : "新增工序角色"}</DialogTitle>
              <DialogDescription>
                配置角色标识、名称、所属工序节点和可访问页面
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role-key">标识 key</Label>
                  <Input
                    id="role-key"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    placeholder="如：designer"
                    disabled={!!editingRole}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-name">名称</Label>
                  <Input
                    id="role-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="如：设计师"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-description">描述</Label>
                <Input
                  id="role-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="简要说明该角色职责"
                />
              </div>

              <div className="space-y-2">
                <Label>所属工序节点</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {processNodeOptions.map((node) => (
                    <button
                      key={node.value}
                      type="button"
                      onClick={() => setFormNode(node.value)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        formNode === node.value
                          ? "border-navy-300 bg-navy-50 text-navy-800"
                          : "border-border bg-card hover:bg-sand-50"
                      }`}
                    >
                      {node.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>可访问页面</Label>
                <div className="flex flex-wrap gap-2">
                  {routeOptions.map((route) => {
                    const selected = formRoutes.includes(route.value);
                    return (
                      <button
                        key={route.value}
                        type="button"
                        onClick={() => toggleRoute(route.value)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                          selected
                            ? "bg-navy-700 text-white border-navy-700"
                            : "bg-card border-border text-muted-foreground hover:bg-sand-50"
                        }`}
                      >
                        {selected ? "✓ " : ""}
                        {route.label}
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
