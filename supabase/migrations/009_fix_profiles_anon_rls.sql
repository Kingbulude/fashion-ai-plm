-- 修复 profiles 和 brands 表的 anon 用户 RLS 策略
-- 确保 anon 用户也能正常操作这些表（MVP 阶段）

-- profiles 表 - 允许 anon 用户全部操作
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'allow_anon_all_profiles'
  ) THEN
    CREATE POLICY allow_anon_all_profiles ON profiles
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- brands 表 - 允许 anon 用户全部操作
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'brands' AND policyname = 'allow_anon_all_brands'
  ) THEN
    CREATE POLICY allow_anon_all_brands ON brands
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- 确保权限正确
GRANT ALL ON profiles TO anon;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON brands TO anon;
GRANT ALL ON brands TO authenticated;
