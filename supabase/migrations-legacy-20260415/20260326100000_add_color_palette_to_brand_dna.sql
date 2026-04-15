ALTER TABLE brand_dna
  ADD COLUMN IF NOT EXISTS color_palette jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS palette_description text DEFAULT '';
