/**
 * Skill configuration registry.
 * Maps skill slugs to their behavior config — determines AI prompt, tools, artifact type, and UI suggestions.
 */

export interface SkillConfig {
  slug: string
  name: string
  icon: string // Lucide icon name
  description: string
  promptAdditions: string
  artifactType: string | null
  suggestions: string[]
  prerequisites: string[] // e.g., ['brand_dna'] — checked before skill execution
}

const SKILL_CONFIGS: Record<string, SkillConfig> = {
  general: {
    slug: 'general',
    name: 'Geral',
    icon: 'MessageSquare',
    description: 'Assistente geral — vendas, estoque, pedidos, dúvidas',
    promptAdditions: '',
    artifactType: null,
    suggestions: [
      'Quanto vendi hoje?',
      'Como está meu estoque?',
      'Quais clientes estão em risco de churn?',
      'Mostre meus pedidos recentes',
    ],
    prerequisites: [],
  },
  'seasonal-calendar': {
    slug: 'seasonal-calendar',
    name: 'Calendário',
    icon: 'Calendar',
    description: 'Calendário sazonal com campanhas completas',
    promptAdditions: `Você está no modo CALENDÁRIO SAZONAL. Seu foco é:
- Gerar e gerenciar o calendário sazonal da loja
- Criar campanhas completas para datas (copies, email, assets, video, timeline)
- Modificar o calendário no painel lateral usando SNEW_MODIFY_ARTIFACT
- Responder perguntas sobre datas, campanhas e estratégia sazonal
Sempre use as tools disponíveis para modificar o calendário — nunca gere conteúdo estruturado como texto no chat.`,
    artifactType: 'seasonal-calendar',
    suggestions: [
      'Gere o calendário sazonal',
      'Gere a campanha de Dia das Mães',
      'Quais as próximas datas importantes?',
      'Remova as datas de baixa prioridade',
    ],
    prerequisites: ['brand_dna'],
  },
  copywriter: {
    slug: 'copywriter',
    name: 'Copywriter',
    icon: 'PenTool',
    description: 'Copies para todos os canais — email, WhatsApp, social',
    promptAdditions: `Você está no modo COPYWRITER. Seu foco é:
- Gerar copies de alta qualidade para diferentes canais (email, WhatsApp, Instagram, anúncios)
- Adaptar o tom de voz conforme o Brand DNA da loja
- Sugerir variações A/B de copies
- Criar sequências de email e fluxos de mensagem
Use o Brand DNA da loja para manter consistência de tom e palavras.`,
    artifactType: 'copywriter',
    suggestions: [
      'Escreva copies para Dia das Mães',
      'Crie uma sequência de email para Black Friday',
      'Copies para Instagram — lançamento de produto',
      'WhatsApp: mensagem de carrinho abandonado',
    ],
    prerequisites: ['brand_dna'],
  },
}

/**
 * Get config for a skill slug. Falls back to 'general' if not found.
 */
export function getSkillConfig(slug: string | null | undefined): SkillConfig {
  if (!slug || slug === 'general') return SKILL_CONFIGS.general
  return SKILL_CONFIGS[slug] ?? SKILL_CONFIGS.general
}

/**
 * Get all available skill configs (for the selector UI).
 */
export function getAllSkillConfigs(): SkillConfig[] {
  return Object.values(SKILL_CONFIGS)
}

/**
 * Get skill configs filtered by active skills from the team's catalog.
 * Always includes 'general'. Only includes other skills if they're in the active list.
 */
export function getActiveSkillConfigs(activeSlugs: string[]): SkillConfig[] {
  const configs = [SKILL_CONFIGS.general]
  for (const slug of activeSlugs) {
    if (slug !== 'general' && SKILL_CONFIGS[slug]) {
      configs.push(SKILL_CONFIGS[slug])
    }
  }
  return configs
}
