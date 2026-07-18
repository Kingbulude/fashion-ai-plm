// AI分级架构定义
// AI负责80%的内容和决策，人工辅助反馈和执行
// 所有AI建议需要人工审核才生效

// AI角色级别（对应人工分级）
export enum AIRoleLevel {
  AI_MASTER = "ai_master",          // AI总控（对应老板/品牌负责人）
  AI_SPECIALIST = "ai_specialist",  // AI工序专员（对应工序负责人）
  AI_ASSISTANT = "ai_assistant",    // AI执行助手（对应执行者）
}

// AI角色中文显示名
export const AIRoleLevelLabels: Record<string, string> = {
  [AIRoleLevel.AI_MASTER]: "AI总控",
  [AIRoleLevel.AI_SPECIALIST]: "AI工序专员",
  [AIRoleLevel.AI_ASSISTANT]: "AI执行助手",
};

// 工序对应的AI专员
export enum AISpecialistType {
  PLANNING_AI = "planning_ai",         // 企划AI
  DESIGN_AI = "design_ai",             // 设计AI
  SAMPLING_AI = "sampling_ai",         // 打样AI
  TESTING_AI = "testing_ai",           // 测款AI
  PROCUREMENT_AI = "procurement_ai",   // 采购AI
  STOCKING_AI = "stocking_ai",         // 备货AI
  SALES_AI = "sales_ai",               // 销售AI
  AFTERSALES_AI = "aftersales_ai",     // 售后AI
}

// AI专员中文显示名
export const AISpecialistLabels: Record<string, string> = {
  [AISpecialistType.PLANNING_AI]: "企划AI专员",
  [AISpecialistType.DESIGN_AI]: "设计AI专员",
  [AISpecialistType.SAMPLING_AI]: "打样AI专员",
  [AISpecialistType.TESTING_AI]: "测款AI专员",
  [AISpecialistType.PROCUREMENT_AI]: "采购AI专员",
  [AISpecialistType.STOCKING_AI]: "备货AI专员",
  [AISpecialistType.SALES_AI]: "销售AI专员",
  [AISpecialistType.AFTERSALES_AI]: "售后AI专员",
};

// AI执行助手类型（细分到具体步骤）
export enum AIAssistantType {
  // 设计助手
  DESIGN_DERIVATIVE = "design_derivative",     // 设计衍生
  COLOR_MATCHING = "color_matching",           // 配色建议
  FABRIC_SELECTION = "fabric_selection",       // 面料选择
  TECH_PACK_GENERATOR = "tech_pack_generator", // 工艺单生成
  // 企划助手
  TREND_ANALYZER = "trend_analyzer",           // 趋势分析
  PRICING_ADVISOR = "pricing_advisor",         // 定价建议
  // 打样助手
  SAMPLE_TRACKER = "sample_tracker",           // 打样跟踪
  FACTORY_MATCHER = "factory_matcher",         // 工厂匹配
  // 采购助手
  SUPPLIER_MATCHER = "supplier_matcher",       // 供应商匹配
  RISK_ASSESSOR = "risk_assessor",             // 风险评估
  // 生产助手
  QC_ANALYZER = "qc_analyzer",                 // 质检分析
  PROGRESS_TRACKER = "progress_tracker",       // 进度跟踪
  // 销售助手
  SALES_PREDICTOR = "sales_predictor",         // 销售预测
  ORDER_SUGGESTER = "order_suggester",         // 下单建议
  // 售后助手
  FEEDBACK_ANALYZER = "feedback_analyzer",     // 反馈分析
  RETURN_PROCESSOR = "return_processor",       // 退换处理
}

// AI助手中文显示名
export const AIAssistantLabels: Record<string, string> = {
  [AIAssistantType.DESIGN_DERIVATIVE]: "设计衍生助手",
  [AIAssistantType.COLOR_MATCHING]: "配色建议助手",
  [AIAssistantType.FABRIC_SELECTION]: "面料选择助手",
  [AIAssistantType.TECH_PACK_GENERATOR]: "工艺单生成助手",
  [AIAssistantType.TREND_ANALYZER]: "趋势分析助手",
  [AIAssistantType.PRICING_ADVISOR]: "定价建议助手",
  [AIAssistantType.SAMPLE_TRACKER]: "打样跟踪助手",
  [AIAssistantType.FACTORY_MATCHER]: "工厂匹配助手",
  [AIAssistantType.SUPPLIER_MATCHER]: "供应商匹配助手",
  [AIAssistantType.RISK_ASSESSOR]: "风险评估助手",
  [AIAssistantType.QC_ANALYZER]: "质检分析助手",
  [AIAssistantType.PROGRESS_TRACKER]: "进度跟踪助手",
  [AIAssistantType.SALES_PREDICTOR]: "销售预测助手",
  [AIAssistantType.ORDER_SUGGESTER]: "下单建议助手",
  [AIAssistantType.FEEDBACK_ANALYZER]: "反馈分析助手",
  [AIAssistantType.RETURN_PROCESSOR]: "退换处理助手",
};

// AI建议状态
export enum AISuggestionStatus {
  PENDING = "pending",      // 待审核
  APPROVED = "approved",    // 已通过
  REJECTED = "rejected",    // 已拒绝
  EXECUTED = "executed",    // 已执行
  EXPIRED = "expired",      // 已过期
}

// AI建议类型
export enum AISuggestionType {
  ANALYSIS = "analysis",        // 分析报告
  DECISION = "decision",        // 决策建议
  PREDICTION = "prediction",    // 预测建议
  OPTIMIZATION = "optimization", // 优化建议
  ALERT = "alert",              // 异常提醒
  AUTOMATION = "automation",    // 自动化执行
}

// AI建议优先级
export enum AISuggestionPriority {
  CRITICAL = "critical",  // 紧急
  HIGH = "high",          // 高
  MEDIUM = "medium",      // 中
  LOW = "low",            // 低
}

// 根据用户角色获取对应的AI级别
export function getAIRoleForUser(roleLevel: string): AIRoleLevel {
  switch (roleLevel) {
    case "boss":
    case "brand_manager":
      return AIRoleLevel.AI_MASTER;
    case "process_owner":
      return AIRoleLevel.AI_SPECIALIST;
    case "executor":
    case "admin":
    default:
      return AIRoleLevel.AI_ASSISTANT;
  }
}

// 根据工序节点获取对应的AI专员
export function getSpecialistForProcess(processNode: string): AISpecialistType | null {
  const mapping: Record<string, AISpecialistType> = {
    planning: AISpecialistType.PLANNING_AI,
    design: AISpecialistType.DESIGN_AI,
    sampling: AISpecialistType.SAMPLING_AI,
    testing: AISpecialistType.TESTING_AI,
    procurement: AISpecialistType.PROCUREMENT_AI,
    stocking: AISpecialistType.STOCKING_AI,
    sales: AISpecialistType.SALES_AI,
    aftersales: AISpecialistType.AFTERSALES_AI,
  };
  return mapping[processNode] || null;
}

// AI建议接口定义
export interface AISuggestion {
  id?: string;
  aiRoleLevel: AIRoleLevel;
  specialistType?: AISpecialistType;
  assistantType?: AIAssistantType;
  brandId?: string;
  processNode?: string;
  type: AISuggestionType;
  priority: AISuggestionPriority;
  title: string;
  content: string;
  proposedAction?: any; // AI建议的具体操作
  targetTable?: string;
  targetId?: string;
  status: AISuggestionStatus;
  createdBy: string; // AI系统标识
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
  createdAt?: string;
  expireAt?: string;
}
