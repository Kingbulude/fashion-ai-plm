-- 工序角色表
CREATE TABLE IF NOT EXISTS process_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  process_node TEXT NOT NULL,
  route_permissions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 用户横向角色关联
CREATE TABLE IF NOT EXISTS user_process_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  process_role_id UUID NOT NULL REFERENCES process_roles(id) ON DELETE CASCADE,
  brand_id UUID,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, process_role_id, brand_id)
);

-- 工序主管类型
CREATE TABLE IF NOT EXISTS process_owner_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  process_nodes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 用户主管类型关联
CREATE TABLE IF NOT EXISTS user_process_owner_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scope_id UUID NOT NULL REFERENCES process_owner_scopes(id) ON DELETE CASCADE,
  brand_id UUID,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope_id, brand_id)
);

-- AI skill 定义
CREATE TABLE IF NOT EXISTS ai_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  skill_type TEXT NOT NULL CHECK (skill_type IN ('personal_assistant', 'process_master', 'execution')),
  process_node TEXT,
  config_schema JSONB,
  entry_route TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 横向角色与 AI skill 关联
CREATE TABLE IF NOT EXISTS process_role_ai_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_role_id UUID NOT NULL REFERENCES process_roles(id) ON DELETE CASCADE,
  ai_skill_id UUID NOT NULL REFERENCES ai_skills(id) ON DELETE CASCADE,
  UNIQUE (process_role_id, ai_skill_id)
);

-- 主管类型与 AI skill 关联
CREATE TABLE IF NOT EXISTS process_owner_scope_ai_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id UUID NOT NULL REFERENCES process_owner_scopes(id) ON DELETE CASCADE,
  ai_skill_id UUID NOT NULL REFERENCES ai_skills(id) ON DELETE CASCADE,
  UNIQUE (scope_id, ai_skill_id)
);

-- 初始化默认工序角色
INSERT INTO process_roles (key, name, description, process_node, route_permissions) VALUES
('planner', '企划师', '负责商品企划、主题企划', 'planning', '{"/planning": ["view", "edit"]}'),
('designer', '设计师', '负责款式设计、图案设计', 'design', '{"/design": ["view", "edit"], "/styles": ["view", "edit"]}'),
('sampling_master', '打样师', '负责样衣制作', 'sampling', '{"/styles": ["view", "edit"]}'),
('testing_specialist', '测款师', '负责市场测试、接受度评估', 'testing', '{"/ai-review": ["view", "edit"], "/styles": ["view"]}'),
('procurement_specialist', '采购师', '负责供应商匹配、采购下单', 'procurement', '{"/suppliers": ["view"], "/styles": ["view", "edit"]}'),
('production_coordinator', '生产跟单/QC', '负责生产排期、QC检查', 'stocking', '{"/production": ["view", "edit"]}'),
('sales', '销售', '负责销售记录、销售预测', 'sales', '{"/sales": ["view", "edit"], "/analytics": ["view"]}'),
('aftersales', '售后', '负责退换货分析', 'aftersales', '{"/aftersales": ["view", "edit"]}'),
('finance', '财务', '负责经营分析、成本核算', 'finance', '{"/analytics": ["view"]}')
ON CONFLICT (key) DO NOTHING;

-- 初始化默认主管类型
INSERT INTO process_owner_scopes (key, name, description, process_nodes) VALUES
('design_lead', '设计主管', '从企划到打样完成', ARRAY['planning', 'design', 'sampling']),
('product_lead', '产品主管', '从打样到大货生产前', ARRAY['sampling', 'testing', 'procurement', 'stocking']),
('operations_lead', '运营主管', '从测款到销售', ARRAY['testing', 'sales']),
('aftersales_lead', '售后主管', '售后问题处理', ARRAY['aftersales'])
ON CONFLICT (key) DO NOTHING;
