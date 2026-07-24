-- ============================================
-- 阶段7：工序角色与AI技能表补齐多租户字段
-- 解决问题：process_roles / ai_skills / process_owner_scopes 缺少 company_id
-- 创建时间：2026-07-24
-- ============================================

-- 1. process_roles 工序角色表
ALTER TABLE process_roles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_process_roles_company_id ON process_roles(company_id);

-- 回填默认公司（与 011 迁移保持一致）
UPDATE process_roles
SET company_id = '00000000-0000-0000-0000-000000000010'
WHERE company_id IS NULL;

-- 2. ai_skills AI技能表
ALTER TABLE ai_skills
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ai_skills_company_id ON ai_skills(company_id);

UPDATE ai_skills
SET company_id = '00000000-0000-0000-0000-000000000010'
WHERE company_id IS NULL;

-- 3. process_owner_scopes 工序主管类型表
ALTER TABLE process_owner_scopes
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_process_owner_scopes_company_id ON process_owner_scopes(company_id);

UPDATE process_owner_scopes
SET company_id = '00000000-0000-0000-0000-000000000010'
WHERE company_id IS NULL;

-- 4. 同步更新 014 中 INSERT 默认值的 company_id（保证后续重新初始化时也是带租户的）
-- 此处通过 UPDATE 确保存量数据归属默认公司，新插入由应用层负责传入 company_id

-- 5. 为关联表补齐 company_id（user_process_roles / user_process_owner_scopes）
ALTER TABLE user_process_roles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_process_roles_company_id ON user_process_roles(company_id);

UPDATE user_process_roles upr
SET company_id = COALESCE(
  (SELECT pr.company_id FROM process_roles pr WHERE pr.id = upr.process_role_id),
  '00000000-0000-0000-0000-000000000010'
)
WHERE company_id IS NULL;

ALTER TABLE user_process_owner_scopes
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_process_owner_scopes_company_id ON user_process_owner_scopes(company_id);

UPDATE user_process_owner_scopes upos
SET company_id = COALESCE(
  (SELECT pos.company_id FROM process_owner_scopes pos WHERE pos.id = upos.scope_id),
  '00000000-0000-0000-0000-000000000010'
)
WHERE company_id IS NULL;

SELECT '✅ 阶段7完成：工序角色与AI技能表已补齐 company_id 字段，数据已回填默认公司' AS status;
