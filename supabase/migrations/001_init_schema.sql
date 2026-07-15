-- StyleForge 数据库初始化脚本
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本

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

-- 索引
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

-- 创建存储桶（需要在 Supabase Dashboard → Storage 中手动创建名为 design-assets 的存储桶，设置为 Public）
