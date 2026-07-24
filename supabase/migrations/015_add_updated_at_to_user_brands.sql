ALTER TABLE user_brands ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION set_user_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_brands_updated_at ON user_brands;
CREATE TRIGGER trigger_user_brands_updated_at
BEFORE UPDATE ON user_brands
FOR EACH ROW
EXECUTE FUNCTION set_user_brands_updated_at();