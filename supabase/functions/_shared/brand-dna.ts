import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

export interface BrandDna {
  niche?: string | null
  audience?: string | null
  positioning?: string | null
  tone?: string | null
  average_ticket?: number | null
  opportunities?: unknown[] | null
}

export interface Store {
  id: string
  name: string
  segment?: string | null
  platform?: string | null
  platform_store_id?: string | null
  platform_access_token?: string | null
}

/** Loads the team's brand_dna row; returns null if not onboarded. */
export async function loadBrandDna(
  supabase: SupabaseClient,
  teamId: string
): Promise<BrandDna | null> {
  const { data } = await supabase
    .from('brand_dna')
    .select('niche, audience, positioning, tone, average_ticket, opportunities')
    .eq('team_id', teamId)
    .single()
  return (data as BrandDna | null) ?? null
}

/** Loads the primary store for a team; returns null if none connected. */
export async function loadStoreForTeam(
  supabase: SupabaseClient,
  teamId: string
): Promise<Store | null> {
  const { data } = await supabase
    .from('stores')
    .select('id, name, segment, platform, platform_store_id, platform_access_token')
    .eq('team_id', teamId)
    .limit(1)
    .single()
  return (data as Store | null) ?? null
}
