-- ============================================
-- 046: Phase 2 款式衍生闭环表
-- 用于记录 AI 建议、采纳反馈、后续结果与 Skill 效果指标
-- ============================================

-- AI 建议记录
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES ai_skills(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  process_node TEXT,
  context JSONB NOT NULL DEFAULT '{}',
  result JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'adopted', 'rejected', 'modified')),
  reject_reason TEXT,
  modified_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_company_id ON ai_recommendations(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_brand_id ON ai_recommendations(brand_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_season_id ON ai_recommendations(season_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_skill_id ON ai_recommendations(skill_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_status ON ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_created_at ON ai_recommendations(created_at);

-- 建议后续结果（测款评分、销售额、退货率等）
CREATE TABLE IF NOT EXISTS ai_recommendation_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES ai_recommendations(id) ON DELETE CASCADE,
  style_id UUID REFERENCES styles(id) ON DELETE SET NULL,
  outcome_type TEXT NOT NULL,
  outcome_value NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendation_outcomes_recommendation_id ON ai_recommendation_outcomes(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_outcomes_style_id ON ai_recommendation_outcomes(style_id);

-- Skill 效果与版本追踪
CREATE TABLE IF NOT EXISTS ai_skill_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES ai_skills(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  total_recommendations INT NOT NULL DEFAULT 0,
  adopted_count INT NOT NULL DEFAULT 0,
  rejected_count INT NOT NULL DEFAULT 0,
  modified_count INT NOT NULL DEFAULT 0,
  avg_outcome_score NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_skill_metrics_skill_id ON ai_skill_metrics(skill_id);
CREATE INDEX IF NOT EXISTS idx_ai_skill_metrics_company_id ON ai_skill_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_skill_metrics_brand_id ON ai_skill_metrics(brand_id);
CREATE INDEX IF NOT EXISTS idx_ai_skill_metrics_season_id ON ai_skill_metrics(season_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_skill_metrics_unique ON ai_skill_metrics(skill_id, company_id, brand_id, COALESCE(season_id, '00000000-0000-0000-0000-000000000000'));

-- 自动更新 updated_at
DROP TRIGGER IF EXISTS update_ai_recommendations_updated_at ON ai_recommendations;
CREATE TRIGGER update_ai_recommendations_updated_at BEFORE UPDATE ON ai_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendation_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_skill_metrics ENABLE ROW LEVEL SECURITY;

-- 安全函数
CREATE OR REPLACE FUNCTION rls_safe_execute(p_sql TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE p_sql;
EXCEPTION
  WHEN undefined_table OR undefined_column OR undefined_function OR duplicate_object OR duplicate_table OR insufficient_privilege THEN
    RAISE NOTICE 'rls_safe_execute skipped (%): %', SQLSTATE, p_sql;
END $$ LANGUAGE plpgsql;

-- ai_recommendations 策略：用户可读写自己/同公司数据；BOSS/ADMIN 可读写全公司
SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_select_ai_recommendations" ON ai_recommendations;');
SELECT rls_safe_execute('CREATE POLICY "rls_select_ai_recommendations" ON ai_recommendations FOR SELECT TO authenticated USING (user_id = auth.uid() OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_insert_ai_recommendations" ON ai_recommendations;');
SELECT rls_safe_execute('CREATE POLICY "rls_insert_ai_recommendations" ON ai_recommendations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_update_ai_recommendations" ON ai_recommendations;');
SELECT rls_safe_execute('CREATE POLICY "rls_update_ai_recommendations" ON ai_recommendations FOR UPDATE TO authenticated USING (user_id = auth.uid() OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_delete_ai_recommendations" ON ai_recommendations;');
SELECT rls_safe_execute('CREATE POLICY "rls_delete_ai_recommendations" ON ai_recommendations FOR DELETE TO authenticated USING (user_id = auth.uid() OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')));');

-- ai_recommendation_outcomes 策略：同公司可读，BOSS/ADMIN 可写
SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_select_ai_recommendation_outcomes" ON ai_recommendation_outcomes;');
SELECT rls_safe_execute('CREATE POLICY "rls_select_ai_recommendation_outcomes" ON ai_recommendation_outcomes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM ai_recommendations r WHERE r.id = recommendation_id AND (r.user_id = auth.uid() OR r.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')))));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_insert_ai_recommendation_outcomes" ON ai_recommendation_outcomes;');
SELECT rls_safe_execute('CREATE POLICY "rls_insert_ai_recommendation_outcomes" ON ai_recommendation_outcomes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM ai_recommendations r WHERE r.id = recommendation_id AND (r.user_id = auth.uid() OR r.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')))));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_update_ai_recommendation_outcomes" ON ai_recommendation_outcomes;');
SELECT rls_safe_execute('CREATE POLICY "rls_update_ai_recommendation_outcomes" ON ai_recommendation_outcomes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM ai_recommendations r WHERE r.id = recommendation_id AND (r.user_id = auth.uid() OR r.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')))));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_delete_ai_recommendation_outcomes" ON ai_recommendation_outcomes;');
SELECT rls_safe_execute('CREATE POLICY "rls_delete_ai_recommendation_outcomes" ON ai_recommendation_outcomes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM ai_recommendations r WHERE r.id = recommendation_id AND (r.user_id = auth.uid() OR r.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')))));');

-- ai_skill_metrics 策略：同公司可读，BOSS/ADMIN 可写
SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_select_ai_skill_metrics" ON ai_skill_metrics;');
SELECT rls_safe_execute('CREATE POLICY "rls_select_ai_skill_metrics" ON ai_skill_metrics FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_insert_ai_skill_metrics" ON ai_skill_metrics;');
SELECT rls_safe_execute('CREATE POLICY "rls_insert_ai_skill_metrics" ON ai_skill_metrics FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_update_ai_skill_metrics" ON ai_skill_metrics;');
SELECT rls_safe_execute('CREATE POLICY "rls_update_ai_skill_metrics" ON ai_skill_metrics FOR UPDATE TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_delete_ai_skill_metrics" ON ai_skill_metrics;');
SELECT rls_safe_execute('CREATE POLICY "rls_delete_ai_skill_metrics" ON ai_skill_metrics FOR DELETE TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')));');

GRANT ALL ON ai_recommendations TO anon, authenticated;
GRANT ALL ON ai_recommendation_outcomes TO anon, authenticated;
GRANT ALL ON ai_skill_metrics TO anon, authenticated;

-- 默认 style-derivative Skill（仅默认公司）
INSERT INTO ai_skills (key, name, description, skill_type, process_node, entry_route, company_id)
VALUES (
  'style-derivative',
  '款式衍生',
  '基于参考图与风格/面料/价格带约束生成多个款式方案与 BOM 草案',
  'execution',
  'design',
  '/ai-workspace',
  '00000000-0000-0000-0000-000000000010'
)
ON CONFLICT (key) DO NOTHING;

-- 绑定默认 designer 角色
INSERT INTO process_role_ai_skills (process_role_id, ai_skill_id)
SELECT pr.id, s.id
FROM process_roles pr, ai_skills s
WHERE pr.key = 'designer'
  AND pr.company_id = '00000000-0000-0000-0000-000000000010'
  AND s.key = 'style-derivative'
  AND s.company_id = '00000000-0000-0000-0000-000000000010'
ON CONFLICT DO NOTHING;

SELECT '✅ 046 完成：Phase 2 款式衍生闭环表已创建' AS status;
