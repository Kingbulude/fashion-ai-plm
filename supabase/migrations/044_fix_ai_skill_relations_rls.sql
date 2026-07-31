-- ============================================
-- 044: 修复 AI Skill 关联表 RLS 与 key 唯一约束
-- 原因：
--   1. 关联表 RLS 策略在 profiles.company_id 为空时会阻止保存；
--   2. 旧全局唯一约束可能残留，导致多公司默认 Skill 初始化失败。
-- ============================================

-- 安全函数
CREATE OR REPLACE FUNCTION rls_safe_execute(p_sql TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE p_sql;
EXCEPTION
  WHEN undefined_table OR undefined_column OR undefined_function OR duplicate_object OR duplicate_table OR insufficient_privilege THEN
    RAISE NOTICE 'rls_safe_execute skipped (%): %', SQLSTATE, p_sql;
END $$ LANGUAGE plpgsql;

-- 1. 彻底清理 ai_skills.key 上的旧全局唯一约束/索引
DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO con_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_name = 'ai_skills'
    AND tc.constraint_type = 'UNIQUE'
    AND ccu.column_name = 'key'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage ccu2
      WHERE ccu2.constraint_name = tc.constraint_name
        AND ccu2.column_name = 'company_id'
    );

  IF con_name IS NOT NULL THEN
    PERFORM rls_safe_execute(format('ALTER TABLE ai_skills DROP CONSTRAINT %I;', con_name));
  END IF;
END $$;

SELECT rls_safe_execute('DROP INDEX IF EXISTS idx_ai_skills_key;');

-- 确保组合唯一约束存在
SELECT rls_safe_execute('
  ALTER TABLE ai_skills
  ADD CONSTRAINT ai_skills_key_company_unique
  UNIQUE (key, company_id);
');

-- 2. 为关联表启用 RLS（如未启用）
ALTER TABLE IF EXISTS process_role_ai_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS process_role_ai_skills FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS process_owner_scope_ai_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS process_owner_scope_ai_skills FORCE ROW LEVEL SECURITY;

-- 3. 关联表统一策略：BOSS/ADMIN 全权限；普通用户按父表 company_id 或 brand 推导
-- 3.1 process_role_ai_skills
SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_select_process_role_ai_skills" ON process_role_ai_skills;');
SELECT rls_safe_execute('CREATE POLICY "rls_select_process_role_ai_skills" ON process_role_ai_skills FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role_level IN (''boss'', ''admin'')) OR EXISTS (SELECT 1 FROM process_roles pr WHERE pr.id = process_role_ai_skills.process_role_id AND (pr.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR pr.company_id IN (SELECT company_id FROM brands WHERE id IN (SELECT brand_id FROM profiles WHERE user_id = auth.uid())))));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_insert_process_role_ai_skills" ON process_role_ai_skills;');
SELECT rls_safe_execute('CREATE POLICY "rls_insert_process_role_ai_skills" ON process_role_ai_skills FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role_level IN (''boss'', ''admin'')) OR EXISTS (SELECT 1 FROM process_roles pr WHERE pr.id = process_role_ai_skills.process_role_id AND (pr.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR pr.company_id IN (SELECT company_id FROM brands WHERE id IN (SELECT brand_id FROM profiles WHERE user_id = auth.uid())))));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_update_process_role_ai_skills" ON process_role_ai_skills;');
SELECT rls_safe_execute('CREATE POLICY "rls_update_process_role_ai_skills" ON process_role_ai_skills FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role_level IN (''boss'', ''admin'')) OR EXISTS (SELECT 1 FROM process_roles pr WHERE pr.id = process_role_ai_skills.process_role_id AND (pr.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR pr.company_id IN (SELECT company_id FROM brands WHERE id IN (SELECT brand_id FROM profiles WHERE user_id = auth.uid()))))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role_level IN (''boss'', ''admin'')) OR EXISTS (SELECT 1 FROM process_roles pr WHERE pr.id = process_role_ai_skills.process_role_id AND (pr.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR pr.company_id IN (SELECT company_id FROM brands WHERE id IN (SELECT brand_id FROM profiles WHERE user_id = auth.uid())))));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_delete_process_role_ai_skills" ON process_role_ai_skills;');
SELECT rls_safe_execute('CREATE POLICY "rls_delete_process_role_ai_skills" ON process_role_ai_skills FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role_level IN (''boss'', ''admin'')) OR EXISTS (SELECT 1 FROM process_roles pr WHERE pr.id = process_role_ai_skills.process_role_id AND (pr.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR pr.company_id IN (SELECT company_id FROM brands WHERE id IN (SELECT brand_id FROM profiles WHERE user_id = auth.uid())))));');

-- 3.2 process_owner_scope_ai_skills
SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_select_process_owner_scope_ai_skills" ON process_owner_scope_ai_skills;');
SELECT rls_safe_execute('CREATE POLICY "rls_select_process_owner_scope_ai_skills" ON process_owner_scope_ai_skills FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role_level IN (''boss'', ''admin'')) OR EXISTS (SELECT 1 FROM process_owner_scopes pos WHERE pos.id = process_owner_scope_ai_skills.scope_id AND (pos.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR pos.company_id IN (SELECT company_id FROM brands WHERE id IN (SELECT brand_id FROM profiles WHERE user_id = auth.uid())))));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_insert_process_owner_scope_ai_skills" ON process_owner_scope_ai_skills;');
SELECT rls_safe_execute('CREATE POLICY "rls_insert_process_owner_scope_ai_skills" ON process_owner_scope_ai_skills FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role_level IN (''boss'', ''admin'')) OR EXISTS (SELECT 1 FROM process_owner_scopes pos WHERE pos.id = process_owner_scope_ai_skills.scope_id AND (pos.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR pos.company_id IN (SELECT company_id FROM brands WHERE id IN (SELECT brand_id FROM profiles WHERE user_id = auth.uid())))));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_update_process_owner_scope_ai_skills" ON process_owner_scope_ai_skills;');
SELECT rls_safe_execute('CREATE POLICY "rls_update_process_owner_scope_ai_skills" ON process_owner_scope_ai_skills FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role_level IN (''boss'', ''admin'')) OR EXISTS (SELECT 1 FROM process_owner_scopes pos WHERE pos.id = process_owner_scope_ai_skills.scope_id AND (pos.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR pos.company_id IN (SELECT company_id FROM brands WHERE id IN (SELECT brand_id FROM profiles WHERE user_id = auth.uid()))))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role_level IN (''boss'', ''admin'')) OR EXISTS (SELECT 1 FROM process_owner_scopes pos WHERE pos.id = process_owner_scope_ai_skills.scope_id AND (pos.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR pos.company_id IN (SELECT company_id FROM brands WHERE id IN (SELECT brand_id FROM profiles WHERE user_id = auth.uid())))));');

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_delete_process_owner_scope_ai_skills" ON process_owner_scope_ai_skills;');
SELECT rls_safe_execute('CREATE POLICY "rls_delete_process_owner_scope_ai_skills" ON process_owner_scope_ai_skills FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role_level IN (''boss'', ''admin'')) OR EXISTS (SELECT 1 FROM process_owner_scopes pos WHERE pos.id = process_owner_scope_ai_skills.scope_id AND (pos.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR pos.company_id IN (SELECT company_id FROM brands WHERE id IN (SELECT brand_id FROM profiles WHERE user_id = auth.uid())))));');

SELECT '✅ 044 完成：AI Skill 关联表 RLS 与 key 唯一约束已修复' AS status;
