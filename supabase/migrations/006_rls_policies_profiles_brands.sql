-- profiles 表策略
CREATE POLICY "Allow authenticated users to read profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update profiles" ON profiles
  FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated users to delete profiles" ON profiles
  FOR DELETE USING (true);

-- brands 表策略
CREATE POLICY "Allow authenticated users to read brands" ON brands
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert brands" ON brands
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update brands" ON brands
  FOR UPDATE USING (true);

-- 启用表的 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- 刷新权限
GRANT ALL ON profiles TO anon;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON brands TO anon;
GRANT ALL ON brands TO authenticated;
