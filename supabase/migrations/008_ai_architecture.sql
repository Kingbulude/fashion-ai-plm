-- ============================================
-- 阶段5：AI分级架构数据库迁移
-- ============================================

-- AI建议表
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ai_role_level TEXT NOT NULL, -- ai_master / ai_specialist / ai_assistant
  specialist_type TEXT, -- planning_ai / design_ai / ...
  assistant_type TEXT, -- design_derivative / color_matching / ...
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  process_node TEXT, -- planning / design / sampling / ...
  type TEXT NOT NULL, -- analysis / decision / prediction / optimization / alert / automation
  priority TEXT NOT NULL DEFAULT 'medium', -- critical / high / medium / low
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  proposed_data JSONB, -- AI建议的具体操作数据
  target_table TEXT,
  target_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending / approved / rejected / executed / expired
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

-- RLS 策略
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read ai_suggestions" ON ai_suggestions
  FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert ai_suggestions" ON ai_suggestions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update ai_suggestions" ON ai_suggestions
  FOR UPDATE USING (true);

GRANT ALL ON ai_suggestions TO authenticated;
