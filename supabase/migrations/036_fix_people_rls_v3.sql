-- ============================================
-- 036: 进一步修复人员列表 RLS（使用 SECURITY DEFINER 辅助函数，避免递归）
-- 问题：035 的策略在部分 Supabase 环境中因 RLS 递归导致同公司成员仍不可见
-- 目标：用无递归的辅助函数实现同公司成员可见
-- ============================================

-- 0. 兼容性：确保辅助函数存在
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role_level()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role_level FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_user_company_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_current_user_role_level() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role_level() TO authenticated;

-- 1. profiles 策略清理与重建（v3）
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_v2" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_v2" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_v2" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_v2" ON public.profiles;

-- 兜底：再清理一次旧名称
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
DROP POLICY IF EXISTS "rls_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "rls_insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "rls_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "rls_delete_profiles" ON public.profiles;

-- 1.1 SELECT：自己；同一公司；未分配公司的待选成员仅 BOSS/ADMIN 可见
CREATE POLICY "profiles_select_v3" ON public.profiles
  FOR SELECT USING (
    user_id = auth.uid()
    OR company_id = public.get_current_user_company_id()
    OR (
      company_id IS NULL
      AND public.get_current_user_role_level() IN ('boss', 'admin')
    )
  );

-- 1.2 INSERT：自己创建 profile；本公司 BOSS/ADMIN 可代为创建
CREATE POLICY "profiles_insert_v3" ON public.profiles
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR (
      public.get_current_user_role_level() IN ('boss', 'admin')
      AND company_id = public.get_current_user_company_id()
    )
  );

-- 1.3 UPDATE：自己；或本公司 BOSS/ADMIN 可修改他人
CREATE POLICY "profiles_update_v3" ON public.profiles
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (
      public.get_current_user_role_level() IN ('boss', 'admin')
      AND company_id = public.get_current_user_company_id()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (
      public.get_current_user_role_level() IN ('boss', 'admin')
      AND company_id = public.get_current_user_company_id()
    )
  );

-- 1.4 DELETE：自己；或本公司 BOSS/ADMIN 可删除他人
CREATE POLICY "profiles_delete_v3" ON public.profiles
  FOR DELETE USING (
    user_id = auth.uid()
    OR (
      public.get_current_user_role_level() IN ('boss', 'admin')
      AND company_id = public.get_current_user_company_id()
    )
  );

-- 2. user_brands 策略清理与重建（v3）
ALTER TABLE public.user_brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_brands_select_v2" ON public.user_brands;
DROP POLICY IF EXISTS "user_brands_insert_v2" ON public.user_brands;
DROP POLICY IF EXISTS "user_brands_update_v2" ON public.user_brands;
DROP POLICY IF EXISTS "user_brands_delete_v2" ON public.user_brands;

DROP POLICY IF EXISTS "rls_select_user_brands" ON public.user_brands;
DROP POLICY IF EXISTS "rls_insert_user_brands" ON public.user_brands;
DROP POLICY IF EXISTS "rls_update_user_brands" ON public.user_brands;
DROP POLICY IF EXISTS "rls_delete_user_brands" ON public.user_brands;

-- 2.1 SELECT：自己；或同一公司下任意成员的品牌关联
CREATE POLICY "user_brands_select_v3" ON public.user_brands
  FOR SELECT USING (
    user_id = auth.uid()
    OR brand_id IN (
      SELECT id FROM public.brands
      WHERE company_id = public.get_current_user_company_id()
    )
  );

-- 2.2 INSERT：本公司 BOSS/ADMIN 可分配品牌权限
CREATE POLICY "user_brands_insert_v3" ON public.user_brands
  FOR INSERT WITH CHECK (
    public.get_current_user_role_level() IN ('boss', 'admin')
    AND brand_id IN (
      SELECT id FROM public.brands
      WHERE company_id = public.get_current_user_company_id()
    )
  );

-- 2.3 UPDATE：本公司 BOSS/ADMIN 可修改品牌权限
CREATE POLICY "user_brands_update_v3" ON public.user_brands
  FOR UPDATE USING (
    public.get_current_user_role_level() IN ('boss', 'admin')
    AND brand_id IN (
      SELECT id FROM public.brands
      WHERE company_id = public.get_current_user_company_id()
    )
  )
  WITH CHECK (
    public.get_current_user_role_level() IN ('boss', 'admin')
    AND brand_id IN (
      SELECT id FROM public.brands
      WHERE company_id = public.get_current_user_company_id()
    )
  );

-- 2.4 DELETE：本公司 BOSS/ADMIN 可删除；用户自己也可以取消自己的品牌关联
CREATE POLICY "user_brands_delete_v3" ON public.user_brands
  FOR DELETE USING (
    user_id = auth.uid()
    OR (
      public.get_current_user_role_level() IN ('boss', 'admin')
      AND brand_id IN (
        SELECT id FROM public.brands
        WHERE company_id = public.get_current_user_company_id()
      )
    )
  );

-- 3. 权限授予
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_brands TO authenticated;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.user_brands FROM anon;
