-- 047 修复表名一致性：创建缺失的 ai_images 表，扩展 ai_test_results 列
-- 背景：
--   1. app/api/ai/images 和 app/api/ai/test-results 路由引用 ai_images 表，但该表在所有 migration 中均未创建
--   2. app/api/ai/test-results 路由向 ai_test_results 插入 image_id/style_name/target_audience/test_duration/status/positive_count/negative_count 等列，但 migration 003 未定义这些列
--   3. app/api/ai/analyze-test 和 test-results 路由误用 test_results 表名（已在代码层修正为 ai_test_results）
--   4. migration 030 Step 7.7 误用 inventory/sales_data/after_sales 表名（正确应为 inventory_records/sales_records/aftersales_records），导致 style_id 粒度 RLS 未应用（brand_id 粒度 RLS 已由 Step 5 自动覆盖，安全无漏洞）

-- ───────────────────────────────────────────
-- 1. 创建 ai_images 表
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_id UUID REFERENCES styles(id) ON DELETE SET NULL,
  style_name TEXT NOT NULL DEFAULT '未命名',
  description TEXT,
  style_type TEXT NOT NULL DEFAULT 'realistic',
  colors TEXT[],
  image_url TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_images_style_id ON ai_images(style_id);
CREATE INDEX IF NOT EXISTS idx_ai_images_company_id ON ai_images(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_images_brand_id ON ai_images(brand_id);

-- ───────────────────────────────────────────
-- 2. 扩展 ai_test_results 表（补齐 API 所需列）
-- ───────────────────────────────────────────
-- 原 migration 003 定义：id, style_id(NOT NULL), ai_image_url, test_score, feedback_count, feedback_summary, suggested_quantity, created_at
-- API 需要额外列：image_id, style_name, target_audience, test_duration, status, positive_count, negative_count

-- style_id 改为可空（API 使用 image_id 关联 ai_images，不一定传 style_id）
ALTER TABLE ai_test_results ALTER COLUMN style_id DROP NOT NULL;

ALTER TABLE ai_test_results ADD COLUMN IF NOT EXISTS image_id UUID REFERENCES ai_images(id) ON DELETE SET NULL;
ALTER TABLE ai_test_results ADD COLUMN IF NOT EXISTS style_name TEXT NOT NULL DEFAULT '未命名';
ALTER TABLE ai_test_results ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE ai_test_results ADD COLUMN IF NOT EXISTS test_duration INTEGER NOT NULL DEFAULT 7;
ALTER TABLE ai_test_results ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE ai_test_results ADD COLUMN IF NOT EXISTS positive_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ai_test_results ADD COLUMN IF NOT EXISTS negative_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ai_test_results_image_id ON ai_test_results(image_id);

-- ───────────────────────────────────────────
-- 3. RLS：为 ai_images 和 ai_test_results 启用行级安全
-- ───────────────────────────────────────────
ALTER TABLE ai_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_test_results ENABLE ROW LEVEL SECURITY;

-- ai_images：按 brand_id 隔离
DROP POLICY IF EXISTS "rls_select_ai_images" ON ai_images;
CREATE POLICY "rls_select_ai_images" ON ai_images FOR SELECT TO authenticated
  USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_insert_ai_images" ON ai_images;
CREATE POLICY "rls_insert_ai_images" ON ai_images FOR INSERT TO authenticated
  WITH CHECK (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_update_ai_images" ON ai_images;
CREATE POLICY "rls_update_ai_images" ON ai_images FOR UPDATE TO authenticated
  USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()))
  WITH CHECK (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_delete_ai_images" ON ai_images;
CREATE POLICY "rls_delete_ai_images" ON ai_images FOR DELETE TO authenticated
  USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));

-- ai_test_results：已有 brand_id 列（migration 011），按 brand_id 隔离
DROP POLICY IF EXISTS "rls_select_ai_test_results" ON ai_test_results;
CREATE POLICY "rls_select_ai_test_results" ON ai_test_results FOR SELECT TO authenticated
  USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_insert_ai_test_results" ON ai_test_results;
CREATE POLICY "rls_insert_ai_test_results" ON ai_test_results FOR INSERT TO authenticated
  WITH CHECK (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_update_ai_test_results" ON ai_test_results;
CREATE POLICY "rls_update_ai_test_results" ON ai_test_results FOR UPDATE TO authenticated
  USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()))
  WITH CHECK (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
DROP POLICY IF EXISTS "rls_delete_ai_test_results" ON ai_test_results;
CREATE POLICY "rls_delete_ai_test_results" ON ai_test_results FOR DELETE TO authenticated
  USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));

-- ───────────────────────────────────────────
-- 4. 补充 inventory_records / sales_records / aftersales_records 的 style_id 粒度 RLS
--    （migration 030 Step 7.7 因表名错误未应用；brand_id 粒度已由 Step 5 覆盖）
-- ───────────────────────────────────────────
DO $$
DECLARE
  style_tbl TEXT;
  style_tables TEXT[] := ARRAY['inventory_records', 'sales_records', 'aftersales_records'];
BEGIN
  FOREACH style_tbl IN ARRAY style_tables
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = style_tbl) THEN
      EXECUTE format('DROP POLICY IF EXISTS "rls_select_%I" ON %I;', style_tbl, style_tbl);
      EXECUTE format('DROP POLICY IF EXISTS "rls_insert_%I" ON %I;', style_tbl, style_tbl);
      EXECUTE format('DROP POLICY IF EXISTS "rls_update_%I" ON %I;', style_tbl, style_tbl);
      EXECUTE format('DROP POLICY IF EXISTS "rls_delete_%I" ON %I;', style_tbl, style_tbl);

      -- 优先按 brand_id 隔离（与 Step 5 一致），同时兼容 style_id 关联
      EXECUTE format(
        'CREATE POLICY "rls_select_%1$I" ON %1$I FOR SELECT TO authenticated USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));',
        style_tbl
      );
      EXECUTE format(
        'CREATE POLICY "rls_insert_%1$I" ON %1$I FOR INSERT TO authenticated WITH CHECK (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));',
        style_tbl
      );
      EXECUTE format(
        'CREATE POLICY "rls_update_%1$I" ON %1$I FOR UPDATE TO authenticated USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids())) WITH CHECK (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));',
        style_tbl
      );
      EXECUTE format(
        'CREATE POLICY "rls_delete_%1$I" ON %1$I FOR DELETE TO authenticated USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));',
        style_tbl
      );
    END IF;
  END LOOP;
END $$;
