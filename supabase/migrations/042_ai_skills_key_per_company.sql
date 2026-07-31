-- ============================================
-- 042: AI Skill key 改为按公司唯一
-- 原因：默认 AI Skill（企划助手、库存盘活等）需要按公司为每个租户自动初始化，
--       全局唯一 key 会导致非默认公司无法插入同名预设。
-- ============================================

-- 先补齐 company_id 字段（兼容尚未执行 014 迁移的环境）
ALTER TABLE ai_skills
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ai_skills_company_id ON ai_skills(company_id);

-- 安全函数：捕获对象不存在等错误
CREATE OR REPLACE FUNCTION rls_safe_execute(p_sql TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE p_sql;
EXCEPTION
  WHEN undefined_table OR undefined_column OR undefined_function OR duplicate_object OR duplicate_table OR insufficient_privilege THEN
    RAISE NOTICE 'rls_safe_execute skipped (%): %', SQLSTATE, p_sql;
END $$ LANGUAGE plpgsql;

-- 删除 key 列上的旧全局唯一约束/索引
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

-- 清理可能存在的旧唯一索引
SELECT rls_safe_execute('DROP INDEX IF EXISTS idx_ai_skills_key;');

-- 处理已有数据中的重复 key（同一公司内），避免组合唯一约束失败
DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN
    SELECT id, key, company_id
    FROM ai_skills a
    WHERE EXISTS (
      SELECT 1 FROM ai_skills b
      WHERE b.key = a.key
        AND b.company_id IS NOT DISTINCT FROM a.company_id
        AND b.id <> a.id
    )
  LOOP
    UPDATE ai_skills
    SET key = dup.key || '_' || substr(gen_random_uuid()::text, 1, 8)
    WHERE id = dup.id;
  END LOOP;
END $$;

-- 添加新的组合唯一约束：同一公司内 key 唯一
SELECT rls_safe_execute('
  ALTER TABLE ai_skills
  ADD CONSTRAINT ai_skills_key_company_unique
  UNIQUE (key, company_id);
');

-- 为现有 NULL company_id 的数据回填默认公司，避免后续查询为空
UPDATE ai_skills
SET company_id = '00000000-0000-0000-0000-000000000010'
WHERE company_id IS NULL;

-- 为管理员角色开通完整访问权限，避免 company_id 为空时被 RLS 拦截
SELECT rls_safe_execute('CREATE POLICY "rls_select_ai_skills_admin" ON ai_skills FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'', ''admin'')) OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));');
SELECT rls_safe_execute('CREATE POLICY "rls_insert_ai_skills_admin" ON ai_skills FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'', ''admin'')) OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));');
SELECT rls_safe_execute('CREATE POLICY "rls_update_ai_skills_admin" ON ai_skills FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'', ''admin'')) OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'', ''admin'')) OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));');
SELECT rls_safe_execute('CREATE POLICY "rls_delete_ai_skills_admin" ON ai_skills FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role_level IN (''boss'', ''admin'')) OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));');

SELECT '✅ 042 完成：ai_skills key 已改为按公司唯一' AS status;
