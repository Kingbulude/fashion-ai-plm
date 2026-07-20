-- ============================================
-- 🚀 全合一初始化脚本（全新数据库）
-- 用途：在空白的 Supabase 项目一次性执行
-- 涵盖：001~012 全部迁移，按依赖顺序合并
-- 创建时间：2026-07-19
-- ============================================

-- ⚠️ 如果是重置，请在 Supabase SQL Editor 单独运行以下清空语句，然后才执行本脚本：
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- ============================================
-- 001_init_schema.sql
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 枚举类型
DO $$ BEGIN
  CREATE TYPE style_status AS ENUM ('planning', 'designing', 'designed', 'sampling', 'sampled', 'producing', 'produced', 'selling', 'sold', 'reviewing', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE design_asset_type AS ENUM ('inspiration', 'design', 'ai_derivative', '3d_sample');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE material_type AS ENUM ('fabric', 'accessory', 'packaging');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 款式表
CREATE TABLE IF NOT EXISTS styles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_no TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  season TEXT,
  category TEXT,
  status style_status NOT NULL DEFAULT 'planning',
  target_cost NUMERIC,
  actual_cost NUMERIC,
  description TEXT,
  ai_tags JSONB,
  ai_color_palette JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- 设计资产表
CREATE TABLE IF NOT EXISTS design_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  type design_asset_type NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT,
  thumbnail_url TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  ai_tags JSONB,
  ai_analysis JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 工艺包表
CREATE TABLE IF NOT EXISTS tech_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  size_chart JSONB,
  process_notes TEXT,
  sewing_standard TEXT,
  print_embroidery JSONB,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- BOM 物料清单表
CREATE TABLE IF NOT EXISTS bom_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  material_type material_type NOT NULL,
  specification TEXT,
  supplier_id UUID,
  unit_consumption NUMERIC NOT NULL,
  loss_rate NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC,
  total_cost NUMERIC,
  ai_suggested BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_assets_style_id ON design_assets(style_id);
CREATE INDEX IF NOT EXISTS idx_tech_packs_style_id ON tech_packs(style_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_style_id ON bom_items(style_id);
CREATE INDEX IF NOT EXISTS idx_styles_status ON styles(status);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_styles_updated_at ON styles;
CREATE TRIGGER update_styles_updated_at BEFORE UPDATE ON styles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 002_rls_policies.sql
-- ============================================
-- (基础表的 RLS 策略)
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read styles" ON styles;
DROP POLICY IF EXISTS "Allow public insert styles" ON styles;
DROP POLICY IF EXISTS "Allow public update styles" ON styles;
DROP POLICY IF EXISTS "Allow public delete styles" ON styles;

CREATE POLICY "Allow public read styles" ON styles FOR SELECT USING (true);
CREATE POLICY "Allow public insert styles" ON styles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update styles" ON styles FOR UPDATE USING (true);
CREATE POLICY "Allow public delete styles" ON styles FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read design_assets" ON design_assets;
DROP POLICY IF EXISTS "Allow public insert design_assets" ON design_assets;
DROP POLICY IF EXISTS "Allow public update design_assets" ON design_assets;
DROP POLICY IF EXISTS "Allow public delete design_assets" ON design_assets;
CREATE POLICY "Allow public read design_assets" ON design_assets FOR SELECT USING (true);
CREATE POLICY "Allow public insert design_assets" ON design_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update design_assets" ON design_assets FOR UPDATE USING (true);
CREATE POLICY "Allow public delete design_assets" ON design_assets FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read tech_packs" ON tech_packs;
DROP POLICY IF EXISTS "Allow public insert tech_packs" ON tech_packs;
DROP POLICY IF EXISTS "Allow public update tech_packs" ON tech_packs;
DROP POLICY IF EXISTS "Allow public delete tech_packs" ON tech_packs;
CREATE POLICY "Allow public read tech_packs" ON tech_packs FOR SELECT USING (true);
CREATE POLICY "Allow public insert tech_packs" ON tech_packs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update tech_packs" ON tech_packs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete tech_packs" ON tech_packs FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read bom_items" ON bom_items;
DROP POLICY IF EXISTS "Allow public insert bom_items" ON bom_items;
DROP POLICY IF EXISTS "Allow public update bom_items" ON bom_items;
DROP POLICY IF EXISTS "Allow public delete bom_items" ON bom_items;
CREATE POLICY "Allow public read bom_items" ON bom_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert bom_items" ON bom_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update bom_items" ON bom_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete bom_items" ON bom_items FOR DELETE USING (true);

-- ============================================
-- 003_additional_tables.sql
-- ============================================
-- 企划表
CREATE TABLE IF NOT EXISTS planning (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season TEXT NOT NULL,
  theme TEXT NOT NULL,
  category TEXT,
  target_cost NUMERIC,
  timeline TEXT,
  brand_story TEXT,
  target_audience TEXT,
  price_range TEXT,
  ai_trend_analysis TEXT,
  inspiration_tags JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fabrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  supplier TEXT,
  composition TEXT,
  price NUMERIC,
  usage TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  hex TEXT,
  usage TEXT,
  season TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sampling_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  sample_no TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requirements TEXT,
  target_date DATE,
  actual_date DATE,
  review_notes TEXT,
  cost NUMERIC,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS material_procurement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  bom_item_id UUID NOT NULL REFERENCES bom_items(id) ON DELETE CASCADE,
  supplier_id UUID,
  order_quantity NUMERIC NOT NULL,
  unit_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  order_date DATE,
  expected_date DATE,
  actual_date DATE,
  received_quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  rating NUMERIC DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  order_no TEXT UNIQUE NOT NULL,
  quantity NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  schedule JSONB,
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  batch_no TEXT,
  cost_price NUMERIC,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_in_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  batch_no TEXT,
  production_order_id UUID REFERENCES production_orders(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  order_no TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  channel TEXT,
  sale_date DATE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aftersales_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  sales_record_id UUID REFERENCES sales_records(id),
  type TEXT NOT NULL DEFAULT 'return',
  reason TEXT,
  quantity NUMERIC NOT NULL,
  amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  solution TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  ai_image_url TEXT,
  test_score NUMERIC,
  feedback_count NUMERIC,
  feedback_summary TEXT,
  suggested_quantity NUMERIC,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planning_season ON planning(season);
CREATE INDEX IF NOT EXISTS idx_sampling_records_style_id ON sampling_records(style_id);
CREATE INDEX IF NOT EXISTS idx_material_procurement_style_id ON material_procurement(style_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_style_id ON production_orders(style_id);
CREATE INDEX IF NOT EXISTS idx_inventory_records_style_id ON inventory_records(style_id);
CREATE INDEX IF NOT EXISTS idx_stock_in_records_style_id ON stock_in_records(style_id);
CREATE INDEX IF NOT EXISTS idx_sales_records_style_id ON sales_records(style_id);
CREATE INDEX IF NOT EXISTS idx_sales_records_date ON sales_records(sale_date);
CREATE INDEX IF NOT EXISTS idx_aftersales_records_style_id ON aftersales_records(style_id);
CREATE INDEX IF NOT EXISTS idx_ai_test_results_style_id ON ai_test_results(style_id);

DROP TRIGGER IF EXISTS update_planning_updated_at ON planning;
CREATE TRIGGER update_planning_updated_at BEFORE UPDATE ON planning
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_records_updated_at ON inventory_records;
CREATE TRIGGER update_inventory_records_updated_at BEFORE UPDATE ON inventory_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sampling_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_procurement ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_in_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE aftersales_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_test_results ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['planning','fabrics','colors','sampling_records','material_procurement','suppliers','production_orders','inventory_records','stock_in_records','sales_records','aftersales_records','ai_test_results'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow public read %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public insert %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public update %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public delete %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Allow public read %I" ON %I FOR SELECT USING (true)', t, t);
    EXECUTE format('CREATE POLICY "Allow public insert %I" ON %I FOR INSERT WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "Allow public update %I" ON %I FOR UPDATE USING (true)', t, t);
    EXECUTE format('CREATE POLICY "Allow public delete %I" ON %I FOR DELETE USING (true)', t, t);
  END LOOP;
END $$;

-- ============================================
-- 004_knowledge_base.sql
-- ============================================
-- 004 中的简化版 brand_dna 已被 010 的完整版替代，此处只补全 010 缺失的字段
ALTER TABLE brand_dna ADD COLUMN IF NOT EXISTS brand_mission TEXT;
ALTER TABLE brand_dna ADD COLUMN IF NOT EXISTS age_range VARCHAR(50);
ALTER TABLE brand_dna ADD COLUMN IF NOT EXISTS visual_identity JSONB;
ALTER TABLE brand_dna ADD COLUMN IF NOT EXISTS brand_story TEXT;
ALTER TABLE brand_dna ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE brand_dna ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TABLE IF NOT EXISTS market_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  keywords TEXT[],
  category VARCHAR(50),
  popularity_score INTEGER DEFAULT 0,
  trend_direction VARCHAR(20),
  brand_reference VARCHAR(100),
  url TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT[],
  metadata JSONB,
  referenced_by TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS planning_ai_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id UUID REFERENCES planning(id) ON DELETE CASCADE,
  skill_type VARCHAR(50) NOT NULL,
  skill_name VARCHAR(100),
  result JSONB NOT NULL,
  confidence_score DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS color_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season VARCHAR(20) NOT NULL,
  color_hex VARCHAR(7) NOT NULL,
  color_name VARCHAR(50),
  trend_level VARCHAR(20),
  usage_scenarios TEXT[],
  ai_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fabric_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fabric_name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  trend_level VARCHAR(20),
  properties JSONB,
  application_scenarios TEXT[],
  price_range VARCHAR(50),
  ai_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_intelligence_type ON market_intelligence(type);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_category ON market_intelligence(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_planning_ai_results_planning_id ON planning_ai_results(planning_id);
CREATE INDEX IF NOT EXISTS idx_color_trends_season ON color_trends(season);
CREATE INDEX IF NOT EXISTS idx_fabric_trends_category ON fabric_trends(category);

ALTER TABLE brand_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_ai_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE color_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_trends ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['brand_dna','market_intelligence','knowledge_base','planning_ai_results','color_trends','fabric_trends'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow public read %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public insert %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public update %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public delete %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Allow public read %I" ON %I FOR SELECT USING (true)', t, t);
    EXECUTE format('CREATE POLICY "Allow public insert %I" ON %I FOR INSERT WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "Allow public update %I" ON %I FOR UPDATE USING (true)', t, t);
    EXECUTE format('CREATE POLICY "Allow public delete %I" ON %I FOR DELETE USING (true)', t, t);
  END LOOP;
END $$;

INSERT INTO brand_dna (brand_name, brand_slogan, target_audience, style_direction, price_position, color_palette, core_values, competitive_advantage)
VALUES (
  'StyleForge',
  '以AI赋能时尚，让设计更精准',
  '25-35岁都市职场女性，追求品质与时尚的平衡',
  ARRAY['极简都市', '轻商务', '休闲舒适'],
  '中高端',
  ARRAY['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#ffffff'],
  ARRAY['品质至上', '创新设计', '数据驱动'],
  'AI驱动的全链路品牌管理系统，数据驱动决策'
) ON CONFLICT DO NOTHING;

-- ============================================
-- 005_brands_profiles.sql (基础版)
-- ============================================
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '小芳',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT '设计师',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

INSERT INTO brands (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'TEPNIX步戌') ON CONFLICT DO NOTHING;

INSERT INTO profiles (user_id, brand_id, name, role)
SELECT id, '00000000-0000-0000-0000-000000000001', '小芳', '设计师'
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.users.id);

DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 005_process_links.sql
-- ============================================
CREATE TABLE IF NOT EXISTS process_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL DEFAULT 0,
  stage TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS process_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_node_id UUID NOT NULL REFERENCES process_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES process_nodes(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'sequential',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE process_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read process_nodes" ON process_nodes;
DROP POLICY IF EXISTS "Allow public insert process_nodes" ON process_nodes;
DROP POLICY IF EXISTS "Allow public update process_nodes" ON process_nodes;
DROP POLICY IF EXISTS "Allow public delete process_nodes" ON process_nodes;
CREATE POLICY "Allow public read process_nodes" ON process_nodes FOR SELECT USING (true);
CREATE POLICY "Allow public insert process_nodes" ON process_nodes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update process_nodes" ON process_nodes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete process_nodes" ON process_nodes FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read process_links" ON process_links;
DROP POLICY IF EXISTS "Allow public insert process_links" ON process_links;
DROP POLICY IF EXISTS "Allow public update process_links" ON process_links;
DROP POLICY IF EXISTS "Allow public delete process_links" ON process_links;
CREATE POLICY "Allow public read process_links" ON process_links FOR SELECT USING (true);
CREATE POLICY "Allow public insert process_links" ON process_links FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update process_links" ON process_links FOR UPDATE USING (true);
CREATE POLICY "Allow public delete process_links" ON process_links FOR DELETE USING (true);

-- ============================================
-- 006_rls_policies_profiles_brands.sql
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to delete profiles" ON profiles;
CREATE POLICY "Allow authenticated users to read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update profiles" ON profiles FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated users to delete profiles" ON profiles FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read brands" ON brands;
DROP POLICY IF EXISTS "Allow authenticated users to insert brands" ON brands;
DROP POLICY IF EXISTS "Allow authenticated users to update brands" ON brands;
CREATE POLICY "Allow authenticated users to read brands" ON brands FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert brands" ON brands FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update brands" ON brands FOR UPDATE USING (true);

GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON brands TO anon, authenticated;

-- ============================================
-- 007_organization_architecture.sql ⭐ 必须！
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO companies (id, name) VALUES ('00000000-0000-0000-0000-000000000010', '默认公司') ON CONFLICT DO NOTHING;

ALTER TABLE brands ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
UPDATE brands SET company_id = '00000000-0000-0000-0000-000000000010' WHERE company_id IS NULL;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_level TEXT NOT NULL DEFAULT 'executor';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
UPDATE profiles SET company_id = '00000000-0000-0000-0000-000000000010' WHERE company_id IS NULL;

CREATE TABLE IF NOT EXISTS user_brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  role_level TEXT NOT NULL DEFAULT 'executor',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, brand_id)
);

INSERT INTO user_brands (user_id, brand_id, role_level)
SELECT p.user_id, '00000000-0000-0000-0000-000000000001', 'boss'
FROM profiles p
WHERE p.role_level = 'boss'
  AND NOT EXISTS (
    SELECT 1 FROM user_brands ub WHERE ub.user_id = p.user_id AND ub.brand_id = '00000000-0000-0000-0000-000000000001'
  );

CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  season_type TEXT NOT NULL CHECK (season_type IN ('SS', 'FW')),
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seasons_brand_id ON seasons(brand_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_brand_year_type ON seasons(brand_id, year, season_type);

CREATE TABLE IF NOT EXISTS operation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id TEXT,
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_brand_id ON operation_logs(brand_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);

CREATE TABLE IF NOT EXISTS data_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  data JSONB NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_versions_table_record ON data_versions(table_name, record_id);

CREATE TABLE IF NOT EXISTS temp_authorizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  data_scope TEXT NOT NULL,
  record_ids JSONB,
  expire_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_temp_auth_to_user ON temp_authorizations(to_user_id);
CREATE INDEX IF NOT EXISTS idx_temp_auth_status ON temp_authorizations(status);

CREATE TABLE IF NOT EXISTS approval_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  proposed_data JSONB NOT NULL,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending',
  review_comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_flows_status ON approval_flows(status);
CREATE INDEX IF NOT EXISTS idx_approval_flows_submitted_by ON approval_flows(submitted_by);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_flows ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['companies','user_brands','seasons','operation_logs','data_versions','temp_authorizations','approval_flows'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated read %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated insert %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated update %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated delete %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Allow authenticated read %I" ON %I FOR SELECT USING (true)', t, t);
    EXECUTE format('CREATE POLICY "Allow authenticated insert %I" ON %I FOR INSERT WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "Allow authenticated update %I" ON %I FOR UPDATE USING (true)', t, t);
  END LOOP;
END $$;

GRANT ALL ON companies TO authenticated;
GRANT ALL ON user_brands TO authenticated;
GRANT ALL ON seasons TO authenticated;
GRANT ALL ON operation_logs TO authenticated;
GRANT ALL ON data_versions TO authenticated;
GRANT ALL ON temp_authorizations TO authenticated;
GRANT ALL ON approval_flows TO authenticated;

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_seasons_updated_at ON seasons;
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 008_ai_architecture.sql
-- ============================================
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ai_role_level TEXT NOT NULL,
  specialist_type TEXT,
  assistant_type TEXT,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  process_node TEXT,
  type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  proposed_data JSONB,
  target_table TEXT,
  target_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by TEXT NOT NULL DEFAULT 'ai_system',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  review_comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expire_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON ai_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_brand ON ai_suggestions(brand_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_ai_role ON ai_suggestions(ai_role_level);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_priority ON ai_suggestions(priority);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created_at ON ai_suggestions(created_at);

ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read ai_suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "Allow authenticated insert ai_suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "Allow authenticated update ai_suggestions" ON ai_suggestions;
CREATE POLICY "Allow authenticated read ai_suggestions" ON ai_suggestions FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert ai_suggestions" ON ai_suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update ai_suggestions" ON ai_suggestions FOR UPDATE USING (true);

GRANT ALL ON ai_suggestions TO authenticated;

-- ============================================
-- 009_fix_profiles_anon_rls.sql (兼容)
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to delete profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read brands" ON brands;
DROP POLICY IF EXISTS "Allow authenticated users to insert brands" ON brands;
DROP POLICY IF EXISTS "Allow authenticated users to update brands" ON brands;

DROP POLICY IF EXISTS "allow_all_read_profiles" ON profiles;
DROP POLICY IF EXISTS "allow_all_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "allow_all_update_profiles" ON profiles;
DROP POLICY IF EXISTS "allow_all_delete_profiles" ON profiles;
DROP POLICY IF EXISTS "allow_all_read_brands" ON brands;
DROP POLICY IF EXISTS "allow_all_insert_brands" ON brands;
DROP POLICY IF EXISTS "allow_all_update_brands" ON brands;

CREATE POLICY allow_all_read_profiles ON profiles FOR SELECT USING (true);
CREATE POLICY allow_all_insert_profiles ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY allow_all_update_profiles ON profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY allow_all_delete_profiles ON profiles FOR DELETE USING (true);

CREATE POLICY allow_all_read_brands ON brands FOR SELECT USING (true);
CREATE POLICY allow_all_insert_brands ON brands FOR INSERT WITH CHECK (true);
CREATE POLICY allow_all_update_brands ON brands FOR UPDATE USING (true) WITH CHECK (true);

GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON brands TO anon, authenticated;

-- ============================================
-- 010_planning_system.sql
-- ============================================
CREATE TABLE IF NOT EXISTS brand_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id),
  brand_name VARCHAR(255) NOT NULL,
  brand_slogan TEXT,
  brand_mission TEXT,
  target_audience TEXT,
  age_range VARCHAR(50),
  style_direction TEXT[],
  price_position VARCHAR(50),
  core_values TEXT[],
  visual_identity JSONB,
  color_palette VARCHAR(7)[],
  brand_story TEXT,
  competitive_advantage TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id),
  skill_type VARCHAR(50) NOT NULL,
  skill_name VARCHAR(100) NOT NULL,
  conversation_data JSONB NOT NULL,
  current_step VARCHAR(50),
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS market_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id),
  trend_type VARCHAR(50) NOT NULL,
  trend_name VARCHAR(255) NOT NULL,
  description TEXT,
  confidence_score INTEGER DEFAULT 0,
  source VARCHAR(100),
  data_date DATE NOT NULL,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crawler_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL,
  search_query VARCHAR(255),
  data_type VARCHAR(50),
  raw_data JSONB,
  processed_data JSONB,
  crawl_time TIMESTAMP DEFAULT NOW(),
  brand_id UUID REFERENCES brands(id)
);

CREATE TABLE IF NOT EXISTS planning_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id),
  season VARCHAR(20) NOT NULL,
  theme_name VARCHAR(255) NOT NULL,
  theme_description TEXT,
  inspiration_source VARCHAR(255),
  mood_board JSONB,
  selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id UUID REFERENCES planning(id),
  theme_id UUID REFERENCES planning_themes(id),
  product_category VARCHAR(50),
  category_ratio DECIMAL(5,2),
  price_min DECIMAL(10,2),
  price_max DECIMAL(10,2),
  target_cost DECIMAL(10,2),
  sales_forecast INTEGER,
  launch_date DATE,
  product_structure JSONB,
  weather_factor TEXT,
  market_insights TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id UUID REFERENCES planning(id),
  theme_id UUID REFERENCES planning_themes(id),
  design_concept TEXT,
  inspiration_images JSONB,
  lookbook JSONB,
  design_elements JSONB,
  silhouette_description TEXT,
  detail_features TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS color_planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id UUID REFERENCES planning(id),
  theme_id UUID REFERENCES planning_themes(id),
  main_colors JSONB,
  accent_colors JSONB,
  base_colors JSONB,
  color_story TEXT,
  trend_analysis TEXT,
  brand_alignment_score INTEGER DEFAULT 0,
  color_mood VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fabric_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(100),
  contact_email VARCHAR(100),
  contact_phone VARCHAR(50),
  location VARCHAR(255),
  website VARCHAR(255),
  fabric_categories TEXT[],
  certifications TEXT[],
  rating DECIMAL(3,1),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fabric_planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id UUID REFERENCES planning(id),
  theme_id UUID REFERENCES planning_themes(id),
  fabric_name VARCHAR(255),
  supplier_id UUID REFERENCES fabric_suppliers(id),
  composition TEXT,
  unit_price DECIMAL(10,2),
  usage_area VARCHAR(100),
  properties JSONB,
  eco_certification VARCHAR(100),
  sample_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brand_dna_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_dna_id UUID REFERENCES brand_dna(id),
  change_type VARCHAR(20),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES profiles(user_id),
  changed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_dna_brand_id ON brand_dna(brand_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_skill ON ai_conversations(user_id, skill_type);
CREATE INDEX IF NOT EXISTS idx_market_trends_brand_date ON market_trends(brand_id, data_date);
CREATE INDEX IF NOT EXISTS idx_crawler_data_platform_time ON crawler_data(platform, crawl_time);
CREATE INDEX IF NOT EXISTS idx_planning_themes_season ON planning_themes(season);
CREATE INDEX IF NOT EXISTS idx_product_planning_planning_id ON product_planning(planning_id);
CREATE INDEX IF NOT EXISTS idx_design_planning_planning_id ON design_planning(planning_id);
CREATE INDEX IF NOT EXISTS idx_color_planning_planning_id ON color_planning(planning_id);
CREATE INDEX IF NOT EXISTS idx_fabric_planning_planning_id ON fabric_planning(planning_id);

ALTER TABLE brand_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawler_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE color_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_dna_history ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['brand_dna','ai_conversations','market_trends','crawler_data','planning_themes','product_planning','design_planning','color_planning','fabric_planning','fabric_suppliers','brand_dna_history'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon all on %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Allow anon all on %I" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('GRANT ALL ON %I TO anon, authenticated', t);
  END LOOP;
END $$;

INSERT INTO brand_dna (
  brand_name, brand_slogan, brand_mission, target_audience, age_range,
  style_direction, price_position, core_values, visual_identity, color_palette,
  brand_story, competitive_advantage, status
) VALUES (
  'TEPNIX步戌',
  '以AI赋能时尚，让设计更精准',
  '通过AI技术赋能时尚产业，帮助品牌实现数据驱动的全链路管理',
  '25-35岁都市职场女性，追求品质与时尚的平衡',
  '25-35',
  ARRAY['极简都市', '轻商务', '休闲舒适'],
  '中高端',
  ARRAY['品质至上', '创新设计', '数据驱动'],
  '{"logo_style": "简约现代", "typography": "无衬线字体", "visual_tone": "专业优雅"}',
  ARRAY['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#ffffff'],
  'TEPNIX步戌诞生于对时尚产业数字化转型的深刻洞察，致力于通过AI技术重构时尚品牌的全链路管理体系。我们相信，数据驱动的决策能够让每一件设计都更贴近市场需求，让每一个品牌都能找到属于自己的独特定位。',
  'AI驱动的全链路品牌管理系统，数据驱动决策，智能企划生成',
  'active'
) ON CONFLICT DO NOTHING;

INSERT INTO fabric_suppliers (
  name, contact_name, contact_email, contact_phone, location, website,
  fabric_categories, certifications, rating
) VALUES (
  '恒源祥面料', '张先生', 'zhang@hengxiang.com', '021-88888888', '上海', 'www.hengxiang.com',
  ARRAY['羊毛', '羊绒', '混纺'], ARRAY['Oeko-Tex', 'ISO9001'], 4.8
), (
  '盛虹集团', '李女士', 'li@shenghong.com', '0512-66666666', '苏州', 'www.shenghong.com',
  ARRAY['丝绸', '化纤', '功能性面料'], ARRAY['GOTS', 'OCS'], 4.6
), (
  '南山集团', '王先生', 'wang@nanshan.com', '0535-55555555', '烟台', 'www.nanshan.com',
  ARRAY['毛纺', '针织', '牛仔'], ARRAY['Oeko-Tex', 'BSCI'], 4.7
) ON CONFLICT DO NOTHING;

-- ============================================
-- 011_core_tables_tenant_fields.sql ⭐ 核心
-- ============================================
ALTER TABLE styles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_styles_company_id ON styles(company_id);
CREATE INDEX IF NOT EXISTS idx_styles_brand_id ON styles(brand_id);
CREATE INDEX IF NOT EXISTS idx_styles_season_id ON styles(season_id);
CREATE INDEX IF NOT EXISTS idx_styles_brand_season ON styles(brand_id, season_id);

UPDATE styles
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

ALTER TABLE styles DROP CONSTRAINT IF EXISTS styles_style_no_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_styles_brand_style_no ON styles(brand_id, style_no) WHERE brand_id IS NOT NULL;

ALTER TABLE design_assets
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_design_assets_company_id ON design_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_design_assets_brand_id ON design_assets(brand_id);

UPDATE design_assets
SET company_id = (SELECT company_id FROM styles WHERE styles.id = design_assets.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = design_assets.style_id LIMIT 1)
WHERE company_id IS NULL;

ALTER TABLE tech_packs
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS idx_tech_packs_company_id ON tech_packs(company_id);
CREATE INDEX IF NOT EXISTS idx_tech_packs_brand_id ON tech_packs(brand_id);
CREATE INDEX IF NOT EXISTS idx_tech_packs_season_id ON tech_packs(season_id);

UPDATE tech_packs
SET company_id = (SELECT company_id FROM styles WHERE styles.id = tech_packs.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = tech_packs.style_id LIMIT 1)
WHERE company_id IS NULL;

ALTER TABLE bom_items
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS idx_bom_items_company_id ON bom_items(company_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_brand_id ON bom_items(brand_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_season_id ON bom_items(season_id);

UPDATE bom_items
SET company_id = (SELECT company_id FROM styles WHERE styles.id = bom_items.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = bom_items.style_id LIMIT 1)
WHERE company_id IS NULL;

ALTER TABLE sampling_records
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS round_no INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_sampling_records_company_id ON sampling_records(company_id);
CREATE INDEX IF NOT EXISTS idx_sampling_records_brand_id ON sampling_records(brand_id);

UPDATE sampling_records
SET company_id = (SELECT company_id FROM styles WHERE styles.id = sampling_records.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = sampling_records.style_id LIMIT 1)
WHERE company_id IS NULL;

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

ALTER TABLE stock_in_records
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_stock_in_records_company_id ON stock_in_records(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_in_records_brand_id ON stock_in_records(brand_id);

UPDATE stock_in_records
SET company_id = (SELECT company_id FROM styles WHERE styles.id = stock_in_records.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = stock_in_records.style_id LIMIT 1)
WHERE company_id IS NULL;

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

ALTER TABLE aftersales_records
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_aftersales_records_company_id ON aftersales_records(company_id);
CREATE INDEX IF NOT EXISTS idx_aftersales_records_brand_id ON aftersales_records(brand_id);

UPDATE aftersales_records
SET company_id = (SELECT company_id FROM styles WHERE styles.id = aftersales_records.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = aftersales_records.style_id LIMIT 1)
WHERE company_id IS NULL;

ALTER TABLE ai_test_results
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ai_test_results_company_id ON ai_test_results(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_test_results_brand_id ON ai_test_results(brand_id);

UPDATE ai_test_results
SET company_id = (SELECT company_id FROM styles WHERE styles.id = ai_test_results.style_id LIMIT 1),
    brand_id = (SELECT brand_id FROM styles WHERE styles.id = ai_test_results.style_id LIMIT 1)
WHERE company_id IS NULL;

ALTER TABLE planning
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS idx_planning_company_id ON planning(company_id);
CREATE INDEX IF NOT EXISTS idx_planning_brand_id ON planning(brand_id);
CREATE INDEX IF NOT EXISTS idx_planning_season_id ON planning(season_id);

UPDATE planning
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

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

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_brand_id ON suppliers(brand_id);
UPDATE suppliers
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

ALTER TABLE fabrics
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_fabrics_company_id ON fabrics(company_id);
CREATE INDEX IF NOT EXISTS idx_fabrics_brand_id ON fabrics(brand_id);
UPDATE fabrics
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

ALTER TABLE colors
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_colors_company_id ON colors(company_id);
CREATE INDEX IF NOT EXISTS idx_colors_brand_id ON colors(brand_id);
UPDATE colors
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

ALTER TABLE fabric_suppliers
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_fabric_suppliers_company_id ON fabric_suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_fabric_suppliers_brand_id ON fabric_suppliers(brand_id);
UPDATE fabric_suppliers
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

ALTER TABLE market_intelligence
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_market_intelligence_company_id ON market_intelligence(company_id);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_brand_id ON market_intelligence(brand_id);
UPDATE market_intelligence
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_knowledge_base_company_id ON knowledge_base(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_brand_id ON knowledge_base(brand_id);
UPDATE knowledge_base
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

ALTER TABLE planning_ai_results
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_planning_ai_results_company_id ON planning_ai_results(company_id);
CREATE INDEX IF NOT EXISTS idx_planning_ai_results_brand_id ON planning_ai_results(brand_id);
UPDATE planning_ai_results
SET company_id = (SELECT company_id FROM planning WHERE planning.id = planning_ai_results.planning_id LIMIT 1),
    brand_id = (SELECT brand_id FROM planning WHERE planning.id = planning_ai_results.planning_id LIMIT 1)
WHERE company_id IS NULL;

ALTER TABLE color_trends
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_color_trends_company_id ON color_trends(company_id);
CREATE INDEX IF NOT EXISTS idx_color_trends_brand_id ON color_trends(brand_id);
UPDATE color_trends
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

ALTER TABLE fabric_trends
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_fabric_trends_company_id ON fabric_trends(company_id);
CREATE INDEX IF NOT EXISTS idx_fabric_trends_brand_id ON fabric_trends(brand_id);
UPDATE fabric_trends
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

ALTER TABLE ai_conversations
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_ai_conversations_company_id ON ai_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_brand_id ON ai_conversations(brand_id);

ALTER TABLE brand_dna_history
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_brand_dna_history_company_id ON brand_dna_history(company_id);
CREATE INDEX IF NOT EXISTS idx_brand_dna_history_brand_id ON brand_dna_history(brand_id);
UPDATE brand_dna_history
SET company_id = (SELECT company_id FROM brand_dna WHERE brand_dna.id = brand_dna_history.brand_dna_id LIMIT 1),
    brand_id = (SELECT brand_id FROM brand_dna WHERE brand_dna.id = brand_dna_history.brand_dna_id LIMIT 1)
WHERE company_id IS NULL;

ALTER TABLE process_nodes
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_process_nodes_company_id ON process_nodes(company_id);
CREATE INDEX IF NOT EXISTS idx_process_nodes_brand_id ON process_nodes(brand_id);
UPDATE process_nodes
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

ALTER TABLE process_links
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_process_links_company_id ON process_links(company_id);
CREATE INDEX IF NOT EXISTS idx_process_links_brand_id ON process_links(brand_id);
UPDATE process_links
SET company_id = '00000000-0000-0000-0000-000000000010',
    brand_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

ALTER TABLE data_versions
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_data_versions_company_id ON data_versions(company_id);
CREATE INDEX IF NOT EXISTS idx_data_versions_brand_id ON data_versions(brand_id);

-- ============================================
-- 012_rls_brand_isolation.sql ⭐ 真正的多品牌隔离
-- ============================================
-- 辅助函数
CREATE OR REPLACE FUNCTION get_user_brand_ids()
RETURNS TABLE(brand_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RETURN QUERY
    SELECT ub.brand_id
    FROM user_brands ub
    WHERE ub.user_id = auth.uid();
  ELSE
    RETURN;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION check_brand_access(p_brand_id UUID, p_required_level TEXT DEFAULT 'executor')
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
  SELECT role_level INTO v_user_level
  FROM user_brands
  WHERE user_id = auth.uid() AND brand_id = p_brand_id
  LIMIT 1;

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

  IF v_user_level = 'boss' THEN RETURN TRUE; END IF;
  RETURN v_level_rank >= v_required_rank;
END;
$$;

-- 删除原有 USING(true) 策略
DROP POLICY IF EXISTS "Allow public read styles" ON styles;
DROP POLICY IF EXISTS "Allow public insert styles" ON styles;
DROP POLICY IF EXISTS "Allow public update styles" ON styles;
DROP POLICY IF EXISTS "Allow public delete styles" ON styles;

CREATE POLICY "brand_isolation_select_styles" ON styles FOR SELECT USING (brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL);
CREATE POLICY "brand_isolation_insert_styles" ON styles FOR INSERT WITH CHECK (brand_id IN (SELECT get_user_brand_ids()));
CREATE POLICY "brand_isolation_update_styles" ON styles FOR UPDATE USING (brand_id IN (SELECT get_user_brand_ids()));
CREATE POLICY "brand_isolation_delete_styles" ON styles FOR DELETE USING (brand_id IN (SELECT get_user_brand_ids()));

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['design_assets','tech_packs','bom_items','sampling_records','material_procurement','production_orders','inventory_records','stock_in_records','sales_records','aftersales_records','ai_test_results','planning','product_planning','design_planning','color_planning','fabric_planning','planning_themes','brand_dna','market_trends','ai_conversations','suppliers','fabrics','colors','fabric_suppliers','market_intelligence','knowledge_base','planning_ai_results','ai_suggestions'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow public read %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public insert %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public update %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public delete %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated read %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated insert %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated update %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon all on %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "brand_isolation_%I" ON %I FOR ALL USING (brand_id IN (SELECT get_user_brand_ids()) OR auth.uid() IS NULL) WITH CHECK (brand_id IN (SELECT get_user_brand_ids()))', t, t);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION get_user_brand_ids() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_brand_access(UUID, TEXT) TO authenticated, anon;

-- ============================================
-- 🎉 完成
-- ============================================
SELECT '🎉 全部迁移完成！所有表已具备多品牌隔离能力' AS status;
