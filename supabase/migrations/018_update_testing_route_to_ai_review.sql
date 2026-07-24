-- 更新测款节点路由：从 /ai 改为 /ai-review
-- 旧 /ai 路由已迁移为 AI 审核中心

UPDATE process_nodes
SET route = '/ai-review',
    description = 'AI 审核与市场验证'
WHERE node_key = 'testing'
  AND route = '/ai';
