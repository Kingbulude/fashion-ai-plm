// 表名常量（与 src/lib/db/schema.ts 和 supabase/migrations 对齐）
// 用途：API 路由 import 这些常量代替裸字符串，避免 sales vs sales_records 类拼写错误
// 维护规则：新增 migration 创建表后，必须在此处同步新增常量并更新 schema.ts

export const TABLES = {
  // 核心业务表（migration 001 / 003）
  styles: "styles",
  designAssets: "design_assets",
  techPacks: "tech_packs",
  bomItems: "bom_items",
  samplingRecords: "sampling_records",
  materialProcurement: "material_procurement",
  productionOrders: "production_orders",
  qcRecords: "qc_records",
  inventoryRecords: "inventory_records",
  salesRecords: "sales_records",
  aftersalesRecords: "aftersales_records",
  suppliers: "suppliers",
  fabrics: "fabrics",
  colors: "colors",

  // 企划系统（migration 003 / 026 / 037）
  planning: "planning",
  planningThemes: "planning_themes",
  productPlanning: "product_planning",
  designPlanning: "design_planning",
  colorPlanning: "color_planning",
  fabricPlanning: "fabric_planning",
  fabricSuppliers: "fabric_suppliers",
  planningAiResults: "planning_ai_results",

  // 灵感板（migration 020）
  inspirationBoards: "inspiration_boards",
  inspirationItems: "inspiration_items",

  // 租户与组织（migration 005 / 007 / 029）
  companies: "companies",
  brands: "brands",
  profiles: "profiles",
  userBrands: "user_brands",
  seasons: "seasons",

  // AI 表（migration 003 / 008 / 026 / 043 / 044 / 046 / 047）
  aiImages: "ai_images",
  aiTestResults: "ai_test_results",
  aiSkills: "ai_skills",
  aiSuggestions: "ai_suggestions",
  aiRecommendations: "ai_recommendations",
  aiRecommendationOutcomes: "ai_recommendation_outcomes",
  aiSkillMetrics: "ai_skill_metrics",
  aiConversations: "ai_conversations",
  aiExecutions: "ai_executions",
  brandDna: "brand_dna",
  brandDnaHistory: "brand_dna_history",
  marketTrends: "market_trends",
  crawlerData: "crawler_data",
  colorTrends: "color_trends",
  fabricTrends: "fabric_trends",

  // 工作流与审批（migration 013 / 014 / 017 / 024）
  todos: "todos",
  approvalFlows: "approval_flows",
  processLinks: "process_links",
  processRoles: "process_roles",
  processOwnerScopes: "process_owner_scopes",
  userProcessRoles: "user_process_roles",

  // 审计与版本（migration 007 / 010）
  operationLogs: "operation_logs",
  dataVersions: "data_versions",
  tempAuthorizations: "temp_authorizations",
  pipelineRuns: "pipeline_runs",

  // 质量与售后扩展（migration 019 / 021 / 022 / 023 / 028）
  materialFulfillmentAlerts: "material_fulfillment_alerts",
  supplierRatings: "supplier_ratings",
  aftersalesDefectIterations: "aftersales_defect_iterations",
  seasonReviews: "season_reviews",

  // 知识库（migration 004）
  knowledgeBase: "knowledge_base",
  designFeedbackItems: "design_feedback_items",
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];
