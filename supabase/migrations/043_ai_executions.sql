-- ============================================
-- 043: AI 执行记录表
-- 用于记录每次 AI Skill 执行的输入、输出、模型和状态，
-- 支撑 Phase 2 的数据闭环和自我迭代。
-- ============================================

CREATE TABLE IF NOT EXISTS ai_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES ai_skills(id) ON DELETE SET NULL,
  skill_key TEXT NOT NULL,
  user_id UUID NOT NULL,
  company_id UUID,
  brand_id UUID,
  season_id UUID,
  input TEXT NOT NULL,
  output JSONB,
  raw_response TEXT,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_executions_skill_id ON ai_executions(skill_id);
CREATE INDEX IF NOT EXISTS idx_ai_executions_user_id ON ai_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_executions_company_id ON ai_executions(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_executions_created_at ON ai_executions(created_at);

-- 安全函数
CREATE OR REPLACE FUNCTION rls_safe_execute(p_sql TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE p_sql;
EXCEPTION
  WHEN undefined_table OR undefined_column OR undefined_function OR duplicate_object OR duplicate_table OR insufficient_privilege THEN
    RAISE NOTICE 'rls_safe_execute skipped (%): %', SQLSTATE, p_sql;
END $$ LANGUAGE plpgsql;

-- 用户只能读写自己的执行记录；BOSS/ADMIN 可读写全公司
SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_select_ai_executions" ON ai_executions;');
SELECT rls_safe_execute('CREATE POLICY "rls_select_ai_executions" ON ai_executions FOR SELECT TO authenticated USING (user_id = auth.uid() OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_insert_ai_executions" ON ai_executions;');
SELECT rls_safe_execute('CREATE POLICY "rls_insert_ai_executions" ON ai_executions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_update_ai_executions" ON ai_executions;');
SELECT rls_safe_execute('CREATE POLICY "rls_update_ai_executions" ON ai_executions FOR UPDATE TO authenticated USING (user_id = auth.uid() OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_delete_ai_executions" ON ai_executions;');
SELECT rls_safe_execute('CREATE POLICY "rls_delete_ai_executions" ON ai_executions FOR DELETE TO authenticated USING (user_id = auth.uid() OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'',''admin'')));');

SELECT '✅ 043 完成：ai_executions 表已创建' AS status;
