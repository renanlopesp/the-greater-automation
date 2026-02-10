export type PaletteName =
  | 'blue'
  | 'orange'
  | 'green'
  | 'purple'
  | 'red'
  | 'teal'
  | 'pink'
  | 'amber'
  | 'slate'
  | 'cyan'
  | 'lime'
  | 'rose'
  | 'indigo'

export const PALETTE_MAP: Record<PaletteName, string[]> = {
  blue: ['#1a3a5c', '#648EE9', '#a3c4f3', '#e2ebff', '#052062'],
  orange: ['#4e1a05', '#D7733E', '#f0a875', '#f9ede8', '#8b4513'],
  green: ['#0a3d1f', '#5BA87B', '#8fd4a8', '#e5f5ed', '#2e7d4f'],
  purple: ['#2d1150', '#9B6BC4', '#c9a7e4', '#f0e8f7', '#6a3d9a'],
  red: ['#5c0e0e', '#D94444', '#f0a0a0', '#fce8e8', '#8b1a1a'],
  teal: ['#0e3d3d', '#4BA8A8', '#8fd4d4', '#e5f5f5', '#2e7d7d'],
  pink: ['#4a0e4a', '#D44EBA', '#e0a0d8', '#f8e8f5', '#7a1a6a'],
  amber: ['#5c3d0e', '#D4A34E', '#f0d4a0', '#fcf2e8', '#8b6a1a'],
  slate: ['#2d3748', '#718096', '#a0aec0', '#edf2f7', '#4a5568'],
  cyan: ['#0e3d5c', '#4EA8D4', '#a0d4f0', '#e8f4fc', '#1a6a8b'],
  lime: ['#1a3d0e', '#6BA84E', '#a8d48f', '#f0fce8', '#3d6a1a'],
  rose: ['#5c1a1a', '#D46363', '#f0b0a8', '#fce8e5', '#8b3a30'],
  indigo: ['#1a0a3d', '#5E3DC8', '#9a82e0', '#ece6fc', '#3a1f8b'],
}

export const GLITCH_PALETTE_MAP: Record<PaletteName, string[]> = {
  blue: ['#1a3a5c', '#648EE9', '#a3c4f3'],
  orange: ['#4e1a05', '#D7733E', '#f0a875'],
  green: ['#0a3d1f', '#5BA87B', '#8fd4a8'],
  purple: ['#2d1150', '#9B6BC4', '#c9a7e4'],
  red: ['#5c0e0e', '#D94444', '#f0a0a0'],
  teal: ['#0e3d3d', '#4BA8A8', '#8fd4d4'],
  pink: ['#4a0e4a', '#D44EBA', '#e0a0d8'],
  amber: ['#5c3d0e', '#D4A34E', '#f0d4a0'],
  slate: ['#2d3748', '#718096', '#a0aec0'],
  cyan: ['#0e3d5c', '#4EA8D4', '#a0d4f0'],
  lime: ['#1a3d0e', '#6BA84E', '#a8d48f'],
  rose: ['#5c1a1a', '#D46363', '#f0b0a8'],
  indigo: ['#1a0a3d', '#5E3DC8', '#9a82e0'],
}

const DEFAULT_PALETTE: PaletteName = 'blue'

export function getAgentPalette(palette?: string | null): string[] {
  return PALETTE_MAP[(palette as PaletteName) ?? DEFAULT_PALETTE] ?? PALETTE_MAP[DEFAULT_PALETTE]
}

export function getGlitchPalette(palette?: string | null): string[] {
  return (
    GLITCH_PALETTE_MAP[(palette as PaletteName) ?? DEFAULT_PALETTE] ??
    GLITCH_PALETTE_MAP[DEFAULT_PALETTE]
  )
}
