-- Add Managed Agent columns to teams table (for Claude Managed Agents API)
-- These columns store the provisioned agent and environment IDs per team.
-- Applied via Supabase MCP on 2026-04-09.

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS anthropic_agent_id text,
  ADD COLUMN IF NOT EXISTS anthropic_env_id text;
