-- 为 profiles 表添加 email 字段，用于在后台管理中选择已注册用户
ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- 创建索引加速按邮箱查询
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
