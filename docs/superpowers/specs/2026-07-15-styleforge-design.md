# fashion-ai-plm - 服装AI全链路品牌自研系统设计文档

> 日期：2026-07-15
> 状态：已通过需求对齐，待用户审阅后进入实施规划

---

## 1. 项目概述

### 1.1 定位

fashion-ai-plm 是面向轻资产服装品牌（无工厂、全外包生产）的 AI 全链路自研管理系统。以「款式生命周期」为核心，用 2 人团队实现传统大服装品牌公司所需的企划、设计、打样、大货、销售、售后全链路数字化闭环。

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
| 白板 SDK | tldraw | latest | 高性能无限画布，支持自定义形状和工具 |
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
fashion-ai-plm/
├─ src/
│  ├─ app/                    # Next.js App Router
│  │  ├─ (auth)/              # 认证相关页面
│  │  ├─ (dashboard)/         # 主工作台
│  │  │  ├─ styles/           # 款式管理（核心）
│  │  │  ├─ planning/         # 企划模块（含灵感白板）
│  │  │  ├─ sampling/         # 打样模块
│  │  │  ├─ production/       # 大货生产
│  │  │  ├─ inventory/        # 库存管理
│  │  │  ├─ sales/            # 销售运营
│  │  │  ├─ review/           # 复盘分析
│  │  │  └─ suppliers/        # 供应商管理
│  │  ├─ api/                 # API Routes
│  │  │  ├─ ai/               # AI 相关接口
│  │  │  ├─ styles/           # 款式 CRUD
│  │  │  ├─ upload/           # 文件上传（含图片处理）
│  │  │  ├─ whiteboard/       # 白板数据接口
│  │  │  └─ webhooks/         # 外部回调
│  │  └─ layout.tsx           # 全局布局
│  ├─ components/             # 组件
│  │  ├─ ui/                  # shadcn/ui 基础组件
│  │  ├─ style/               # 款式相关组件
│  │  ├─ ai/                  # AI 辅助组件
│  │  ├─ whiteboard/          # tldraw 白板组件（含自定义形状）
│  │  └─ shared/              # 共享组件
│  ├─ lib/
│  │  ├─ db/                  # Drizzle schema & queries
│  │  ├─ ai/                  # AI 服务封装
│  │  ├─ storage/             # R2 文件存储（含图片处理）
│  │  ├─ whiteboard/          # 白板数据处理（快照/区域分割）
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

## 4.5 tldraw 灵感白板（Mood Board）架构设计

### 4.5.1 需求背景

企划灵感板（Mood Board）是服装品牌研发的核心环节，设计师需要将数百到上千张参考图、面料图、设计元素拖拽到无限画布上自由排版。单次企划灵感白板素材数量最高可达 500~1000 张高清参考图，必须解决：

- 大量图片带来的内存高占用问题
- 画布加载缓慢问题
- 缩放平移卡顿问题

### 4.5.2 架构级性能优化方案

针对 500-1000 张高清图片场景，采用**多层级架构优化**：

```
┌─────────────────────────────────────────────────────────────┐
│                    前端渲染层                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         tldraw 编辑器（视口裁剪 + 虚拟化渲染）            │   │
│  │  ├─ 自定义 ImageShapeUtil（渐进式加载 + 占位符）       │   │
│  │  ├─ 自定义工具（批量导入 + AI 标签）                    │   │
│  │  └─ 组件优化（React.memo + useMemo）                  │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    图片处理层                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Cloudflare R2 + 图片处理管道                    │   │
│  │  ├─ 多级缩略图生成（256px / 512px / 原始尺寸）        │   │
│  │  ├─ WebP 格式转换（体积减少 60-70%）                   │   │
│  │  └─ 按需加载（基于视口和缩放级别）                      │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    数据存储层                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Supabase + R2 联合存储                          │   │
│  │  ├─ 白板元数据（形状位置、大小、层级）                  │   │
│  │  ├─ 区域快照（按空间分区缓存）                          │   │
│  │  └─ 素材索引（标签、分类、AI 属性）                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.5.3 性能优化策略详解

#### 策略一：视口裁剪 + 虚拟化渲染（tldraw 原生能力）

tldraw 内置视口裁剪机制，只渲染当前视口内的形状。结合自定义优化：

- **自定义 ImageShapeUtil**：实现渐进式图片加载，先显示低分辨率占位符，再加载高清图
- **条件裁剪**：对于超出视口一定距离的图片，不渲染或仅渲染占位符
- **缩放级别感知**：缩放级别低时（全局视图），只加载最小缩略图

#### 策略二：多级图片处理（架构级核心优化）

这是解决 500-1000 张图片性能问题的**核心方案**：

```
上传高清原图（2-5MB）
    │
    ▼
Cloudflare R2 存储原始文件
    │
    ▼
图片处理管道（Next.js API）
    ├─ 生成 256px 缩略图（用于全局视图和预览）
    ├─ 生成 512px 中等图（用于画布正常缩放级别）
    └─ 保留原始图（用于选中/放大查看）
    │
    ▼
存储到 R2，建立尺寸索引
```

**加载策略**：
| 缩放级别 | 加载尺寸 | 预估单张大小 | 1000 张预估内存 |
|---------|---------|------------|----------------|
| < 25%（全局视图） | 256px 缩略图 | ~10KB | ~10MB |
| 25% - 100%（正常视图） | 512px 中等图 | ~30KB | ~30MB |
| > 100%（放大查看） | 原始尺寸 | ~2MB | 按需加载 |

#### 策略三：区域快照与懒加载

将无限画布按固定大小（如 2000x2000px）划分为网格区域：

- **区域快照**：当用户离开某个区域时，将该区域渲染为一张快照图，替换掉内部的所有图片形状
- **懒加载**：进入新区域时，异步加载该区域的实际图片内容
- **预加载**：根据用户平移方向，提前加载相邻区域的内容

#### 策略四：WebP 格式 + 智能压缩

- 所有图片自动转换为 WebP 格式，体积减少 60-70%
- 根据图片内容智能压缩：
  - 照片类：质量 70%，保留细节
  - 插画/图案类：质量 80%，色彩丰富
  - 纯图/色块：质量 90%，保持清晰度

#### 策略五：内存管理与垃圾回收

- **图片缓存限制**：设置最大缓存数量（如 200 张），LRU 淘汰策略
- **离屏卸载**：图片离开视口后，释放其内存占用
- **定时清理**：定期清理未使用的图片缓存

### 4.5.4 白板数据存储方案

#### 存储结构

```
mood_boards (灵感板主表)
├─ id                  uuid PK
├─ planning_id         uuid FK (关联企划计划)
├─ name                text (白板名称)
├─ thumbnail_url       text (预览图)
├─ created_at          timestamptz
└─ updated_at          timestamptz

mood_board_shapes (形状数据)
├─ id                  uuid PK
├─ board_id            uuid FK
├─ type                text (image/text/rectangle/...)
├─ x                   numeric (X坐标)
├─ y                   numeric (Y坐标)
├─ width               numeric (宽度)
├─ height              numeric (高度)
├─ rotation            numeric (旋转角度)
├─ z_index             int (层级)
├─ props               jsonb (形状属性，含图片URL/标签等)
└─ area_id             text (所属区域ID)

mood_board_areas (区域快照)
├─ id                  text PK
├─ board_id            uuid FK
├─ x                   int (区域左上角X)
├─ y                   int (区域左上角Y)
├─ width               int (区域宽度)
├─ height              int (区域高度)
├─ snapshot_url        text (快照图片URL)
├─ snapshot_time       timestamptz
└─ is_dirty            boolean (是否有未保存变更)

mood_board_assets (素材索引)
├─ id                  uuid PK
├─ board_id            uuid FK
├─ asset_id            uuid FK (关联设计资产)
├─ shape_id            uuid FK (关联形状)
├─ ai_tags             jsonb (AI 标签)
├─ ai_color_palette    jsonb (AI 提取色彩)
└─ category            text (分类)
```

#### 数据同步策略

- **实时同步**：使用 tldraw 的 `onMount` 和 `onChange` 回调，监听画布变更
- **批量保存**：采用节流策略，每 3 秒或累计 10 个变更后批量保存到数据库
- **版本管理**：每次保存生成版本快照，支持回滚
- **离线支持**：本地 IndexedDB 缓存，网络恢复后同步

### 4.5.5 自定义 tldraw 扩展

#### 自定义形状：FashionImageShape

```typescript
class FashionImageShapeUtil extends ShapeUtil<TLFashionImageShape> {
  static override type = 'fashion-image' as const

  override getGeometry(shape: TLFashionImageShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true
    })
  }

  override component(shape: TLFashionImageShape) {
    const { assetId, thumbnailUrl, mediumUrl, originalUrl } = shape.props
    
    return (
      <FashionImage
        assetId={assetId}
        thumbnailUrl={thumbnailUrl}
        mediumUrl={mediumUrl}
        originalUrl={originalUrl}
        width={shape.props.w}
        height={shape.props.h}
      />
    )
  }

  override indicator(shape: TLFashionImageShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}
```

#### 自定义工具：BatchImportTool

支持从素材库批量导入图片到画布，自动排列布局。

#### 自定义面板：AssetLibraryPanel

素材库面板，支持：
- AI 标签搜索和筛选
- 分类浏览（灵感图/面料图/设计元素）
- 拖拽到画布
- 批量选择和导入

### 4.5.6 AI 集成

| 用户动作 | AI 自动响应 | AI 类型 |
|---------|------------|---------|
| 上传参考图 | 自动打标签、提取色彩、分类归档 | 图像识别 + DeepSeek |
| 批量导入素材 | 自动分组、推荐布局排列方式 | DeepSeek 推理 |
| 选中图片 | 推荐相似面料、色彩搭配方案 | DeepSeek 推荐 |
| 白板完成 | 自动生成企划方向总结、色彩趋势报告 | DeepSeek 分析 |

### 4.5.7 预期性能指标

| 指标 | 预期值 |
|------|-------|
| 1000 张图片初始加载时间 | < 5 秒（仅加载视口内缩略图） |
| 画布缩放帧率 | > 30 FPS |
| 画布平移帧率 | > 30 FPS |
| 单张图片加载时间 | < 200ms（中等图） |
| 内存占用（正常缩放） | < 100MB |

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

planning (企划计划)
└─ mood_boards          灵感白板
    ├─ mood_board_shapes      白板形状数据
    ├─ mood_board_areas       区域快照
    └─ mood_board_assets      素材索引
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

#### planning（企划计划）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| season | text | 季节（如 2026SS） |
| name | text | 企划名称 |
| start_date | date | 开始日期 |
| end_date | date | 结束日期 |
| category_structure | jsonb | 品类结构规划 |
| cost_target | numeric | 成本目标 |
| ai_trend_analysis | text | AI 趋势分析 |
| ai_plan_suggestion | text | AI 企划建议 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

#### mood_boards（灵感白板）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| planning_id | uuid FK | 关联企划计划 |
| name | text | 白板名称 |
| thumbnail_url | text | 预览图 URL |
| canvas_width | numeric | 画布宽度 |
| canvas_height | numeric | 画布高度 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

#### mood_board_shapes（白板形状数据）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| board_id | uuid FK | 关联灵感白板 |
| type | text | 形状类型（image/text/rectangle/...） |
| x | numeric | X 坐标 |
| y | numeric | Y 坐标 |
| width | numeric | 宽度 |
| height | numeric | 高度 |
| rotation | numeric | 旋转角度（弧度） |
| z_index | int | 层级 |
| props | jsonb | 形状属性（含图片 URL/标签/AI 分析等） |
| area_id | text | 所属区域 ID |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

#### mood_board_areas（区域快照）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | text PK | 区域 ID（格式：`{board_id}_{x}_{y}`） |
| board_id | uuid FK | 关联灵感白板 |
| x | int | 区域左上角 X（网格坐标） |
| y | int | 区域左上角 Y（网格坐标） |
| width | int | 区域宽度（像素） |
| height | int | 区域高度（像素） |
| snapshot_url | text | 快照图片 URL |
| snapshot_time | timestamptz | 快照时间 |
| is_dirty | boolean | 是否有未保存变更 |
| created_at | timestamptz | 创建时间 |

#### mood_board_assets（素材索引）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| board_id | uuid FK | 关联灵感白板 |
| asset_id | uuid FK | 关联设计资产 |
| shape_id | uuid FK | 关联形状 |
| ai_tags | jsonb | AI 标签 |
| ai_color_palette | jsonb | AI 提取色彩 |
| category | text | 分类（灵感图/面料图/设计元素） |
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

### Phase 3：AI 能力强化（6 周）— 核心差异化

**目标**：AI 设计、AI 测款、AI 投产决策全面上线，重点实现高性能灵感白板。

| 周 | 交付内容 | AI 能力 |
|----|---------|---------|
| W9 | 企划模块（季节波段/品类结构/上新节奏）<br>素材库管理（分类/标签/搜索） | AI 趋势分析<br>AI 企划方向建议 |
| W10 | tldraw 白板基础集成（无限画布/基本形状/拖拽）<br>自定义 FashionImageShape（渐进式加载） | AI 参考图打标签、提取色彩 |
| W11 | 多级图片处理管道（256px/512px/原图）<br>WebP 格式转换 + 智能压缩 | - |
| W12 | 区域快照与懒加载机制<br>缩放级别感知图片加载策略 | AI 批量导入分组、推荐布局 |
| W13 | AI 图生图改款、衍生款生成<br>色彩/面料/配饰搭配推荐 | 豆包/Seedream 图像生成<br>AI 搭配推荐 |
| W14 | AI 测款效果图/主图/详情页素材生成<br>AI 销量预估 + 下单量决策 | 豆包/Seedream 图像生成<br>DeepSeek 销量预测 |
| W15 | 色码配比模拟 + 投产风险评估<br>供应商评分体系 + AI 智能匹配工厂 | AI 配比建议<br>AI 供应商匹配 |

**Phase 3 验收标准**：
- AI 能生成可用的测款图和营销素材
- AI 销量预估和下单量建议有参考价值
- 供应商评分和匹配能辅助决策
- 灵感白板支持 500-1000 张图片流畅操作（>30 FPS）

### Phase 4：闭环复盘（3 周）— 完整商业闭环

**目标**：销售 -> 售后 -> 设计迭代反向驱动，完成完整闭环。

| 周 | 交付内容 | AI 能力 |
|----|---------|---------|
| W16 | 多渠道销售数据统计<br>售罄率/动销分析<br>热销/滞销判断 | AI 销售洞察分析 |
| W17 | 售后问题分类 + 缺陷统计<br>问题自动归集款式档案<br>AI 季度复盘报告 | AI 售后归因分析<br>AI 自动复盘 |
| W18 | 全链路数据看板（研发/供应链/销售/库存）<br>商业化预留（多租户字段）<br>系统优化 + 文档 | AI 全链路数据洞察 |

**Phase 4 验收标准**：
- 销售数据能驱动设计和投产决策
- 售后问题能反推设计端迭代
- 全链路数据看板可一览全局

### 总计：18 周，第 4 周即有可用系统

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
