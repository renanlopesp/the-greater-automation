create table if not exists public.brand_dna (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade unique,
  store_name text,
  niche text,
  average_ticket numeric,
  platform text,
  tone text,
  audience text,
  words_to_use text[] default '{}',
  words_to_avoid text[] default '{}',
  positioning text,
  strengths jsonb default '[]'::jsonb,
  alerts jsonb default '[]'::jsonb,
  opportunities jsonb default '[]'::jsonb,
  revenue_projection jsonb,
  is_confirmed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.brand_dna enable row level security;

create policy "Team members can read brand_dna" on public.brand_dna
  for select using (team_id in (select team_id from public.team_members where user_id = auth.uid()));

create policy "Team members can update brand_dna" on public.brand_dna
  for update using (team_id in (select team_id from public.team_members where user_id = auth.uid()));

create policy "Service role full access on brand_dna" on public.brand_dna
  for all using (auth.role() = 'service_role');
