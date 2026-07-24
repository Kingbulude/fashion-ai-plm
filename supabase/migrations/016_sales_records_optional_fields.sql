-- ============================================
-- 阶段10：sales_records 字段调整
-- 解决问题：简化销售录入表单，颜色/尺码改为可选
-- 创建时间：2026-07-24
-- ============================================

ALTER TABLE sales_records
  ALTER COLUMN color DROP NOT NULL,
  ALTER COLUMN size DROP NOT NULL;

SELECT '✅ sales_records 字段调整完成' AS status;
