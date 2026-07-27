-- ============================================
-- 035: 修复人员与权限模块的 RLS 策略
-- 问题：030 迁移把 profiles / user_brands 锁成了“只能看自己”，
--       导致 BOSS/ADMIN 在另一台电脑登录时只能看到 1 个人。
-- 目标：让公司管理员/老板能看到并管理同一公司下的所有成员和品牌权限。
-- ============================================

-- 0. 兼容性：确保 get_user_brand_ids 辅助函数存在
CREATE OR REPLACE FUNCTION public.get_user_brand_ids()
RETURNS TABLE(brand_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT ub.brand_id
  FROM public.user_brands ub
  WHERE ub.user_id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_brand_ids() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_brand_ids() TO authenticated;

-- 1. profiles 表策略清理与重建
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
DROP POLICY IF EXISTS "rls_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "rls_insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "rls_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "rls_delete_profiles" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_delete_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to delete profiles" ON public.profiles;

-- 1.1 SELECT：自己；同一公司的其他成员；未分配公司的待选成员（仅 BOSS/ADMIN 可见）
CREATE POLICY "profiles_select_v2" ON public.profiles
  FOR SELECT USING (
    user_id = auth.uid()
    OR company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    OR (
      company_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.role_level IN ('boss', 'admin')
      )
    )
  );

-- 1.2 INSERT：自己创建 profile；公司管理员可代为创建
CREATE POLICY "profiles_insert_v2" ON public.profiles
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id = profiles.company_id
        AND p.role_level IN ('boss', 'admin')
    )
  );

-- 1.3 UPDATE：自己；或本公司 BOSS/ADMIN 可修改他人
CREATE POLICY "profiles_update_v2" ON public.profiles
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id = profiles.company_id
        AND p.role_level IN ('boss', 'admin')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id = profiles.company_id
        AND p.role_level IN ('boss', 'admin')
    )
  );

-- 1.4 DELETE：自己；或本公司 BOSS/ADMIN 可删除他人
CREATE POLICY "profiles_delete_v2" ON public.profiles
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id = profiles.company_id
        AND p.role_level IN ('boss', 'admin')
    )
  );

-- 2. user_brands 表策略清理与重建
ALTER TABLE public.user_brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_select_user_brands" ON public.user_brands;
DROP POLICY IF EXISTS "rls_insert_user_brands" ON public.user_brands;
DROP POLICY IF EXISTS "rls_update_user_brands" ON public.user_brands;
DROP POLICY IF EXISTS "rls_delete_user_brands" ON public.user_brands;
DROP POLICY IF EXISTS "user_brands_select" ON public.user_brands;
DROP POLICY IF EXISTS "user_brands_insert" ON public.user_brands;
DROP POLICY IF EXISTS "user_brands_update" ON public.user_brands;
DROP POLICY IF EXISTS "user_brands_delete" ON public.user_brands;
DROP POLICY IF EXISTS "Allow authenticated users to read user_brands" ON public.user_brands;
DROP POLICY IF EXISTS "Allow authenticated users to insert user_brands" ON public.user_brands;
DROP POLICY IF EXISTS "Allow authenticated users to update user_brands" ON public.user_brands;
DROP POLICY IF EXISTS "Allow authenticated users to delete user_brands" ON public.user_brands;

-- 2.1 SELECT：自己关联的品牌；或同一公司下其他成员的品牌关联
CREATE POLICY "user_brands_select_v2" ON public.user_brands
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.brands b ON b.company_id = p.company_id
      WHERE p.user_id = auth.uid()
        AND b.id = user_brands.brand_id
    )
  );

-- 2.2 INSERT：本公司 BOSS/ADMIN 可分配品牌权限
CREATE POLICY "user_brands_insert_v2" ON public.user_brands
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.brands b ON b.company_id = p.company_id
      WHERE p.user_id = auth.uid()
        AND b.id = user_brands.brand_id
        AND p.role_level IN ('boss', 'admin')
    )
  );

-- 2.3 UPDATE：本公司 BOSS/ADMIN 可修改品牌权限
CREATE POLICY "user_brands_update_v2" ON public.user_brands
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.brands b ON b.company_id = p.company_id
      WHERE p.user_id = auth.uid()
        AND b.id = user_brands.brand_id
        AND p.role_level IN ('boss', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.brands b ON b.company_id = p.company_id
      WHERE p.user_id = auth.uid()
        AND b.id = user_brands.brand_id
        AND p.role_level IN ('boss', 'admin')
    )
  );

-- 2.4 DELETE：本公司 BOSS/ADMIN 可删除品牌权限；用户自己也可以取消自己的品牌关联
CREATE POLICY "user_brands_delete_v2" ON public.user_brands
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.brands b ON b.company_id = p.company_id
      WHERE p.user_id = auth.uid()
        AND b.id = user_brands.brand_id
        AND p.role_level IN ('boss', 'admin')
    )
  );

-- 3. 权限授予
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_brands TO authenticated;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.user_brands FROM anon;
