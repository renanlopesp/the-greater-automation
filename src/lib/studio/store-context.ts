'use client'

export const STORE_CONTEXT_KEY = 'snew:store-context'

export interface BrandReference {
  id: string
  url: string
  label?: string
}

export interface ModelProfile {
  gender?: 'feminino' | 'masculino' | 'neutro' | 'bebê' | 'criança' | 'família'
  ageRange?: string
  pose?: string
  mood?: string
}

export interface StoreContext {
  url: string
  name: string
  description: string
  tone: string
  niche: string
  audience: string
  colors: string[]
  keywords: string[]
  productTypes: string[]
  updatedAt: string
  brandReferences: BrandReference[]
  visualConcept?: string
  modelProfile?: ModelProfile
  shootingStyle?: string
  lightingMood?: string
  colorMood?: string
  backgroundStyle?: string
}

export function loadStoreContext(): StoreContext | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORE_CONTEXT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return { brandReferences: [], ...parsed }
  } catch {
    return null
  }
}

export function saveStoreContext(ctx: StoreContext): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORE_CONTEXT_KEY, JSON.stringify(ctx))
  } catch (e) {
    console.warn('Failed to save store context to localStorage:', e)
  }
}

export async function loadBrandReferencesBase64(
  refs: BrandReference[],
  max = 3
): Promise<string[]> {
  const results: string[] = []
  for (const ref of refs.slice(0, max)) {
    try {
      const resp = await fetch(ref.url)
      const blob = await resp.blob()
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.readAsDataURL(blob)
      })
      if (base64) results.push(base64)
    } catch {
      // skip failed fetches
    }
  }
  return results
}
