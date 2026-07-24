-- ============================================
-- 阶段8：待办表 todos
-- 解决问题：状态机自动生成待办
-- 创建时间：2026-07-19
-- ============================================

CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'task',  -- task/risk/reminder
  title TEXT NOT NULL,
  description TEXT,
  target_table TEXT,                   -- 关联的表
  target_id TEXT,                       -- 关联的记录ID
  priority TEXT NOT NULL DEFAULT 'medium', -- low/medium/high/urgent
  status TEXT NOT NULL DEFAULT 'pending',  -- pending/in_progress/completed/cancelled
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todos_company_id ON todos(company_id);
CREATE INDEX IF NOT EXISTS idx_todos_brand_id ON todos(brand_id);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_assigned_to ON todos(assigned_to);
CREATE INDEX IF NOT EXISTS idx_todos_target ON todos(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'todos' AND policyname = 'public_read_todos'
  ) THEN
    CREATE POLICY "public_read_todos" ON todos FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'todos' AND policyname = 'brand_isolation_insert_todos'
  ) THEN
    CREATE POLICY "brand_isolation_insert_todos" ON todos FOR INSERT WITH CHECK (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'todos' AND policyname = 'brand_isolation_update_todos'
  ) THEN
    CREATE POLICY "brand_isolation_update_todos" ON todos FOR UPDATE USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'todos' AND policyname = 'brand_isolation_delete_todos'
  ) THEN
    CREATE POLICY "brand_isolation_delete_todos" ON todos FOR DELETE USING (brand_id IS NULL OR brand_id IN (SELECT get_user_brand_ids()));
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT ALL ON todos TO anon, authenticated;

SELECT '✅ todos 表创建完成' AS status;
