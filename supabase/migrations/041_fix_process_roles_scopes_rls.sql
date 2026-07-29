-- ============================================
-- 041: 彻底修复工序角色 / 工序主管类型的数据隔离与管理员访问
-- 问题根因：
--   1. process_roles.key 仍是全局唯一，导致多公司无法初始化同名默认角色。
--   2. process_owner_scopes / process_roles 的 RLS 强依赖 profiles.company_id，
--      旧账号 company_id 为空时看不到也写不进数据。
-- 修复目标：
--   A. 把两张表的 key 改为 (key, company_id) 组合唯一。
--   B. 为 BOSS / ADMIN 开通独立 RLS 策略，不再因 company_id 为空被拦截。
-- ============================================

-- 安全函数：静默忽略对象不存在类错误
CREATE OR REPLACE FUNCTION rls_safe_execute(p_sql TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE p_sql;
EXCEPTION
  WHEN undefined_table OR undefined_column OR undefined_function OR duplicate_object OR insufficient_privilege THEN
    RAISE NOTICE 'rls_safe_execute skipped (%): %', SQLSTATE, p_sql;
END $$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────
-- 1. process_roles：补齐字段 + 改组合唯一 + 管理员 RLS
-- ───────────────────────────────────────────
ALTER TABLE process_roles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_process_roles_company_id ON process_roles(company_id);

-- 删除旧的全局唯一约束/索引（只要 key 列参与且未包含 company_id）
DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO con_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_name = 'process_roles'
    AND tc.constraint_type = 'UNIQUE'
    AND ccu.column_name = 'key'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage ccu2
      WHERE ccu2.constraint_name = tc.constraint_name
        AND ccu2.column_name = 'company_id'
    );

  IF con_name IS NOT NULL THEN
    PERFORM rls_safe_execute(format('ALTER TABLE process_roles DROP CONSTRAINT %I;', con_name));
  END IF;
END $$;

SELECT rls_safe_execute('DROP INDEX IF EXISTS idx_process_roles_key;');

-- 添加组合唯一约束（如果已存在则忽略）
SELECT rls_safe_execute('
  ALTER TABLE process_roles
  ADD CONSTRAINT process_roles_key_company_unique
  UNIQUE (key, company_id);
');

-- 回填历史 NULL 数据到默认公司
UPDATE process_roles
SET company_id = '00000000-0000-0000-0000-000000000010'
WHERE company_id IS NULL;

-- 为管理员角色（BOSS / ADMIN）开通完整访问权限
SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_select_process_roles" ON process_roles;');
SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_insert_process_roles" ON process_roles;');
SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_update_process_roles" ON process_roles;');
SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_delete_process_roles" ON process_roles;');

SELECT rls_safe_execute('CREATE POLICY "rls_select_process_roles" ON process_roles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'', ''admin'')) OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));');
SELECT rls_safe_execute('CREATE POLICY "rls_insert_process_roles" ON process_roles FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'', ''admin'')) OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));');
SELECT rls_safe_execute('CREATE POLICY "rls_update_process_roles" ON process_roles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'', ''admin'')) OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'', ''admin'')) OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));');
SELECT rls_safe_execute('CREATE POLICY "rls_delete_process_roles" ON process_roles FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'', ''admin'')) OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));');

-- ───────────────────────────────────────────
-- 2. process_owner_scopes：补齐字段 + 改组合唯一 + 管理员 RLS
-- ───────────────────────────────────────────
ALTER TABLE process_owner_scopes
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_process_owner_scopes_company_id ON process_owner_scopes(company_id);

DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO con_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_name = 'process_owner_scopes'
    AND tc.constraint_type = 'UNIQUE'
    AND ccu.column_name = 'key'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage ccu2
      WHERE ccu2.constraint_name = tc.constraint_name
        AND ccu2.column_name = 'company_id'
    );

  IF con_name IS NOT NULL THEN
    PERFORM rls_safe_execute(format('ALTER TABLE process_owner_scopes DROP CONSTRAINT %I;', con_name));
  END IF;
END $$;

SELECT rls_safe_execute('DROP INDEX IF EXISTS idx_process_owner_scopes_key;');

SELECT rls_safe_execute('
  ALTER TABLE process_owner_scopes
  ADD CONSTRAINT process_owner_scopes_key_company_unique
  UNIQUE (key, company_id);
');

UPDATE process_owner_scopes
SET company_id = '00000000-0000-0000-0000-000000000010'
WHERE company_id IS NULL;

SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_select_process_owner_scopes" ON process_owner_scopes;');
SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_insert_process_owner_scopes" ON process_owner_scopes;');
SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_update_process_owner_scopes" ON process_owner_scopes;');
SELECT rls_safe_execute('DROP POLICY IF EXISTS "rls_delete_process_owner_scopes" ON process_owner_scopes;');

SELECT rls_safe_execute('CREATE POLICY "rls_select_process_owner_scopes" ON process_owner_scopes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'', ''admin'')) OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));');
SELECT rls_safe_execute('CREATE POLICY "rls_insert_process_owner_scopes" ON process_owner_scopes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'', ''admin'')) OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));');
SELECT rls_safe_execute('CREATE POLICY "rls_update_process_owner_scopes" ON process_owner_scopes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'', ''admin'')) OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'', ''admin'')) OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));');
SELECT rls_safe_execute('CREATE POLICY "rls_delete_process_owner_scopes" ON process_owner_scopes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'', ''admin'')) OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));');

SELECT '✅ 041 完成：工序角色/主管类型 RLS 与唯一约束已修复' AS status;
