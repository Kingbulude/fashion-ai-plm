-- ============================================
-- 010: Pipeline 运行记录表
-- ============================================
-- 存储 AI Pipeline 的每次执行记录，用于审计、调试、恢复暂停的 Pipeline

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id TEXT PRIMARY KEY,
  pipeline_id TEXT NOT NULL,
  trigger_event_id TEXT NOT NULL,
  trigger_event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running', -- running / paused_confirm / paused_approve / completed / failed / skipped
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_pipeline ON pipeline_runs(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_started_at ON pipeline_runs(started_at DESC);

-- RLS：authenticated 用户可读写（pipeline 由系统触发，不区分租户）
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_runs_all" ON pipeline_runs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE ON pipeline_runs TO authenticated;
