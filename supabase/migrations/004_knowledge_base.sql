-- 品牌知识库 - 核心数据模型

-- 品牌基因表：存储品牌核心DNA，包括品牌定位、风格、目标客群等
CREATE TABLE IF NOT EXISTS brand_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name VARCHAR(100) NOT NULL,
  brand_slogan TEXT,
  target_audience TEXT,
  style_direction TEXT[],
  price_position VARCHAR(50),
  color_palette VARCHAR(7)[],
  core_values TEXT[],
  competitive_advantage TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 市场情报表：收集市场爆款信息、竞品动态、行业趋势
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

-- 知识库条目表：品牌积累的各类知识（设计规范、工艺技术、供应链信息等）
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

-- 企划AI分析结果表：存储AI生成的分析和建议
CREATE TABLE IF NOT EXISTS planning_ai_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id UUID REFERENCES planning(id) ON DELETE CASCADE,
  skill_type VARCHAR(50) NOT NULL,
  skill_name VARCHAR(100),
  result JSONB NOT NULL,
  confidence_score DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 色彩趋势预测表
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

-- 面料趋势预测表
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_market_intelligence_type ON market_intelligence(type);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_category ON market_intelligence(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_planning_ai_results_planning_id ON planning_ai_results(planning_id);
CREATE INDEX IF NOT EXISTS idx_color_trends_season ON color_trends(season);
CREATE INDEX IF NOT EXISTS idx_fabric_trends_category ON fabric_trends(category);

-- 插入初始品牌基因数据
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