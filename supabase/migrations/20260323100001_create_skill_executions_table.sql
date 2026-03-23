-- Skill executions: tracks every invocation of a skill
create table if not exists public.skill_executions (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  conversation_id uuid,

  -- Execution data
  input jsonb,
  output jsonb,
  status text not null default 'running',
  error_message text,
  duration_ms int,

  -- Context
  triggered_by text default 'user',
  parent_execution_id uuid references public.skill_executions(id),

  created_at timestamptz default now(),
  completed_at timestamptz,

  constraint skill_executions_status_check check (status in ('running', 'completed', 'failed')),
  constraint skill_executions_triggered_by_check check (triggered_by in ('user', 'auto', 'skill'))
);

-- Indexes
create index if not exists idx_skill_executions_skill_id on public.skill_executions(skill_id);
create index if not exists idx_skill_executions_team_id on public.skill_executions(team_id);
create index if not exists idx_skill_executions_conversation_id on public.skill_executions(conversation_id);
create index if not exists idx_skill_executions_created_at on public.skill_executions(created_at desc);

-- RLS
alter table public.skill_executions enable row level security;

create policy "Team members can read executions"
  on public.skill_executions for select
  using (team_id in (
    select team_id from public.team_members where user_id = auth.uid()
  ));

create policy "Service role full access on skill_executions"
  on public.skill_executions for all
  using (auth.role() = 'service_role');
