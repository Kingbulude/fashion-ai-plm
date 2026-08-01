# Phase 2：高价值闭环需求对齐文档

## 一、Phase 2 目标

打通「销售/库存 → 企划反馈」，先解决一个真实痛点，并验证 AI 建议可被采纳、记录、复盘的闭环价值。

## 二、选定优先场景：C. 款式衍生

> 设计师上传参考图，AI 生成多个款式方案 + BOM。

### 2.1 业务价值
- 降低设计师从参考图到可执行款式的重复劳动
- 将 AI 能力直接嵌入「设计」工序节点，产出可落地的设计稿与物料清单
- 为后续 Phase 3（设计生产智能化）沉淀数据与 Prompt 工程基础

### 2.2 使用流程

```
设计师进入「设计中心」AI 对话
  → 上传参考图 + 输入风格/面料/价格带等约束
  → AI 调用 style-derivative Skill
  → 返回 N 个款式方案（含设计说明、参考图、BOM 草案）
  → 设计师在对话中采纳/拒绝/修改某个方案
  → 被采纳的方案写入 styles 表，生成待办任务
  → 系统记录采纳率与反馈，用于优化后续生成
```

## 三、数据现状与外部对接

### 3.1 当前内部数据
- 销售数据：无
- 库存数据：无
- 历史季度数据：无

### 3.2 外部数据：淘宝
- 用户有淘宝外源数据需要对接
- **待确认**：淘宝开放平台是否提供对应接口？
  - 候选接口：淘宝商品搜索、生意参谋数据、订单数据等
  - 需要申请权限、确认数据字段、接入方式
- **建议**：Phase 2 先不阻塞在淘宝接口上，先用「设计师上传参考图」作为起点，淘宝数据作为后续增强输入

## 四、闭环机制：AI 建议 → 采纳 → 记录 → 反馈学习

### 4.1 建议查看位置
- 在对应工序环节的 AI 对话中查看（设计中心 AI 面板）
- 不另开独立页面，保持设计师工作流不中断

### 4.2 建议生命周期

| 阶段 | 动作 | 数据落点 |
|---|---|---|
| 生成 | AI 根据 Skill 输出建议 | `ai_recommendations` |
| 展示 | 在 AI 对话中渲染建议卡片 | 读 `ai_recommendations` |
| 采纳 | 用户点击「采纳」 | 更新 `ai_recommendations.status = adopted`，写入 `styles` 草稿 |
| 拒绝 | 用户点击「不感兴趣」 | 更新 `ai_recommendations.status = rejected`，记录原因 |
| 修改 | 用户基于建议修改后保存 | 更新 `ai_recommendations.status = modified`，保存修改 diff |
| 结果 | 款式后续销售/测款数据回流 | 写入 `style_outcomes`，关联原 recommendation |
| 学习 | 定期汇总采纳率与结果 | 更新 Skill Prompt /  Few-shot 示例 |

### 4.3 必须记录的指标
- 建议采纳率（adopted / total）
- 采纳后款式的后续表现（测款评分、销售额、退货率）
- 用户拒绝/修改原因（用于 Prompt 调优）
- 按品牌、季度、设计师、款式类别拆分的效果

## 五、数据库架构思考

### 5.1 现有数据库能否承载？

当前已有：
- `ai_skills`：Skill 定义与 Prompt 模板
- `styles`：款式主数据
- `todos`：待办任务

**结论：现有表不足以承载完整学习闭环，需要新增表。**

### 5.2 推荐新增表

```sql
-- AI 建议记录
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES ai_skills(id),
  brand_id UUID,
  season_id UUID,
  user_id UUID,
  process_node VARCHAR(50), -- 如 design
  context JSONB,            -- 用户输入、参考图 URL、约束条件
  result JSONB,             -- AI 生成的方案、BOM、说明
  status VARCHAR(20),       -- pending / adopted / rejected / modified
  reject_reason TEXT,
  modified_result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 建议后续结果
CREATE TABLE ai_recommendation_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES ai_recommendations(id),
  style_id UUID REFERENCES styles(id),
  outcome_type VARCHAR(50), -- test_score / sales / return_rate
  outcome_value NUMERIC,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Skill 效果与版本追踪
CREATE TABLE ai_skill_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES ai_skills(id),
  brand_id UUID,
  season_id UUID,
  total_recommendations INT DEFAULT 0,
  adopted_count INT DEFAULT 0,
  rejected_count INT DEFAULT 0,
  modified_count INT DEFAULT 0,
  avg_outcome_score NUMERIC,
  recorded_at TIMESTAMP DEFAULT NOW()
);
```

### 5.3 更好的实现方式

如果希望 AI「越来越懂这个品牌」，推荐：

1. **关系表 + Prompt 工程（首推）**
   - 用 PostgreSQL 记录建议、采纳、结果
   - 定期（ nightly ）汇总 metrics，更新 `ai_skills.prompt_template` 中的 few-shot 示例
   - 成本低、可控、可解释

2. **向量检索增强（RAG）**
   - 启用 Supabase `pgvector` 扩展
   - 将历史采纳方案、BOM、结果向量化
   - 生成新方案时检索相似历史优秀案例作为上下文
   - 适合品牌风格沉淀

3. **模型微调（长期）**
   - 积累 1000+ 条采纳记录后，可考虑微调小模型
   - 当前数据量为 0，不建议优先投入

**Phase 2 建议采用方案 1，为方案 2 预留表结构。**

## 六、用户角色与权限

| 功能 | 负责人 | 过滤维度 |
|---|---|---|
| 库存盘活建议 | 品牌负责人、商品专员 | 品牌、季度 |
| 企划辅助建议 | 品牌经理 | 品牌、季度 |
| 款式衍生建议 | 设计师 | 品牌、季度、工序节点 |

## 七、待决策事项

1. **淘宝接口**：是否确认可接入？能拿到哪些字段？
2. **款式衍生产物边界**：
   - 生成几个方案？（建议 3-5 个）
   - 每个方案包含哪些内容？（设计说明、参考图、BOM 草案、预估成本、工艺标签）
3. **采纳后动作**：
   - 是否自动生成 `styles` 草稿？
   - 是否自动生成设计师待办？
4. **上一季反馈建议（企划页面）**：
   - 用户暂无经验，建议 Phase 2 先不深入
   - 可作为 Phase 2 后期扩展项，或进入 Phase 3

## 八、下一步建议

1. 确认淘宝接口可行性与数据字段
2. 输出 Phase 2 技术设计文档（数据流、Skill 清单、API、页面）
3. 先实现「设计师上传参考图 → AI 生成款式方案 → 采纳写入 styles」最小闭环
4. 跑通后再叠加采纳率统计与 Prompt 优化
