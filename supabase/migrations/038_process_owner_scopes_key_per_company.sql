-- ============================================
-- 038: 工序主管类型 key 改为按公司唯一
-- 原因：默认主管类型（设计主管/产品主管/运营主管/售后主管）需要按公司为每个租户自动初始化，
--       全局唯一 key 会导致非默认公司无法插入同名预设。
-- ============================================

-- 先补齐 company_id 字段（兼容尚未执行 017 迁移的环境）
ALTER TABLE process_owner_scopes
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_process_owner_scopes_company_id ON process_owner_scopes(company_id);

-- 安全函数：捕获对象不存在等错误
CREATE OR REPLACE FUNCTION rls_safe_execute(p_sql TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE p_sql;
EXCEPTION
  WHEN undefined_table OR undefined_column OR undefined_function OR duplicate_object OR insufficient_privilege THEN
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

-- 清理可能存在的旧唯一索引
SELECT rls_safe_execute('DROP INDEX IF EXISTS idx_process_owner_scopes_key;');

-- 添加新的组合唯一约束：同一公司内 key 唯一
SELECT rls_safe_execute('
  ALTER TABLE process_owner_scopes
  ADD CONSTRAINT process_owner_scopes_key_company_unique
  UNIQUE (key, company_id);
');

-- 为现有 NULL company_id 的数据回填默认公司，避免唯一约束冲突
UPDATE process_owner_scopes
SET company_id = '00000000-0000-0000-0000-000000000010'
WHERE company_id IS NULL;

SELECT '✅ 038 完成：process_owner_scopes key 已改为按公司唯一' AS status;
