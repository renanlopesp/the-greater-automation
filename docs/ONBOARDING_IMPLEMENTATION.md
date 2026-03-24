# Onboarding Implementation Guide

> Referência: protótipo em `/home/renanl/Projects/snew-ai-core/`
> Screenshots: `proto-onboarding-1-welcome.png`, `proto-onboarding-2-connect.png`, `proto-onboarding-3-analyzing.png`, `proto-onboarding-4-brand-dna.png`

## Visão Geral

4 telas fullscreen (sem sidebar, sem topbar). Fluxo linear:

```
/onboarding → /onboarding/connect → /onboarding/analyzing → /onboarding/brand-dna
```

Layout: `min-h-screen flex items-center justify-center`, max-width `480px` (welcome, connect, analyzing) ou `640px` (brand-dna).

## Arquivos fonte do protótipo (COPIAR 1:1)

| Tela      | Arquivo fonte                                               | Max width | Elementos                                                                                 |
| --------- | ----------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| Welcome   | `snew-ai-core/src/pages/onboarding/OnboardingWelcome.tsx`   | 480px     | Logo "S" + "Snew", h1 "Your AI-powered CMO", description, CTA button, sign in link        |
| Connect   | `snew-ai-core/src/pages/onboarding/OnboardingConnect.tsx`   | 480px     | Back button, h1, description, 2 platform cards (Shopify SVG + Nuvemshop SVG), footer text |
| Analyzing | `snew-ai-core/src/pages/onboarding/OnboardingAnalyzing.tsx` | 480px     | Back button, h1, 3-step animated checklist (Loader2→Check), Continue button (fade in)     |
| Brand DNA | `snew-ai-core/src/pages/onboarding/OnboardingBrandDNA.tsx`  | 640px     | 8 seções + Assets drawer + CTA                                                            |

## Tela 1: Welcome (`/onboarding`)

**Código fonte**: 73 linhas, componente simples.

```
Estrutura:
- div.min-h-screen.flex.items-center.justify-center
  - div.max-w-[480px].flex.flex-col.items-center.text-center.gap-8
    - Logo: div.w-10.h-10.rounded-xl (bg: primary) + "S" bold + "Snew" text
    - h1: "Your AI-powered CMO" (text-[32px] font-semibold)
    - p: description (text-[15px] color-text-secondary)
    - Button.w-full.h-11 → navega para /onboarding/connect
    - "Already have an account? Sign in" → navega para /
```

**O que mudar do protótipo para Next.js**:

- `useNavigate()` → `useRouter()` de `next/navigation`
- `onClick={() => navigate(...)}` → `<Link href="...">` ou `router.push(...)`

## Tela 2: Connect (`/onboarding/connect`)

**Código fonte**: 125 linhas. Inclui 2 SVG icons inline (ShopifyIcon, NuvemshopIcon).

```
Estrutura:
- Back button: ArrowLeft + "Back" → /onboarding
- h1: "Connect your store" (text-[24px])
- p: description
- grid.grid-cols-2.gap-4:
  - Card Shopify: rounded-2xl border, ShopifyIcon SVG, "Shopify", Button "Connect via Shopify"
  - Card Nuvemshop: rounded-2xl border, NuvemshopIcon SVG, "Nuvemshop", Button "Connect via Nuvemshop"
- Footer: "We support Shopify and Nuvemshop. More platforms coming soon."
```

**Ação real**: No protótipo, clicar navega direto para `/onboarding/analyzing`. Na implementação real, deveria iniciar OAuth flow com Nuvemshop/Shopify. Para MVP, manter navegação direta.

## Tela 3: Analyzing (`/onboarding/analyzing`)

**Código fonte**: 145 linhas. Animação com `useEffect` + `setTimeout`.

```
Estrutura:
- Back button → /onboarding/connect
- h1: "Analyzing your store..." (text-[24px])
- 3 steps com animação:
  - Step 1: "Scanning 1,247 products..." → "1,247 products scanned" (1200ms)
  - Step 2: "Extracting brand identity..." → "Brand DNA generated" (2400ms)
  - Step 3: "Mapping seasonal opportunities..." → "32 dates mapped" (3600ms)
- Cada step: circle icon (Loader2 quando ativo, Check quando done, dot quando pending)
- Continue button: fade in after all steps complete (+400ms)
```

**States**: `completed: number[]`, `current: number`, `showContinue: boolean`
**Timings**: [1200, 2400, 3600] ms

**Ação real**: Na implementação real, cada step corresponderia a uma chamada API real:

1. Fetch produtos da Nuvemshop/Shopify API
2. Gerar Brand DNA via LLM (scraping + análise)
3. Mapear datas sazonais baseado no nicho
   Para MVP: manter animação com timer.

## Tela 4: Brand DNA (`/onboarding/brand-dna`)

**Código fonte**: 573 linhas. A mais complexa — 8 seções + Assets drawer.

### Dados mock (hardcoded no componente)

```typescript
COLOR_SWATCHES = [
  { hex: '#F4E8D0', label: 'Vanilla' },
  { hex: '#E8D5C0', label: 'Nude' },
  { hex: '#D4B896', label: 'Caramelo' },
  { hex: '#F5F0EB', label: 'Off-white' },
  { hex: '#C9A87C', label: 'Dourado suave' },
]

USE_WORDS = ['memória', 'afeto', 'único', 'personalizado', 'momentos especiais', 'feito à mão']
AVOID_WORDS = ['promoção', 'corra', 'barato', 'imperdível', 'mega oferta']

INSIGHTS = [
  { borderColor: green, label: 'Páscoa está rodando — bem feito', text: '...' },
  { borderColor: amber, label: 'Dia das Mães em 47 dias — maior data do nicho', text: '...' },
  { borderColor: amber, label: 'Mesversários: recorrência escondida', text: '...' },
  { borderColor: amber, label: 'Seus bastidores são conteúdo de ouro', text: '...' },
]

SKILLS = [
  { dot: amber, name: 'Seasonal Calendar', desc: '...' },
  { dot: blue, name: 'Copywriter', desc: '...' },
  { dot: purple, name: 'Image Generator', desc: '...' },
]
```

### Seções (em ordem)

1. **CMO Greeting**: Avatar "S" gradient + "Oi, Aline. Sou o Snew, seu novo CMO." + intro paragraph
2. **Identidade da marca**: SectionLabel + paragraph + "ver assets →" button (abre drawer)
3. **Tom de voz**: SectionLabel + paragraph + Usar: green tags + Evitar: red tags
4. **Diagnóstico de performance**: SectionLabel + 3 strengths (✓ green bg) + 3 alerts (! amber bg)
5. **O que eu identifiquei**: SectionLabel + 4 insight cards (left border colored, bg colored)
6. **Um alerta**: Bold "Um alerta:" + paragraph about Nuvemshop email limitation
7. **O que eu projeto**: SectionLabel + paragraph com R$ bold + green delta + disclaimer
8. **O que eu recomendo**: SectionLabel + intro + 3 skills with Switch toggles + CTA button

### Assets Drawer

Abre quando clica "ver assets →". Drawer lateral direita (360px) com:

- Header: "Assets da Milkes" + "Extraídos do site e Instagram" + X close
- 3 tabs: Imagens (grid 3x2 de placeholders), Fontes (Cormorant Garamond + Inter + paleta), Textos (slogan + bio + assinatura)
- Overlay backdrop blur

### SectionLabel component

```tsx
<span
  className="mb-2 block text-[11px] font-semibold tracking-[0.05em] uppercase"
  style={{ color: 'hsl(var(--color-text-tertiary))' }}
>
  {children}
</span>
```

### CTA final

```
Button.w-full.h-11 "Começar com essas habilidades" → navega para /
"Você pode ativar mais habilidades e editar o Brand DNA quando quiser."
```

## CSS Variables usadas

O protótipo usa HSL variables que precisam estar definidas no tema:

```
--color-text-primary    (foreground)
--color-text-secondary  (muted-foreground)
--color-text-tertiary   (lighter muted)
--color-border-tertiary (light border)
--color-border-secondary
--color-surface-raised
--color-surface-elevated
--green                 (success green)
--green-bg              (success green light bg)
--amber                 (warning amber)
--amber-bg              (warning amber light bg)
--blue                  (blue accent)
--purple                (purple accent)
```

**No Relay**: mapear para as CSS variables existentes do tema OKLCH, ou adicionar as que faltam.

## Implementação no Relay

### Arquivos alvo

```
src/app/(onboarding)/onboarding/
├── layout.tsx          ← fullscreen, sem sidebar (JÁ EXISTE)
├── page.tsx            ← Welcome screen
├── connect/page.tsx    ← Connect screen
├── analyzing/page.tsx  ← Analyzing screen
└── brand-dna/page.tsx  ← Brand DNA screen

src/components/onboarding/
├── welcome-screen.tsx      ← PORT 1:1 do protótipo
├── connect-screen.tsx      ← PORT 1:1 + SVG icons
├── analyzing-screen.tsx    ← PORT 1:1 + animation logic
└── brand-dna-screen.tsx    ← PORT 1:1 + sub-components

src/components/brand-dna/
├── section-label.tsx       ← Reusable label component
├── assets-drawer.tsx       ← Drawer lateral com tabs
├── diagnostic-list.tsx     ← Strengths + alerts
├── insights-list.tsx       ← Colored border cards
└── skill-activation.tsx    ← Toggle list + CTA
```

### Ordem de implementação

1. **CSS variables** — garantir que --green, --green-bg, --amber, --amber-bg, --blue, --purple existem
2. **Welcome** — mais simples, validar que o layout fullscreen funciona
3. **Connect** — copiar SVG icons inline, testar navegação
4. **Analyzing** — copiar lógica de animação com useEffect/setTimeout
5. **Brand DNA** — portar seção por seção, testar Assets drawer

### O que NÃO mudar

- Textos e dados mock (são baseados na simulação Milkes)
- Estrutura HTML/CSS (portar 1:1)
- Animações e timings
- Assets drawer com tabs

### O que mudar (React Router → Next.js)

| Protótipo                                 | Relay                                     |
| ----------------------------------------- | ----------------------------------------- |
| `useNavigate()`                           | `useRouter()` from `next/navigation`      |
| `navigate("/path")`                       | `router.push("/path")`                    |
| `onClick={() => navigate(...)}`           | `<Link href="...">` ou `router.push(...)` |
| CSS vars `hsl(var(--color-text-primary))` | Mapear para tema existente ou adicionar   |
