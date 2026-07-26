-- 031: suppliers 表增加 company_id 实现公司级数据隔离

-- 1. 新增 company_id 字段（可为空，NULL 表示全局共享供应商）
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- 2. 为已存在供应商数据兜底归属到最早创建的公司（避免迁移后数据不可见）
UPDATE public.suppliers
SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1)
WHERE company_id IS NULL
  AND EXISTS (SELECT 1 FROM public.companies);

-- 3. 强制启用 RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers FORCE ROW LEVEL SECURITY;

-- 4. 清理旧策略
DROP POLICY IF EXISTS "rls_select_suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "rls_insert_suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "rls_update_suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "rls_delete_suppliers" ON public.suppliers;

-- 5. 重建策略：
--    SELECT: 全局供应商 + 本公司供应商
--    INSERT/UPDATE/DELETE: 仅限本公司 admin/boss
CREATE POLICY "rls_select_suppliers" ON public.suppliers
FOR SELECT TO authenticated
USING (company_id IS NULL OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "rls_insert_suppliers" ON public.suppliers
FOR INSERT TO authenticated
WITH CHECK (company_id IN (
  SELECT company_id FROM profiles
  WHERE user_id = auth.uid() AND role_level IN ('admin', 'boss')
));

CREATE POLICY "rls_update_suppliers" ON public.suppliers
FOR UPDATE TO authenticated
USING (company_id IN (
  SELECT company_id FROM profiles
  WHERE user_id = auth.uid() AND role_level IN ('admin', 'boss')
))
WITH CHECK (company_id IN (
  SELECT company_id FROM profiles
  WHERE user_id = auth.uid() AND role_level IN ('admin', 'boss')
));

CREATE POLICY "rls_delete_suppliers" ON public.suppliers
FOR DELETE TO authenticated
USING (company_id IN (
  SELECT company_id FROM profiles
  WHERE user_id = auth.uid() AND role_level IN ('admin', 'boss')
));
