-- ============================================
-- 阶段9：补齐 production_orders 字段
-- 解决问题：生产订单无法记录工厂、物料齐套、色码配比
-- 创建时间：2026-07-24
-- ============================================

ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS factory_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS material_ready BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS color_size_ratio JSONB,
  ADD COLUMN IF NOT EXISTS total_cost NUMERIC;

CREATE INDEX IF NOT EXISTS idx_production_orders_factory_id ON production_orders(factory_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_material_ready ON production_orders(material_ready);

DROP TRIGGER IF EXISTS update_production_orders_updated_at ON production_orders;
CREATE TRIGGER update_production_orders_updated_at BEFORE UPDATE ON production_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT '✅ production_orders 字段补齐完成' AS status;
