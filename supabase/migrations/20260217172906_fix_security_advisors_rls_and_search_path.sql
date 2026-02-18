-- Fix security advisor warnings: add SECURITY DEFINER functions for RLS policies.
-- These functions bypass RLS on the tables they query, preventing infinite recursion
-- when used in RLS policies on the same or related tables.

-- Function to get all team IDs for a user (bypasses team_members RLS)
CREATE OR REPLACE FUNCTION public.get_user_team_ids(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = user_uuid;
$$;

-- Function to get a user's email from profiles (bypasses profiles RLS)
CREATE OR REPLACE FUNCTION public.get_user_email(user_uuid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT email FROM public.profiles WHERE id = user_uuid;
$$;
