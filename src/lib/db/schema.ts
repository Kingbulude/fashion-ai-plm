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

export const inventory = pgTable("inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleId: uuid("style_id").notNull().references(() => styles.id),
  color: text("color").notNull(),
  size: text("size").notNull(),
  quantity: integer("quantity").notNull().default(0),
  warehouse: text("warehouse"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const salesData = pgTable("sales_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleId: uuid("style_id").notNull().references(() => styles.id),
  channel: text("channel").notNull(),
  color: text("color"),
  size: text("size"),
  quantity: integer("quantity").notNull(),
  revenue: numeric("revenue"),
  date: date("date").notNull(),
  aiInsight: text("ai_insight"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const afterSales = pgTable("after_sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleId: uuid("style_id").notNull().references(() => styles.id),
  type: afterSalesTypeEnum("type"),
  description: text("description"),
  photoUrls: jsonb("photo_urls"),
  aiCategorization: text("ai_categorization"),
  aiDesignSuggestion: text("ai_design_suggestion"),
  resolved: boolean("resolved").notNull().default(false),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const planning = pgTable("planning", {
  id: uuid("id").primaryKey().defaultRandom(),
  season: text("season").notNull(),
  name: text("name").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  categoryStructure: jsonb("category_structure"),
  costTarget: numeric("cost_target"),
  aiTrendAnalysis: text("ai_trend_analysis"),
  aiPlanSuggestion: text("ai_plan_suggestion"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const moodBoards = pgTable("mood_boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  planningId: uuid("planning_id").references(() => planning.id),
  name: text("name").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  canvasWidth: numeric("canvas_width"),
  canvasHeight: numeric("canvas_height"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const moodBoardShapes = pgTable("mood_board_shapes", {
  id: uuid("id").primaryKey().defaultRandom(),
  boardId: uuid("board_id").notNull().references(() => moodBoards.id),
  type: text("type").notNull(),
  x: numeric("x").notNull(),
  y: numeric("y").notNull(),
  width: numeric("width").notNull(),
  height: numeric("height").notNull(),
  rotation: numeric("rotation").default("0"),
  zIndex: integer("z_index").default(0),
  props: jsonb("props"),
  areaId: text("area_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const moodBoardAreas = pgTable("mood_board_areas", {
  id: text("id").primaryKey(),
  boardId: uuid("board_id").notNull().references(() => moodBoards.id),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  snapshotUrl: text("snapshot_url"),
  snapshotTime: timestamp("snapshot_time"),
  isDirty: boolean("is_dirty").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const moodBoardAssets = pgTable("mood_board_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  boardId: uuid("board_id").notNull().references(() => moodBoards.id),
  assetId: uuid("asset_id").references(() => designAssets.id),
  shapeId: uuid("shape_id").references(() => moodBoardShapes.id),
  aiTags: jsonb("ai_tags"),
  aiColorPalette: jsonb("ai_color_palette"),
  category: text("category"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
