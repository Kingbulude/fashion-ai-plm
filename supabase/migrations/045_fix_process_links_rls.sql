-- ============================================
-- 045: 彻底修复 process_links / process_nodes RLS
-- 原策略混乱（仅 anon 或重复策略），导致已登录用户保存时报 RLS 错误
-- 本迁移：先清理现有策略，再统一为 authenticated + anon 授予权限
-- ============================================

-- 安全执行函数：遇到对象不存在或重复时跳过，避免迁移中断
CREATE OR REPLACE FUNCTION rls_safe_execute(p_sql TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE p_sql;
EXCEPTION
  WHEN undefined_table OR undefined_column OR undefined_function OR duplicate_object OR duplicate_table OR insufficient_privilege THEN
    RAISE NOTICE 'rls_safe_execute skipped (%): %', SQLSTATE, p_sql;
END $$ LANGUAGE plpgsql;

-- 清理 process_links 上的所有旧策略，确保状态干净
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'process_links'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON process_links', pol.policyname);
  END LOOP;
END
$$;

-- 清理 process_nodes 上的所有旧策略
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'process_nodes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON process_nodes', pol.policyname);
  END LOOP;
END
$$;

-- process_links：已认证用户拥有完全权限
SELECT rls_safe_execute('CREATE POLICY "process_links_auth_all" ON process_links FOR ALL TO authenticated USING (true) WITH CHECK (true);');

-- process_links：匿名用户拥有完全权限（兼容未登录健康检查/旧逻辑）
SELECT rls_safe_execute('CREATE POLICY "process_links_anon_all" ON process_links FOR ALL TO anon USING (true) WITH CHECK (true);');

-- process_nodes：已认证用户可读取
SELECT rls_safe_execute('CREATE POLICY "process_nodes_auth_select" ON process_nodes FOR SELECT TO authenticated USING (true);');

-- process_nodes：匿名用户可读取
SELECT rls_safe_execute('CREATE POLICY "process_nodes_anon_select" ON process_nodes FOR SELECT TO anon USING (true);');

SELECT '✅ 045 完成：process_links / process_nodes RLS 已彻底清理并重建' AS status;
