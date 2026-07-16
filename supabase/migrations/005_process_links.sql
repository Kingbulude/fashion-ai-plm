-- 工序流程工时与交付清单数据模型

-- 工序节点表
CREATE TABLE IF NOT EXISTS process_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_key VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  route VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 工序连接线表（箭头关系）
CREATE TABLE IF NOT EXISTS process_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node VARCHAR(50) NOT NULL,
  to_node VARCHAR(50) NOT NULL,
  link_type VARCHAR(20) DEFAULT 'critical',
  duration_hours DECIMAL(10,2) DEFAULT 0,
  deadline DATE,
  work_content TEXT,
  deliverables TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_node, to_node)
);

-- 初始化工序节点
INSERT INTO process_nodes (node_key, name, icon, color, route, description) VALUES
  ('planning', '企划', '📋', 'bg-blue-500', '/planning', '品牌基因库与商品企划'),
  ('design', '设计', '🎨', 'bg-purple-500', '/styles', '款式设计与开发'),
  ('sampling', '打样', '✂️', 'bg-amber-500', '/styles', '样衣制作与确认'),
  ('testing', '测款', '🎯', 'bg-pink-500', '/ai', 'AI测款与市场验证'),
  ('procurement', '采购', '🛒', 'bg-orange-500', '/styles', '物料采购与供应链'),
  ('stocking', '备货', '📦', 'bg-indigo-500', '/styles', '大货生产/质检/入库'),
  ('sales', '销售', '💰', 'bg-emerald-500', '/sales', '销售运营与管理'),
  ('aftersales', '售后', '🔄', 'bg-slate-500', '/aftersales', '售后服务与复盘')
ON CONFLICT (node_key) DO NOTHING;

-- 初始化工序连接线
INSERT INTO process_links (from_node, to_node, link_type, duration_hours, deadline, work_content, deliverables, sort_order) VALUES
  ('planning', 'design', 'critical', 40, '2026-08-01', '完成商品企划、设计方向确认、面料色彩企划', '企划方案文档、主题板、色彩方案、面料方案', 1),
  ('design', 'sampling', 'critical', 60, '2026-08-15', '完成款式设计、BOM表、工艺单、尺寸表', '款式设计图、BOM清单、工艺单、尺寸规格表', 2),
  ('sampling', 'testing', 'critical', 30, '2026-08-25', '制作首样、试穿修改、确认版型', '确认样衣、版型报告、修改意见', 3),
  ('sampling', 'procurement', 'critical', 20, '2026-08-20', '确认面料供应商、下达采购订单', '面料采购单、供应商确认函、交期确认', 4),
  ('testing', 'procurement', 'parallel', 10, '2026-08-28', '根据测款结果调整采购计划、确认面料风险', '测款反馈、采购调整建议、面料备选方案', 5),
  ('procurement', 'stocking', 'parallel', 80, '2026-09-20', '物料采购到货、大货生产、制程质检、成品入库', '采购到货单、生产订单、质检报告、入库单', 6),
  ('testing', 'sales', 'parallel', 15, '2026-09-05', 'AI测款验证、市场测试、接受度评估、下单决策', '测款报告、接受度评估、下单建议', 7),
  ('stocking', 'sales', 'parallel', 10, '2026-09-25', '备货完成、库存就位、发货准备', '库存确认单、发货清单、物流安排', 8),
  ('sales', 'aftersales', 'critical', 0, NULL, '销售运营、订单处理、物流配送', '销售订单、发货单、物流信息', 9),
  ('aftersales', 'planning', 'feedback', 10, NULL, '售后复盘、客户反馈收集、数据沉淀', '售后报告、客户反馈汇总、复盘分析报告', 10)
ON CONFLICT (from_node, to_node) DO NOTHING;