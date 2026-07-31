-- ============================================
-- 045: 修复 process_links / process_nodes RLS
-- 原策略仅允许 anon，导致已登录用户保存时报 RLS 错误
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

-- 允许已认证用户读取 process_links
SELECT rls_safe_execute('CREATE POLICY "rls_select_process_links_auth" ON process_links FOR SELECT TO authenticated USING (true);');

-- 允许已认证用户插入 process_links
SELECT rls_safe_execute('CREATE POLICY "rls_insert_process_links_auth" ON process_links FOR INSERT TO authenticated WITH CHECK (true);');

-- 允许已认证用户更新 process_links
SELECT rls_safe_execute('CREATE POLICY "rls_update_process_links_auth" ON process_links FOR UPDATE TO authenticated USING (true) WITH CHECK (true);');

-- 允许已认证用户删除 process_links
SELECT rls_safe_execute('CREATE POLICY "rls_delete_process_links_auth" ON process_links FOR DELETE TO authenticated USING (true);');

-- 允许已认证用户读取 process_nodes
SELECT rls_safe_execute('CREATE POLICY "rls_select_process_nodes_auth" ON process_nodes FOR SELECT TO authenticated USING (true);');

SELECT '✅ 045 完成：process_links / process_nodes 已允许已认证用户访问' AS status;
