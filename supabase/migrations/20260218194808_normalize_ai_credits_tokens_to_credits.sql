-- Normalize ai_credits_used from raw token counts to credit values
-- Credits formula: tokens / 1000 (matching tokensToCredits in src/lib/billing/credits.ts)
-- Only normalize values that look like raw token counts (> 1000)
UPDATE usage
SET ai_credits_used = ROUND(ai_credits_used / 1000, 2)
WHERE ai_credits_used > 1000;

UPDATE workflow_runs
SET ai_credits_used = ROUND(ai_credits_used / 1000, 2)
WHERE ai_credits_used > 1000;
