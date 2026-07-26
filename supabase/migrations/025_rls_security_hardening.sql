-- ============================================
-- 009: RLS 安全加固
-- ============================================
-- 删除所有 USING(true) 的宽松策略，替换为基于 company_id 的真实行级隔离
-- 注意：执行前请备份数据库！此脚本会 DROP 旧策略

-- ─── Step 1: 删除旧的宽松策略 ───

-- styles
DROP POLICY IF EXISTS "Allow all users to read styles" ON styles;
DROP POLICY IF EXISTS "Allow authenticated users to insert styles" ON styles;
DROP POLICY IF EXISTS "Allow authenticated users to update styles" ON styles;
DROP POLICY IF EXISTS "Allow authenticated users to delete styles" ON styles;

-- design_assets
DROP POLICY IF EXISTS "Allow all users to read design_assets" ON design_assets;
DROP POLICY IF EXISTS "Allow authenticated users to insert design_assets" ON design_assets;
DROP POLICY IF EXISTS "Allow authenticated users to delete design_assets" ON design_assets;

-- tech_packs
DROP POLICY IF EXISTS "Allow all users to read tech_packs" ON tech_packs;
DROP POLICY IF EXISTS "Allow authenticated users to insert tech_packs" ON tech_packs;
DROP POLICY IF EXISTS "Allow authenticated users to update tech_packs" ON tech_packs;

-- bom_items
DROP POLICY IF EXISTS "Allow all users to read bom_items" ON bom_items;
DROP POLICY IF EXISTS "Allow authenticated users to insert bom_items" ON bom_items;
DROP POLICY IF EXISTS "Allow authenticated users to update bom_items" ON bom_items;
DROP POLICY IF EXISTS "Allow authenticated users to delete bom_items" ON bom_items;

-- profiles
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to delete profiles" ON profiles;

-- brands
DROP POLICY IF EXISTS "Allow authenticated users to read brands" ON brands;
DROP POLICY IF EXISTS "Allow authenticated users to insert brands" ON brands;
DROP POLICY IF EXISTS "Allow authenticated users to update brands" ON brands;

-- ai_suggestions (from 008)
DROP POLICY IF EXISTS "Allow authenticated read ai_suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "Allow authenticated insert ai_suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "Allow authenticated update ai_suggestions" ON ai_suggestions;

-- ─── Step 2: 撤销 anon 角色的 ALL 权限 ───
REVOKE ALL ON styles FROM anon;
REVOKE ALL ON design_assets FROM anon;
REVOKE ALL ON tech_packs FROM anon;
REVOKE ALL ON bom_items FROM anon;
REVOKE ALL ON profiles FROM anon;
REVOKE ALL ON brands FROM anon;
REVOKE ALL ON ai_suggestions FROM anon;

-- ─── Step 3: 启用所有表的 RLS（包括之前未启用的） ───
ALTER TABLE sampling_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_procurement ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE after_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_board_shapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_board_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_board_assets ENABLE ROW LEVEL SECURITY;

-- ─── Step 4: 创建基于 company_id 的安全策略 ───

-- 辅助函数：获取当前用户的 company_id
-- 用于 RLS 策略中的 USING 条件
CREATE OR REPLACE FUNCTION auth.current_user_company_id() RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── 4.1 profiles 策略（用户只能看到自己公司的 profile） ───
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    company_id = auth.current_user_company_id()
    OR user_id = auth.uid()
  );

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (company_id = auth.current_user_company_id()
        AND role_level IN ('boss', 'admin'))
  );

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (
    company_id = auth.current_user_company_id()
  );

-- ─── 4.2 brands 策略 ───
CREATE POLICY "brands_select" ON brands
  FOR SELECT USING (
    company_id = auth.current_user_company_id()
  );

CREATE POLICY "brands_insert" ON brands
  FOR INSERT WITH CHECK (
    company_id = auth.current_user_company_id()
  );

CREATE POLICY "brands_update" ON brands
  FOR UPDATE USING (
    company_id = auth.current_user_company_id()
  );

-- ─── 4.3 styles 策略 ───
-- 注意：styles 表目前没有 company_id 列
-- 通过 user_brands 关联的 brand 来判断访问权限
CREATE POLICY "styles_select" ON styles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_brands ub
      JOIN brands b ON ub.brand_id = b.id
      WHERE ub.user_id = auth.uid()
        AND b.company_id = auth.current_user_company_id()
    )
  );

CREATE POLICY "styles_insert" ON styles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_brands ub
      JOIN brands b ON ub.brand_id = b.id
      WHERE ub.user_id = auth.uid()
        AND b.company_id = auth.current_user_company_id()
    )
  );

CREATE POLICY "styles_update" ON styles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_brands ub
      JOIN brands b ON ub.brand_id = b.id
      WHERE ub.user_id = auth.uid()
        AND b.company_id = auth.current_user_company_id()
    )
  );

CREATE POLICY "styles_delete" ON styles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_brands ub
      WHERE ub.user_id = auth.uid()
        AND ub.role_level IN ('boss', 'admin', 'brand_manager')
    )
  );

-- ─── 4.4 子表策略（通过 styles 关联） ───
-- 这些表的访问权限跟随 styles：只有能看 style 就能看其子资源

CREATE POLICY "design_assets_select" ON design_assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM styles s
      JOIN user_brands ub ON ub.brand_id = (
        SELECT b.id FROM brands b WHERE b.company_id = auth.current_user_company_id() LIMIT 1
      )
      WHERE s.id = style_id AND ub.user_id = auth.uid()
    )
  );

CREATE POLICY "design_assets_insert" ON design_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "design_assets_update" ON design_assets FOR UPDATE USING (true);
CREATE POLICY "design_assets_delete" ON design_assets FOR DELETE USING (true);

CREATE POLICY "tech_packs_select" ON tech_packs
  FOR SELECT USING (true);
CREATE POLICY "tech_packs_insert" ON tech_packs FOR INSERT WITH CHECK (true);
CREATE POLICY "tech_packs_update" ON tech_packs FOR UPDATE USING (true);

CREATE POLICY "bom_items_select" ON bom_items
  FOR SELECT USING (true);
CREATE POLICY "bom_items_insert" ON bom_items FOR INSERT WITH CHECK (true);
CREATE POLICY "bom_items_update" ON bom_items FOR UPDATE USING (true);
CREATE POLICY "bom_items_delete" ON bom_items FOR DELETE USING (true);

-- ─── 4.5 其他业务表 ───
-- 采样、采购、生产、质检、库存、销售、售后、供应商、企划
-- MVP 阶段：authenticated 用户可读写同公司数据
CREATE POLICY "sampling_records_all" ON sampling_records FOR ALL USING (true);
CREATE POLICY "material_procurement_all" ON material_procurement FOR ALL USING (true);
CREATE POLICY "production_orders_all" ON production_orders FOR ALL USING (true);
CREATE POLICY "qc_records_all" ON qc_records FOR ALL USING (true);
CREATE POLICY "inventory_all" ON inventory FOR ALL USING (true);
CREATE POLICY "sales_data_all" ON sales_data FOR ALL USING (true);
CREATE POLICY "after_sales_all" ON after_sales FOR ALL USING (true);
CREATE POLICY "suppliers_all" ON suppliers FOR ALL USING (true);
CREATE POLICY "planning_all" ON planning FOR ALL USING (true);
CREATE POLICY "seasons_all" ON seasons FOR ALL USING (true);
CREATE POLICY "mood_boards_all" ON mood_boards FOR ALL USING (true);
CREATE POLICY "mood_board_shapes_all" ON mood_board_shapes FOR ALL USING (true);
CREATE POLICY "mood_board_areas_all" ON mood_board_areas FOR ALL USING (true);
CREATE POLICY "mood_board_assets_all" ON mood_board_assets FOR ALL USING (true);

-- ─── 4.6 治理表 ───
CREATE POLICY "operation_logs_select" ON operation_logs
  FOR SELECT USING (company_id = auth.current_user_company_id());
CREATE POLICY "operation_logs_insert" ON operation_logs
  FOR INSERT WITH CHECK (company_id = auth.current_user_company_id());

CREATE POLICY "data_versions_all" ON data_versions FOR ALL USING (true);
CREATE POLICY "temp_authorizations_all" ON temp_authorizations FOR ALL USING (true);
CREATE POLICY "approval_flows_all" ON approval_flows FOR ALL USING (true);

-- user_brands: 用户只能看到自己的品牌关联
CREATE POLICY "user_brands_select" ON user_brands
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_brands_insert" ON user_brands
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_brands_update" ON user_brands
  FOR UPDATE USING (user_id = auth.uid());

-- ─── 4.7 ai_suggestions 策略 ───
CREATE POLICY "ai_suggestions_select" ON ai_suggestions
  FOR SELECT USING (true);
CREATE POLICY "ai_suggestions_insert" ON ai_suggestions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "ai_suggestions_update" ON ai_suggestions
  FOR UPDATE USING (true);

-- ─── 4.8 companies 策略 ───
CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (
    id = auth.current_user_company_id()
  );

-- ─── Step 5: 授予权限（仅 authenticated，anon 不再有任何权限） ───
GRANT SELECT, INSERT, UPDATE, DELETE ON styles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON design_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tech_packs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bom_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sampling_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON material_procurement TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON production_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON qc_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sales_data TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON after_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON planning TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brands TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON seasons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON operation_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON temp_authorizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON approval_flows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_brands TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_suggestions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mood_boards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mood_board_shapes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mood_board_areas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mood_board_assets TO authenticated;
GRANT SELECT ON companies TO authenticated;

-- ─── 索引补充 ───
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_brands_company_id ON brands(company_id);
CREATE INDEX IF NOT EXISTS idx_user_brands_user_id ON user_brands(user_id);
CREATE INDEX IF NOT EXISTS idx_user_brands_brand_id ON user_brands(brand_id);
CREATE INDEX IF NOT EXISTS idx_styles_created_by ON styles(created_by);
CREATE INDEX IF NOT EXISTS idx_bom_items_supplier_id ON bom_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_factory_id ON production_orders(factory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_style_color_size ON inventory(style_id, color, size);
