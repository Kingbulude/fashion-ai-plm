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

-- 面料表
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

-- 颜色表
CREATE TABLE IF NOT EXISTS colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  hex TEXT,
  usage TEXT,
  season TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 打样记录表
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

-- 物料采购表
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

-- 供应商表
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

-- 生产订单表
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

-- 库存台账表
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

-- 入库记录表
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

-- 销售记录表
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

-- 售后记录表
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

-- AI测款结果表
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

-- 索引
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

-- 自动更新 updated_at
DROP TRIGGER IF EXISTS update_planning_updated_at ON planning;
CREATE TRIGGER update_planning_updated_at BEFORE UPDATE ON planning
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_records_updated_at ON inventory_records;
CREATE TRIGGER update_inventory_records_updated_at BEFORE UPDATE ON inventory_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();