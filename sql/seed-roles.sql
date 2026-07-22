-- 初始化两个账号角色：老板账号 + 品牌主理人账号
-- 在 Supabase Dashboard -> SQL Editor 中执行

-- 老板账号：拥有全部后台权限
UPDATE profiles
SET company_id = '00000000-0000-0000-0000-000000000010',
    role_level = 'boss',
    name = 'BOSS',
    updated_at = now()
WHERE user_id = '5c337a05-2e8b-4675-8543-d60c59902cf8';

-- 品牌主理人账号：仅访问被分配品牌
UPDATE profiles
SET company_id = '00000000-0000-0000-0000-000000000010',
    role_level = 'brand_manager',
    name = '品牌主理人',
    updated_at = now()
WHERE user_id = '19546527-536a-4e72-a033-4745afec2495';

-- 清除旧关联（避免重复执行产生脏数据）
DELETE FROM user_brands WHERE user_id = '19546527-536a-4e72-a033-4745afec2495';

-- 品牌主理人关联默认品牌 TEPNIX步戌
INSERT INTO user_brands (user_id, brand_id, role_level, created_at)
VALUES (
  '19546527-536a-4e72-a033-4745afec2495',
  '00000000-0000-0000-0000-000000000001',
  'brand_manager',
  now()
)
ON CONFLICT (user_id, brand_id) DO UPDATE SET
  role_level = EXCLUDED.role_level;
