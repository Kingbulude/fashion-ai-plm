-- RLS 策略配置
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本

-- 为所有表创建允许所有用户访问的策略（MVP阶段简化配置）
-- 后续可以根据用户ID进行细粒度控制

-- styles 表策略
CREATE POLICY "Allow all users to read styles" ON styles
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert styles" ON styles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update styles" ON styles
  FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated users to delete styles" ON styles
  FOR DELETE USING (true);

-- design_assets 表策略
CREATE POLICY "Allow all users to read design_assets" ON design_assets
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert design_assets" ON design_assets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete design_assets" ON design_assets
  FOR DELETE USING (true);

-- tech_packs 表策略
CREATE POLICY "Allow all users to read tech_packs" ON tech_packs
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert tech_packs" ON tech_packs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update tech_packs" ON tech_packs
  FOR UPDATE USING (true);

-- bom_items 表策略
CREATE POLICY "Allow all users to read bom_items" ON bom_items
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert bom_items" ON bom_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update bom_items" ON bom_items
  FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated users to delete bom_items" ON bom_items
  FOR DELETE USING (true);

-- 启用表的 RLS（如果尚未启用）
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;

-- 刷新权限
GRANT ALL ON styles TO anon;
GRANT ALL ON styles TO authenticated;
GRANT ALL ON design_assets TO anon;
GRANT ALL ON design_assets TO authenticated;
GRANT ALL ON tech_packs TO anon;
GRANT ALL ON tech_packs TO authenticated;
GRANT ALL ON bom_items TO anon;
GRANT ALL ON bom_items TO authenticated;
