-- 性能优化：为高频查询字段添加索引
-- 这些索引覆盖经营分析、列表筛选、状态流转等核心链路

-- 补全生产订单完成时间字段（用于准交率统计）
ALTER TABLE public.production_orders
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 款式表：品牌/季节/状态/公司是列表页和分析 API 的核心过滤条件
CREATE INDEX IF NOT EXISTS idx_styles_brand_id ON public.styles(brand_id);
CREATE INDEX IF NOT EXISTS idx_styles_season_id ON public.styles(season_id);
CREATE INDEX IF NOT EXISTS idx_styles_status ON public.styles(status);
CREATE INDEX IF NOT EXISTS idx_styles_company_id ON public.styles(company_id);
CREATE INDEX IF NOT EXISTS idx_styles_brand_season_status ON public.styles(brand_id, season_id, status);

-- 生产订单：按款式查询、状态统计是生产看板核心
CREATE INDEX IF NOT EXISTS idx_production_orders_style_id ON public.production_orders(style_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON public.production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_orders_company_id ON public.production_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_brand_id ON public.production_orders(brand_id);

-- 采购单：按款式和状态查询
CREATE INDEX IF NOT EXISTS idx_material_procurement_style_id ON public.material_procurement(style_id);
CREATE INDEX IF NOT EXISTS idx_material_procurement_status ON public.material_procurement(status);

-- 销售记录：按款式查询用于经营分析
CREATE INDEX IF NOT EXISTS idx_sales_records_style_id ON public.sales_records(style_id);
CREATE INDEX IF NOT EXISTS idx_sales_records_sale_date ON public.sales_records(sale_date);

-- 售后记录：按款式和类型查询
CREATE INDEX IF NOT EXISTS idx_aftersales_records_style_id ON public.aftersales_records(style_id);
CREATE INDEX IF NOT EXISTS idx_aftersales_records_type ON public.aftersales_records(type);

-- 供应商：公司隔离和活跃状态筛选
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON public.suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON public.suppliers(is_active);

-- 待办：负责人、状态、租户隔离
CREATE INDEX IF NOT EXISTS idx_todos_assigned_to ON public.todos(assigned_to);
CREATE INDEX IF NOT EXISTS idx_todos_status ON public.todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_company_id ON public.todos(company_id);
CREATE INDEX IF NOT EXISTS idx_todos_brand_id ON public.todos(brand_id);

-- 操作日志：按目标表/目标 ID 查询款式历史
CREATE INDEX IF NOT EXISTS idx_operation_logs_target ON public.operation_logs(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON public.operation_logs(user_id);

-- 数据版本：按表名和记录 ID 查询历史
CREATE INDEX IF NOT EXISTS idx_data_versions_record ON public.data_versions(table_name, record_id);

-- 款式关联表统一索引：设计资产、工艺包、BOM、打样、入库
CREATE INDEX IF NOT EXISTS idx_design_assets_style_id ON public.design_assets(style_id);
CREATE INDEX IF NOT EXISTS idx_tech_packs_style_id ON public.tech_packs(style_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_style_id ON public.bom_items(style_id);
CREATE INDEX IF NOT EXISTS idx_sampling_records_style_id ON public.sampling_records(style_id);
CREATE INDEX IF NOT EXISTS idx_inventory_records_style_id ON public.inventory_records(style_id);
CREATE INDEX IF NOT EXISTS idx_qc_records_style_id ON public.qc_records(style_id);

-- AI 建议：品牌和状态筛选
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_brand_id ON public.ai_suggestions(brand_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON public.ai_suggestions(status);
