-- ============================================
-- 030: RLS 安全加固 - 清理宽松策略
-- 目标：撤销 anon 权限，移除 USING(true)/TO anon/OR auth.uid() IS NULL 等宽松策略，
--       为所有业务表启用并强制 RLS，按 brand_id/company_id/user_id 重建最小权限策略
-- 执行方式：在 Supabase Dashboard → SQL Editor 中按顺序执行
-- 注意：此脚本会 DROP public schema 下所有业务表的现有策略并重建，执行前请备份
-- ============================================

-- ───────────────────────────────────────────
-- Step 1: 撤销 anon 角色在所有对象上的权限
-- ───────────────────────────────────────────
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON SCHEMA public FROM anon;

-- ───────────────────────────────────────────
-- Step 2: 修正/固化辅助函数，确保未认证时返回空
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_brand_ids()
RETURNS TABLE(brand_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 未认证用户：直接返回空集合，不依赖调用方再判断 auth.uid()
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  -- 已认证用户：返回 user_brands 表中关联的品牌
  RETURN QUERY
  SELECT ub.brand_id
  FROM user_brands ub
  WHERE ub.user_id = auth.uid();
END;
$$;

-- 撤销 anon 对所有辅助函数的访问
REVOKE EXECUTE ON FUNCTION get_user_brand_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION check_brand_access(UUID, TEXT) FROM anon;

-- 辅助函数：检查当前用户是否为某公司的 admin/boss
CREATE OR REPLACE FUNCTION is_company_admin_or_boss(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND company_id = p_company_id
      AND role_level IN ('admin', 'boss')
  );
END;
$$;

-- 辅助函数：检查当前用户是否为某品牌的 admin/boss（通过品牌所属公司）
CREATE OR REPLACE FUNCTION is_brand_admin_or_boss(p_brand_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    JOIN brands b ON b.company_id = p.company_id
    WHERE p.user_id = auth.uid()
      AND b.id = p_brand_id
      AND p.role_level IN ('admin', 'boss')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION is_company_admin_or_boss(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION is_brand_admin_or_boss(UUID) FROM anon;

-- ───────────────────────────────────────────
-- Step 3: 清理所有现有宽松策略
-- 安全起见：删除 public schema 下除迁移表外所有表的现有策略，再重建
-- ───────────────────────────────────────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename NOT IN ('schema_migrations', 'migrations')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ───────────────────────────────────────────
-- Step 4: 为所有业务表启用并强制 RLS
-- service_role 通过 BYPASSRLS 绕过强制 RLS，供后台任务使用
-- ───────────────────────────────────────────
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('schema_migrations', 'migrations')
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
    EXECUTE format('ALTER TABLE IF EXISTS public.%I FORCE ROW LEVEL SECURITY;', tbl.tablename);
  END LOOP;
END $$;

-- 注意：Supabase 的 service_role 是保留角色，默认已具备绕过 RLS 的权限，
-- 且只有 superuser 才能修改它，因此这里不执行 ALTER ROLE。
-- 应用层必须确保普通 API 请求不使用 service_role key。

-- ───────────────────────────────────────────
-- Step 5: 为含 brand_id 字段的表批量创建品牌隔离策略
-- 排除需要特殊处理的表：profiles / user_brands / brands / seasons / todos /
--                       user_process_roles / user_process_owner_scopes /
--                       design_feedback_items / inspiration_boards / inspiration_items
-- ───────────────────────────────────────────
DO $$
DECLARE
  tbl RECORD;
  excluded_tables TEXT[] := ARRAY[
    'profiles', 'user_brands', 'brands', 'seasons', 'todos',
    'user_process_roles', 'user_process_owner_scopes',
    'design_feedback_items', 'inspiration_boards', 'inspiration_items'
  ];
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'brand_id'
      AND table_name <> ALL (excluded_tables)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "rls_select_%I" ON %I;', tbl.table_name, tbl.table_name);
    EXECUTE format('DROP POLICY IF EXISTS "rls_insert_%I" ON %I;', tbl.table_name, tbl.table_name);
    EXECUTE format('DROP POLICY IF EXISTS "rls_update_%I" ON %I;', tbl.table_name, tbl.table_name);
    EXECUTE format('DROP POLICY IF EXISTS "rls_delete_%I" ON %I;', tbl.table_name, tbl.table_name);

    EXECUTE format(
      'CREATE POLICY "rls_select_%1$I" ON %1$I FOR SELECT TO authenticated USING (brand_id IN (SELECT get_user_brand_ids()));',
      tbl.table_name
    );
    EXECUTE format(
      'CREATE POLICY "rls_insert_%1$I" ON %1$I FOR INSERT TO authenticated WITH CHECK (brand_id IN (SELECT get_user_brand_ids()));',
      tbl.table_name
    );
    EXECUTE format(
      'CREATE POLICY "rls_update_%1$I" ON %1$I FOR UPDATE TO authenticated USING (brand_id IN (SELECT get_user_brand_ids())) WITH CHECK (brand_id IN (SELECT get_user_brand_ids()));',
      tbl.table_name
    );
    EXECUTE format(
      'CREATE POLICY "rls_delete_%1$I" ON %1$I FOR DELETE TO authenticated USING (brand_id IN (SELECT get_user_brand_ids()));',
      tbl.table_name
    );
  END LOOP;
END $$;

-- ───────────────────────────────────────────
-- Step 6: 为仅含 company_id 字段（不含 brand_id）的表批量创建公司隔离策略
-- 排除需要特殊处理的表：companies
-- ───────────────────────────────────────────
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'company_id'
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns c2
        WHERE c2.table_schema = 'public'
          AND c2.table_name = c.table_name
          AND c2.column_name = 'brand_id'
      )
      AND c.table_name <> 'companies'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "rls_select_%I" ON %I;', tbl.table_name, tbl.table_name);
    EXECUTE format('DROP POLICY IF EXISTS "rls_insert_%I" ON %I;', tbl.table_name, tbl.table_name);
    EXECUTE format('DROP POLICY IF EXISTS "rls_update_%I" ON %I;', tbl.table_name, tbl.table_name);
    EXECUTE format('DROP POLICY IF EXISTS "rls_delete_%I" ON %I;', tbl.table_name, tbl.table_name);

    EXECUTE format(
      'CREATE POLICY "rls_select_%1$I" ON %1$I FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));',
      tbl.table_name
    );
    EXECUTE format(
      'CREATE POLICY "rls_insert_%1$I" ON %1$I FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));',
      tbl.table_name
    );
    EXECUTE format(
      'CREATE POLICY "rls_update_%1$I" ON %1$I FOR UPDATE TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));',
      tbl.table_name
    );
    EXECUTE format(
      'CREATE POLICY "rls_delete_%1$I" ON %1$I FOR DELETE TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));',
      tbl.table_name
    );
  END LOOP;
END $$;

-- ───────────────────────────────────────────
-- Step 7: 特殊表策略
-- ───────────────────────────────────────────

-- 7.1 profiles：用户只能读写自己的 profile
DROP POLICY IF EXISTS "rls_select_profiles" ON profiles;
CREATE POLICY "rls_select_profiles" ON profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "rls_insert_profiles" ON profiles;
CREATE POLICY "rls_insert_profiles" ON profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "rls_update_profiles" ON profiles;
CREATE POLICY "rls_update_profiles" ON profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "rls_delete_profiles" ON profiles;
CREATE POLICY "rls_delete_profiles" ON profiles FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 7.2 user_brands：用户只能看到自己关联的品牌
DROP POLICY IF EXISTS "rls_select_user_brands" ON user_brands;
CREATE POLICY "rls_select_user_brands" ON user_brands FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "rls_insert_user_brands" ON user_brands;
CREATE POLICY "rls_insert_user_brands" ON user_brands FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "rls_update_user_brands" ON user_brands;
CREATE POLICY "rls_update_user_brands" ON user_brands FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "rls_delete_user_brands" ON user_brands;
CREATE POLICY "rls_delete_user_brands" ON user_brands FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 7.3 companies：已认证用户可读；写操作仅限本公司 admin/boss
DROP POLICY IF EXISTS "rls_select_companies" ON companies;
CREATE POLICY "rls_select_companies" ON companies FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rls_insert_companies" ON companies;
CREATE POLICY "rls_insert_companies" ON companies FOR INSERT TO authenticated WITH CHECK (is_company_admin_or_boss(id));
DROP POLICY IF EXISTS "rls_update_companies" ON companies;
CREATE POLICY "rls_update_companies" ON companies FOR UPDATE TO authenticated USING (is_company_admin_or_boss(id)) WITH CHECK (is_company_admin_or_boss(id));
DROP POLICY IF EXISTS "rls_delete_companies" ON companies;
CREATE POLICY "rls_delete_companies" ON companies FOR DELETE TO authenticated USING (is_company_admin_or_boss(id));

-- 7.4 brands：已认证用户可读；写操作仅限公司 admin/boss
DROP POLICY IF EXISTS "rls_select_brands" ON brands;
CREATE POLICY "rls_select_brands" ON brands FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rls_insert_brands" ON brands;
CREATE POLICY "rls_insert_brands" ON brands FOR INSERT TO authenticated WITH CHECK (is_company_admin_or_boss(company_id));
DROP POLICY IF EXISTS "rls_update_brands" ON brands;
CREATE POLICY "rls_update_brands" ON brands FOR UPDATE TO authenticated USING (is_company_admin_or_boss(company_id)) WITH CHECK (is_company_admin_or_boss(company_id));
DROP POLICY IF EXISTS "rls_delete_brands" ON brands;
CREATE POLICY "rls_delete_brands" ON brands FOR DELETE TO authenticated USING (is_company_admin_or_boss(company_id));

-- 7.5 seasons：已认证用户可读；写操作仅限品牌 admin/boss
DROP POLICY IF EXISTS "rls_select_seasons" ON seasons;
CREATE POLICY "rls_select_seasons" ON seasons FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rls_insert_seasons" ON seasons;
CREATE POLICY "rls_insert_seasons" ON seasons FOR INSERT TO authenticated WITH CHECK (is_brand_admin_or_boss(brand_id));
DROP POLICY IF EXISTS "rls_update_seasons" ON seasons;
CREATE POLICY "rls_update_seasons" ON seasons FOR UPDATE TO authenticated USING (is_brand_admin_or_boss(brand_id)) WITH CHECK (is_brand_admin_or_boss(brand_id));
DROP POLICY IF EXISTS "rls_delete_seasons" ON seasons;
CREATE POLICY "rls_delete_seasons" ON seasons FOR DELETE TO authenticated USING (is_brand_admin_or_boss(brand_id));

-- 7.6 todos：brand_id 可为 NULL，NULL 视为全局待办
DROP POLICY IF EXISTS "rls_select_todos" ON todos;
CREATE POLICY "rls_select_todos" ON todos FOR SELECT TO authenticated USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_insert_todos" ON todos;
CREATE POLICY "rls_insert_todos" ON todos FOR INSERT TO authenticated WITH CHECK (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_update_todos" ON todos;
CREATE POLICY "rls_update_todos" ON todos FOR UPDATE TO authenticated USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids())) WITH CHECK (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_delete_todos" ON todos;
CREATE POLICY "rls_delete_todos" ON todos FOR DELETE TO authenticated USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));

-- 7.7 仅含 style_id 的子表：通过 styles 关联到品牌
DO $$
DECLARE
  style_tbl TEXT;
  style_tables TEXT[] := ARRAY['qc_records', 'inventory', 'sales_data', 'after_sales'];
BEGIN
  FOREACH style_tbl IN ARRAY style_tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "rls_select_%I" ON %I;', style_tbl, style_tbl);
    EXECUTE format('DROP POLICY IF EXISTS "rls_insert_%I" ON %I;', style_tbl, style_tbl);
    EXECUTE format('DROP POLICY IF EXISTS "rls_update_%I" ON %I;', style_tbl, style_tbl);
    EXECUTE format('DROP POLICY IF EXISTS "rls_delete_%I" ON %I;', style_tbl, style_tbl);

    EXECUTE format(
      'CREATE POLICY "rls_select_%1$I" ON %1$I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM styles s WHERE s.id = %1$I.style_id AND s.brand_id IN (SELECT get_user_brand_ids())));',
      style_tbl
    );
    EXECUTE format(
      'CREATE POLICY "rls_insert_%1$I" ON %1$I FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM styles s WHERE s.id = %1$I.style_id AND s.brand_id IN (SELECT get_user_brand_ids())));',
      style_tbl
    );
    EXECUTE format(
      'CREATE POLICY "rls_update_%1$I" ON %1$I FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM styles s WHERE s.id = %1$I.style_id AND s.brand_id IN (SELECT get_user_brand_ids()))) WITH CHECK (EXISTS (SELECT 1 FROM styles s WHERE s.id = %1$I.style_id AND s.brand_id IN (SELECT get_user_brand_ids())));',
      style_tbl
    );
    EXECUTE format(
      'CREATE POLICY "rls_delete_%1$I" ON %1$I FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM styles s WHERE s.id = %1$I.style_id AND s.brand_id IN (SELECT get_user_brand_ids())));',
      style_tbl
    );
  END LOOP;
END $$;

-- 7.8 mood_boards 家族：通过 planning 关联到品牌
DROP POLICY IF EXISTS "rls_select_mood_boards" ON mood_boards;
CREATE POLICY "rls_select_mood_boards" ON mood_boards FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM planning p WHERE p.id = mood_boards.planning_id AND p.brand_id IN (SELECT get_user_brand_ids())));
DROP POLICY IF EXISTS "rls_insert_mood_boards" ON mood_boards;
CREATE POLICY "rls_insert_mood_boards" ON mood_boards FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM planning p WHERE p.id = mood_boards.planning_id AND p.brand_id IN (SELECT get_user_brand_ids())));
DROP POLICY IF EXISTS "rls_update_mood_boards" ON mood_boards;
CREATE POLICY "rls_update_mood_boards" ON mood_boards FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM planning p WHERE p.id = mood_boards.planning_id AND p.brand_id IN (SELECT get_user_brand_ids()))) WITH CHECK (EXISTS (SELECT 1 FROM planning p WHERE p.id = mood_boards.planning_id AND p.brand_id IN (SELECT get_user_brand_ids())));
DROP POLICY IF EXISTS "rls_delete_mood_boards" ON mood_boards;
CREATE POLICY "rls_delete_mood_boards" ON mood_boards FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM planning p WHERE p.id = mood_boards.planning_id AND p.brand_id IN (SELECT get_user_brand_ids())));

DROP POLICY IF EXISTS "rls_select_mood_board_shapes" ON mood_board_shapes;
CREATE POLICY "rls_select_mood_board_shapes" ON mood_board_shapes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM mood_boards mb JOIN planning p ON p.id = mb.planning_id WHERE mb.id = mood_board_shapes.board_id AND p.brand_id IN (SELECT get_user_brand_ids())));
DROP POLICY IF EXISTS "rls_insert_mood_board_shapes" ON mood_board_shapes;
CREATE POLICY "rls_insert_mood_board_shapes" ON mood_board_shapes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM mood_boards mb JOIN planning p ON p.id = mb.planning_id WHERE mb.id = mood_board_shapes.board_id AND p.brand_id IN (SELECT get_user_brand_ids())));
DROP POLICY IF EXISTS "rls_update_mood_board_shapes" ON mood_board_shapes;
CREATE POLICY "rls_update_mood_board_shapes" ON mood_board_shapes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM mood_boards mb JOIN planning p ON p.id = mb.planning_id WHERE mb.id = mood_board_shapes.board_id AND p.brand_id IN (SELECT get_user_brand_ids()))) WITH CHECK (EXISTS (SELECT 1 FROM mood_boards mb JOIN planning p ON p.id = mb.planning_id WHERE mb.id = mood_board_shapes.board_id AND p.brand_id IN (SELECT get_user_brand_ids())));
DROP POLICY IF EXISTS "rls_delete_mood_board_shapes" ON mood_board_shapes;
CREATE POLICY "rls_delete_mood_board_shapes" ON mood_board_shapes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM mood_boards mb JOIN planning p ON p.id = mb.planning_id WHERE mb.id = mood_board_shapes.board_id AND p.brand_id IN (SELECT get_user_brand_ids())));

DROP POLICY IF EXISTS "rls_select_mood_board_areas" ON mood_board_areas;
CREATE POLICY "rls_select_mood_board_areas" ON mood_board_areas FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM mood_boards mb JOIN planning p ON p.id = mb.planning_id WHERE mb.id = mood_board_areas.board_id AND p.brand_id IN (SELECT get_user_brand_ids())));
DROP POLICY IF EXISTS "rls_insert_mood_board_areas" ON mood_board_areas;
CREATE POLICY "rls_insert_mood_board_areas" ON mood_board_areas FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM mood_boards mb JOIN planning p ON p.id = mb.planning_id WHERE mb.id = mood_board_areas.board_id AND p.brand_id IN (SELECT get_user_brand_ids())));
DROP POLICY IF EXISTS "rls_update_mood_board_areas" ON mood_board_areas;
CREATE POLICY "rls_update_mood_board_areas" ON mood_board_areas FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM mood_boards mb JOIN planning p ON p.id = mb.planning_id WHERE mb.id = mood_board_areas.board_id AND p.brand_id IN (SELECT get_user_brand_ids()))) WITH CHECK (EXISTS (SELECT 1 FROM mood_boards mb JOIN planning p ON p.id = mb.planning_id WHERE mb.id = mood_board_areas.board_id AND p.brand_id IN (SELECT get_user_brand_ids())));
DROP POLICY IF EXISTS "rls_delete_mood_board_areas" ON mood_board_areas;
CREATE POLICY "rls_delete_mood_board_areas" ON mood_board_areas FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM mood_boards mb JOIN planning p ON p.id = mb.planning_id WHERE mb.id = mood_board_areas.board_id AND p.brand_id IN (SELECT get_user_brand_ids())));

DROP POLICY IF EXISTS "rls_select_mood_board_assets" ON mood_board_assets;
CREATE POLICY "rls_select_mood_board_assets" ON mood_board_assets FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM mood_boards mb JOIN planning p ON p.id = mb.planning_id WHERE mb.id = mood_board_assets.board_id AND p.brand_id IN (SELECT get_user_brand_ids())));
DROP POLICY IF EXISTS "rls_insert_mood_board_assets" ON mood_board_assets;
CREATE POLICY "rls_insert_mood_board_assets" ON mood_board_assets FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM mood_boards mb JOIN planning p ON p.id = mb.planning_id WHERE mb.id = mood_board_assets.board_id AND p.brand_id IN (SELECT get_user_brand_ids())));
DROP POLICY IF EXISTS "rls_update_mood_board_assets" ON mood_board_assets;
CREATE POLICY "rls_update_mood_board_assets" ON mood_board_assets FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM mood_boards mb JOIN planning p ON p.id = mb.planning_id WHERE mb.id = mood_board_assets.board_id AND p.brand_id IN (SELECT get_user_brand_ids()))) WITH CHECK (EXISTS (SELECT 1 FROM mood_boards mb JOIN planning p ON p.id = mb.planning_id WHERE mb.id = mood_board_assets.board_id AND p.brand_id IN (SELECT get_user_brand_ids())));
DROP POLICY IF EXISTS "rls_delete_mood_board_assets" ON mood_board_assets;
CREATE POLICY "rls_delete_mood_board_assets" ON mood_board_assets FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM mood_boards mb JOIN planning p ON p.id = mb.planning_id WHERE mb.id = mood_board_assets.board_id AND p.brand_id IN (SELECT get_user_brand_ids())));

-- 7.9 pipeline_runs：系统级流水，已认证用户可读写
DROP POLICY IF EXISTS "rls_select_pipeline_runs" ON pipeline_runs;
CREATE POLICY "rls_select_pipeline_runs" ON pipeline_runs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rls_insert_pipeline_runs" ON pipeline_runs;
CREATE POLICY "rls_insert_pipeline_runs" ON pipeline_runs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "rls_update_pipeline_runs" ON pipeline_runs;
CREATE POLICY "rls_update_pipeline_runs" ON pipeline_runs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "rls_delete_pipeline_runs" ON pipeline_runs;
CREATE POLICY "rls_delete_pipeline_runs" ON pipeline_runs FOR DELETE TO authenticated USING (true);

-- 7.10 工序角色/AI skill 关联表：通过父表 company_id 隔离
DROP POLICY IF EXISTS "rls_select_process_role_ai_skills" ON process_role_ai_skills;
CREATE POLICY "rls_select_process_role_ai_skills" ON process_role_ai_skills FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM process_roles pr WHERE pr.id = process_role_ai_skills.process_role_id AND pr.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
DROP POLICY IF EXISTS "rls_insert_process_role_ai_skills" ON process_role_ai_skills;
CREATE POLICY "rls_insert_process_role_ai_skills" ON process_role_ai_skills FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM process_roles pr WHERE pr.id = process_role_ai_skills.process_role_id AND pr.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
DROP POLICY IF EXISTS "rls_update_process_role_ai_skills" ON process_role_ai_skills;
CREATE POLICY "rls_update_process_role_ai_skills" ON process_role_ai_skills FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM process_roles pr WHERE pr.id = process_role_ai_skills.process_role_id AND pr.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM process_roles pr WHERE pr.id = process_role_ai_skills.process_role_id AND pr.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
DROP POLICY IF EXISTS "rls_delete_process_role_ai_skills" ON process_role_ai_skills;
CREATE POLICY "rls_delete_process_role_ai_skills" ON process_role_ai_skills FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM process_roles pr WHERE pr.id = process_role_ai_skills.process_role_id AND pr.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "rls_select_process_owner_scope_ai_skills" ON process_owner_scope_ai_skills;
CREATE POLICY "rls_select_process_owner_scope_ai_skills" ON process_owner_scope_ai_skills FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM process_owner_scopes pos WHERE pos.id = process_owner_scope_ai_skills.scope_id AND pos.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
DROP POLICY IF EXISTS "rls_insert_process_owner_scope_ai_skills" ON process_owner_scope_ai_skills;
CREATE POLICY "rls_insert_process_owner_scope_ai_skills" ON process_owner_scope_ai_skills FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM process_owner_scopes pos WHERE pos.id = process_owner_scope_ai_skills.scope_id AND pos.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
DROP POLICY IF EXISTS "rls_update_process_owner_scope_ai_skills" ON process_owner_scope_ai_skills;
CREATE POLICY "rls_update_process_owner_scope_ai_skills" ON process_owner_scope_ai_skills FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM process_owner_scopes pos WHERE pos.id = process_owner_scope_ai_skills.scope_id AND pos.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM process_owner_scopes pos WHERE pos.id = process_owner_scope_ai_skills.scope_id AND pos.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
DROP POLICY IF EXISTS "rls_delete_process_owner_scope_ai_skills" ON process_owner_scope_ai_skills;
CREATE POLICY "rls_delete_process_owner_scope_ai_skills" ON process_owner_scope_ai_skills FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM process_owner_scopes pos WHERE pos.id = process_owner_scope_ai_skills.scope_id AND pos.company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())));

-- 7.11 user_process_roles / user_process_owner_scopes：brand_id 可能为空，按 company_id 隔离
DROP POLICY IF EXISTS "rls_select_user_process_roles" ON user_process_roles;
CREATE POLICY "rls_select_user_process_roles" ON user_process_roles FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "rls_insert_user_process_roles" ON user_process_roles;
CREATE POLICY "rls_insert_user_process_roles" ON user_process_roles FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "rls_update_user_process_roles" ON user_process_roles;
CREATE POLICY "rls_update_user_process_roles" ON user_process_roles FOR UPDATE TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "rls_delete_user_process_roles" ON user_process_roles;
CREATE POLICY "rls_delete_user_process_roles" ON user_process_roles FOR DELETE TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "rls_select_user_process_owner_scopes" ON user_process_owner_scopes;
CREATE POLICY "rls_select_user_process_owner_scopes" ON user_process_owner_scopes FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "rls_insert_user_process_owner_scopes" ON user_process_owner_scopes;
CREATE POLICY "rls_insert_user_process_owner_scopes" ON user_process_owner_scopes FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "rls_update_user_process_owner_scopes" ON user_process_owner_scopes;
CREATE POLICY "rls_update_user_process_owner_scopes" ON user_process_owner_scopes FOR UPDATE TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "rls_delete_user_process_owner_scopes" ON user_process_owner_scopes;
CREATE POLICY "rls_delete_user_process_owner_scopes" ON user_process_owner_scopes FOR DELETE TO authenticated USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

-- 7.12 design_feedback_items / inspiration_boards / inspiration_items：brand_id 可为 NULL
DROP POLICY IF EXISTS "rls_select_design_feedback_items" ON design_feedback_items;
CREATE POLICY "rls_select_design_feedback_items" ON design_feedback_items FOR SELECT TO authenticated USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_insert_design_feedback_items" ON design_feedback_items;
CREATE POLICY "rls_insert_design_feedback_items" ON design_feedback_items FOR INSERT TO authenticated WITH CHECK (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_update_design_feedback_items" ON design_feedback_items;
CREATE POLICY "rls_update_design_feedback_items" ON design_feedback_items FOR UPDATE TO authenticated USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids())) WITH CHECK (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_delete_design_feedback_items" ON design_feedback_items;
CREATE POLICY "rls_delete_design_feedback_items" ON design_feedback_items FOR DELETE TO authenticated USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));

DROP POLICY IF EXISTS "rls_select_inspiration_boards" ON inspiration_boards;
CREATE POLICY "rls_select_inspiration_boards" ON inspiration_boards FOR SELECT TO authenticated USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_insert_inspiration_boards" ON inspiration_boards;
CREATE POLICY "rls_insert_inspiration_boards" ON inspiration_boards FOR INSERT TO authenticated WITH CHECK (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_update_inspiration_boards" ON inspiration_boards;
CREATE POLICY "rls_update_inspiration_boards" ON inspiration_boards FOR UPDATE TO authenticated USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids())) WITH CHECK (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_delete_inspiration_boards" ON inspiration_boards;
CREATE POLICY "rls_delete_inspiration_boards" ON inspiration_boards FOR DELETE TO authenticated USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));

DROP POLICY IF EXISTS "rls_select_inspiration_items" ON inspiration_items;
CREATE POLICY "rls_select_inspiration_items" ON inspiration_items FOR SELECT TO authenticated USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_insert_inspiration_items" ON inspiration_items;
CREATE POLICY "rls_insert_inspiration_items" ON inspiration_items FOR INSERT TO authenticated WITH CHECK (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_update_inspiration_items" ON inspiration_items;
CREATE POLICY "rls_update_inspiration_items" ON inspiration_items FOR UPDATE TO authenticated USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids())) WITH CHECK (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_delete_inspiration_items" ON inspiration_items;
CREATE POLICY "rls_delete_inspiration_items" ON inspiration_items FOR DELETE TO authenticated USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));

-- ───────────────────────────────────────────
-- Step 8: 确保 authenticated 拥有必要的基础权限（RLS 策略再做细粒度控制）
-- ───────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 再次确认 anon 无任何权限
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- ───────────────────────────────────────────
-- 完成状态
-- ───────────────────────────────────────────
SELECT '✅ 030 RLS 安全加固完成：已撤销 anon 权限、清理宽松策略并重建最小权限策略' AS status;
