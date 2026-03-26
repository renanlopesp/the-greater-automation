ALTER TABLE brand_dna
  ADD COLUMN IF NOT EXISTS fonts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_texts jsonb DEFAULT '[]'::jsonb;
