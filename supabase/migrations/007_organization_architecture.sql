-- ============================================
-- 阶段1：核心组织架构数据库迁移
-- ============================================

-- 1. 公司表（一级隔离边界）
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 预置默认公司
INSERT INTO companies (id, name) VALUES ('00000000-0000-0000-0000-000000000010', '默认公司') ON CONFLICT DO NOTHING;

-- 2. 扩展 brands 表，增加 company_id 关联
ALTER TABLE brands ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- 更新已有品牌的公司关联
UPDATE brands SET company_id = '00000000-0000-0000-0000-000000000010' WHERE company_id IS NULL;

-- 3. 扩展 profiles 表，增加角色层级
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_level TEXT NOT NULL DEFAULT 'executor';
-- role_level: boss（老板）/ admin（公司管理员）/ brand_manager（品牌负责人）/ process_owner（工序负责人）/ executor（执行者）

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- 更新已有用户的公司关联
UPDATE profiles SET company_id = '00000000-0000-0000-0000-000000000010' WHERE company_id IS NULL;

-- 4. 用户-品牌多对多关联表
CREATE TABLE IF NOT EXISTS user_brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  role_level TEXT NOT NULL DEFAULT 'executor',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, brand_id)
);

-- 为已有用户创建默认品牌关联
INSERT INTO user_brands (user_id, brand_id, role_level)
SELECT p.user_id, '00000000-0000-0000-0000-000000000001', 'boss'
FROM profiles p
WHERE p.role_level = 'boss'
  AND NOT EXISTS (
    SELECT 1 FROM user_brands ub WHERE ub.user_id = p.user_id AND ub.brand_id = '00000000-0000-0000-0000-000000000001'
  );

-- 5. 季次表（SS/FW）
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 例如 "2026SS"、"2026FW"
  season_type TEXT NOT NULL CHECK (season_type IN ('SS', 'FW')),
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active（可编辑）/ locked（只读）/ archived
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seasons_brand_id ON seasons(brand_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_brand_year_type ON seasons(brand_id, year, season_type);

-- 6. 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- create/update/delete/export/login/permission_change
  target_table TEXT NOT NULL,
  target_id TEXT,
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_brand_id ON operation_logs(brand_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);

-- 7. 数据版本表
CREATE TABLE IF NOT EXISTS data_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  data JSONB NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_versions_table_record ON data_versions(table_name, record_id);

-- 8. 临时授权表
CREATE TABLE IF NOT EXISTS temp_authorizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  data_scope TEXT NOT NULL, -- 例如 "styles"、"process_links" 或具体记录ID
  record_ids JSONB, -- 具体授权的记录ID列表
  expire_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active/expired/revoked
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_temp_auth_to_user ON temp_authorizations(to_user_id);
CREATE INDEX IF NOT EXISTS idx_temp_auth_status ON temp_authorizations(status);

-- 9. 数据审批流表
CREATE TABLE IF NOT EXISTS approval_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL, -- create/update/delete
  proposed_data JSONB NOT NULL,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending', -- pending/approved/rejected
  review_comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_flows_status ON approval_flows(status);
CREATE INDEX IF NOT EXISTS idx_approval_flows_submitted_by ON approval_flows(submitted_by);

-- 10. RLS 策略
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_flows ENABLE ROW LEVEL SECURITY;

-- MVP阶段：允许认证用户访问
CREATE POLICY "Allow authenticated read companies" ON companies FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert companies" ON companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update companies" ON companies FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated read user_brands" ON user_brands FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert user_brands" ON user_brands FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update user_brands" ON user_brands FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete user_brands" ON user_brands FOR DELETE USING (true);

CREATE POLICY "Allow authenticated read seasons" ON seasons FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert seasons" ON seasons FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update seasons" ON seasons FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated read operation_logs" ON operation_logs FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert operation_logs" ON operation_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated read data_versions" ON data_versions FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert data_versions" ON data_versions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated read temp_auths" ON temp_authorizations FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert temp_auths" ON temp_authorizations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update temp_auths" ON temp_authorizations FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated read approvals" ON approval_flows FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert approvals" ON approval_flows FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update approvals" ON approval_flows FOR UPDATE USING (true);

-- 权限
GRANT ALL ON companies TO authenticated;
GRANT ALL ON user_brands TO authenticated;
GRANT ALL ON seasons TO authenticated;
GRANT ALL ON operation_logs TO authenticated;
GRANT ALL ON data_versions TO authenticated;
GRANT ALL ON temp_authorizations TO authenticated;
GRANT ALL ON approval_flows TO authenticated;

-- 触发器
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_seasons_updated_at ON seasons;
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
