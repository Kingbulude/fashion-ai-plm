-- ============================================
-- 阶段：企划表补齐租户与季次字段
-- 解决问题：planning 表缺少 company_id / brand_id / season_id，
--          导致企划与品牌/季次无法双向打通
-- ============================================

-- 1. 补齐租户字段
ALTER TABLE planning
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_planning_company_id ON planning(company_id);
CREATE INDEX IF NOT EXISTS idx_planning_brand_id ON planning(brand_id);
CREATE INDEX IF NOT EXISTS idx_planning_season_id ON planning(season_id);
CREATE INDEX IF NOT EXISTS idx_planning_brand_season ON planning(brand_id, season_id);

-- 2. 回填默认租户（与历史数据兼容）
UPDATE planning
SET
  company_id = COALESCE(company_id, '00000000-0000-0000-0000-000000000010'),
  brand_id = COALESCE(brand_id, '00000000-0000-0000-0000-000000000001')
WHERE company_id IS NULL OR brand_id IS NULL;

-- 3. 尝试根据 season 文本匹配 season_id（仅对能精确匹配到的记录）
UPDATE planning p
SET season_id = s.id
FROM seasons s
WHERE p.season_id IS NULL
  AND p.brand_id = s.brand_id
  AND p.season = s.name;

-- 4. RLS：确保 planning 表已启用 RLS
ALTER TABLE planning ENABLE ROW LEVEL SECURITY;

-- 5. 清理旧的无租户 RLS 策略（如果存在）并创建带租户隔离的策略
DROP POLICY IF EXISTS planning_select_policy ON planning;
DROP POLICY IF EXISTS planning_insert_policy ON planning;
DROP POLICY IF EXISTS planning_update_policy ON planning;
DROP POLICY IF EXISTS planning_delete_policy ON planning;

CREATE POLICY planning_select_policy ON planning
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
    OR brand_id IN (
      SELECT brand_id FROM user_brands WHERE user_id = auth.uid()
    )
  );

CREATE POLICY planning_insert_policy ON planning
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
    AND brand_id IN (
      SELECT brand_id FROM user_brands WHERE user_id = auth.uid()
    )
  );

CREATE POLICY planning_update_policy ON planning
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
    AND brand_id IN (
      SELECT brand_id FROM user_brands WHERE user_id = auth.uid()
    )
  );

CREATE POLICY planning_delete_policy ON planning
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
    AND brand_id IN (
      SELECT brand_id FROM user_brands WHERE user_id = auth.uid()
    )
  );

SELECT '✅ planning 表已补齐 company_id / brand_id / season_id 字段并建立 RLS 隔离' AS status;
