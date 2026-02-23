-- Add has_store flag to teams for quick onboarding redirect check.
ALTER TABLE teams ADD COLUMN has_store BOOLEAN NOT NULL DEFAULT false;
