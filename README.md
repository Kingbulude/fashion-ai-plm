# fashion-ai-plm

服装AI全链路品牌自研管理系统

## 项目定位

面向轻资产服装品牌（无工厂、全外包生产）的 AI 全链路自研管理系统。以「款式生命周期」为核心，用 2 人团队实现传统大服装品牌公司所需的企划、设计、打样、大货、销售、售后全链路数字化闭环。

## 核心理念

1. **工作流驱动，非模块驱动**：系统是 5 条工作流串联的「数字流水线」
2. **AI 隐形嵌入**：AI 嵌入每个用户动作自动触发
3. **款号唯一主键**：所有数据围绕 `style_no` 归集，终身可追溯
4. **小而美优先**：前期不做多租户、不做复杂权限
5. **可平滑扩容**：先自用、后付费升级、最后私有化自建

## 技术栈

- **框架**：Next.js 14 (App Router)
- **语言**：TypeScript 5+
- **UI**：Tailwind CSS + shadcn/ui
- **白板**：tldraw
- **数据库**：Supabase (PostgreSQL)
- **ORM**：Drizzle ORM
- **文件存储**：Cloudflare R2
- **AI**：DeepSeek API + 豆包/Seedream API
- **部署**：Vercel

## 架构文档

详细设计文档见 [docs/superpowers/specs/2026-07-15-styleforge-design.md](docs/superpowers/specs/2026-07-15-styleforge-design.md)