-- ============================================
-- 阶段6：核心业务表添加多品牌归属字段
-- 解决问题：核心业务表（款式/BOM/打样/生产/销售/售后）缺少 company_id/brand_id/season_id
-- 创建时间：2026-07-19
-- ============================================

-- 1. styles 款式表（最核心！）
ALTER TABLE styles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 创建索引（多品牌数据隔离的关键索引）
CREATE INDEX IF NOT EXISTS idx_styles_company_id ON styles(company_id);
CREATE INDEX IF NOT EXISTS idx_styles_brand_id ON styles(brand_id);
CREATE INDEX IF NOT EXISTS idx_styles_season_id ON styles(season_id);
CREATE INDEX IF NOT EXISTS idx_styles_brand_season ON styles(brand_id, season_id);

-- 回填默认公司（已有数据）
UPDATE styles
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- 修改 style_no 唯一约束为（brand_id, style_no）复合唯一
ALTER TABLE styles DROP CONSTRAINT IF EXISTS styles_style_no_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_styles_brand_style_no ON styles(brand_id, style_no) WHERE brand_id IS NOT NULL;

-- 2. design_assets 设计资产表
ALTER TABLE design_assets
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_design_assets_company_id ON design_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_design_assets_brand_id ON design_assets(brand_id);

UPDATE design_assets
SET company_id = (SELECT company_id FROM styles WHERE styles.id = design_assets.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = design_assets.style_id LIMIT 1)
WHERE company_id IS NULL;

-- 3. tech_packs 工艺包表
ALTER TABLE tech_packs
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'; -- draft / approved / locked

CREATE INDEX IF NOT EXISTS idx_tech_packs_company_id ON tech_packs(company_id);
CREATE INDEX IF NOT EXISTS idx_tech_packs_brand_id ON tech_packs(brand_id);
CREATE INDEX IF NOT EXISTS idx_tech_packs_season_id ON tech_packs(season_id);

UPDATE tech_packs
SET company_id = (SELECT company_id FROM styles WHERE styles.id = tech_packs.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = tech_packs.style_id LIMIT 1)
WHERE company_id IS NULL;

-- 4. bom_items BOM表
ALTER TABLE bom_items
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'; -- draft / approved / locked

CREATE INDEX IF NOT EXISTS idx_bom_items_company_id ON bom_items(company_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_brand_id ON bom_items(brand_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_season_id ON bom_items(season_id);

UPDATE bom_items
SET company_id = (SELECT company_id FROM styles WHERE styles.id = bom_items.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = bom_items.style_id LIMIT 1)
WHERE company_id IS NULL;

-- 5. sampling_records 打样记录表
ALTER TABLE sampling_records
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS round_no INTEGER NOT NULL DEFAULT 1; -- 样衣轮次

CREATE INDEX IF NOT EXISTS idx_sampling_records_company_id ON sampling_records(company_id);
CREATE INDEX IF NOT EXISTS idx_sampling_records_brand_id ON sampling_records(brand_id);

UPDATE sampling_records
SET company_id = (SELECT company_id FROM styles WHERE styles.id = sampling_records.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = sampling_records.style_id LIMIT 1)
WHERE company_id IS NULL;

-- 6. material_procurement 采购表
ALTER TABLE material_procurement
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_material_procurement_company_id ON material_procurement(company_id);
CREATE INDEX IF NOT EXISTS idx_material_procurement_brand_id ON material_procurement(brand_id);

UPDATE material_procurement
SET company_id = (SELECT company_id FROM styles WHERE styles.id = material_procurement.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = material_procurement.style_id LIMIT 1)
WHERE company_id IS NULL;

-- 7. production_orders 生产订单表
ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_production_orders_company_id ON production_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_brand_id ON production_orders(brand_id);

UPDATE production_orders
SET company_id = (SELECT company_id FROM styles WHERE styles.id = production_orders.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = production_orders.style_id LIMIT 1)
WHERE company_id IS NULL;

-- 8. inventory_records 库存表
ALTER TABLE inventory_records
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_records_company_id ON inventory_records(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_records_brand_id ON inventory_records(brand_id);

UPDATE inventory_records
SET company_id = (SELECT company_id FROM styles WHERE styles.id = inventory_records.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = inventory_records.style_id LIMIT 1)
WHERE company_id IS NULL;

-- 9. stock_in_records 入库表
ALTER TABLE stock_in_records
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_stock_in_records_company_id ON stock_in_records(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_in_records_brand_id ON stock_in_records(brand_id);

UPDATE stock_in_records
SET company_id = (SELECT company_id FROM styles WHERE styles.id = stock_in_records.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = stock_in_records.style_id LIMIT 1)
WHERE company_id IS NULL;

-- 10. sales_records 销售表
ALTER TABLE sales_records
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_records_company_id ON sales_records(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_records_brand_id ON sales_records(brand_id);

UPDATE sales_records
SET company_id = (SELECT company_id FROM styles WHERE styles.id = sales_records.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = sales_records.style_id LIMIT 1)
WHERE company_id IS NULL;

-- 11. aftersales_records 售后表
ALTER TABLE aftersales_records
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_aftersales_records_company_id ON aftersales_records(company_id);
CREATE INDEX IF NOT EXISTS idx_aftersales_records_brand_id ON aftersales_records(brand_id);

UPDATE aftersales_records
SET company_id = (SELECT company_id FROM styles WHERE styles.id = aftersales_records.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = aftersales_records.style_id LIMIT 1)
WHERE company_id IS NULL;

-- 12. ai_test_results AI测款表
ALTER TABLE ai_test_results
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ai_test_results_company_id ON ai_test_results(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_test_results_brand_id ON ai_test_results(brand_id);

UPDATE ai_test_results
SET company_id = (SELECT company_id FROM styles WHERE styles.id = ai_test_results.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = ai_test_results.style_id LIMIT 1)
WHERE company_id IS NULL;

-- 13. planning 企划表
ALTER TABLE planning
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'; -- draft / active / locked / archived

CREATE INDEX IF NOT EXISTS idx_planning_company_id ON planning(company_id);
CREATE INDEX IF NOT EXISTS idx_planning_brand_id ON planning(brand_id);
CREATE INDEX IF NOT EXISTS idx_planning_season_id ON planning(season_id);

UPDATE planning
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- 14. product_planning 商品企划表
ALTER TABLE product_planning
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_planning_company_id ON product_planning(company_id);
CREATE INDEX IF NOT EXISTS idx_product_planning_brand_id ON product_planning(brand_id);

UPDATE product_planning
SET company_id = (SELECT company_id FROM planning WHERE planning.id = product_planning.planning_id LIMIT 1),
    brand_id = (SELECT brand_id FROM planning WHERE planning.id = product_planning.planning_id LIMIT 1)
WHERE company_id IS NULL;

-- 15. design_planning 设计企划表
ALTER TABLE design_planning
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_design_planning_company_id ON design_planning(company_id);
CREATE INDEX IF NOT EXISTS idx_design_planning_brand_id ON design_planning(brand_id);

UPDATE design_planning
SET company_id = (SELECT company_id FROM planning WHERE planning.id = design_planning.planning_id LIMIT 1),
    brand_id = (SELECT brand_id FROM planning WHERE planning.id = design_planning.planning_id LIMIT 1)
WHERE company_id IS NULL;

-- 16. color_planning 色彩企划表
ALTER TABLE color_planning
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_color_planning_company_id ON color_planning(company_id);
CREATE INDEX IF NOT EXISTS idx_color_planning_brand_id ON color_planning(brand_id);

UPDATE color_planning
SET company_id = (SELECT company_id FROM planning WHERE planning.id = color_planning.planning_id LIMIT 1),
    brand_id = (SELECT brand_id FROM planning WHERE planning.id = color_planning.planning_id LIMIT 1)
WHERE company_id IS NULL;

-- 17. fabric_planning 面料企划表
ALTER TABLE fabric_planning
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fabric_planning_company_id ON fabric_planning(company_id);
CREATE INDEX IF NOT EXISTS idx_fabric_planning_brand_id ON fabric_planning(brand_id);

UPDATE fabric_planning
SET company_id = (SELECT company_id FROM planning WHERE planning.id = fabric_planning.planning_id LIMIT 1),
    brand_id = (SELECT brand_id FROM planning WHERE planning.id = fabric_planning.planning_id LIMIT 1)
WHERE company_id IS NULL;

-- 18. suppliers 供应商表
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_brand_id ON suppliers(brand_id);

UPDATE suppliers
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- 19. fabrics 面料库
ALTER TABLE fabrics
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_fabrics_company_id ON fabrics(company_id);
CREATE INDEX IF NOT EXISTS idx_fabrics_brand_id ON fabrics(brand_id);

UPDATE fabrics
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- 20. colors 色卡
ALTER TABLE colors
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_colors_company_id ON colors(company_id);
CREATE INDEX IF NOT EXISTS idx_colors_brand_id ON colors(brand_id);

UPDATE colors
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- 21. fabric_suppliers 面料供应商
ALTER TABLE fabric_suppliers
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_fabric_suppliers_company_id ON fabric_suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_fabric_suppliers_brand_id ON fabric_suppliers(brand_id);

UPDATE fabric_suppliers
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- 22. market_intelligence 市场情报
ALTER TABLE market_intelligence
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_market_intelligence_company_id ON market_intelligence(company_id);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_brand_id ON market_intelligence(brand_id);

UPDATE market_intelligence
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- 23. knowledge_base 知识库
ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_knowledge_base_company_id ON knowledge_base(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_brand_id ON knowledge_base(brand_id);

UPDATE knowledge_base
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- 24. planning_ai_results AI结果
ALTER TABLE planning_ai_results
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_planning_ai_results_company_id ON planning_ai_results(company_id);
CREATE INDEX IF NOT EXISTS idx_planning_ai_results_brand_id ON planning_ai_results(brand_id);

UPDATE planning_ai_results
SET company_id = (SELECT company_id FROM planning WHERE planning.id = planning_ai_results.planning_id LIMIT 1),
    brand_id = (SELECT brand_id FROM planning WHERE planning.id = planning_ai_results.planning_id LIMIT 1)
WHERE company_id IS NULL;

-- 25. color_trends 色卡趋势
ALTER TABLE color_trends
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_color_trends_company_id ON color_trends(company_id);
CREATE INDEX IF NOT EXISTS idx_color_trends_brand_id ON color_trends(brand_id);

UPDATE color_trends
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- 26. fabric_trends 面料趋势
ALTER TABLE fabric_trends
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_fabric_trends_company_id ON fabric_trends(company_id);
CREATE INDEX IF NOT EXISTS idx_fabric_trends_brand_id ON fabric_trends(brand_id);

UPDATE fabric_trends
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- 27. ai_conversations AI对话
ALTER TABLE ai_conversations
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_company_id ON ai_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_brand_id ON ai_conversations(brand_id);

-- 28. brand_dna_history 品牌基因历史
ALTER TABLE brand_dna_history
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_brand_dna_history_company_id ON brand_dna_history(company_id);
CREATE INDEX IF NOT EXISTS idx_brand_dna_history_brand_id ON brand_dna_history(brand_id);

UPDATE brand_dna_history
SET company_id = (SELECT company_id FROM brand_dna WHERE brand_dna.id = brand_dna_history.brand_dna_id LIMIT 1),
    brand_id = (SELECT brand_id FROM brand_dna WHERE brand_dna.id = brand_dna_history.brand_dna_id LIMIT 1)
WHERE company_id IS NULL;

-- 29. process_nodes 工序节点
ALTER TABLE process_nodes
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_process_nodes_company_id ON process_nodes(company_id);
CREATE INDEX IF NOT EXISTS idx_process_nodes_brand_id ON process_nodes(brand_id);

UPDATE process_nodes
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- 30. process_links 工序链接
ALTER TABLE process_links
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_process_links_company_id ON process_links(company_id);
CREATE INDEX IF NOT EXISTS idx_process_links_brand_id ON process_links(brand_id);

UPDATE process_links
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- 31. data_versions 数据版本
ALTER TABLE data_versions
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_data_versions_company_id ON data_versions(company_id);
CREATE INDEX IF NOT EXISTS idx_data_versions_brand_id ON data_versions(brand_id);

SELECT '✅ 阶段6完成：所有核心业务表已添加 company_id/brand_id/season_id 字段' AS status;
