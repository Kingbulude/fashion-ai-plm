# StyleForge - 服装AI全链路品牌自研系统设计文档

> 日期：2026-07-15
> 状态：已通过需求对齐，待用户审阅后进入实施规划

---

## 1. 项目概述

### 1.1 定位

StyleForge 是面向轻资产服装品牌（无工厂、全外包生产）的 AI 全链路自研管理系统。以「款式生命周期」为核心，用 2 人团队实现传统大服装品牌公司所需的企划、设计、打样、大货、销售、售后全链路数字化闭环。

前期 2 人纯自用，全程 AI 介入；后期验证价值后可平滑升级为多租户 SaaS。

### 1.2 核心理念

1. **工作流驱动，非模块驱动**：系统不是 10 个并列模块的「功能清单」，而是 5 条工作流串联的「数字流水线」。款式状态自动流转，每一步需要做什么跟着款式走。
2. **AI 隐形嵌入**：AI 不作为独立功能入口，而是嵌入每个用户动作自动触发。用户不需要「去用 AI」，而是在正常操作中 AI 自动提供帮助。
3. **款号唯一主键**：所有数据围绕 `style_no`（款号）归集，终身可追溯、可复盘、可改款复用。
4. **小而美优先**：前期不做多租户、不做复杂权限，优先保证 2 人高效使用。
5. **可平滑扩容**：先自用、后付费升级、最后私有化自建，无需重构代码。

### 1.3 核心差异化（行业补齐）

在市面常规服装软件基础上，保留原文档的三大关键闭环：

- **物料齐套管控**：大货投产前自动校验面辅料到货进度，缺料预警，杜绝停工待料。
- **全链路质检体系**：覆盖来料检、打样评审、生产巡检、尾期抽检、入库复检，问题全追溯。
- **单品全生命周期档案**：以款号为唯一主键，全链路数据统一归集，实现可复盘、可迭代、可改款复用。

---

## 2. 设计哲学：数字流水线

### 2.1 五条工作流

系统围绕 5 条工作流组织，每条工作流覆盖原方案中的多个模块：

| 工作流 | 涵盖原模块 | 核心动作 | 款式状态流转 |
|--------|-----------|---------|-------------|
| 企划 -> 设计 | 企划趋势 + AI设计研发 | 趋势分析 -> 灵感板 -> AI改款 -> 定稿 | `planning` -> `designing` -> `designed` |
| 设计 -> 打样 | 工艺BOM + 打样管理 | AI生成工艺包 -> 下发工厂 -> 回样评审 -> 封样 | `sampling` -> `sampled` |
| 打样 -> 大货 | 物料齐套 + 大货生产 + 质检 | 采购 -> 齐套校验 -> 下单 -> 进度 -> 质检 -> 入库 | `producing` -> `produced` |
| 大货 -> 销售 | 测款投产 + 入库库存 + 销售运营 | AI测款图 -> 上架 -> 销售追踪 | `selling` -> `sold` |
| 销售 -> 复盘 | 售后反向迭代 + 数据复盘 | 售后归因 -> AI复盘 -> 反推设计迭代 | `reviewing` -> `archived` |

### 2.2 款式状态机

```
planning     企划中（灵感收集、趋势分析）
  ↓
designing    设计中（AI改款、设计稿迭代）
  ↓
designed     设计定稿（工艺包生成、BOM确认）
  ↓
sampling     打样中（工厂沟通、多轮改版）
  ↓
sampled      封样完成（质检通过、可投产）
  ↓
producing    大货生产中（物料齐套、进度跟踪、质检）
  ↓
produced     大货完成（入库、库存台账）
  ↓
selling      销售中（多渠道、售罄率追踪）
  ↓
sold         销售结束（清仓/返仓）
  ↓
reviewing    复盘中（AI复盘、售后分析、迭代建议）
  ↓
archived     已归档（完整档案可查、可改款复用）
```

状态可回退（如打样失败回到设计阶段），每次状态变更自动记录时间和操作人。

---

## 3. AI 隐形嵌入设计

### 3.1 设计原则

- AI 不作为独立功能入口，嵌入每个用户动作自动触发
- 用户在正常操作流程中自然获得 AI 辅助，无需主动「去用 AI」
- AI 结果作为「草稿建议」呈现，用户可接受、修改或忽略
- 所有 AI 调用异步进行，不阻塞用户操作

### 3.2 AI 触发点全表

| 工作流 | 用户动作 | AI 自动响应 | AI 类型 | 输出形式 |
|--------|---------|------------|---------|---------|
| 企划 | 新建企划计划 | 基于历史数据和趋势生成企划建议 | DeepSeek 文本 | 草稿建议 |
| 企划 | 上传灵感图 | 自动打标签、提取色彩、分类归档 | 图像识别 | 自动填充 |
| 设计 | 上传设计稿 | 自动打标签、提取色彩面板、推荐面料 | DeepSeek + 图像 | 建议面板 |
| 设计 | 选择参考款 | AI 图生图改款、衍生款生成 | 豆包/Seedream 图像 | 图片结果 |
| 设计 | 设计定稿 | 自动生成工艺说明草稿、BOM 草稿、成本预估 | DeepSeek 文本 | 草稿建议 |
| 打样 | 下发打样 | 自动生成工厂工艺包文案 | DeepSeek 文本 | 文档草稿 |
| 打样 | 回样拍照上传 | 与设计稿对比，标记差异点 | 图像识别 | 差异报告 |
| 打样 | 打样评审 | AI 辅助评审，总结改版要点 | DeepSeek 文本 | 评审建议 |
| 大货 | 物料采购 | 自动校验到货时间线，缺料预警 | DeepSeek 推理 | 预警通知 |
| 大货 | 大货下单 | 基于工厂历史评估生产风险 | DeepSeek 推理 | 风险报告 |
| 大货 | 质检拍照 | 自动识别常见缺陷类型 | 图像识别 | 缺陷标注 |
| 大货 | 进度更新 | 延误自动预警，建议应对方案 | DeepSeek 推理 | 预警通知 |
| 销售 | 上架新品 | AI 生成测款效果图、主图、详情页素材 | 豆包/Seedream 图像 | 图片素材 |
| 销售 | 录入销售数据 | 自动生成洞察、爆款/滞销预测 | DeepSeek 分析 | 分析报告 |
| 复盘 | 售后登记 | 自动归类问题、关联款号、推送设计改进建议 | DeepSeek 分析 | 改进建议 |
| 复盘 | 季度复盘 | AI 自动复盘，提炼每季开发优缺点 | DeepSeek 分析 | 复盘报告 |
| 供应商 | 选择工厂 | AI 智能匹配适配供应商 | DeepSeek 推理 | 推荐列表 |

### 3.3 AI 成本估算

| AI 服务 | 用途 | 预估月用量 | 预估月成本 |
|---------|------|-----------|-----------|
| DeepSeek API | 文本推理/生成/分析 | ~500万 token | ~5-10 元 |
| 豆包/Seedream API | 图像生成 | ~100-200张 | ~10-20 元 |
| 图像识别 API | 质检/对比/打标 | ~200-500张 | ~5-10 元 |
| **合计** | | | **~20-40 元/月** |

---

## 4. 技术架构

### 4.1 架构总览

```
用户浏览器（电脑/手机自适应）
    │
    ▼
Vercel（免费，永不休眠，git push 自动部署）
├─ Next.js 14 全栈应用
│  ├─ App Router 页面（SSR/SSG）
│  ├─ API Routes（后端业务逻辑）
│  ├─ AI SDK（流式 AI 响应）
│  └─ Drizzle ORM（类型安全数据库访问）
│
├──→ Supabase（免费 PostgreSQL）
│    ├─ 业务数据（款式/BOM/打样/生产/销售...）
│    ├─ Auth 认证
│    └─ RLS 行级安全
│
├──→ Cloudflare R2（免费 10GB）
│    └─ 图片/设计稿/工艺文件/3D 文件
│
└──→ 外部 AI API
     ├─ DeepSeek（文本 AI）
     ├─ 豆包/Seedream（图像生成）
     └─ 图像识别 API
```

### 4.2 技术栈明细

| 层 | 技术 | 版本 | 选择理由 |
|----|------|------|---------|
| 框架 | Next.js (App Router) | 14+ | 全栈一体，TypeScript 原生，Vercel 零配置部署 |
| 语言 | TypeScript | 5+ | strict 模式，编译期拦截类型错误 |
| UI 库 | Tailwind CSS + shadcn/ui | latest | 专业级 UI，响应式自适应 |
| 数据库 | Supabase (PostgreSQL) | 免费版 | 500MB，自带 Auth/RLS/自动备份 |
| ORM | Drizzle ORM | latest | 轻量 TypeScript 优先，类型安全 |
| 文件存储 | Cloudflare R2 | 免费版 | 10GB，无流量费，S3 兼容 |
| AI 文本 | DeepSeek API | - | ~1 元/百万 token，推理能力强 |
| AI 图像 | 豆包/Seedream API | - | 中文时尚理解好，成本低 |
| 部署 | Vercel | 免费版 | 永不休眠，git push 自动部署 |
| 类型检查 | tsc --noEmit | - | 编译期拦截未定义变量/拼写错误 |

### 4.3 对比原方案的改进

| 维度 | 原方案 | 改进方案 | 改进理由 |
|------|--------|---------|---------|
| 架构 | Vue3 前端 + FastAPI 后端分离 | Next.js 全栈一体 | 2 人团队维护一套代码更稳定 |
| 后端部署 | Render 免费容器 | Vercel 免费部署 | Render 15 分钟休眠不可接受 |
| AI 文本 | 本地 Qwen2.5-7B CPU | DeepSeek 云端 API | 30 秒/次 -> 2 秒/次 |
| AI 图像 | 多平台免费 API 轮询 | 豆包/Seedream 单一稳定 API | 轮询违反 ToS 且不稳定 |
| UI | Element Plus | shadcn/ui | 更现代、更专业、更灵活 |
| MVP 周期 | 12 周 | 4 周可用 + 持续迭代 | 2 人团队需要尽快用上系统 |

### 4.4 目录结构（预设）

```
styleforge/
├─ src/
│  ├─ app/                    # Next.js App Router
│  │  ├─ (auth)/              # 认证相关页面
│  │  ├─ (dashboard)/         # 主工作台
│  │  │  ├─ styles/           # 款式管理（核心）
│  │  │  ├─ planning/         # 企划模块
│  │  │  ├─ sampling/         # 打样模块
│  │  │  ├─ production/       # 大货生产
│  │  │  ├─ inventory/        # 库存管理
│  │  │  ├─ sales/            # 销售运营
│  │  │  ├─ review/           # 复盘分析
│  │  │  └─ suppliers/        # 供应商管理
│  │  ├─ api/                 # API Routes
│  │  │  ├─ ai/               # AI 相关接口
│  │  │  ├─ styles/           # 款式 CRUD
│  │  │  ├─ upload/           # 文件上传
│  │  │  └─ webhooks/         # 外部回调
│  │  └─ layout.tsx           # 全局布局
│  ├─ components/             # 组件
│  │  ├─ ui/                  # shadcn/ui 基础组件
│  │  ├─ style/               # 款式相关组件
│  │  ├─ ai/                  # AI 辅助组件
│  │  └─ shared/              # 共享组件
│  ├─ lib/
│  │  ├─ db/                  # Drizzle schema & queries
│  │  ├─ ai/                  # AI 服务封装
│  │  ├─ storage/             # R2 文件存储
│  │  └─ utils/               # 工具函数
│  ├─ types/                  # TypeScript 类型定义
│  └─ middleware.ts           # 认证中间件
├─ drizzle/                   # 数据库迁移文件
├─ public/                    # 静态资源
├─ package.json
├─ tsconfig.json
├─ drizzle.config.ts
├─ next.config.js
└─ .env.local                 # 环境变量
```

---

## 5. 数据模型

### 5.1 核心实体关系

所有数据围绕 `styles` 表（款式）展开，`style_no`（款号）为全局唯一主键。

```
styles (款式)
├─ design_assets        设计资产
├─ tech_packs           工艺包
├─ bom_items            BOM 物料清单
├─ sampling_records     打样记录
├─ material_procurement 物料采购
├─ production_orders    大货订单
├─ qc_records           质检记录
├─ inventory            库存台账
├─ sales_data           销售数据
├─ marketing_assets     营销素材
├─ after_sales          售后记录
└─ supplier_relations   供应商关联
```

### 5.2 核心表结构

#### styles（款式主表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| style_no | text unique | 款号（全局唯一，用户可读） |
| name | text | 款式名称 |
| season | text | 季节（如 2026SS） |
| category | text | 品类（上衣/裤装/裙装...） |
| status | enum | 款式状态（见状态机） |
| target_cost | numeric | 目标成本 |
| actual_cost | numeric | 实际成本 |
| description | text | 描述 |
| ai_tags | jsonb | AI 自动标签 |
| ai_color_palette | jsonb | AI 提取色彩 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |
| created_by | uuid | 创建人 |

#### design_assets（设计资产）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| style_id | uuid FK | 关联款式 |
| type | enum | 灵感图/设计稿/AI衍生/3D样衣 |
| file_url | text | R2 文件地址 |
| thumbnail_url | text | 缩略图地址 |
| version | int | 版本号 |
| ai_tags | jsonb | AI 自动标签 |
| ai_analysis | jsonb | AI 分析结果（色彩/风格/元素） |
| is_active | boolean | 是否当前版本 |
| created_at | timestamptz | 创建时间 |

#### tech_packs（工艺包）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| style_id | uuid FK | 关联款式 |
| version | int | 版本号 |
| size_chart | jsonb | 尺寸表 |
| process_notes | text | 工艺说明 |
| sewing_standard | text | 缝制标准 |
| print_embroidery | jsonb | 印花绣花信息 |
| ai_generated | boolean | 是否 AI 生成草稿 |
| approved | boolean | 是否审核确认 |
| created_at | timestamptz | 创建时间 |

#### bom_items（BOM 物料清单）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| style_id | uuid FK | 关联款式 |
| material_name | text | 物料名称 |
| material_type | enum | 面料/辅料/包装 |
| specification | text | 规格描述 |
| supplier_id | uuid FK | 供应商 |
| unit_consumption | numeric | 单耗 |
| loss_rate | numeric | 损耗率(%) |
| unit_price | numeric | 单价 |
| total_cost | numeric | 总成本(计算) |
| ai_suggested | boolean | 是否 AI 推荐 |
| created_at | timestamptz | 创建时间 |

#### sampling_records（打样记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| style_id | uuid FK | 关联款式 |
| round | int | 打样轮次 |
| factory_id | uuid FK | 打样工厂 |
| status | enum | 待发/进行中/已回样/评审中/通过/不通过 |
| sent_date | date | 下发日期 |
| received_date | date | 回样日期 |
| feedback | text | 评审意见 |
| revision_notes | text | 改版说明 |
| qc_result | jsonb | 质检结果 |
| approved | boolean | 是否封样 |
| created_at | timestamptz | 创建时间 |

#### material_procurement（物料采购）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| style_id | uuid FK | 关联款式 |
| bom_item_id | uuid FK | 关联 BOM 项 |
| supplier_id | uuid FK | 供应商 |
| status | enum | 待采购/已下单/部分到货/全部到货 |
| order_date | date | 下单日期 |
| expected_date | date | 预计到货 |
| actual_date | date | 实际到货 |
| quantity | numeric | 采购数量 |
| unit_price | numeric | 单价 |
| ai_risk_warning | text | AI 缺料预警 |
| created_at | timestamptz | 创建时间 |

#### production_orders（大货订单）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| style_id | uuid FK | 关联款式 |
| factory_id | uuid FK | 生产工厂 |
| status | enum | 待排产/生产中/部分完成/已完成 |
| quantity | int | 总数量 |
| color_size_ratio | jsonb | 色码配比 |
| material_ready | boolean | 物料齐套 |
| start_date | date | 开工日期 |
| expected_end_date | date | 预计完工 |
| actual_end_date | date | 实际完工 |
| ai_risk_assessment | jsonb | AI 风险评估 |
| created_at | timestamptz | 创建时间 |

#### qc_records（质检记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| style_id | uuid FK | 关联款式 |
| type | enum | 来料检/打样评审/生产巡检/尾期抽检/入库复检 |
| ref_id | uuid | 关联单据 ID（打样/大货） |
| result | enum | 合格/不合格/让步接收 |
| defects | jsonb | 缺陷明细 |
| photos | jsonb | 质检照片 URL 数组 |
| ai_defect_analysis | jsonb | AI 缺陷识别结果 |
| inspector | text | 检验人 |
| created_at | timestamptz | 创建时间 |

#### inventory（库存台账）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| style_id | uuid FK | 关联款式 |
| color | text | 颜色 |
| size | text | 尺码 |
| quantity | int | 库存数量 |
| warehouse | text | 仓库 |
| updated_at | timestamptz | 更新时间 |

#### sales_data（销售数据）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| style_id | uuid FK | 关联款式 |
| channel | text | 销售渠道 |
| color | text | 颜色 |
| size | text | 尺码 |
| quantity | int | 销量 |
| revenue | numeric | 销售额 |
| date | date | 销售日期 |
| ai_insight | text | AI 销售洞察 |
| created_at | timestamptz | 创建时间 |

#### after_sales（售后记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| style_id | uuid FK | 关联款式 |
| type | enum | 版型问题/面料问题/工艺问题/尺码问题/其他 |
| description | text | 问题描述 |
| photo_urls | jsonb | 问题照片 |
| ai_categorization | text | AI 自动归类 |
| ai_design_suggestion | text | AI 设计改进建议 |
| resolved | boolean | 是否已处理 |
| created_at | timestamptz | 创建时间 |

#### suppliers（供应商档案）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| name | text | 供应商名称 |
| type | enum | 工厂/面料商/辅料商 |
| contact | text | 联系人 |
| phone | text | 电话 |
| capabilities | jsonb | 能力标签（品类/工艺/产能） |
| quality_score | numeric | 品质评分 |
| delivery_score | numeric | 交期评分 |
| price_level | text | 价格水平 |
| ai_match_score | numeric | AI 匹配评分 |
| created_at | timestamptz | 创建时间 |

---

## 6. 分阶段交付计划

### Phase 1：核心流水线（4 周）— 替代 Excel + 微信

**目标**：从款式建档到打样封样的日常核心链路上线，2 人开始用系统工作。

| 周 | 交付内容 | AI 能力 |
|----|---------|---------|
| W1 | 项目搭建（Next.js + Supabase + R2 + Drizzle）<br>认证登录<br>款式建档（CRUD + 状态机）<br>设计资产上传/版本管理 | 上传设计图自动打标签、提取色彩 |
| W2 | 工艺包管理（尺寸表/工艺说明/缝制标准）<br>BOM 管理（物料清单/单耗/成本核算）<br>成本预估面板 | AI 生成工艺说明草稿<br>AI 推荐 BOM 物料<br>AI 成本预估 |
| W3 | 打样全流程（下单 -> 工艺包下发 -> 进度跟踪 -> 回样登记 -> 多轮改版 -> 封样确认） | AI 生成工厂工艺包文案<br>AI 辅助评审总结 |
| W4 | 样衣质检记录<br>基础看板（款式列表/状态概览/待办事项）<br>手机端适配<br>BUG 修复 + 体验优化 | 回样拍照 AI 差异对比 |

**Phase 1 验收标准**：
- 能在系统中完成从建款到封样的完整流程
- AI 能自动生成工艺包草稿和 BOM 建议
- 手机端可正常访问和操作
- 替代 Excel 和微信传文件的工作方式

### Phase 2：生产链路（4 周）— 大货全流程上线

**目标**：物料采购 -> 大货生产 -> 质检 -> 入库全链路数字化。

| 周 | 交付内容 | AI 能力 |
|----|---------|---------|
| W5 | 物料采购管理（采购单/到货跟踪）<br>物料齐套校验 + 缺料预警 | AI 到货时间线预测<br>缺料风险预警 |
| W6 | 大货外协下单 + 色码配比<br>生产节点跟踪 + 工厂进度上报 | AI 生产风险评估 |
| W7 | 全链路质检（来料检/巡检/尾检/入库复检）<br>质检问题追溯 | 质检拍照 AI 缺陷识别 |
| W8 | 成品入库 + 色码库存台账<br>库存变动记录<br>供应商档案基础管理 | - |

**Phase 2 验收标准**：
- 大货从下单到入库全流程在系统内完成
- 物料齐套校验有效预防停工待料
- 质检记录可追溯到具体款式和批次

### Phase 3：AI 能力强化（4 周）— 核心差异化

**目标**：AI 设计、AI 测款、AI 投产决策全面上线。

| 周 | 交付内容 | AI 能力 |
|----|---------|---------|
| W9 | 企划模块（季节波段/品类结构/上新节奏）<br>灵感白板 + 素材标签化管理 | AI 趋势分析<br>AI 企划方向建议 |
| W10 | AI 图生图改款、衍生款生成<br>色彩/面料/配饰搭配推荐 | 豆包/Seedream 图像生成<br>AI 搭配推荐 |
| W11 | AI 测款效果图/主图/详情页素材生成<br>AI 销量预估 + 下单量决策 | 豆包/Seedream 图像生成<br>DeepSeek 销量预测 |
| W12 | 色码配比模拟 + 投产风险评估<br>供应商评分体系 + AI 智能匹配工厂 | AI 配比建议<br>AI 供应商匹配 |

**Phase 3 验收标准**：
- AI 能生成可用的测款图和营销素材
- AI 销量预估和下单量建议有参考价值
- 供应商评分和匹配能辅助决策

### Phase 4：闭环复盘（3 周）— 完整商业闭环

**目标**：销售 -> 售后 -> 设计迭代反向驱动，完成完整闭环。

| 周 | 交付内容 | AI 能力 |
|----|---------|---------|
| W13 | 多渠道销售数据统计<br>售罄率/动销分析<br>热销/滞销判断 | AI 销售洞察分析 |
| W14 | 售后问题分类 + 缺陷统计<br>问题自动归集款式档案<br>AI 季度复盘报告 | AI 售后归因分析<br>AI 自动复盘 |
| W15 | 全链路数据看板（研发/供应链/销售/库存）<br>商业化预留（多租户字段）<br>系统优化 + 文档 | AI 全链路数据洞察 |

**Phase 4 验收标准**：
- 销售数据能驱动设计和投产决策
- 售后问题能反推设计端迭代
- 全链路数据看板可一览全局

### 总计：15 周，第 4 周即有可用系统

---

## 7. 项目开发原则

1. **自用优先**：前期不做多租户、不做复杂权限，优先保证 2 人高效使用。
2. **AI 原生嵌入**：AI 不是外挂功能，深度嵌入每一个业务节点，用户无感使用。
3. **数据唯一闭环**：所有数据围绕款号归集，终身可追溯。
4. **类型安全第一**：TypeScript strict 模式，`tsc --noEmit` 不通过不允许推送。
5. **可平滑扩容**：先自用、后付费升级、最后私有化自建，无需重构代码。
6. **小步快跑**：4 周出 MVP，持续迭代，不追求一步到位。

---

## 8. 后期扩容路线（盈利后升级）

1. 升级 Vercel Pro / 独立云服务器，解除免费限制
2. 独立自建数据库，脱离 Supabase 托管
3. 升级 GPU 设备，本地部署图像 AI 模型（降低图像生成成本）
4. 改造多租户架构，对外商业化
5. 微信小程序 / 企业微信集成
6. 工厂端独立入口（供应商协同门户）

---

## 9. 环境变量清单

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# AI APIs
DEEPSEEK_API_KEY=
DOUBAO_API_KEY=
IMAGE_RECOGNITION_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```
