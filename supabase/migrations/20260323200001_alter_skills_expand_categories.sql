alter table public.skills drop constraint if exists skills_category_check;
alter table public.skills add constraint skills_category_check
  check (category in ('foundation', 'campaign', 'content', 'retention', 'analytics', 'ads', 'operations', 'scale', 'cart', 'social'));
