-- ============================================
-- 🚀 全合一初始化脚本 V2（彻底修复版）
-- 用途：彻底清空后一次性执行
-- 关键修复：
--   1. 所有表按依赖关系严格排序
--   2. 所有表先建完，再加字段，再加 RLS
--   3. RLS 策略不依赖表创建顺序
-- ============================================

-- ============================================
-- 第 0 步：彻底清空
-- ============================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- ============================================
-- 第 1 步：扩展
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 第 2 步：枚举类型
-- ============================================
DO $$ BEGIN
  CREATE TYPE style_status AS ENUM ('planning', 'designing', 'designed', 'sampling', 'sampled', 'producing', 'produced', 'selling', 'sold', 'reviewing', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE design_asset_type AS ENUM ('inspiration', 'design', 'ai_derivative', '3d_sample');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE material_type AS ENUM ('fabric', 'accessory', 'packaging');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================
-- 第 3 步：辅助函数
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 第 4 步：组织架构（最底层：company/brand/season/user）
-- ============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE seasons (
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

CREATE INDEX idx_seasons_brand_id ON seasons(brand_id);
CREATE UNIQUE INDEX idx_seasons_brand_year_type ON seasons(brand_id, year, season_type);

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '小芳',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT '设计师',
  role_level TEXT NOT NULL DEFAULT 'executor',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_profiles_user_id ON profiles(user_id);

CREATE TABLE user_brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  role_level TEXT NOT NULL DEFAULT 'executor',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, brand_id)
);

CREATE TABLE operation_logs (
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

CREATE INDEX idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX idx_operation_logs_brand_id ON operation_logs(brand_id);
CREATE INDEX idx_operation_logs_created_at ON operation_logs(created_at);

CREATE TABLE data_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  data JSONB NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_data_versions_table_record ON data_versions(table_name, record_id);

CREATE TABLE temp_authorizations (
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

CREATE TABLE approval_flows (
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

-- ============================================
-- 第 5 步：基础数据表（不依赖 styles）
-- ============================================
CREATE TABLE planning (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  season TEXT NOT NULL,
  theme TEXT NOT NULL,
  category TEXT,
  target_cost NUMERIC,
  timeline TEXT,
  brand_story TEXT,
  target_audience TEXT,
  price_range TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  ai_trend_analysis TEXT,
  inspiration_tags JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE fabrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  supplier TEXT,
  composition TEXT,
  price NUMERIC,
  usage TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex TEXT,
  usage TEXT,
  season TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  rating NUMERIC DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 工序节点和链接
CREATE TABLE process_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL DEFAULT 0,
  stage TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE process_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES process_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES process_nodes(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'sequential',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 知识库/品牌基因
CREATE TABLE brand_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
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

CREATE INDEX idx_brand_dna_brand_id ON brand_dna(brand_id);

CREATE TABLE brand_dna_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_dna_id UUID REFERENCES brand_dna(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  change_type VARCHAR(20),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES profiles(user_id),
  changed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE market_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
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

CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT[],
  metadata JSONB,
  referenced_by TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE color_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season VARCHAR(20) NOT NULL,
  color_hex VARCHAR(7) NOT NULL,
  color_name VARCHAR(50),
  trend_level VARCHAR(20),
  usage_scenarios TEXT[],
  ai_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE fabric_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  fabric_name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  trend_level VARCHAR(20),
  properties JSONB,
  application_scenarios TEXT[],
  price_range VARCHAR(50),
  ai_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 面料供应商（必须在 fabric_planning 之前）
CREATE TABLE fabric_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
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

CREATE TABLE planning_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  season VARCHAR(20) NOT NULL,
  theme_name VARCHAR(255) NOT NULL,
  theme_description TEXT,
  inspiration_source VARCHAR(255),
  mood_board JSONB,
  selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE product_planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
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

CREATE TABLE design_planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
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

CREATE TABLE color_planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
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

-- 面料企划在面料供应商之后
CREATE TABLE fabric_planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
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

CREATE TABLE market_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  trend_type VARCHAR(50) NOT NULL,
  trend_name VARCHAR(255) NOT NULL,
  description TEXT,
  confidence_score INTEGER DEFAULT 0,
  source VARCHAR(100),
  data_date DATE NOT NULL,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE crawler_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  search_query VARCHAR(255),
  data_type VARCHAR(50),
  raw_data JSONB,
  processed_data JSONB,
  crawl_time TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(user_id),
  skill_type VARCHAR(50) NOT NULL,
  skill_name VARCHAR(100) NOT NULL,
  conversation_data JSONB NOT NULL,
  current_step VARCHAR(50),
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE planning_ai_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  planning_id UUID REFERENCES planning(id) ON DELETE CASCADE,
  skill_type VARCHAR(50) NOT NULL,
  skill_name VARCHAR(100),
  result JSONB NOT NULL,
  confidence_score DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ai_role_level TEXT NOT NULL,
  specialist_type TEXT,
  assistant_type TEXT,
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

-- ============================================
-- 第 6 步：核心业务表（依赖 styles）
-- ============================================
CREATE TABLE styles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  style_no TEXT NOT NULL,
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
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_styles_brand_style_no ON styles(brand_id, style_no);
CREATE INDEX idx_styles_company_id ON styles(company_id);
CREATE INDEX idx_styles_brand_id ON styles(brand_id);
CREATE INDEX idx_styles_season_id ON styles(season_id);
CREATE INDEX idx_styles_brand_season ON styles(brand_id, season_id);
CREATE INDEX idx_styles_status ON styles(status);

CREATE TABLE design_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
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

CREATE TABLE tech_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  version_no INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  size_chart JSONB,
  process_notes TEXT,
  sewing_standard TEXT,
  print_embroidery JSONB,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE bom_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  material_type material_type NOT NULL,
  specification TEXT,
  supplier_id UUID,
  unit_consumption NUMERIC NOT NULL,
  loss_rate NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC,
  total_cost NUMERIC,
  version_no INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  ai_suggested BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE sampling_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  sample_no TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  round_no INTEGER NOT NULL DEFAULT 1,
  requirements TEXT,
  target_date DATE,
  actual_date DATE,
  review_notes TEXT,
  cost NUMERIC,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE material_procurement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
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

CREATE TABLE production_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
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

CREATE TABLE inventory_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  batch_no TEXT,
  cost_price NUMERIC,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_in_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  batch_no TEXT,
  production_order_id UUID REFERENCES production_orders(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
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

CREATE TABLE aftersales_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
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

CREATE TABLE ai_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  ai_image_url TEXT,
  test_score NUMERIC,
  feedback_count NUMERIC,
  feedback_summary TEXT,
  suggested_quantity NUMERIC,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_design_assets_style_id ON design_assets(style_id);
CREATE INDEX idx_design_assets_company_id ON design_assets(company_id);
CREATE INDEX idx_design_assets_brand_id ON design_assets(brand_id);
CREATE INDEX idx_tech_packs_style_id ON tech_packs(style_id);
CREATE INDEX idx_bom_items_style_id ON bom_items(style_id);
CREATE INDEX idx_sampling_records_style_id ON sampling_records(style_id);
CREATE INDEX idx_material_procurement_style_id ON material_procurement(style_id);
CREATE INDEX idx_production_orders_style_id ON production_orders(style_id);
CREATE INDEX idx_inventory_records_style_id ON inventory_records(style_id);
CREATE INDEX idx_stock_in_records_style_id ON stock_in_records(style_id);
CREATE INDEX idx_sales_records_style_id ON sales_records(style_id);
CREATE INDEX idx_sales_records_date ON sales_records(sale_date);
CREATE INDEX idx_aftersales_records_style_id ON aftersales_records(style_id);
CREATE INDEX idx_ai_test_results_style_id ON ai_test_results(style_id);
CREATE INDEX idx_market_intelligence_type ON market_intelligence(type);
CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX idx_planning_ai_results_planning_id ON planning_ai_results(planning_id);
CREATE INDEX idx_color_trends_season ON color_trends(season);
CREATE INDEX idx_fabric_trends_category ON fabric_trends(category);
CREATE INDEX idx_ai_conversations_user_skill ON ai_conversations(user_id, skill_type);
CREATE INDEX idx_market_trends_brand_date ON market_trends(brand_id, data_date);
CREATE INDEX idx_crawler_data_platform_time ON crawler_data(platform, crawl_time);
CREATE INDEX idx_planning_themes_season ON planning_themes(season);
CREATE INDEX idx_product_planning_planning_id ON product_planning(planning_id);
CREATE INDEX idx_design_planning_planning_id ON design_planning(planning_id);
CREATE INDEX idx_color_planning_planning_id ON color_planning(planning_id);
CREATE INDEX idx_fabric_planning_planning_id ON fabric_planning(planning_id);
CREATE INDEX idx_ai_suggestions_status ON ai_suggestions(status);
CREATE INDEX idx_ai_suggestions_brand ON ai_suggestions(brand_id);

-- ============================================
-- 第 7 步：自动 updated_at 触发器
-- ============================================
DROP TRIGGER IF EXISTS update_styles_updated_at ON styles;
CREATE TRIGGER update_styles_updated_at BEFORE UPDATE ON styles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_planning_updated_at ON planning;
CREATE TRIGGER update_planning_updated_at BEFORE UPDATE ON planning FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_records_updated_at ON inventory_records;
CREATE TRIGGER update_inventory_records_updated_at BEFORE UPDATE ON inventory_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_seasons_updated_at ON seasons;
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 第 8 步：插入种子数据
-- ============================================
INSERT INTO companies (id, name) VALUES
  ('00000000-0000-0000-0000-000000000010', 'TEPNIX集团');

INSERT INTO brands (id, company_id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'TEPNIX步戌');

INSERT INTO seasons (id, brand_id, name, season_type, year, start_date, end_date, status) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'SS26 春夏', 'SS', 2026, '2026-01-01', '2026-06-30', 'active'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'FW26 秋冬', 'FW', 2026, '2026-07-01', '2026-12-31', 'active');

INSERT INTO fabric_suppliers (id, company_id, brand_id, name, contact_name, contact_email, contact_phone, location, website, fabric_categories, certifications, rating) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '恒源祥面料', '张先生', 'zhang@hengxiang.com', '021-88888888', '上海', 'www.hengxiang.com', ARRAY['羊毛', '羊绒', '混纺'], ARRAY['Oeko-Tex', 'ISO9001'], 4.8),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '盛虹集团', '李女士', 'li@shenghong.com', '0512-66666666', '苏州', 'www.shenghong.com', ARRAY['丝绸', '化纤', '功能性面料'], ARRAY['GOTS', 'OCS'], 4.6),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '南山集团', '王先生', 'wang@nanshan.com', '0535-55555555', '烟台', 'www.nanshan.com', ARRAY['毛纺', '针织', '牛仔'], ARRAY['Oeko-Tex', 'BSCI'], 4.7);

INSERT INTO brand_dna (company_id, brand_id, brand_name, brand_slogan, brand_mission, target_audience, age_range, style_direction, price_position, core_values, color_palette, brand_story, status) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'TEPNIX步戌', '以AI赋能时尚，让设计更精准', '通过AI技术赋能时尚产业', '25-35岁都市职场女性', '25-35', ARRAY['极简都市', '轻商务', '休闲舒适'], '中高端', ARRAY['品质至上', '创新设计', '数据驱动'], ARRAY['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#ffffff'], '以AI赋能时尚，让设计更精准', 'active');

-- ============================================
-- 第 9 步：多品牌 RLS 隔离策略
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
    RETURN QUERY SELECT ub.brand_id FROM user_brands ub WHERE ub.user_id = auth.uid();
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
  SELECT role_level INTO v_user_level FROM user_brands
  WHERE user_id = auth.uid() AND brand_id = p_brand_id LIMIT 1;

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

-- 启用所有表的 RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_dna_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE color_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE color_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawler_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_ai_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sampling_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_procurement ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_in_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE aftersales_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_test_results ENABLE ROW LEVEL SECURITY;

-- 公共读策略（所有表都允许读，对写做限制）
-- 关键：只对有 brand_id 字段的表做品牌隔离，否则用 WITH CHECK (true)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'companies','brands','seasons','profiles','user_brands','operation_logs','data_versions','temp_authorizations','approval_flows',
    'planning','fabrics','colors','suppliers','process_nodes','process_links',
    'brand_dna','brand_dna_history','market_intelligence','knowledge_base','color_trends','fabric_trends',
    'fabric_suppliers','planning_themes','product_planning','design_planning','color_planning','fabric_planning',
    'market_trends','crawler_data','ai_conversations','planning_ai_results','ai_suggestions',
    'styles','design_assets','tech_packs','bom_items','sampling_records','material_procurement',
    'production_orders','inventory_records','stock_in_records','sales_records','aftersales_records','ai_test_results'
  ];
  has_brand_id boolean;
BEGIN
  FOR t IN SELECT unnest(tables) LOOP
    -- 公共读
    EXECUTE format('CREATE POLICY "public_read_%I" ON %I FOR SELECT USING (true)', t, t);

    -- 检查表是否有 brand_id 字段
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = %L AND table_name = %L AND column_name = %L)',
      'public', t, 'brand_id'
    ) INTO has_brand_id;

    IF has_brand_id THEN
      -- 有 brand_id 字段：用品牌隔离
      EXECUTE format('CREATE POLICY "brand_isolation_insert_%I" ON %I FOR INSERT WITH CHECK (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()))', t, t);
      EXECUTE format('CREATE POLICY "brand_isolation_update_%I" ON %I FOR UPDATE USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()))', t, t);
      EXECUTE format('CREATE POLICY "brand_isolation_delete_%I" ON %I FOR DELETE USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()))', t, t);
    ELSE
      -- 没有 brand_id 字段（如 companies）：允许所有写
      EXECUTE format('CREATE POLICY "public_write_%I" ON %I FOR INSERT WITH CHECK (true)', t, t);
      EXECUTE format('CREATE POLICY "public_update_%I" ON %I FOR UPDATE USING (true)', t, t);
      EXECUTE format('CREATE POLICY "public_delete_%I" ON %I FOR DELETE USING (true)', t, t);
    END IF;
  END LOOP;
END $$;

-- profiles 单独处理（用 user_id 而不是 brand_id）
DROP POLICY IF EXISTS "brand_isolation_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "brand_isolation_update_profiles" ON profiles;
DROP POLICY IF EXISTS "brand_isolation_delete_profiles" ON profiles;
DROP POLICY IF EXISTS "public_write_profiles" ON profiles;
DROP POLICY IF EXISTS "public_update_profiles" ON profiles;
DROP POLICY IF EXISTS "public_delete_profiles" ON profiles;
CREATE POLICY "user_isolation_insert_profiles" ON profiles FOR INSERT WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);
CREATE POLICY "user_isolation_update_profiles" ON profiles FOR UPDATE USING (user_id = auth.uid() OR auth.uid() IS NULL);
CREATE POLICY "user_isolation_delete_profiles" ON profiles FOR DELETE USING (user_id = auth.uid() OR auth.uid() IS NULL);

-- 授权
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- 🎉 完成
-- ============================================
SELECT '🎉 全部迁移完成！共创建 ' || (
  SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
) || ' 张表，' || (
  SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'
) || ' 条RLS策略' AS status;
