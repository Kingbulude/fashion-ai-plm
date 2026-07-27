-- 面料库模块增强
-- 1. 补齐面料基础属性字段
-- 2. 支持关联供应商表
-- 3. 为列表页搜索和高频过滤添加索引

-- 面料供应商外键（可选，优先 supplier_id，旧的 supplier 文本保留做兼容）
ALTER TABLE public.fabrics
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS width TEXT,
  ADD COLUMN IF NOT EXISTS weight TEXT,
  ADD COLUMN IF NOT EXISTS moq NUMERIC,
  ADD COLUMN IF NOT EXISTS lead_time INTEGER,
  ADD COLUMN IF NOT EXISTS remark TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 默认值：激活状态
ALTER TABLE public.fabrics
  ALTER COLUMN status SET DEFAULT 'active';

-- 历史数据状态兼容：将旧 pending 改为 active
UPDATE public.fabrics
SET status = 'active'
WHERE status IS NULL OR status = 'pending';

-- 索引：列表页搜索、过滤、排序
CREATE INDEX IF NOT EXISTS idx_fabrics_name ON public.fabrics(name);
CREATE INDEX IF NOT EXISTS idx_fabrics_status ON public.fabrics(status);
CREATE INDEX IF NOT EXISTS idx_fabrics_supplier_id ON public.fabrics(supplier_id);
CREATE INDEX IF NOT EXISTS idx_fabrics_name_status ON public.fabrics(name, status);
