-- Add is_orchestrator flag to agents table.
-- The orchestrator is the central chat entry point that delegates to specialist agents.
-- App logic enforces one orchestrator per team (no unique constraint needed).
ALTER TABLE agents ADD COLUMN is_orchestrator boolean NOT NULL DEFAULT false;
