# StyleForge — 服装AI全链路品牌管理系统

> 面向轻资产服装品牌的全生命周期智能管理系统，基于运筹学思想构建工序流程调度中心

---

## 一、项目架构

### 1.1 工序流程图（PERT网络图）

```
关键路径（红色箭头）：决定总工期
并行工序（灰色虚线）：可与关键路径同步进行

┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  P1企划 │ ──→ │  P2设计 │ ──→ │  P3打样 │ ──→ │  P4测款 │ ──→ │ P6大货  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘     └────┬────┘
                                                                     │
                                                                     ↓
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ P10售后 │ ←── │  P9销售 │ ←── │  P8入库 │ ←── │  P7质检 │     │         │
└─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘

                              ┌─────────────┐
                              │ P5物料采购  │ ←── 与 P4测款 并行
                              └──────┬──────┘
                                     │
                                     └──────────→ 汇入 P6大货生产
```

### 1.2 业务模块全景

| 模块 | 路由 | 说明 |
|------|------|------|
| 工作台 | `/dashboard` | 数据看板、快捷入口 |
| 智能调度 | `/` | PERT网络图、工序流转、交期预测 |
| 企划中心 | `/planning` | 商品企划、设计企划、面料/色彩企划、趋势预测、灵感白板 |
| AI智能分析 | `/ai` | AI测款、销量预估、供应商匹配、AI生图 |
| AI审核中心 | `/ai-review` | AI深度审核、自动质检分析 |
| 款式管理 | `/styles` | 款式全生命周期（设计→打样→采购→生产→质检→库存→销售→售后） |
| 设计资产 | `/design` | 设计图片、版型文件、AI衍生图、3D样衣展示 |
| 生产管理 | `/production` | 生产订单、进度跟踪、物料齐套、缺料预警 |
| 品牌管理 | `/brands` | 多品牌管理、品牌资料维护 |
| 供应商 | `/suppliers` | 供应商档案、评分体系、智能匹配 |
| 灵感库 | `/inspiration` | 灵感白板、素材收藏 |
| 待办中心 | `/todos` | 待办任务、样式级待办、指定负责人 |
| 管理后台 | `/admin` | 组织架构、人员管理、流程角色、AI技能配置 |
| 设置 | `/settings` | 个人资料、品牌配置 |

### 1.3 款式生命周期状态机

```
planning → designing → designed → sampling → sampled → producing → produced → selling → sold → reviewing → archived
```

每个状态流转均触发事件总线，自动通知相关AI专员生成建议。

---

## 二、技术架构

### 2.1 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Next.js (App Router + Turbopack) | 15.5.2 |
| UI框架 | React | 19 |
| 语言 | TypeScript | 5.x |
| 样式 | Tailwind CSS | 3.4 |
| UI组件 | shadcn/ui (Radix UI) | latest |
| 图标 | Lucide React | latest |
| 数据库 | Supabase (PostgreSQL) | - |
| ORM | Drizzle ORM | 0.45 |
| AI引擎 | Cloudflare Workers AI | - |
| 状态管理 | @tanstack/react-query | 5.x |
| 认证 | Supabase Auth (JWT) | - |
| 部署 | Cloudflare Pages | `@cloudflare/next-on-pages` |

### 2.2 架构特点

- **多租户隔离**：基于 `brandId` 的行级安全（RLS）策略，品牌间数据完全隔离
- **延迟初始化模式**：使用 Proxy 包裹 Supabase 客户端，避免构建时环境变量未加载导致报错
- **Edge Runtime**：API 路由使用 Edge Runtime，支持全球边缘部署
- **AI三级角色体系**：AI总控 → 8个工序AI专员 → 16+执行助手，模拟人类组织架构
- **事件驱动架构**：29种业务事件触发Pipeline自动执行，支持同步/异步两种模式
- **Pipeline引擎**：可编排多步骤自动化流程（日签到、采购自动化、测款决策下单）
- **Skill系统**：可注册/执行的AI技能（技术包生成、采购单生成、飞书/微信通知）
- **组件化开发**：所有功能模块封装为独立组件，便于维护和扩展

### 2.3 项目结构

```
├── app/                         # Next.js App Router
│   ├── page.tsx                 # 首页（PERT网络图）
│   ├── dashboard/               # 工作台
│   ├── planning/                # 企划中心
│   ├── ai/                      # AI智能分析
│   ├── ai-review/               # AI审核中心
│   ├── styles/                  # 款式管理
│   ├── design/                  # 设计资产
│   ├── production/              # 生产管理
│   ├── brands/                  # 品牌管理
│   ├── suppliers/               # 供应商管理
│   ├── sales/                   # 销售管理
│   ├── aftersales/              # 售后管理
│   ├── inspiration/             # 灵感库
│   ├── todos/                   # 待办中心
│   ├── settings/                # 设置
│   ├── admin/                   # 管理后台
│   ├── api/                     # API路由（90+端点）
│   │   ├── ai/                  # AI服务（测款/生图/销量预测/供应商匹配）
│   │   ├── planning/ai/         # 企划AI（品牌DNA/趋势/面料/色彩/定价）
│   │   ├── styles/[id]/         # 款式子资源（BOM/打样/采购/生产/质检/库存）
│   │   ├── suppliers/           # 供应商管理API
│   │   ├── organization/        # 组织架构API
│   │   ├── pipeline/            # Pipeline恢复API
│   │   └── ...
│   └── login/                   # 登录页
├── src/
│   ├── components/
│   │   ├── layout/              # 侧边栏布局、租户切换器
│   │   ├── styles/              # 款式相关组件（14个表单/展示组件）
│   │   ├── chat/                # AI对话面板
│   │   ├── ai/                  # AI对话弹窗、AI助手面板
│   │   ├── planning/            # 灵感白板组件
│   │   └── ui/                  # shadcn/ui基础组件
│   ├── lib/
│   │   ├── ai/                  # AI架构定义、Cloudflare AI封装、JSON解析
│   │   ├── auth/                # 认证、RBAC、权限、审计、租户上下文
│   │   ├── db/                  # 数据库客户端、Drizzle Schema、字段映射
│   │   ├── events/              # 事件总线（29种事件类型）
│   │   ├── pipeline/            # Pipeline引擎（注册/执行/步骤定义）
│   │   ├── skills/              # Skill系统（注册/执行/4个内置技能）
│   │   ├── storage/             # Supabase Storage上传下载
│   │   ├── workflow/            # 款式状态机、状态流转、负责人解析
│   │   └── api/                 # API调用Hook
│   ├── services/
│   │   └── crawler.ts           # 爬虫服务（小红书/淘宝趋势数据）
│   └── middleware.ts            # 中间件（已移至Supabase Auth处理）
├── supabase/
│   └── migrations/              # 29个数据库迁移脚本
├── public/                      # 静态资源
├── drizzle.config.ts            # Drizzle ORM配置
├── next.config.mjs              # Next.js配置（Turbopack + instrumentation）
├── wrangler.toml                # Cloudflare Pages部署配置（含Cron触发器）
├── tailwind.config.ts           # Tailwind配置
├── tsconfig.json                # TypeScript配置
└── package.json                 # 依赖管理
```

---

## 三、AI架构

### 3.1 三级角色体系

| 层级 | 名称 | 职责 |
|------|------|------|
| Level 1 | AI总控（AI Master） | 品牌全局决策、战略建议、跨工序协调 |
| Level 2 | AI工序专员（AI Specialist） | 企划/设计/打样/测款/采购/备货/销售/售后 8个专员 |
| Level 3 | AI执行助手（AI Assistant） | 色彩匹配、面料选择、技术包生成等 16+ 专项助手 |

### 3.2 事件驱动 Pipeline

| Pipeline | 触发条件 | 执行步骤 |
|----------|---------|---------|
| 日签到 | 每日 9:00 Cron | 数据汇总 → AI分析 → 飞书/微信推送 |
| 采购自动化 | 物料缺料事件 | 供应商匹配 → 采购单生成 → 审批流 |
| 测款决策下单 | 测款数据就绪 | AI评分 → 下单建议 → 人工确认 → 创建生产单 |

### 3.3 内置 Skill

| Skill | 功能 |
|-------|------|
| 技术包生成 | 根据款式信息自动生成BOM、工艺单、尺码表 |
| 采购单生成 | 根据缺料清单自动创建采购订单 |
| 飞书通知 | 通过 Webhook 发送飞书消息/卡片 |
| 微信通知 | 通过 Webhook 发送企业微信消息 |

---

## 四、数据库设计

### 4.1 核心表（25+张）

| 分类 | 表名 | 说明 |
|------|------|------|
| 款式核心 | `styles`, `designAssets`, `techPacks`, `bomItems` | 款式、设计资产、技术包、物料清单 |
| 供应链 | `samplingRecords`, `materialProcurement`, `productionOrders` | 打样、采购、生产 |
| 质量/库存 | `qcRecords`, `inventory` | 质检、库存 |
| 销售/售后 | `salesData`, `afterSales` | 销售、售后 |
| 供应商 | `suppliers` | 供应商档案 |
| 企划 | `planning`, `moodBoards`, `moodBoardShapes`, `moodBoardAreas`, `moodBoardAssets` | 企划、灵感白板 |
| 组织 | `companies`, `brands`, `profiles`, `userBrands`, `seasons` | 多租户组织架构 |
| AI | `aiSuggestions` | AI建议记录 |
| 审批 | `approvalFlows`, `operationLogs`, `dataVersions` | 审批流、操作日志、数据版本 |
| 系统 | `tempAuthorizations` | 临时授权 |

### 4.2 枚举类型（10个）

`style_status`, `design_asset_type`, `material_type`, `sampling_status`, `procurement_status`, `production_status`, `qc_type`, `qc_result`, `after_sales_type`, `supplier_type`

---

## 五、开发计划

### 5.1 已完成阶段

| 阶段 | 说明 |
|------|------|
| Phase 1 MVP | 款式设计、打样管理、物料采购、大货生产、库存管理 |
| Phase 2 企划+AI | 企划中心、AI趋势分析、AI测款、AI销量预估、供应商智能匹配 |
| Phase 3 销售+售后+看板 | 销售管理、售后管理、数据看板 |
| 首页重构 | PERT网络图风格首页，点击节点跳转对应工作台 |
| AI Pipeline | 事件系统 + 3条自动化Pipeline + Skill系统 |
| 通信集成 | 飞书/微信 Webhook 通知 |
| 5大功能 | 物料缺料预警、灵感白板、3D样衣展示、供应商评分体系、售后缺陷反向迭代 |
| 多租户安全 | RLS品牌隔离、操作审计、数据版本、审批流 |

### 5.2 待完善内容

| 任务 | 优先级 |
|------|--------|
| 企划中心子模块细化（商品/设计/面料/色彩企划） | 高 |
| 测款中心细化（AI生图、市场测试、接受度评估） | 高 |
| 生产管理页面完善（生产订单、进度跟踪） | 高 |
| 设计资产库页面开发 | 中 |
| 销售趋势图表动态化 | 中 |
| 用户权限体系（按角色区分功能可见性） | 低 |

---

## 六、运行项目

### 6.1 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 6.2 构建部署

```bash
# 构建
npm run build

# 类型检查
npx tsc --noEmit

# 部署到 Cloudflare Pages
npm run pages:build
npx wrangler pages deploy .vercel/output/static
```

---

## 七、环境变量

在 `.env.local` 中配置：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cloudflare Workers AI
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_AI_TOKEN=your-ai-token

# AI Pipeline 内部密钥
AI_API_KEY=generate-a-strong-random-string

# 通信渠道
LARK_WEBHOOK_URL=
WECHAT_WEBHOOK_URL=

# 应用配置
NODE_ENV=development
```

---

## 八、数据库初始化

```bash
# 执行迁移脚本
npx supabase migration up

# 刷新数据库类型
npx supabase gen types --local > src/types/supabase.ts

# 或使用 Drizzle
npx drizzle-kit push
```
