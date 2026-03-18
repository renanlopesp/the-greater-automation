import type { AgentTypeDefinition } from './types'

export const AGENT_TYPE_REGISTRY: Record<string, AgentTypeDefinition> = {
  'carrinho-conversao': {
    agentType: 'carrinho-conversao',
    name: 'Carrinho & Conversão',
    category: 'Carrinho & Conversão',
    description:
      'Recupera carrinhos, otimiza conversão, gerencia urgência e faz upsell automaticamente.',
    modules: [
      {
        moduleType: 'abandoned-cart',
        name: 'Abandoned Cart',
        description: 'Detecta carrinhos abandonados e envia mensagens de recuperação multicanal.',
        requiredConnections: ['nuvemshop'],
        workflows: [
          {
            triggerType: 'cron',
            cronExpression: '*/15 * * * *',
            stepDescriptions: [
              'check_abandoned_carts',
              'send_recovery_messages',
              'track_recoveries',
            ],
          },
          {
            triggerType: 'cron',
            cronExpression: '0 10 * * *',
            stepDescriptions: ['send_second_touch'],
          },
        ],
      },
      {
        moduleType: 'conversion-optimizer',
        name: 'Conversion Optimizer',
        description: 'Analisa o funil de conversão e identifica pontos de fricção.',
        requiredConnections: ['nuvemshop'],
        workflows: [
          {
            triggerType: 'cron',
            cronExpression: '0 6 * * 1',
            stepDescriptions: ['analyze_checkout_funnel', 'generate_friction_report'],
          },
        ],
      },
      {
        moduleType: 'urgency-manager',
        name: 'Urgency Manager',
        description: 'Monitora estoque e ativa alertas de escassez em produtos com baixo estoque.',
        requiredConnections: ['nuvemshop'],
        workflows: [
          {
            triggerType: 'cron',
            cronExpression: '0 */4 * * *',
            stepDescriptions: ['check_low_stock_products', 'generate_urgency_alerts'],
          },
        ],
      },
      {
        moduleType: 'upsell-engine',
        name: 'Upsell Engine',
        description: 'Identifica oportunidades de venda complementar e envia ofertas pós-compra.',
        requiredConnections: ['nuvemshop'],
        workflows: [
          {
            triggerType: 'cron',
            cronExpression: '0 8 * * *',
            stepDescriptions: [
              'analyze_purchase_affinity',
              'generate_bundle_recommendations',
              'send_post_purchase_upsell',
            ],
          },
        ],
      },
    ],
  },
}

export function getAgentTypeDefinition(agentType: string): AgentTypeDefinition | undefined {
  return AGENT_TYPE_REGISTRY[agentType]
}

export function getAllAgentTypes(): AgentTypeDefinition[] {
  return Object.values(AGENT_TYPE_REGISTRY)
}
