-- 023_season_review.sql
-- 每季AI复盘体系

-- 季度复盘表
CREATE TABLE IF NOT EXISTS season_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  season_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  review_type VARCHAR(20) NOT NULL DEFAULT 'mid_season',
  overall_score DECIMAL(5,2),
  summary TEXT,
  highlights JSONB DEFAULT '[]',
  issues JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  kpi_summary JSONB DEFAULT '{}',
  style_analysis JSONB DEFAULT '{}',
  supply_chain_analysis JSONB DEFAULT '{}',
  design_feedback_count INTEGER DEFAULT 0,
  generated_by UUID REFERENCES profiles(id),
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_season_reviews_company ON season_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_season_reviews_brand ON season_reviews(brand_id);
CREATE INDEX IF NOT EXISTS idx_season_reviews_season ON season_reviews(season_id);
CREATE INDEX IF NOT EXISTS idx_season_reviews_status ON season_reviews(status);

ALTER TABLE season_reviews ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_season_reviews_updated_at BEFORE UPDATE ON season_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
