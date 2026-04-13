import type { SupabaseClient } from '@supabase/supabase-js'

export interface StoreContext {
  name: string
  niche: string | null
  tone: string | null
  audience: string | null
  productTypes: string[]
  keywords: string[]
}

interface StoreRow {
  name: string | null
  segment: string | null
}

interface BrandDnaRow {
  niche: string | null
  tone: string | null
  audience: string | null
  words_to_use: string[] | null
  store_name: string | null
  product_types?: string[] | null
  keywords?: string[] | null
}

/**
 * Load store + brand DNA context for home hero + capability card generators.
 * Called from Server Components via createServerClient().
 *
 * Returns null if neither store nor brand_dna row exists for the team.
 */
export async function loadStoreContext(
  supabase: SupabaseClient,
  teamId: string
): Promise<StoreContext | null> {
  const [storeRes, dnaRes] = await Promise.all([
    supabase
      .from('stores')
      .select('name, segment')
      .eq('team_id', teamId)
      .limit(1)
      .maybeSingle<StoreRow>(),
    supabase
      .from('brand_dna')
      .select('niche, tone, audience, words_to_use, store_name, product_types, keywords')
      .eq('team_id', teamId)
      .limit(1)
      .maybeSingle<BrandDnaRow>(),
  ])

  const store = storeRes.data
  const dna = dnaRes.data

  if (!store && !dna) return null

  return {
    name: dna?.store_name ?? store?.name ?? 'sua loja',
    niche: dna?.niche ?? store?.segment ?? null,
    tone: dna?.tone ?? null,
    audience: dna?.audience ?? null,
    productTypes: dna?.product_types ?? [],
    keywords: dna?.keywords ?? dna?.words_to_use ?? [],
  }
}
