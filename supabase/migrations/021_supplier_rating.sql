-- 021_supplier_rating.sql
-- 供应商评分体系

CREATE TABLE IF NOT EXISTS supplier_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  style_id UUID REFERENCES styles(id) ON DELETE SET NULL,
  rating_type TEXT NOT NULL DEFAULT 'overall',
  delivery_score NUMERIC(3,1),
  quality_score NUMERIC(3,1),
  price_score NUMERIC(3,1),
  service_score NUMERIC(3,1),
  overall_score NUMERIC(3,1) NOT NULL,
  comment TEXT,
  rated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

--  -- 为供应商表添加评分相关字段
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS overall_rating NUMERIC(3,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_avg_delivery_days NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_pass_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_competitiveness NUMERIC(3,1) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_supplier_ratings_supplier ON supplier_ratings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_company ON supplier_ratings(company_id);

ALTER TABLE supplier_ratings ENABLE ROW LEVEL SECURITY;
