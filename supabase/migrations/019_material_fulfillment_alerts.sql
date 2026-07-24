-- 019_material_fulfillment_alerts.sql
-- 物料缺料预警与到货跟踪增强

-- 为 material_procurement 添加延迟预警标记
ALTER TABLE material_procurement
  ADD COLUMN IF NOT EXISTS is_delayed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delay_days INTEGER DEFAULT 0;

-- 创建物料齐套校验函数（供生产下单前调用检查）
CREATE OR REPLACE FUNCTION check_material_fulfillment(p_style_id UUID)
RETURNS TABLE (
  all_fulfilled BOOLEAN,
  total_items INTEGER,
  fulfilled_items INTEGER,
  missing_items INTEGER,
  delayed_items INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(CASE WHEN mp.status = 'fully_received' THEN 1 END) = COUNT(*) AS all_fulfilled,
    COUNT(DISTINCT bi.id) AS total_items,
    COUNT(DISTINCT CASE WHEN mp.status = 'fully_received' THEN bi.id END) AS fulfilled_items,
    COUNT(DISTINCT CASE WHEN mp.status != 'fully_received' OR mp.id IS NULL THEN bi.id END) AS missing_items,
    COUNT(DISTINCT CASE WHEN mp.is_delayed = true THEN bi.id END) AS delayed_items
  FROM bom_items bi
  LEFT JOIN material_procurement mp ON mp.bom_item_id = bi.id
  WHERE bi.style_id = p_style_id
    AND bi.status != 'obsolete';
END;
$$ LANGUAGE plpgsql STABLE;

-- 标记延迟到货的采购单（超过预计到货日期仍未全部到货）
CREATE OR REPLACE FUNCTION mark_delayed_procurements()
RETURNS VOID AS $$
BEGIN
  UPDATE material_procurement
  SET is_delayed = true,
      delay_days = CURRENT_DATE - expected_date
  WHERE expected_date IS NOT NULL
    AND status != 'fully_received'
    AND expected_date < CURRENT_DATE
    AND (is_delayed = false OR delay_days != CURRENT_DATE - expected_date);
END;
$$ LANGUAGE plpgsql;

-- 为 todos 表添加预警类型（缺料预警）
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS alert_type TEXT,
  ADD COLUMN IF NOT EXISTS alert_level TEXT DEFAULT 'normal';
