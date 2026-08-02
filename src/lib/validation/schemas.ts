// 统一输入校验工具
// 基于 Zod，所有 API 写入路由应在入口处调用 validateBody 进行校验
// 失败统一返回 400 + 错误详情

import { NextResponse } from "next/server";
import { z } from "zod";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

/**
 * 校验请求体，返回结构化结果
 * 成功：{ ok: true, data }
 * 失败：{ ok: false, response }（可直接 return 给客户端，状态码 400）
 */
export function validateBody<T>(
  schema: z.ZodType<T>,
  body: unknown
): ValidationResult<T> {
  const result = schema.safeParse(body);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const firstError = result.error.issues[0];
  const message = firstError
    ? `${firstError.path.join(".") || "body"}: ${firstError.message}`
    : "请求体格式错误";
  return {
    ok: false,
    response: NextResponse.json({ error: "参数校验失败", detail: message }, { status: 400 }),
  };
}

// ─── 通用字段类型（供各 schema 复用） ───

const numericOrNull = z.union([z.number(), z.string()]).nullable().optional();
const stringOrNull = z.string().nullable().optional();
const uuidOrNull = z.string().uuid().nullable().optional();

// ─── 款式校验 ───

const styleStatusSchema = z.enum([
  "planning", "designing", "designed", "sampling", "sampled",
  "producing", "produced", "selling", "sold", "reviewing", "archived",
]);

export const styleCreateSchema = z.object({
  styleNo: z.string().min(1, "款号不能为空").max(100),
  name: z.string().min(1, "款式名称不能为空").max(200),
  season: z.string().max(50).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  targetCost: z.union([z.number(), z.string()]).optional().nullable(),
  status: styleStatusSchema.optional(),
  seasonId: z.string().uuid().optional().nullable(),
});

export const styleUpdateSchema = z.object({
  styleNo: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  season: z.string().max(50).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  targetCost: z.union([z.number(), z.string()]).optional().nullable(),
  actualCost: z.union([z.number(), z.string()]).optional().nullable(),
  status: styleStatusSchema.optional(),
});

// ─── 颜色校验 ───

export const colorCreateSchema = z.object({
  name: z.string().min(1, "颜色名称不能为空").max(100),
  hex: z.string().max(20).optional().nullable(),
  usage: z.string().max(200).optional().nullable(),
  season: z.string().max(50).optional().nullable(),
});

// ─── 质检记录校验 ───

export const qcRecordCreateSchema = z.object({
  styleId: z.string().uuid().optional().nullable(),
  process: z.string().max(100).optional().nullable(),
  result: z.enum(["pass", "fail", "concession", "pending"]).optional(),
  defects: z.any().optional().nullable(),
  batch: z.string().max(100).optional().nullable(),
});

export const qcRecordUpdateSchema = z.object({
  type: z.string().max(50).optional(),
  refId: uuidOrNull,
  result: z.enum(["pass", "fail", "concession", "pending"]).optional(),
  defects: z.any().optional().nullable(),
  photos: z.any().optional().nullable(),
  inspector: z.string().max(100).optional().nullable(),
});

// ─── 库存调整校验 ───

export const inventoryAdjustSchema = z.object({
  color: z.string().min(1, "颜色不能为空").max(50),
  size: z.string().min(1, "尺码不能为空").max(50),
  quantity: z.union([z.number(), z.string()]).refine(
    (v) => !Number.isNaN(Number(v)),
    "数量必须为数字"
  ),
});

// ─── BOM 物料校验 ───

export const bomItemCreateSchema = z.object({
  materialName: z.string().min(1, "物料名称不能为空").max(200),
  materialType: z.string().min(1, "物料类型不能为空").max(50),
  specification: stringOrNull,
  unitConsumption: z.union([z.number(), z.string()]).refine(
    (v) => !Number.isNaN(Number(v)),
    "单耗必须为数字"
  ),
  lossRate: numericOrNull,
  unitPrice: numericOrNull,
  aiSuggested: z.boolean().optional(),
});

export const bomItemUpdateSchema = z.object({
  materialName: z.string().min(1).max(200).optional(),
  materialType: z.string().min(1).max(50).optional(),
  specification: stringOrNull,
  unitConsumption: z.union([z.number(), z.string()]).refine(
    (v) => !Number.isNaN(Number(v)),
    "单耗必须为数字"
  ).optional(),
  lossRate: numericOrNull,
  unitPrice: numericOrNull,
  aiSuggested: z.boolean().optional(),
  status: z.string().max(50).optional(),
});

// ─── 生产订单校验 ───

export const productionOrderCreateSchema = z.object({
  quantity: z.union([z.number(), z.string()]).refine(
    (v) => Number(v) > 0,
    "订单数量必须大于 0"
  ),
  status: z.string().max(50).optional(),
  schedule: z.any().optional().nullable(),
  startDate: stringOrNull,
  expectedEndDate: stringOrNull,
  factoryId: uuidOrNull,
  materialReady: z.boolean().optional(),
  colorSizeRatio: z.any().optional().nullable(),
  totalCost: numericOrNull,
});

export const productionOrderUpdateSchema = z.object({
  quantity: z.union([z.number(), z.string()]).refine(
    (v) => !Number.isNaN(Number(v)) && Number(v) >= 0,
    "订单数量必须为非负数字"
  ).optional(),
  status: z.string().max(50).optional(),
  schedule: z.any().optional().nullable(),
  startDate: stringOrNull,
  expectedEndDate: stringOrNull,
  factoryId: uuidOrNull,
  materialReady: z.boolean().optional(),
  colorSizeRatio: z.any().optional().nullable(),
  totalCost: numericOrNull,
  actualEndDate: stringOrNull,
});

// ─── 采购记录校验 ───

export const procurementCreateSchema = z.object({
  bomItemId: z.string().uuid("物料项 ID 格式错误"),
  supplierId: uuidOrNull,
  status: z.string().max(50).optional(),
  orderDate: stringOrNull,
  expectedDate: stringOrNull,
  quantity: z.union([z.number(), z.string()]).refine(
    (v) => Number(v) > 0,
    "采购数量必须大于 0"
  ),
  unitPrice: numericOrNull,
});

export const procurementUpdateSchema = z.object({
  supplierId: uuidOrNull,
  status: z.string().max(50).optional(),
  orderDate: stringOrNull,
  expectedDate: stringOrNull,
  actualDate: stringOrNull,
  quantity: z.union([z.number(), z.string()]).refine(
    (v) => !Number.isNaN(Number(v)) && Number(v) >= 0,
    "订单数量必须为非负数字"
  ).optional(),
  receivedQuantity: z.union([z.number(), z.string()]).refine(
    (v) => !Number.isNaN(Number(v)) && Number(v) >= 0,
    "已收数量必须为非负数字"
  ).optional(),
  unitPrice: numericOrNull,
});

// ─── 打样记录校验 ───

export const samplingCreateSchema = z.object({
  round: z.union([z.number(), z.string()]).refine(
    (v) => !Number.isNaN(Number(v)) && Number(v) >= 1,
    "轮次必须为大于 0 的数字"
  ).optional(),
  factoryId: uuidOrNull,
  status: z.string().max(50).optional(),
  sentDate: stringOrNull,
  receivedDate: stringOrNull,
  feedback: z.any().optional().nullable(),
  revisionNotes: z.any().optional().nullable(),
  qcResult: z.any().optional().nullable(),
});

export const samplingUpdateSchema = z.object({
  round: z.union([z.number(), z.string()]).refine(
    (v) => !Number.isNaN(Number(v)) && Number(v) >= 1,
    "轮次必须为大于 0 的数字"
  ).optional(),
  factoryId: uuidOrNull,
  status: z.string().max(50).optional(),
  sentDate: stringOrNull,
  receivedDate: stringOrNull,
  feedback: z.any().optional().nullable(),
  revisionNotes: z.any().optional().nullable(),
  qcResult: z.any().optional().nullable(),
  approved: z.boolean().optional(),
});

// ─── 工艺包校验 ───

export const techPackCreateSchema = z.object({
  sizeChart: z.any().optional().nullable(),
  processNotes: z.any().optional().nullable(),
  sewingStandard: z.any().optional().nullable(),
  printEmbroidery: z.any().optional().nullable(),
  aiGenerated: z.boolean().optional(),
  approved: z.boolean().optional(),
});

export const techPackUpdateSchema = z.object({
  sizeChart: z.any().optional().nullable(),
  processNotes: z.any().optional().nullable(),
  sewingStandard: z.any().optional().nullable(),
  printEmbroidery: z.any().optional().nullable(),
  aiGenerated: z.boolean().optional(),
  approved: z.boolean().optional(),
});

// ─── 款式状态转换校验 ───

export const styleTransitionSchema = z.object({
  toStatus: z.string().min(1, "目标状态不能为空"),
  event: z.string().min(1, "事件不能为空"),
  comment: z.string().max(1000).optional().nullable(),
});

// ─── 供应商校验 ───

export const supplierCreateSchema = z.object({
  name: z.string().min(1, "供应商名称不能为空").max(200),
  type: z.string().min(1, "供应商类型不能为空").max(50),
  contact: z.string().max(100).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().max(100).nullable().optional(),
  capabilities: z.any().optional().nullable(),
  qualityScore: numericOrNull,
  deliveryScore: numericOrNull,
  priceLevel: z.string().max(50).nullable().optional(),
});

export const supplierUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.string().min(1).max(50).optional(),
  contact: z.string().max(100).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().max(100).nullable().optional(),
  capabilities: z.any().optional().nullable(),
  qualityScore: numericOrNull,
  deliveryScore: numericOrNull,
  priceLevel: z.string().max(50).nullable().optional(),
});

// ─── 销售记录校验 ───

export const saleCreateSchema = z.object({
  styleId: z.string().uuid("款式 ID 格式错误"),
  saleDate: z.string().min(1, "销售日期不能为空"),
  quantity: z.union([z.number(), z.string()]).refine(
    (v) => Number(v) > 0,
    "销售数量必须大于 0"
  ),
  amount: z.union([z.number(), z.string()]).refine(
    (v) => Number(v) >= 0,
    "销售金额必须为非负数字"
  ),
  unitPrice: numericOrNull,
  color: z.string().max(50).nullable().optional(),
  size: z.string().max(50).nullable().optional(),
  channel: z.string().max(100).nullable().optional(),
  customerInfo: z.any().optional().nullable(),
});

// ─── 季次校验 ───

export const seasonCreateSchema = z.object({
  brandId: z.string().uuid("品牌 ID 格式错误"),
  name: z.string().min(1, "季次名称不能为空").max(100),
  seasonType: z.string().min(1, "季次类型不能为空").max(50),
  year: z.union([z.number(), z.string()]).refine(
    (v) => !Number.isNaN(Number(v)) && Number(v) >= 2000,
    "年份必须为大于 2000 的数字"
  ),
  startDate: z.string().min(1, "开始日期不能为空"),
  endDate: z.string().min(1, "结束日期不能为空"),
});

export const seasonUpdateSchema = z.object({
  id: z.string().uuid("季次 ID 格式错误"),
  name: z.string().min(1).max(100).optional(),
  seasonType: z.string().min(1).max(50).optional(),
  year: z.union([z.number(), z.string()]).refine(
    (v) => !Number.isNaN(Number(v)) && Number(v) >= 2000,
    "年份必须为大于 2000 的数字"
  ).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().max(50).optional(),
});

// ─── 品牌校验 ───

export const brandCreateSchema = z.object({
  name: z.string().min(1, "品牌名称不能为空").max(200),
  logoUrl: z.string().max(500).nullable().optional(),
});

export const brandUpdateSchema = z.object({
  id: z.string().uuid("品牌 ID 格式错误"),
  name: z.string().min(1).max(200).optional(),
  logoUrl: z.string().max(500).nullable().optional(),
});

// 品牌 [id] 路由 PUT（使用 snake_case 字段）
export const brandDetailUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  logo_url: z.string().max(500).nullable().optional(),
});

// ─── 组织成员分配校验 ───

export const organizationAssignSchema = z.object({
  userId: z.string().min(1, "用户 ID 不能为空"),
  roleLevel: z.string().max(50).optional(),
  brandIds: z.array(z.string()).optional(),
  name: z.string().max(100).optional(),
  processRoleIds: z.array(z.string()).optional(),
  processOwnerScopeId: z.string().max(100).nullable().optional(),
});

// ─── 邀请用户校验 ───

export const inviteUserSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  name: z.string().max(100).optional(),
  roleLevel: z.string().min(1, "请选择角色层级"),
  brandIds: z.array(z.string()).optional(),
  processRoleIds: z.array(z.string()).optional(),
  processOwnerScopeId: z.string().max(100).nullable().optional(),
});

// ─── AI 对话/调度校验 ───

export const aiChatSchema = z.object({
  skillKey: z.string().max(100).optional(),
  skillName: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  processNode: z.string().max(100).optional(),
  userMessage: z.string().min(1, "缺少 userMessage").max(5000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(5000),
  })).optional(),
});

export const aiOrchestrateSchema = z.object({
  message: z.string().min(1, "缺少 message").max(5000),
  skillKey: z.string().max(100).optional(),
  seasonId: uuidOrNull,
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(5000),
  })).optional(),
});

// ─── AI 图片生成校验 ───

export const aiImageCreateSchema = z.object({
  styleName: z.string().max(200).optional(),
  styleId: uuidOrNull,
  description: z.string().max(2000).optional().nullable(),
  styleType: z.string().max(50).optional(),
  colors: z.array(z.string().max(50)).optional(),
});

export const aiTestResultCreateSchema = z.object({
  imageId: uuidOrNull,
  targetAudience: z.string().max(200).optional().nullable(),
  testDuration: z.union([z.number(), z.string()]).refine(
    (v) => !Number.isNaN(Number(v)) && Number(v) > 0,
    "测试时长必须为大于 0 的数字"
  ).optional(),
});

// ─── AI 改款/营销图校验 ───

export const aiRedesignSchema = z.object({
  styleId: z.string().min(1, "缺少 styleId"),
  sourceAssetId: uuidOrNull,
  instruction: z.string().min(1, "缺少改款指令").max(1000),
  saveAsAsset: z.boolean().optional(),
});

export const aiMarketingImagesSchema = z.object({
  styleId: z.string().min(1, "缺少 styleId"),
  sceneIds: z.array(z.string().max(50)).optional(),
  customInstruction: z.string().max(1000).optional().nullable(),
  sourceAssetId: uuidOrNull,
});

// ─── AI 测款分析校验 ───

export const aiStyleTestSchema = z.object({
  styleId: uuidOrNull,
  styleName: z.string().max(200).optional(),
  category: z.string().max(100).optional().nullable(),
  price: z.union([z.number(), z.string()]).optional().nullable(),
  season: z.string().max(50).optional().nullable(),
  targetAudience: z.string().max(200).optional().nullable(),
  designFeatures: z.string().max(2000).optional().nullable(),
});

// ─── AI 建议记录校验 ───

export const aiRecommendationCreateSchema = z.object({
  skillId: uuidOrNull,
  processNode: z.string().max(100).optional(),
  context: z.any().optional(),
  result: z.record(z.string(), z.any()),
  status: z.string().max(50).optional(),
});

// ─── AI 销售预测校验 ───

export const aiSalesPredictionSchema = z.object({
  styleId: uuidOrNull,
  styleName: z.string().max(200).optional(),
  category: z.string().max(100).optional().nullable(),
  price: z.union([z.number(), z.string()]).optional().nullable(),
  season: z.string().max(50).optional().nullable(),
  targetAudience: z.string().max(200).optional().nullable(),
  initialStock: z.union([z.number(), z.string()]).refine(
    (v) => !Number.isNaN(Number(v)) && Number(v) >= 0,
    "初始库存必须为非负数字"
  ).optional().nullable(),
});

// ─── AI 供应商匹配校验 ───

export const aiSupplierMatchSchema = z.object({
  styleName: z.string().max(200).optional(),
  category: z.string().max(100).optional().nullable(),
  material: z.string().max(500).optional().nullable(),
  processRequirements: z.string().max(1000).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  budget: z.string().max(200).optional().nullable(),
});

// ─── AI 建议操作校验 ───

export const aiRecAdoptSchema = z.object({
  designId: z.string().max(200).optional(),
});

export const aiRecModifySchema = z.object({
  designId: z.string().max(200).optional(),
  modifiedDesign: z.record(z.string(), z.any()),
});

export const aiRecOutcomeSchema = z.object({
  styleId: uuidOrNull,
  outcomeType: z.string().min(1, "缺少 outcomeType").max(100),
  outcomeValue: z.union([z.number(), z.string()]).refine(
    (v) => !Number.isNaN(Number(v)),
    "结果值必须为数字"
  ).optional().nullable(),
});

export const aiRecRejectSchema = z.object({
  reason: z.string().max(1000).optional().nullable(),
});

// ─── 企划校验 ───

export const planningCreateSchema = z.object({
  season: z.string().min(1, "季节不能为空").max(50),
  theme: z.string().min(1, "主题不能为空").max(200),
  category: z.string().max(100).optional().nullable(),
  targetCost: z.union([z.number(), z.string()]).optional().nullable(),
  timeline: z.string().max(200).optional().nullable(),
  aiTrendAnalysis: z.any().optional().nullable(),
  inspirationTags: z.any().optional().nullable(),
  seasonId: uuidOrNull,
});

export const planningUpdateSchema = z.object({
  season: z.string().max(50).optional(),
  theme: z.string().max(200).optional(),
  category: z.string().max(100).optional().nullable(),
  targetCost: z.union([z.number(), z.string()]).optional().nullable(),
  timeline: z.string().max(200).optional().nullable(),
  aiTrendAnalysis: z.any().optional().nullable(),
  inspirationTags: z.any().optional().nullable(),
});

export const planningTrendAnalyzeSchema = z.object({
  season: z.string().max(50).optional().nullable(),
  theme: z.string().max(200).optional().nullable(),
});

// ─── 企划 AI 子能力校验 ───

export const planningGeneratePlanSchema = z.object({
  season: z.string().max(50).optional().nullable(),
  theme: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  targetCost: z.union([z.number(), z.string()]).optional().nullable(),
  seasonId: uuidOrNull,
});

export const planningTrendSchema = z.object({
  season: z.string().max(50).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
});

export const planningPricingSchema = z.object({
  cost: z.union([z.number(), z.string()]).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  brandPosition: z.string().max(100).optional().nullable(),
});

export const planningColorSchema = z.object({
  season: z.string().max(50).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  brandColors: z.array(z.string().max(50)).optional(),
});

export const planningFabricSchema = z.object({
  season: z.string().max(50).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
});

export const planningHotProductsSchema = z.object({
  season: z.string().max(50).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
});

export const planningChatSchema = z.object({
  skillKey: z.string().min(1, "缺少 skillKey").max(100),
  userMessage: z.string().min(1, "缺少 userMessage").max(5000),
  history: z
    .array(
      z.object({
        id: z.string().max(200).optional(),
        content: z.string().max(5000),
        sender: z.enum(["user", "ai"]),
        timestamp: z.string().max(100).optional(),
      })
    )
    .optional(),
});

// ─── 灵感板校验 ───

export const inspirationBoardCreateSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200),
  description: z.string().max(2000).optional().nullable(),
  brandId: uuidOrNull,
  seasonId: uuidOrNull,
  themeTags: z.array(z.string().max(50)).optional(),
  coverImageUrl: z.string().max(2000).optional().nullable(),
});

export const inspirationItemCreateSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().min(1, "图片不能为空").max(2000),
  sourceUrl: z.string().max(2000).optional().nullable(),
  sourceType: z.string().max(50).optional(),
  tags: z.array(z.string().max(50)).optional(),
  category: z.string().max(100).optional().nullable(),
  colorTags: z.array(z.string().max(50)).optional(),
  styleTags: z.array(z.string().max(50)).optional(),
});

// ─── 审批校验 ───

export const approvalCreateSchema = z.object({
  brandId: uuidOrNull,
  tableName: z.string().min(1, "缺少 tableName").max(100),
  recordId: z.string().min(1, "缺少 recordId").max(200),
  action: z.enum(["create", "update", "delete"]),
  proposedData: z.record(z.string(), z.any()),
});

export const approvalUpdateSchema = z.object({
  id: z.string().min(1, "缺少审批 ID"),
  status: z.enum(["approved", "rejected"]),
  reviewComment: z.string().max(1000).optional().nullable(),
});

// ─── 待办校验 ───

export const todoCreateSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200),
  description: z.string().max(2000).optional().nullable(),
  type: z.string().max(50).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  targetTable: z.string().max(100).optional().nullable(),
  targetId: z.string().max(200).optional().nullable(),
  assignedTo: z.string().max(200).optional().nullable(),
  dueDate: z.string().max(100).optional().nullable(),
});

export const todoUpdateSchema = z.object({
  status: z.string().max(50).optional(),
  isRead: z.boolean().optional(),
});

// ─── 个人资料校验 ───

export const profileUpdateSchema = z.object({
  name: z.string().max(100).optional(),
  avatarUrl: z.string().max(2048).nullable().optional(),
});

// ─── 设计反馈校验 ───

export const designFeedbackCreateSchema = z.object({
  styleId: z.string().min(1, "款式不能为空").max(200),
  title: z.string().min(1, "标题不能为空").max(200),
  description: z.string().max(2000).optional().nullable(),
  defectCategory: z.string().max(100).optional().nullable(),
  severity: z.enum(["critical", "major", "minor", "cosmetic"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  relatedAftersaleIds: z.array(z.string().max(200)).optional(),
});

export const designFeedbackUpdateSchema = z.object({
  id: z.string().min(1, "缺少 ID"),
  status: z.enum(["pending", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  severity: z.enum(["critical", "major", "minor", "cosmetic"]).optional(),
  description: z.string().max(2000).optional().nullable(),
});

// ─── 公司信息校验 ───

export const companyUpdateSchema = z.object({
  name: z.string().max(200).optional(),
  logoUrl: z.string().max(2000).nullable().optional(),
});

// ─── 定时任务校验 ───

export const cronSchema = z.object({
  schedule: z.enum(["hourly", "daily", "weekly"]).optional(),
});
