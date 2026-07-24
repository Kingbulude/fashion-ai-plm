-- ============================================
-- 阶段8.1：待办表 todos 增加已读状态
-- 解决问题：通知铃铛需要真实未读计数
-- 创建时间：2026-07-24
-- ============================================

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_todos_is_read ON todos(is_read);

DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT '✅ todos 已读状态字段添加完成' AS status;
