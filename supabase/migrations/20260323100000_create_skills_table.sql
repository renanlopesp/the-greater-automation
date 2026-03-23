-- Skills table: represents a capability that Snew can activate
-- Replaces the multi-agent catalog with a single-agent + skills model
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  category text not null,
  phase int not null default 1,

  -- Skill execution context
  system_prompt text,
  tools jsonb default '[]'::jsonb,
  knowledge jsonb default '[]'::jsonb,
  input_schema jsonb,
  output_schema jsonb,

  -- Dependencies & state
  dependencies text[] default '{}',
  status text not null default 'available',
  is_native boolean default false,
  requires_connections text[] default '{}',

  -- Metadata
  icon text,
  color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint skills_team_slug_unique unique (team_id, slug),
  constraint skills_status_check check (status in ('available', 'active', 'running', 'deprecated')),
  constraint skills_category_check check (category in ('foundation', 'campaign', 'content', 'retention', 'analytics', 'ads', 'operations', 'scale')),
  constraint skills_phase_check check (phase between 1 and 4),
  constraint skills_slug_format check (slug ~ '^[a-z0-9-]+$')
);

-- Indexes
create index if not exists idx_skills_team_id on public.skills(team_id);
create index if not exists idx_skills_team_status on public.skills(team_id, status);
create index if not exists idx_skills_slug on public.skills(slug);

-- RLS
alter table public.skills enable row level security;

create policy "Team members can read skills"
  on public.skills for select
  using (team_id in (
    select team_id from public.team_members where user_id = auth.uid()
  ));

create policy "Team members can update skills"
  on public.skills for update
  using (team_id in (
    select team_id from public.team_members where user_id = auth.uid()
  ));

create policy "Team members can insert skills"
  on public.skills for insert
  with check (team_id in (
    select team_id from public.team_members where user_id = auth.uid()
  ));

create policy "Service role full access on skills"
  on public.skills for all
  using (auth.role() = 'service_role');
