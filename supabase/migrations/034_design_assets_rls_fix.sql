-- ============================================
-- 034: 修复设计资产库 RLS 策略
-- 问题：/api/design-assets 返回 500 / 加载失败
-- 原因：原 design_assets_select 策略逻辑错误，且未正确利用 design_assets.company_id/brand_id
-- 目标：补齐租户字段、重建基于 user_brands/style.brand_id 的可读策略
-- ============================================

-- 1. 确保 design_assets 有租户字段
ALTER TABLE public.design_assets
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_design_assets_company_id ON public.design_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_design_assets_brand_id ON public.design_assets(brand_id);

-- 2. 从关联的 style 回填缺失的 company_id / brand_id
UPDATE public.design_assets da
SET company_id = s.company_id,
    brand_id = s.brand_id
FROM public.styles s
WHERE da.style_id = s.id
  AND (da.company_id IS NULL OR da.brand_id IS NULL);

-- 3. 删除旧的/错误的策略
DROP POLICY IF EXISTS "brand_isolation_design_assets" ON public.design_assets;
DROP POLICY IF EXISTS "design_assets_select" ON public.design_assets;
DROP POLICY IF EXISTS "Allow all users to read design_assets" ON public.design_assets;

-- 4. 重建 SELECT 策略
-- 用户可以读取：
--   a) 自己品牌下的 design_assets
--   b) 关联 style 属于自己品牌的 design_assets
--   c) 公司 admin/boss 可读取本公司所有 design_assets
CREATE POLICY "design_assets_select_v2" ON public.design_assets
  FOR SELECT USING (
    brand_id IN (SELECT brand_id FROM get_user_brand_ids())
    OR EXISTS (
      SELECT 1 FROM public.styles s
      WHERE s.id = design_assets.style_id
        AND s.brand_id IN (SELECT brand_id FROM get_user_brand_ids())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id = design_assets.company_id
        AND p.role_level IN ('admin', 'boss')
    )
  );

-- 5. 收紧写入策略（原策略为 USING(true) 过于宽松）
DROP POLICY IF EXISTS "Allow authenticated users to insert design_assets" ON public.design_assets;
DROP POLICY IF EXISTS "Allow authenticated users to delete design_assets" ON public.design_assets;
DROP POLICY IF EXISTS "design_assets_insert" ON public.design_assets;
DROP POLICY IF EXISTS "design_assets_update" ON public.design_assets;
DROP POLICY IF EXISTS "design_assets_delete" ON public.design_assets;

CREATE POLICY "design_assets_insert_v2" ON public.design_assets
  FOR INSERT WITH CHECK (
    brand_id IN (SELECT brand_id FROM get_user_brand_ids())
    OR EXISTS (
      SELECT 1 FROM public.styles s
      WHERE s.id = design_assets.style_id
        AND s.brand_id IN (SELECT brand_id FROM get_user_brand_ids())
    )
  );

CREATE POLICY "design_assets_update_v2" ON public.design_assets
  FOR UPDATE USING (
    brand_id IN (SELECT brand_id FROM get_user_brand_ids())
    OR EXISTS (
      SELECT 1 FROM public.styles s
      WHERE s.id = design_assets.style_id
        AND s.brand_id IN (SELECT brand_id FROM get_user_brand_ids())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id = design_assets.company_id
        AND p.role_level IN ('admin', 'boss')
    )
  );

CREATE POLICY "design_assets_delete_v2" ON public.design_assets
  FOR DELETE USING (
    brand_id IN (SELECT brand_id FROM get_user_brand_ids())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id = design_assets.company_id
        AND p.role_level IN ('admin', 'boss')
    )
  );

-- 6. 确保 authenticated 角色拥有表权限
GRANT SELECT, INSERT, UPDATE, DELETE ON public.design_assets TO authenticated;
REVOKE ALL ON public.design_assets FROM anon;
