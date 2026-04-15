-- Add explicit report_kind column to agents to replace brittle name-matching
-- in /api/agents/cron/reports. Previously the cron dispatcher used
-- `agent.name.toLowerCase().includes('stock' | 'price' | 'sales' | ...)`,
-- so renaming an agent changed which report it generated, and a name like
-- "stock price sales monitor" would fall through to the first match.

alter table public.agents
  add column if not exists report_kind text
  check (report_kind in ('stock', 'price', 'sales'));

-- Backfill using the existing name heuristics so the cron keeps working for
-- agents that already exist. New agents must set report_kind explicitly.
update public.agents
set report_kind = 'stock'
where report_kind is null
  and (
    lower(name) like '%stock%'
    or lower(name) like '%estoquista%'
    or lower(name) like '%inventory%'
  );

update public.agents
set report_kind = 'price'
where report_kind is null
  and (
    lower(name) like '%price%'
    or lower(name) like '%vigia%'
    or lower(name) like '%monitor%'
  );

update public.agents
set report_kind = 'sales'
where report_kind is null
  and (
    lower(name) like '%sales%'
    or lower(name) like '%caixa%'
    or lower(name) like '%analyst%'
  );

create index if not exists agents_report_kind_idx
  on public.agents (report_kind)
  where report_kind is not null;
