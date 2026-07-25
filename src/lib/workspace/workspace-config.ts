// 岗位差异化工作台模块配置
// 定义每个工序岗位看到哪些工作台模块

// 工作台模块类型
export type WorkspaceModuleType =
  | "kpi"        // KPI卡片
  | "todo"       // 待办列表
  | "pipeline"   // 流水线
  | "risk"       // 风险预警
  | "recent"     // 最近款式
  | "ai"         // AI工具
  | "custom";    // 自定义组件

// 工作台模块定义
export interface WorkspaceModule {
  id: string;
  type: WorkspaceModuleType;
  title: string;
  // 该模块适用的工序节点列表，["*"] 表示所有工序
  processNodes: string[];
  // 该模块适用的角色层级
  roles: string[];
  // 数据过滤：款式状态过滤
  styleStatusFilter?: string[];
  // 待办类型过滤
  todoTypeFilter?: string[];
  // 风险类型过滤
  riskTypeFilter?: string[];
}

// 每个工序岗位的工作台配置
export interface WorkspaceConfig {
  // 顶部KPI卡片（最多4个）
  kpiModules: WorkspaceModule[];
  // 主内容区模块（左列）
  leftModules: WorkspaceModule[];
  // 主内容区模块（右列）
  rightModules: WorkspaceModule[];
  // 底部模块
  bottomModules: WorkspaceModule[];
}

// 管理层工作台配置（BOSS/ADMIN/BRAND_MANAGER）
export const MANAGER_WORKSPACE: WorkspaceConfig = {
  kpiModules: [
    { id: "style-overview", type: "kpi", title: "款式概览", processNodes: ["*"], roles: ["boss", "admin", "brand_manager"] },
    { id: "pending-todos", type: "kpi", title: "待办事项", processNodes: ["*"], roles: ["boss", "admin", "brand_manager"] },
    { id: "high-risk", type: "kpi", title: "高风险", processNodes: ["*"], roles: ["boss", "admin", "brand_manager"] },
  ],
  leftModules: [
    { id: "today-todos", type: "todo", title: "今日待办", processNodes: ["*"], roles: ["boss", "admin", "brand_manager"] },
  ],
  rightModules: [
    { id: "full-pipeline", type: "pipeline", title: "款式流水线", processNodes: ["*"], roles: ["boss", "admin", "brand_manager"] },
  ],
  bottomModules: [
    { id: "recent-styles", type: "recent", title: "最近款式", processNodes: ["*"], roles: ["boss", "admin", "brand_manager"] },
    { id: "ai-tools", type: "ai", title: "AI 工具", processNodes: ["*"], roles: ["boss", "admin", "brand_manager"] },
  ],
};

// 设计岗位工作台
export const DESIGN_WORKSPACE: WorkspaceConfig = {
  kpiModules: [
    { id: "design-pending", type: "kpi", title: "待设计", processNodes: ["design"], roles: ["executor", "process_owner"], styleStatusFilter: ["planning", "designing"] },
    { id: "design-done", type: "kpi", title: "设计完成", processNodes: ["design"], roles: ["executor", "process_owner"], styleStatusFilter: ["designed", "sampling"] },
    { id: "design-revision", type: "kpi", title: "待修改", processNodes: ["design"], roles: ["executor", "process_owner"], todoTypeFilter: ["design_revision"] },
  ],
  leftModules: [
    { id: "design-tasks", type: "todo", title: "我的设计任务", processNodes: ["design"], roles: ["executor", "process_owner"], todoTypeFilter: ["design", "design_revision"] },
  ],
  rightModules: [
    { id: "design-styles", type: "recent", title: "我负责的款式", processNodes: ["design"], roles: ["executor", "process_owner"], styleStatusFilter: ["planning", "designing", "designed"] },
  ],
  bottomModules: [
    { id: "ai-tools", type: "ai", title: "设计 AI 工具", processNodes: ["design"], roles: ["executor", "process_owner"] },
  ],
};

// 打样岗位工作台
export const SAMPLING_WORKSPACE: WorkspaceConfig = {
  kpiModules: [
    { id: "sampling-pending", type: "kpi", title: "待打样", processNodes: ["sampling"], roles: ["executor", "process_owner"], styleStatusFilter: ["designed", "sampling"] },
    { id: "sampling-done", type: "kpi", title: "封样完成", processNodes: ["sampling"], roles: ["executor", "process_owner"], styleStatusFilter: ["sampled"] },
    { id: "sampling-overdue", type: "kpi", title: "打样超时", processNodes: ["sampling"], roles: ["executor", "process_owner"], riskTypeFilter: ["sampling_overdue"] },
  ],
  leftModules: [
    { id: "sampling-tasks", type: "todo", title: "打样任务", processNodes: ["sampling"], roles: ["executor", "process_owner"], todoTypeFilter: ["sampling"] },
  ],
  rightModules: [
    { id: "sampling-styles", type: "recent", title: "打样中款式", processNodes: ["sampling"], roles: ["executor", "process_owner"], styleStatusFilter: ["designed", "sampling", "sampled"] },
  ],
  bottomModules: [
    { id: "ai-tools", type: "ai", title: "打样 AI 工具", processNodes: ["sampling"], roles: ["executor", "process_owner"] },
  ],
};

// 采购岗位工作台
export const PROCUREMENT_WORKSPACE: WorkspaceConfig = {
  kpiModules: [
    { id: "procurement-pending", type: "kpi", title: "待采购", processNodes: ["procurement"], roles: ["executor", "process_owner"], styleStatusFilter: ["sampled", "producing"] },
    { id: "procurement-done", type: "kpi", title: "采购完成", processNodes: ["procurement"], roles: ["executor", "process_owner"] },
    { id: "procurement-overdue", type: "kpi", title: "采购逾期", processNodes: ["procurement"], roles: ["executor", "process_owner"], riskTypeFilter: ["procurement_overdue"] },
  ],
  leftModules: [
    { id: "procurement-tasks", type: "todo", title: "采购任务", processNodes: ["procurement"], roles: ["executor", "process_owner"], todoTypeFilter: ["procurement"] },
  ],
  rightModules: [
    { id: "procurement-styles", type: "recent", title: "采购中款式", processNodes: ["procurement"], roles: ["executor", "process_owner"], styleStatusFilter: ["sampled", "producing"] },
  ],
  bottomModules: [
    { id: "ai-tools", type: "ai", title: "采购 AI 工具", processNodes: ["procurement"], roles: ["executor", "process_owner"] },
  ],
};

// 生产岗位工作台
export const PRODUCTION_WORKSPACE: WorkspaceConfig = {
  kpiModules: [
    { id: "production-pending", type: "kpi", title: "待生产", processNodes: ["stocking"], roles: ["executor", "process_owner"], styleStatusFilter: ["sampled", "producing"] },
    { id: "production-done", type: "kpi", title: "生产完成", processNodes: ["stocking"], roles: ["executor", "process_owner"], styleStatusFilter: ["produced"] },
    { id: "production-risk", type: "kpi", title: "生产风险", processNodes: ["stocking"], roles: ["executor", "process_owner"], riskTypeFilter: ["production_delay"] },
  ],
  leftModules: [
    { id: "production-tasks", type: "todo", title: "生产任务", processNodes: ["stocking"], roles: ["executor", "process_owner"], todoTypeFilter: ["production"] },
  ],
  rightModules: [
    { id: "production-styles", type: "recent", title: "生产中款式", processNodes: ["stocking"], roles: ["executor", "process_owner"], styleStatusFilter: ["producing", "produced"] },
  ],
  bottomModules: [
    { id: "ai-tools", type: "ai", title: "生产 AI 工具", processNodes: ["stocking"], roles: ["executor", "process_owner"] },
  ],
};

// 销售岗位工作台
export const SALES_WORKSPACE: WorkspaceConfig = {
  kpiModules: [
    { id: "sales-active", type: "kpi", title: "在售款式", processNodes: ["sales"], roles: ["executor", "process_owner"], styleStatusFilter: ["selling", "sold"] },
    { id: "sales-revenue", type: "kpi", title: "本周销售", processNodes: ["sales"], roles: ["executor", "process_owner"] },
    { id: "inventory-alert", type: "kpi", title: "库存预警", processNodes: ["sales"], roles: ["executor", "process_owner"], riskTypeFilter: ["inventory_low"] },
  ],
  leftModules: [
    { id: "sales-tasks", type: "todo", title: "销售任务", processNodes: ["sales"], roles: ["executor", "process_owner"], todoTypeFilter: ["sales", "listing"] },
  ],
  rightModules: [
    { id: "sales-styles", type: "recent", title: "在售款式", processNodes: ["sales"], roles: ["executor", "process_owner"], styleStatusFilter: ["selling", "sold"] },
  ],
  bottomModules: [
    { id: "ai-tools", type: "ai", title: "销售 AI 工具", processNodes: ["sales"], roles: ["executor", "process_owner"] },
  ],
};

// 售后岗位工作台
export const AFTERSALES_WORKSPACE: WorkspaceConfig = {
  kpiModules: [
    { id: "aftersales-pending", type: "kpi", title: "待处理售后", processNodes: ["aftersales"], roles: ["executor", "process_owner"], todoTypeFilter: ["aftersales"] },
    { id: "aftersales-return-rate", type: "kpi", title: "退货率", processNodes: ["aftersales"], roles: ["executor", "process_owner"] },
    { id: "aftersales-quality", type: "kpi", title: "质量投诉", processNodes: ["aftersales"], roles: ["executor", "process_owner"], riskTypeFilter: ["quality_complaint"] },
  ],
  leftModules: [
    { id: "aftersales-tasks", type: "todo", title: "售后任务", processNodes: ["aftersales"], roles: ["executor", "process_owner"], todoTypeFilter: ["aftersales", "return", "exchange"] },
  ],
  rightModules: [
    { id: "aftersales-styles", type: "recent", title: "售后关注款式", processNodes: ["aftersales"], roles: ["executor", "process_owner"], styleStatusFilter: ["selling", "sold", "reviewing"] },
  ],
  bottomModules: [
    { id: "ai-tools", type: "ai", title: "售后 AI 工具", processNodes: ["aftersales"], roles: ["executor", "process_owner"] },
  ],
};

// 工序节点 → 工作台配置映射
export const WORKSPACE_CONFIG_MAP: Record<string, WorkspaceConfig> = {
  planning: MANAGER_WORKSPACE,       // 企划岗位用管理层配置
  design: DESIGN_WORKSPACE,
  sampling: SAMPLING_WORKSPACE,
  testing: MANAGER_WORKSPACE,         // 测款暂用管理层配置
  procurement: PROCUREMENT_WORKSPACE,
  stocking: PRODUCTION_WORKSPACE,
  sales: SALES_WORKSPACE,
  aftersales: AFTERSALES_WORKSPACE,
};

// 根据用户角色和工序获取工作台配置
export function getWorkspaceConfig(
  userRole: string | null,
  processRoles: { process_node: string }[] | string[]
): WorkspaceConfig {
  // 管理层 → 全局看板
  if (
    userRole === "boss" ||
    userRole === "admin" ||
    userRole === "brand_manager"
  ) {
    return MANAGER_WORKSPACE;
  }

  // 执行者/工序负责人 → 取第一个工序的工作台配置
  let nodeList: string[];
  if (Array.isArray(processRoles)) {
    if (processRoles.length === 0) {
      nodeList = [];
    } else if (typeof processRoles[0] === "string") {
      nodeList = processRoles as string[];
    } else {
      nodeList = (processRoles as { process_node: string }[]).map(
        (r) => r.process_node
      );
    }
  } else {
    nodeList = [];
  }

  if (nodeList.length > 0) {
    const node = nodeList[0];
    return WORKSPACE_CONFIG_MAP[node] || MANAGER_WORKSPACE;
  }

  // 兜底
  return MANAGER_WORKSPACE;
}

// 款式状态 → 工序节点映射（执行者可见状态范围）
export const PROCESS_STATUS_MAP: Record<string, string[]> = {
  design: ["planning", "designing", "designed"],
  sampling: ["designed", "sampling", "sampled"],
  procurement: ["sampled", "producing"],
  stocking: ["producing", "produced"],
  sales: ["selling", "sold"],
  aftersales: ["selling", "sold", "reviewing"],
};

// 根据工序节点过滤款式
export function filterStylesByProcess(
  styles: any[],
  isManager: boolean,
  processNodes: string[]
): any[] {
  if (isManager) return styles;

  const allowedStatuses = processNodes.flatMap(
    (node) => PROCESS_STATUS_MAP[node] || []
  );

  if (allowedStatuses.length === 0) return styles;
  return styles.filter((s) => allowedStatuses.includes(s.status));
}

// 根据工序节点过滤风险
export const PROCESS_RISK_MAP: Record<string, string[]> = {
  design: ["成本超支"],
  sampling: ["打样超时"],
  procurement: ["采购逾期", "采购即将到期"],
  stocking: ["生产延误"],
  sales: ["库存不足"],
  aftersales: ["质量投诉", "退货率"],
};

export function filterRisksByProcess(
  risks: any[],
  isManager: boolean,
  processNodes: string[]
): any[] {
  if (isManager) return risks;

  const allowedKeywords = processNodes.flatMap(
    (node) => PROCESS_RISK_MAP[node] || []
  );

  if (allowedKeywords.length === 0) return risks;
  return risks.filter((r) =>
    allowedKeywords.some(
      (kw) => r.title?.includes(kw) || r.message?.includes(kw)
    )
  );
}
