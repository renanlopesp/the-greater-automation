alter table public.skills add column if not exists emoji text;
alter table public.skills add column if not exists stats jsonb default '[]'::jsonb;
alter table public.skills add column if not exists what_it_does jsonb default '[]'::jsonb;
alter table public.skills add column if not exists expected_results text[] default '{}';
alter table public.skills add column if not exists config_schema jsonb;
alter table public.skills add column if not exists connected_skills jsonb default '[]'::jsonb;
alter table public.skills add column if not exists outputs jsonb default '[]'::jsonb;
