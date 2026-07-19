-- 完整的 profiles 和 brands 表创建及 RLS 策略配置
-- 在 Supabase Dashboard → SQL Editor 中执行

-- 1. 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. 创建 brands 表
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  company_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. 创建 profiles 表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '小芳',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT '设计师',
  role_level TEXT NOT NULL DEFAULT 'executor',
  company_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. 创建索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- 6. 插入默认品牌数据
INSERT INTO brands (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'TEPNIX步戌') ON CONFLICT DO NOTHING;

-- 7. 为已有用户创建默认 profile
INSERT INTO profiles (user_id, brand_id, name, role)
SELECT id, '00000000-0000-0000-0000-000000000001', '小芳', '设计师'
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.users.id);

-- 8. 创建触发器
DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- 10. 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to delete profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read brands" ON brands;
DROP POLICY IF EXISTS "Allow authenticated users to insert brands" ON brands;
DROP POLICY IF EXISTS "Allow authenticated users to update brands" ON brands;

-- 11. 创建新的 RLS 策略（对所有用户开放）
CREATE POLICY allow_all_read_profiles ON profiles FOR SELECT USING (true);
CREATE POLICY allow_all_insert_profiles ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY allow_all_update_profiles ON profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY allow_all_delete_profiles ON profiles FOR DELETE USING (true);

CREATE POLICY allow_all_read_brands ON brands FOR SELECT USING (true);
CREATE POLICY allow_all_insert_brands ON brands FOR INSERT WITH CHECK (true);
CREATE POLICY allow_all_update_brands ON brands FOR UPDATE USING (true) WITH CHECK (true);

-- 12. 授予权限
GRANT ALL ON profiles TO anon;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON brands TO anon;
GRANT ALL ON brands TO authenticated;

-- 13. 验证
SELECT 'profiles 表:', relname FROM pg_class WHERE relname = 'profiles';
SELECT 'brands 表:', relname FROM pg_class WHERE relname = 'brands';
SELECT 'profiles 策略:', policyname FROM pg_policies WHERE tablename = 'profiles';
SELECT 'brands 策略:', policyname FROM pg_policies WHERE tablename = 'brands';
