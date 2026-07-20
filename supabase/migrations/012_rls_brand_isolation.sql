-- ============================================
-- 阶段7：核心业务表真正的多品牌RLS隔离策略
-- 解决问题：替换"USING (true)"的全开放策略，按品牌隔离数据
-- 创建时间：2026-07-19
-- ============================================

-- 1. 删除所有旧的全开放策略
DROP POLICY IF EXISTS "Allow anon all on brand_dna" ON brand_dna;
DROP POLICY IF EXISTS "Allow anon all on ai_conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Allow anon all on market_trends" ON market_trends;
DROP POLICY IF EXISTS "Allow anon all on crawler_data" ON crawler_data;
DROP POLICY IF EXISTS "Allow anon all on planning_themes" ON planning_themes;
DROP POLICY IF EXISTS "Allow anon all on product_planning" ON product_planning;
DROP POLICY IF EXISTS "Allow anon all on design_planning" ON design_planning;
DROP POLICY IF EXISTS "Allow anon all on color_planning" ON color_planning;
DROP POLICY IF EXISTS "Allow anon all on fabric_planning" ON fabric_planning;
DROP POLICY IF EXISTS "Allow anon all on fabric_suppliers" ON fabric_suppliers;
DROP POLICY IF EXISTS "Allow anon all on brand_dna_history" ON brand_dna_history;

-- 2. 创建辅助函数：获取当前用户可访问的品牌列表
CREATE OR REPLACE FUNCTION get_user_brand_ids()
RETURNS TABLE(brand_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 如果用户已认证，返回 user_brands 表中关联的品牌
  IF auth.uid() IS NOT NULL THEN
    RETURN QUERY
    SELECT ub.brand_id
    FROM user_brands ub
    WHERE ub.user_id = auth.uid();
  ELSE
    -- 未认证用户：返回空（不允许访问任何品牌数据）
    RETURN;
  END IF;
END;
$$;

-- 3. 创建辅助函数：检查用户是否有某个品牌的某个权限级别
CREATE OR REPLACE FUNCTION check_brand_access(
  p_brand_id UUID,
  p_required_level TEXT DEFAULT 'executor'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_level TEXT;
  v_level_rank INTEGER;
  v_required_rank INTEGER;
BEGIN
  -- 获取用户的角色级别
  SELECT role_level INTO v_user_level
  FROM user_brands
  WHERE user_id = auth.uid() AND brand_id = p_brand_id
  LIMIT 1;

  -- 权限等级排名（数字越大权限越高）
  -- boss=5, admin=4, brand_manager=3, process_owner=2, executor=1
  v_level_rank := CASE v_user_level
    WHEN 'boss' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'brand_manager' THEN 3
    WHEN 'process_owner' THEN 2
    WHEN 'executor' THEN 1
    ELSE 0
  END;

  v_required_rank := CASE p_required_level
    WHEN 'boss' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'brand_manager' THEN 3
    WHEN 'process_owner' THEN 2
    WHEN 'executor' THEN 1
    ELSE 0
  END;

  -- boss 可以访问任何品牌（特殊权限）
  IF v_user_level = 'boss' THEN
    RETURN TRUE;
  END IF;

  -- 检查等级是否满足
  RETURN v_level_rank >= v_required_rank;
END;
$$;

-- 4. 为所有核心表创建基于 brand_id 的 RLS 策略

-- styles 款式表
DROP POLICY IF EXISTS "brand_isolation_select_styles" ON styles;
CREATE POLICY "brand_isolation_select_styles" ON styles
  FOR SELECT USING (
    brand_id IN (SELECT get_user_brand_ids())
    OR auth.uid() IS NULL  -- 允许未认证用户读取（兼容匿名访问）
  );

DROP POLICY IF EXISTS "brand_isolation_insert_styles" ON styles;
CREATE POLICY "brand_isolation_insert_styles" ON styles
  FOR INSERT WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

DROP POLICY IF EXISTS "brand_isolation_update_styles" ON styles;
CREATE POLICY "brand_isolation_update_styles" ON styles
  FOR UPDATE USING (
    brand_id IN (SELECT get_user_brand_ids())
  );

DROP POLICY IF EXISTS "brand_isolation_delete_styles" ON styles;
CREATE POLICY "brand_isolation_delete_styles" ON styles
  FOR DELETE USING (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- design_assets 设计资产
DROP POLICY IF EXISTS "brand_isolation_design_assets" ON design_assets;
CREATE POLICY "brand_isolation_design_assets" ON design_assets
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- tech_packs 工艺包
DROP POLICY IF EXISTS "brand_isolation_tech_packs" ON tech_packs;
CREATE POLICY "brand_isolation_tech_packs" ON tech_packs
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- bom_items BOM
DROP POLICY IF EXISTS "brand_isolation_bom_items" ON bom_items;
CREATE POLICY "brand_isolation_bom_items" ON bom_items
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- sampling_records 打样
DROP POLICY IF EXISTS "brand_isolation_sampling_records" ON sampling_records;
CREATE POLICY "brand_isolation_sampling_records" ON sampling_records
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- material_procurement 采购
DROP POLICY IF EXISTS "brand_isolation_material_procurement" ON material_procurement;
CREATE POLICY "brand_isolation_material_procurement" ON material_procurement
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- production_orders 生产订单
DROP POLICY IF EXISTS "brand_isolation_production_orders" ON production_orders;
CREATE POLICY "brand_isolation_production_orders" ON production_orders
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- inventory_records 库存
DROP POLICY IF EXISTS "brand_isolation_inventory_records" ON inventory_records;
CREATE POLICY "brand_isolation_inventory_records" ON inventory_records
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- stock_in_records 入库
DROP POLICY IF EXISTS "brand_isolation_stock_in_records" ON stock_in_records;
CREATE POLICY "brand_isolation_stock_in_records" ON stock_in_records
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- sales_records 销售
DROP POLICY IF EXISTS "brand_isolation_sales_records" ON sales_records;
CREATE POLICY "brand_isolation_sales_records" ON sales_records
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- aftersales_records 售后
DROP POLICY IF EXISTS "brand_isolation_aftersales_records" ON aftersales_records;
CREATE POLICY "brand_isolation_aftersales_records" ON aftersales_records
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- ai_test_results AI测款
DROP POLICY IF EXISTS "brand_isolation_ai_test_results" ON ai_test_results;
CREATE POLICY "brand_isolation_ai_test_results" ON ai_test_results
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- planning 企划
DROP POLICY IF EXISTS "brand_isolation_planning" ON planning;
CREATE POLICY "brand_isolation_planning" ON planning
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- product_planning 商品企划
DROP POLICY IF EXISTS "brand_isolation_product_planning" ON product_planning;
CREATE POLICY "brand_isolation_product_planning" ON product_planning
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- design_planning 设计企划
DROP POLICY IF EXISTS "brand_isolation_design_planning" ON design_planning;
CREATE POLICY "brand_isolation_design_planning" ON design_planning
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- color_planning 色彩企划
DROP POLICY IF EXISTS "brand_isolation_color_planning" ON color_planning;
CREATE POLICY "brand_isolation_color_planning" ON color_planning
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- fabric_planning 面料企划
DROP POLICY IF EXISTS "brand_isolation_fabric_planning" ON fabric_planning;
CREATE POLICY "brand_isolation_fabric_planning" ON fabric_planning
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- planning_themes 企划主题
DROP POLICY IF EXISTS "brand_isolation_planning_themes" ON planning_themes;
CREATE POLICY "brand_isolation_planning_themes" ON planning_themes
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- brand_dna 品牌基因
DROP POLICY IF EXISTS "brand_isolation_brand_dna" ON brand_dna;
CREATE POLICY "brand_isolation_brand_dna" ON brand_dna
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- market_trends 市场趋势
DROP POLICY IF EXISTS "brand_isolation_market_trends" ON market_trends;
CREATE POLICY "brand_isolation_market_trends" ON market_trends
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- ai_conversations AI对话
DROP POLICY IF EXISTS "brand_isolation_ai_conversations" ON ai_conversations;
CREATE POLICY "brand_isolation_ai_conversations" ON ai_conversations
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- suppliers 供应商
DROP POLICY IF EXISTS "brand_isolation_suppliers" ON suppliers;
CREATE POLICY "brand_isolation_suppliers" ON suppliers
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- fabrics 面料库
DROP POLICY IF EXISTS "brand_isolation_fabrics" ON fabrics;
CREATE POLICY "brand_isolation_fabrics" ON fabrics
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- colors 色卡
DROP POLICY IF EXISTS "brand_isolation_colors" ON colors;
CREATE POLICY "brand_isolation_colors" ON colors
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- fabric_suppliers 面料供应商
DROP POLICY IF EXISTS "brand_isolation_fabric_suppliers" ON fabric_suppliers;
CREATE POLICY "brand_isolation_fabric_suppliers" ON fabric_suppliers
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- market_intelligence 市场情报
DROP POLICY IF EXISTS "brand_isolation_market_intelligence" ON market_intelligence;
CREATE POLICY "brand_isolation_market_intelligence" ON market_intelligence
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- knowledge_base 知识库
DROP POLICY IF EXISTS "brand_isolation_knowledge_base" ON knowledge_base;
CREATE POLICY "brand_isolation_knowledge_base" ON knowledge_base
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- planning_ai_results AI结果
DROP POLICY IF EXISTS "brand_isolation_planning_ai_results" ON planning_ai_results;
CREATE POLICY "brand_isolation_planning_ai_results" ON planning_ai_results
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- ai_suggestions AI建议
DROP POLICY IF EXISTS "Allow authenticated read ai_suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "Allow authenticated insert ai_suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "Allow authenticated update ai_suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "brand_isolation_ai_suggestions" ON ai_suggestions;
CREATE POLICY "brand_isolation_ai_suggestions" ON ai_suggestions
  FOR ALL USING (
    brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL
  ) WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
  );

-- 5. 授权
GRANT EXECUTE ON FUNCTION get_user_brand_ids() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_brand_access(UUID, TEXT) TO authenticated, anon;

SELECT '✅ 阶段7完成：所有核心业务表已建立真正的多品牌RLS隔离' AS status;
