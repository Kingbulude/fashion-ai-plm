import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  date,
  timestamp,
  jsonb,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

export const styleStatusEnum = pgEnum("style_status", [
  "planning",
  "designing",
  "designed",
  "sampling",
  "sampled",
  "producing",
  "produced",
  "selling",
  "sold",
  "reviewing",
  "archived",
]);

export const designAssetTypeEnum = pgEnum("design_asset_type", [
  "inspiration",
  "design",
  "ai_derivative",
  "3d_sample",
]);

export const materialTypeEnum = pgEnum("material_type", [
  "fabric",
  "accessory",
  "packaging",
]);

export const samplingStatusEnum = pgEnum("sampling_status", [
  "pending",
  "in_progress",
  "received",
  "reviewing",
  "approved",
  "rejected",
]);

export const procurementStatusEnum = pgEnum("procurement_status", [
  "pending",
  "ordered",
  "partial_received",
  "fully_received",
]);

export const productionStatusEnum = pgEnum("production_status", [
  "pending",
  "in_progress",
  "partial_completed",
  "completed",
]);

export const qcTypeEnum = pgEnum("qc_type", [
  "incoming",
  "sampling_review",
  "in_process",
  "final",
  "warehouse_inspection",
]);

export const qcResultEnum = pgEnum("qc_result", ["pass", "fail", "concession"]);

export const afterSalesTypeEnum = pgEnum("after_sales_type", [
  "pattern",
  "fabric",
  "craft",
  "size",
  "other",
]);

export const supplierTypeEnum = pgEnum("supplier_type", [
  "factory",
  "fabric_supplier",
  "accessory_supplier",
]);

export const styles = pgTable("styles", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleNo: text("style_no").unique().notNull(),
  name: text("name").notNull(),
  season: text("season"),
  category: text("category"),
  status: styleStatusEnum("status").notNull().default("planning"),
  targetCost: numeric("target_cost"),
  actualCost: numeric("actual_cost"),
  description: text("description"),
  aiTags: jsonb("ai_tags"),
  aiColorPalette: jsonb("ai_color_palette"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: uuid("created_by"),
});

export const designAssets = pgTable("design_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleId: uuid("style_id").notNull().references(() => styles.id),
  type: designAssetTypeEnum("type").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  filePath: text("file_path"),
  thumbnailUrl: text("thumbnail_url"),
  version: integer("version").notNull().default(1),
  aiTags: jsonb("ai_tags"),
  aiAnalysis: jsonb("ai_analysis"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const techPacks = pgTable("tech_packs", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleId: uuid("style_id").notNull().references(() => styles.id),
  version: integer("version").notNull().default(1),
  sizeChart: jsonb("size_chart"),
  processNotes: text("process_notes"),
  sewingStandard: text("sewing_standard"),
  printEmbroidery: jsonb("print_embroidery"),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  approved: boolean("approved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bomItems = pgTable("bom_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleId: uuid("style_id").notNull().references(() => styles.id),
  materialName: text("material_name").notNull(),
  materialType: materialTypeEnum("material_type").notNull(),
  specification: text("specification"),
  supplierId: uuid("supplier_id"),
  unitConsumption: numeric("unit_consumption").notNull(),
  lossRate: numeric("loss_rate").notNull().default("0"),
  unitPrice: numeric("unit_price"),
  totalCost: numeric("total_cost"),
  aiSuggested: boolean("ai_suggested").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const samplingRecords = pgTable("sampling_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleId: uuid("style_id").notNull().references(() => styles.id),
  round: integer("round").notNull().default(1),
  factoryId: uuid("factory_id"),
  status: samplingStatusEnum("status").notNull().default("pending"),
  sentDate: date("sent_date"),
  receivedDate: date("received_date"),
  feedback: text("feedback"),
  revisionNotes: text("revision_notes"),
  qcResult: jsonb("qc_result"),
  approved: boolean("approved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const materialProcurement = pgTable("material_procurement", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleId: uuid("style_id").notNull().references(() => styles.id),
  bomItemId: uuid("bom_item_id").notNull().references(() => bomItems.id),
  supplierId: uuid("supplier_id"),
  status: procurementStatusEnum("status").notNull().default("pending"),
  orderDate: date("order_date"),
  expectedDate: date("expected_date"),
  actualDate: date("actual_date"),
  quantity: numeric("quantity").notNull(),
  unitPrice: numeric("unit_price"),
  aiRiskWarning: text("ai_risk_warning"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productionOrders = pgTable("production_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleId: uuid("style_id").notNull().references(() => styles.id),
  factoryId: uuid("factory_id"),
  status: productionStatusEnum("status").notNull().default("pending"),
  quantity: integer("quantity").notNull(),
  colorSizeRatio: jsonb("color_size_ratio"),
  materialReady: boolean("material_ready").notNull().default(false),
  startDate: date("start_date"),
  expectedEndDate: date("expected_end_date"),
  actualEndDate: date("actual_end_date"),
  aiRiskAssessment: jsonb("ai_risk_assessment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const qcRecords = pgTable("qc_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleId: uuid("style_id").notNull().references(() => styles.id),
  type: qcTypeEnum("type").notNull(),
  refId: uuid("ref_id"),
  result: qcResultEnum("result"),
  defects: jsonb("defects"),
  photos: jsonb("photos"),
  aiDefectAnalysis: jsonb("ai_defect_analysis"),
  inspector: text("inspector"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inventoryRecords = pgTable("inventory_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleId: uuid("style_id").notNull().references(() => styles.id),
  color: text("color").notNull(),
  size: text("size").notNull(),
  quantity: numeric("quantity").notNull().default("0"),
  batchNo: text("batch_no"),
  costPrice: numeric("cost_price"),
  companyId: uuid("company_id"),
  brandId: uuid("brand_id"),
  seasonId: uuid("season_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const salesRecords = pgTable("sales_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleId: uuid("style_id").notNull().references(() => styles.id),
  orderNo: text("order_no").unique().notNull(),
  color: text("color").notNull(),
  size: text("size").notNull(),
  quantity: numeric("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  channel: text("channel"),
  saleDate: date("sale_date").notNull().defaultNow(),
  companyId: uuid("company_id"),
  brandId: uuid("brand_id"),
  seasonId: uuid("season_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aftersalesRecords = pgTable("aftersales_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleId: uuid("style_id").notNull().references(() => styles.id),
  salesRecordId: uuid("sales_record_id").references(() => salesRecords.id),
  type: text("type").notNull().default("return"),
  reason: text("reason"),
  quantity: numeric("quantity").notNull(),
  amount: numeric("amount"),
  status: text("status").notNull().default("pending"),
  solution: text("solution"),
  companyId: uuid("company_id"),
  brandId: uuid("brand_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: supplierTypeEnum("type").notNull(),
  contact: text("contact"),
  phone: text("phone"),
  email: text("email"),
  capabilities: jsonb("capabilities"),
  qualityScore: numeric("quality_score"),
  deliveryScore: numeric("delivery_score"),
  priceLevel: text("price_level"),
  aiMatchScore: numeric("ai_match_score"),
  companyId: uuid("company_id").references(() => companies.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 企划表（以 migration 003_additional_tables.sql + 037_planning_season_tenant.sql 为准）
export const planning = pgTable("planning", {
  id: uuid("id").primaryKey().defaultRandom(),
  season: text("season").notNull(),
  theme: text("theme").notNull(),
  category: text("category"),
  targetCost: numeric("target_cost"),
  timeline: text("timeline"),
  brandStory: text("brand_story"),
  targetAudience: text("target_audience"),
  priceRange: text("price_range"),
  aiTrendAnalysis: text("ai_trend_analysis"),
  inspirationTags: jsonb("inspiration_tags"),
  // 租户字段（migration 037 新增）
  companyId: uuid("company_id").references(() => companies.id),
  brandId: uuid("brand_id").references(() => brands.id),
  seasonId: uuid("season_id").references(() => seasons.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 灵感板表（以 migration 020_inspiration_board.sql 为准；旧 mood_boards 系列已废弃）
export const inspirationBoards = pgTable("inspiration_boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  brandId: uuid("brand_id").references(() => brands.id),
  seasonId: uuid("season_id").references(() => seasons.id),
  title: text("title").notNull(),
  description: text("description"),
  themeTags: text("theme_tags").array().default([]),
  coverImageUrl: text("cover_image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inspirationItems = pgTable("inspiration_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  brandId: uuid("brand_id").references(() => brands.id),
  boardId: uuid("board_id").notNull().references(() => inspirationBoards.id),
  title: text("title"),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  sourceUrl: text("source_url"),
  sourceType: text("source_type").default("upload"),
  tags: text("tags").array().default([]),
  category: text("category"),
  colorTags: text("color_tags").array().default([]),
  styleTags: text("style_tags").array().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 公司表
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  companyId: uuid("company_id").references(() => companies.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const aiSkills = pgTable("ai_skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  skillType: text("skill_type").notNull(),
  processNode: text("process_node"),
  configSchema: jsonb("config_schema"),
  entryRoute: text("entry_route"),
  isActive: boolean("is_active").notNull().default(true),
  companyId: uuid("company_id").references(() => companies.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  brandId: uuid("brand_id").references(() => brands.id),
  name: text("name").notNull().default("小芳"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("设计师"),
  roleLevel: text("role_level").notNull().default("executor"),
  companyId: uuid("company_id").references(() => companies.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 用户-品牌多对多关联
export const userBrands = pgTable("user_brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  brandId: uuid("brand_id").notNull().references(() => brands.id),
  roleLevel: text("role_level").notNull().default("executor"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 季次表（SS/FW）
export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id").notNull().references(() => brands.id),
  name: text("name").notNull(),
  seasonType: text("season_type").notNull(),
  year: integer("year").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 操作日志
export const operationLogs = pgTable("operation_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  companyId: uuid("company_id").references(() => companies.id),
  brandId: uuid("brand_id").references(() => brands.id),
  action: text("action").notNull(),
  targetTable: text("target_table").notNull(),
  targetId: text("target_id"),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 数据版本
export const dataVersions = pgTable("data_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  version: integer("version").notNull().default(1),
  data: jsonb("data").notNull(),
  changedBy: uuid("changed_by"),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 临时授权
export const tempAuthorizations = pgTable("temp_authorizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromUserId: uuid("from_user_id").notNull(),
  toUserId: uuid("to_user_id").notNull(),
  brandId: uuid("brand_id").references(() => brands.id),
  dataScope: text("data_scope").notNull(),
  recordIds: jsonb("record_ids"),
  expireAt: timestamp("expire_at").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 审批流
export const approvalFlows = pgTable("approval_flows", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id").references(() => brands.id),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  action: text("action").notNull(),
  proposedData: jsonb("proposed_data").notNull(),
  submittedBy: uuid("submitted_by").notNull(),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  status: text("status").notNull().default("pending"),
  reviewComment: text("review_comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// AI建议表
export const aiSuggestions = pgTable("ai_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  aiRoleLevel: text("ai_role_level").notNull(),
  specialistType: text("specialist_type"),
  assistantType: text("assistant_type"),
  brandId: uuid("brand_id").references(() => brands.id),
  processNode: text("process_node"),
  type: text("type").notNull(),
  priority: text("priority").notNull().default("medium"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  proposedData: jsonb("proposed_data"),
  targetTable: text("target_table"),
  targetId: text("target_id"),
  status: text("status").notNull().default("pending"),
  createdBy: text("created_by").notNull().default("ai_system"),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewComment: text("review_comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expireAt: timestamp("expire_at"),
});

// Phase 2: AI 建议记录（款式衍生闭环）
export const aiRecommendations = pgTable("ai_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  skillId: uuid("skill_id").references(() => aiSkills.id),
  companyId: uuid("company_id").references(() => companies.id),
  brandId: uuid("brand_id").references(() => brands.id),
  seasonId: uuid("season_id").references(() => seasons.id),
  userId: uuid("user_id").notNull(),
  processNode: text("process_node"),
  context: jsonb("context").notNull().default({}),
  result: jsonb("result").notNull().default({}),
  status: text("status").notNull().default("pending"),
  rejectReason: text("reject_reason"),
  modifiedResult: jsonb("modified_result"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Phase 2: 建议后续结果
export const aiRecommendationOutcomes = pgTable("ai_recommendation_outcomes", {
  id: uuid("id").primaryKey().defaultRandom(),
  recommendationId: uuid("recommendation_id").notNull(),
  styleId: uuid("style_id").references(() => styles.id),
  outcomeType: text("outcome_type").notNull(),
  outcomeValue: numeric("outcome_value"),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

// Phase 2: Skill 效果与版本追踪
export const aiSkillMetrics = pgTable("ai_skill_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  skillId: uuid("skill_id").references(() => aiSkills.id),
  companyId: uuid("company_id").references(() => companies.id),
  brandId: uuid("brand_id").references(() => brands.id),
  seasonId: uuid("season_id").references(() => seasons.id),
  totalRecommendations: integer("total_recommendations").notNull().default(0),
  adoptedCount: integer("adopted_count").notNull().default(0),
  rejectedCount: integer("rejected_count").notNull().default(0),
  modifiedCount: integer("modified_count").notNull().default(0),
  avgOutcomeScore: numeric("avg_outcome_score"),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

// AI 生图记录表（以 migration 047_fix_ai_tables_and_rls.sql 为准）
export const aiImages = pgTable("ai_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleId: uuid("style_id").references(() => styles.id),
  styleName: text("style_name").notNull().default("未命名"),
  description: text("description"),
  styleType: text("style_type").notNull().default("realistic"),
  colors: text("colors").array(),
  imageUrl: text("image_url").notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  brandId: uuid("brand_id").references(() => brands.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AI 测款结果表（以 migration 003_additional_tables.sql + 047_fix_ai_tables_and_rls.sql 为准）
// 注意：style_id 经 047 改为可空；image_id/style_name/target_audience/test_duration/status/
//       positive_count/negative_count 由 047 新增；brand_id/company_id 由 011 新增
export const aiTestResults = pgTable("ai_test_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleId: uuid("style_id").references(() => styles.id),
  imageId: uuid("image_id").references(() => aiImages.id),
  styleName: text("style_name").notNull().default("未命名"),
  aiImageUrl: text("ai_image_url"),
  testScore: numeric("test_score"),
  feedbackCount: numeric("feedback_count"),
  feedbackSummary: text("feedback_summary"),
  suggestedQuantity: numeric("suggested_quantity"),
  targetAudience: text("target_audience"),
  testDuration: integer("test_duration").notNull().default(7),
  status: text("status").notNull().default("active"),
  positiveCount: integer("positive_count").notNull().default(0),
  negativeCount: integer("negative_count").notNull().default(0),
  companyId: uuid("company_id").references(() => companies.id),
  brandId: uuid("brand_id").references(() => brands.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
