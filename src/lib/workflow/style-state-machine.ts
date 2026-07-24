// 款式生命周期状态机
// 定义状态转换规则，确保业务流程合规

export type StyleStatus =
  | "planning"      // 企划中
  | "designing"     // 设计中
  | "designed"      // 设计定稿
  | "sampling"      // 打样中
  | "sampled"       // 封样完成
  | "producing"     // 大货生产
  | "produced"      // 大货完成
  | "selling"       // 销售中
  | "sold"          // 销售结束
  | "reviewing"     // 复盘中
  | "archived";     // 已归档

export interface StateTransition {
  from: StyleStatus;
  to: StyleStatus;
  event: string;
  description: string;
  requiredFields?: string[];
  autoCreateTodo?: string;
  checkGuard?: string; // 检查函数名
  responsibleNode?: string; // 负责该转换的工序节点，默认取 to 状态对应节点
}

export const STYLE_TRANSITIONS: StateTransition[] = [
  // 企划阶段
  {
    from: "planning",
    to: "designing",
    event: "start_design",
    description: "开始设计",
    requiredFields: ["style_no", "name", "category"],
    autoCreateTodo: "上传设计资产",
  },
  // 设计阶段
  {
    from: "designing",
    to: "designed",
    event: "design_locked",
    description: "设计定稿",
    requiredFields: ["design_assets"],
    autoCreateTodo: "创建工艺包",
  },
  // 打样阶段
  {
    from: "designed",
    to: "sampling",
    event: "start_sampling",
    description: "开始打样",
    requiredFields: ["tech_packs", "bom_items"],
    autoCreateTodo: "记录打样结果",
  },
  {
    from: "sampling",
    to: "sampled",
    event: "sample_approved",
    description: "封样通过",
    autoCreateTodo: "创建生产订单",
  },
  // 生产阶段
  {
    from: "sampled",
    to: "producing",
    event: "start_production",
    description: "开始大货生产",
    requiredFields: ["production_orders", "procurement_complete"],
    autoCreateTodo: "跟踪生产进度",
  },
  {
    from: "producing",
    to: "produced",
    event: "production_complete",
    description: "大货完成",
    autoCreateTodo: "入库登记",
  },
  // 销售阶段
  {
    from: "produced",
    to: "selling",
    event: "start_selling",
    description: "开始销售",
    requiredFields: ["inventory_records"],
  },
  {
    from: "selling",
    to: "sold",
    event: "sales_ended",
    description: "销售结束",
  },
  {
    from: "sold",
    to: "reviewing",
    event: "start_review",
    description: "开始复盘",
    autoCreateTodo: "整理销售数据",
  },
  {
    from: "reviewing",
    to: "archived",
    event: "archive",
    description: "归档",
  },
  // 任何状态都可回到 planning（重做）
  {
    from: "designed",
    to: "planning",
    event: "back_to_planning",
    description: "返回企划",
    responsibleNode: "design",
  },
  {
    from: "sampling",
    to: "designing",
    event: "design_revision",
    description: "设计修改",
    autoCreateTodo: "上传修改后设计",
    responsibleNode: "design",
  },
];

// 获取从某状态出发的所有合法转换
export function getAvailableTransitions(currentStatus: StyleStatus): StateTransition[] {
  return STYLE_TRANSITIONS.filter((t) => t.from === currentStatus);
}

// 验证转换是否合法
export function isValidTransition(from: StyleStatus, to: StyleStatus, event: string): boolean {
  return STYLE_TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.event === event
  );
}

// 款式状态 → 工序节点映射（用于确定待办负责人）
export function statusToProcessNode(status: StyleStatus): string | null {
  const map: Record<StyleStatus, string | null> = {
    planning: "planning",
    designing: "design",
    designed: "design",
    sampling: "sampling",
    sampled: "sampling",
    producing: "stocking",
    produced: "stocking",
    selling: "sales",
    sold: "sales",
    reviewing: "aftersales",
    archived: null,
  };
  return map[status] || null;
}

// 获取某转换的负责工序节点
export function getTransitionResponsibleNode(transition: StateTransition): string | null {
  if (transition.responsibleNode) return transition.responsibleNode;
  return statusToProcessNode(transition.to);
}

// 状态显示配置
export const STATUS_CONFIG: Record<StyleStatus, { label: string; color: string; bg: string; progress: number; icon: string }> = {
  planning: { label: "企划中", color: "text-slate-700", bg: "bg-slate-100", progress: 10, icon: "📋" },
  designing: { label: "设计中", color: "text-blue-700", bg: "bg-blue-100", progress: 25, icon: "🎨" },
  designed: { label: "设计定稿", color: "text-indigo-700", bg: "bg-indigo-100", progress: 35, icon: "✏️" },
  sampling: { label: "打样中", color: "text-amber-700", bg: "bg-amber-100", progress: 50, icon: "🧵" },
  sampled: { label: "封样完成", color: "text-yellow-700", bg: "bg-yellow-100", progress: 65, icon: "✅" },
  producing: { label: "大货生产", color: "text-green-700", bg: "bg-green-100", progress: 80, icon: "🏭" },
  produced: { label: "大货完成", color: "text-emerald-700", bg: "bg-emerald-100", progress: 90, icon: "📦" },
  selling: { label: "销售中", color: "text-purple-700", bg: "bg-purple-100", progress: 95, icon: "🛍️" },
  sold: { label: "销售结束", color: "text-gray-700", bg: "bg-gray-100", progress: 100, icon: "🏁" },
  reviewing: { label: "复盘中", color: "text-pink-700", bg: "bg-pink-100", progress: 100, icon: "📊" },
  archived: { label: "已归档", color: "text-slate-500", bg: "bg-slate-100", progress: 100, icon: "🗄️" },
};
