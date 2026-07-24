-- 020_inspiration_board.sql
-- 灵感白板：企划阶段视觉素材聚合与标签管理

CREATE TABLE IF NOT EXISTS inspiration_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  theme_tags TEXT[] DEFAULT '{}',
  cover_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspiration_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  board_id UUID NOT NULL REFERENCES inspiration_boards(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT DEFAULT 'upload',
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  color_tags TEXT[] DEFAULT '{}',
  style_tags TEXT[] DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspiration_boards_company ON inspiration_boards(company_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_boards_brand ON inspiration_boards(brand_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_boards_season ON inspiration_boards(season_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_items_board ON inspiration_items(board_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_items_company ON inspiration_items(company_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_items_tags ON inspiration_items USING gin(tags);

ALTER TABLE inspiration_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspiration_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_inspiration_boards_updated_at BEFORE UPDATE ON inspiration_boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspiration_items_updated_at BEFORE UPDATE ON inspiration_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
