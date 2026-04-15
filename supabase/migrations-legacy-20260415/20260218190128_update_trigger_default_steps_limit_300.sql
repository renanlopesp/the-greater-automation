-- Update plans table default steps_limit to 300 for consistency
ALTER TABLE plans ALTER COLUMN steps_limit SET DEFAULT 300;
