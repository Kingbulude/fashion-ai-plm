-- 企划系统数据库结构

-- 品牌基因表
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

-- AI对话记录表
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

-- 市场趋势表
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

-- 爬虫数据表
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

-- 企划主题表
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

-- 商品企划表
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

-- 设计企划表
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

-- 色彩企划表
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

-- 面料企划表
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

-- 面料供应商表
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

-- 品牌基因历史表
CREATE TABLE IF NOT EXISTS brand_dna_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_dna_id UUID REFERENCES brand_dna(id),
  change_type VARCHAR(20),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES profiles(user_id),
  changed_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_brand_dna_brand_id ON brand_dna(brand_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_skill ON ai_conversations(user_id, skill_type);
CREATE INDEX IF NOT EXISTS idx_market_trends_brand_date ON market_trends(brand_id, data_date);
CREATE INDEX IF NOT EXISTS idx_crawler_data_platform_time ON crawler_data(platform, crawl_time);
CREATE INDEX IF NOT EXISTS idx_planning_themes_season ON planning_themes(season);
CREATE INDEX IF NOT EXISTS idx_product_planning_planning_id ON product_planning(planning_id);
CREATE INDEX IF NOT EXISTS idx_design_planning_planning_id ON design_planning(planning_id);
CREATE INDEX IF NOT EXISTS idx_color_planning_planning_id ON color_planning(planning_id);
CREATE INDEX IF NOT EXISTS idx_fabric_planning_planning_id ON fabric_planning(planning_id);

-- 启用RLS
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

-- RLS策略
CREATE POLICY "Allow anon all on brand_dna" ON brand_dna FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on ai_conversations" ON ai_conversations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on market_trends" ON market_trends FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on crawler_data" ON crawler_data FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on planning_themes" ON planning_themes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on product_planning" ON product_planning FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on design_planning" ON design_planning FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on color_planning" ON color_planning FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on fabric_planning" ON fabric_planning FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on fabric_suppliers" ON fabric_suppliers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on brand_dna_history" ON brand_dna_history FOR ALL TO anon USING (true) WITH CHECK (true);

-- 授权
GRANT ALL ON brand_dna TO anon, authenticated;
GRANT ALL ON ai_conversations TO anon, authenticated;
GRANT ALL ON market_trends TO anon, authenticated;
GRANT ALL ON crawler_data TO anon, authenticated;
GRANT ALL ON planning_themes TO anon, authenticated;
GRANT ALL ON product_planning TO anon, authenticated;
GRANT ALL ON design_planning TO anon, authenticated;
GRANT ALL ON color_planning TO anon, authenticated;
GRANT ALL ON fabric_planning TO anon, authenticated;
GRANT ALL ON fabric_suppliers TO anon, authenticated;
GRANT ALL ON brand_dna_history TO anon, authenticated;

-- 插入默认品牌基因数据
INSERT INTO brand_dna (
  brand_name,
  brand_slogan,
  brand_mission,
  target_audience,
  age_range,
  style_direction,
  price_position,
  core_values,
  visual_identity,
  color_palette,
  brand_story,
  competitive_advantage,
  status
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

-- 插入默认面料供应商数据
INSERT INTO fabric_suppliers (
  name,
  contact_name,
  contact_email,
  contact_phone,
  location,
  website,
  fabric_categories,
  certifications,
  rating
) VALUES (
  '恒源祥面料',
  '张先生',
  'zhang@hengxiang.com',
  '021-88888888',
  '上海',
  'www.hengxiang.com',
  ARRAY['羊毛', '羊绒', '混纺'],
  ARRAY['Oeko-Tex', 'ISO9001'],
  4.8
), (
  '盛虹集团',
  '李女士',
  'li@shenghong.com',
  '0512-66666666',
  '苏州',
  'www.shenghong.com',
  ARRAY['丝绸', '化纤', '功能性面料'],
  ARRAY['GOTS', 'OCS'],
  4.6
), (
  '南山集团',
  '王先生',
  'wang@nanshan.com',
  '0535-55555555',
  '烟台',
  'www.nanshan.com',
  ARRAY['毛纺', '针织', '牛仔'],
  ARRAY['Oeko-Tex', 'BSCI'],
  4.7
) ON CONFLICT DO NOTHING;

SELECT '数据库表结构创建完成' AS status;