-- 022_aftersales_defect_iteration.sql
-- 售后缺陷反向迭代体系

-- 为售后记录表增加缺陷分类字段
ALTER TABLE aftersales_records
  ADD COLUMN IF NOT EXISTS defect_category TEXT,
  ADD COLUMN IF NOT EXISTS defect_severity TEXT DEFAULT 'minor',
  ADD COLUMN IF NOT EXISTS design_suggestion TEXT,
  ADD COLUMN IF NOT EXISTS pushed_to_design BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ;

-- 创建设计反馈表（汇总售后缺陷推送到设计端）
CREATE TABLE IF NOT EXISTS design_feedback_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL DEFAULT 'defect',
  defect_category TEXT,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'minor',
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  related_aftersale_ids UUID[] DEFAULT '{}',
  ai_suggestion TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_design_feedback_style ON design_feedback_items(style_id);
CREATE INDEX IF NOT EXISTS idx_design_feedback_company ON design_feedback_items(company_id);
CREATE INDEX IF NOT EXISTS idx_design_feedback_status ON design_feedback_items(status);

ALTER TABLE design_feedback_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_design_feedback_items_updated_at BEFORE UPDATE ON design_feedback_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
