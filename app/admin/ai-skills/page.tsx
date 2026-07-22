"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Wand2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Cpu,
  UserCircle,
  Layers,
} from "lucide-react";

interface AISkill {
  id: string;
  key: string;
  name: string;
  description: string | null;
  skill_type: string;
  process_node: string | null;
  entry_route: string | null;
  is_active: boolean;
  processRoleIds: string[];
  scopeIds: string[];
}

interface ProcessRole {
  id: string;
  key: string;
  name: string;
  process_node: string;
}

interface ProcessOwnerScope {
  id: string;
  key: string;
  name: string;
  process_nodes: string[];
}

const skillTypeOptions = [
  { value: "personal_assistant", label: "个人 AI 秘书" },
  { value: "process_master", label: "工序总管 AI" },
  { value: "execution", label: "执行环节 AI Skill" },
];

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

export default function AdminAISkillsPage() {
  const [skills, setSkills] = useState<AISkill[]>([]);
  const [processRoles, setProcessRoles] = useState<ProcessRole[]>([]);
  const [scopes, setScopes] = useState<ProcessOwnerScope[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<AISkill | null>(null);

  const [formKey, setFormKey] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSkillType, setFormSkillType] = useState("execution");
  const [formProcessNode, setFormProcessNode] = useState<string>("");
  const [formEntryRoute, setFormEntryRoute] = useState("");
  const [formProcessRoleIds, setFormProcessRoleIds] = useState<string[]>([]);
  const [formScopeIds, setFormScopeIds] = useState<string[]>([]);

  useEffect(() => {
    fetchSkills();
    fetchProcessRoles();
    fetchScopes();
  }, []);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-skills");
      const data = await res.json();
      if (Array.isArray(data)) {
        setSkills(data);
      }
    } catch (error) {
      console.error("Failed to fetch AI skills:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProcessRoles = async () => {
    try {
      const res = await fetch("/api/process-roles");
      const data = await res.json();
      if (Array.isArray(data)) {
        setProcessRoles(data);
      }
    } catch (error) {
      console.error("Failed to fetch process roles:", error);
    }
  };

  const fetchScopes = async () => {
    try {
      const res = await fetch("/api/process-owner-scopes");
      const data = await res.json();
      if (Array.isArray(data)) {
        setScopes(data);
      }
    } catch (error) {
      console.error("Failed to fetch process owner scopes:", error);
    }
  };

  const resetForm = () => {
    setFormKey("");
    setFormName("");
    setFormDescription("");
    setFormSkillType("execution");
    setFormProcessNode("");
    setFormEntryRoute("");
    setFormProcessRoleIds([]);
    setFormScopeIds([]);
  };

  const handleAdd = () => {
    setEditingSkill(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (skill: AISkill) => {
    setEditingSkill(skill);
    setFormKey(skill.key);
    setFormName(skill.name);
    setFormDescription(skill.description || "");
    setFormSkillType(skill.skill_type);
    setFormProcessNode(skill.process_node || "");
    setFormEntryRoute(skill.entry_route || "");
    setFormProcessRoleIds(skill.processRoleIds || []);
    setFormScopeIds(skill.scopeIds || []);
    setDialogOpen(true);
  };

  const toggleProcessRole = (roleId: string) => {
    setFormProcessRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const toggleScope = (scopeId: string) => {
    setFormScopeIds((prev) =>
      prev.includes(scopeId) ? prev.filter((id) => id !== scopeId) : [...prev, scopeId]
    );
  };

  const handleSave = async () => {
    if (!formKey.trim() || !formName.trim()) {
      alert("请填写标识和名称");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/ai-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSkill?.id,
          key: formKey.trim(),
          name: formName.trim(),
          description: formDescription.trim() || null,
          skill_type: formSkillType,
          process_node: formProcessNode || null,
          entry_route: formEntryRoute.trim() || null,
          processRoleIds: formProcessRoleIds,
          scopeIds: formScopeIds,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        resetForm();
        await fetchSkills();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "保存失败");
      }
    } catch (error) {
      console.error("Failed to save AI skill:", error);
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (skill: AISkill) => {
    if (!confirm(`确定要停用「${skill.name}」吗？`)) return;
    try {
      const res = await fetch(`/api/ai-skills?id=${skill.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchSkills();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "删除失败");
      }
    } catch (error) {
      console.error("Failed to delete AI skill:", error);
      alert("删除失败");
    }
  };

  const getTypeLabel = (type: string) =>
    skillTypeOptions.find((o) => o.value === type)?.label || type;

  const getNodeLabel = (node: string | null) =>
    processNodeOptions.find((o) => o.value === node)?.label || node;

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[2400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl gradient-navy flex items-center justify-center shadow-premium">
                <Wand2 className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">AI Skill 管理</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-13">
              配置 AI 智能体、工序总管和个人秘书，并绑定到角色与主管类型
            </p>
          </div>
          <Button onClick={handleAdd} className="bg-navy-700 hover:bg-navy-800 text-white">
            <Plus className="h-4 w-4 mr-2" />
            新增 AI Skill
          </Button>
        </div>

        <Card className="card-premium">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2 section-title !before:hidden">
              <Cpu className="h-4 w-4 text-navy-700" />
              Skill 列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-20 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                加载中...
              </div>
            ) : skills.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                暂无 AI Skill，点击右上角新增
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-3 px-4 font-medium">标识</th>
                      <th className="py-3 px-4 font-medium">名称</th>
                      <th className="py-3 px-4 font-medium">类型</th>
                      <th className="py-3 px-4 font-medium">工序</th>
                      <th className="py-3 px-4 font-medium">绑定角色</th>
                      <th className="py-3 px-4 font-medium">绑定主管类型</th>
                      <th className="py-3 px-4 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skills.map((skill) => (
                      <tr
                        key={skill.id}
                        className="border-b border-border/50 hover:bg-sand-50/50 transition-colors"
                      >
                        <td className="py-4 px-4 font-mono text-xs text-muted-foreground">
                          {skill.key}
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium">{skill.name}</p>
                            {skill.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 max-w-[240px]">
                                {skill.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="secondary" className="text-xs font-normal">
                            {getTypeLabel(skill.skill_type)}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          {skill.process_node ? (
                            <Badge variant="outline" className="text-xs font-normal">
                              {getNodeLabel(skill.process_node)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {skill.processRoleIds.length === 0 ? (
                              <span className="text-xs text-muted-foreground">未绑定</span>
                            ) : (
                              skill.processRoleIds.map((rid) => (
                                <Badge key={rid} variant="outline" className="text-[10px] font-normal">
                                  {processRoles.find((r) => r.id === rid)?.name || rid.slice(0, 6)}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {skill.scopeIds.length === 0 ? (
                              <span className="text-xs text-muted-foreground">未绑定</span>
                            ) : (
                              skill.scopeIds.map((sid) => (
                                <Badge key={sid} variant="outline" className="text-[10px] font-normal">
                                  {scopes.find((s) => s.id === sid)?.name || sid.slice(0, 6)}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(skill)}>
                              <Pencil className="h-3.5 w-3.5 mr-1.5" />
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/5"
                              onClick={() => handleDelete(skill)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              停用
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 新增/编辑对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSkill ? "编辑 AI Skill" : "新增 AI Skill"}</DialogTitle>
              <DialogDescription>
                配置 AI Skill 基础信息并绑定到角色或主管类型
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="skill-key">标识 key</Label>
                  <Input
                    id="skill-key"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    placeholder="如：theme-planner"
                    disabled={!!editingSkill}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skill-name">名称</Label>
                  <Input
                    id="skill-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="如：主题企划智能体"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skill-description">描述</Label>
                <Input
                  id="skill-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="说明该 Skill 的职责和产出"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Skill 类型</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {skillTypeOptions.map((type) => {
                      const Icon = type.value === "personal_assistant" ? UserCircle : type.value === "process_master" ? Layers : Cpu;
                      const selected = formSkillType === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormSkillType(type.value)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                            selected
                              ? "border-navy-300 bg-navy-50 text-navy-800"
                              : "border-border bg-card hover:bg-sand-50"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>所属工序节点</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {processNodeOptions.map((node) => {
                      const selected = formProcessNode === node.value;
                      return (
                        <button
                          key={node.value}
                          type="button"
                          onClick={() => setFormProcessNode(node.value)}
                          className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                            selected
                              ? "border-navy-300 bg-navy-50 text-navy-800"
                              : "border-border bg-card hover:bg-sand-50"
                          }`}
                        >
                          {node.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skill-entry-route">入口路由</Label>
                <Input
                  id="skill-entry-route"
                  value={formEntryRoute}
                  onChange={(e) => setFormEntryRoute(e.target.value)}
                  placeholder="如：/planning/ai/theme 或 /ai-review"
                />
                <p className="text-xs text-muted-foreground">
                  用户点击 Skill 后将跳转至此页面
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  绑定工序角色
                </Label>
                <div className="flex flex-wrap gap-2">
                  {processRoles.map((role) => {
                    const selected = formProcessRoleIds.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleProcessRole(role.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                          selected
                            ? "bg-navy-700 text-white border-navy-700"
                            : "bg-card border-border text-muted-foreground hover:bg-sand-50"
                        }`}
                      >
                        {selected ? "✓ " : ""}
                        {role.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  绑定主管类型
                </Label>
                <div className="flex flex-wrap gap-2">
                  {scopes.map((scope) => {
                    const selected = formScopeIds.includes(scope.id);
                    return (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() => toggleScope(scope.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                          selected
                            ? "bg-navy-700 text-white border-navy-700"
                            : "bg-card border-border text-muted-foreground hover:bg-sand-50"
                        }`}
                      >
                        {selected ? "✓ " : ""}
                        {scope.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-navy-700 hover:bg-navy-800 text-white"
              >
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarLayout>
  );
}
