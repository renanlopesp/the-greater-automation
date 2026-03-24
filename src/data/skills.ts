/**
 * Skill Registry — Single Agent + Skills Architecture
 *
 * Each entry defines a capability that Snew (the single orchestrator agent) can activate.
 * This file is the source of truth for skill definitions. The DB tracks per-team state (active/inactive).
 *
 * Category keys match the prototype exactly (carrinho-conversao, retencao-churn, etc.)
 */

export interface SkillDefinition {
  slug: string
  name: string
  emoji: string
  description: string
  detailedDescription: string
  category: string
  colorBg: string
  phase: 1 | 2 | 3 | 4
  icon: string
  color: string
  dependencies: string[]
  requiredConnections: string[]
  tags: string[]
  /** True = native orchestrator capability (runs automatically) */
  isNative?: boolean
  active?: boolean
}

export const SKILL_CATEGORIES = [
  { key: 'all', label: 'All', count: 38 },
  { key: 'carrinho-conversao', label: 'Carrinho & Conversão', count: 4 },
  { key: 'retencao-churn', label: 'Retenção & Churn', count: 3 },
  { key: 'marketing-campanhas', label: 'Marketing & Campanhas', count: 7 },
  { key: 'ads-performance', label: 'Ads & Performance', count: 4 },
  { key: 'analytics-inteligencia', label: 'Analytics & Inteligência', count: 6 },
  { key: 'atendimento-experiencia', label: 'Atendimento & Experiência', count: 3 },
  { key: 'produto-catalogo', label: 'Produto & Catálogo', count: 3 },
  { key: 'redes-sociais', label: 'Redes Sociais', count: 4 },
  { key: 'visibilidade-ia', label: 'Visibilidade & IA', count: 6 },
]

// Legacy category aliases used in the DB (old category keys → new display)
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  foundation: 'visibilidade-ia',
  campaign: 'marketing-campanhas',
  content: 'produto-catalogo',
  retention: 'retencao-churn',
  analytics: 'analytics-inteligencia',
  ads: 'ads-performance',
  operations: 'visibilidade-ia',
  scale: 'atendimento-experiencia',
  cart: 'carrinho-conversao',
  social: 'redes-sociais',
}

export type SkillCategory =
  | 'carrinho-conversao'
  | 'retencao-churn'
  | 'marketing-campanhas'
  | 'ads-performance'
  | 'analytics-inteligencia'
  | 'atendimento-experiencia'
  | 'produto-catalogo'
  | 'redes-sociais'
  | 'visibilidade-ia'

export const skillCategoryLabels: Record<string, string> = {
  'carrinho-conversao': 'Carrinho & Conversão',
  'retencao-churn': 'Retenção & Churn',
  'marketing-campanhas': 'Marketing & Campanhas',
  'ads-performance': 'Ads & Performance',
  'analytics-inteligencia': 'Analytics & Inteligência',
  'atendimento-experiencia': 'Atendimento & Experiência',
  'produto-catalogo': 'Produto & Catálogo',
  'redes-sociais': 'Redes Sociais',
  'visibilidade-ia': 'Visibilidade & IA',
  // Legacy keys for backward compatibility
  foundation: 'Visibilidade & IA',
  campaign: 'Marketing & Campanhas',
  content: 'Produto & Catálogo',
  retention: 'Retenção & Churn',
  analytics: 'Analytics & Inteligência',
  ads: 'Ads & Performance',
  operations: 'Visibilidade & IA',
  scale: 'Atendimento & Experiência',
  cart: 'Carrinho & Conversão',
  social: 'Redes Sociais',
}

export const skillCategories: SkillCategory[] = [
  'carrinho-conversao',
  'retencao-churn',
  'marketing-campanhas',
  'ads-performance',
  'analytics-inteligencia',
  'atendimento-experiencia',
  'produto-catalogo',
  'redes-sociais',
  'visibilidade-ia',
]

export const skills: SkillDefinition[] = [
  // ── Carrinho & Conversão (4) ──────────────────────────────────────────────
  {
    slug: 'abandoned-cart',
    name: 'Abandoned Cart',
    emoji: '🛒',
    description: 'Recupera carrinhos em até 15 min pelo canal certo',
    detailedDescription:
      'Monitora carrinhos abandonados em tempo real e aciona sequências personalizadas de recuperação via WhatsApp, e-mail ou SMS.\n\nO que analisa:\n• Valor e composição dos carrinhos abandonados\n• Histórico de compras do cliente\n• Canal de contato com maior taxa de resposta\n• Janela de tempo ideal para cada segmento\n\nAções geradas:\n• Mensagem imediata de recuperação (até 15 min)\n• Sequência de follow-up com incentivos progressivos\n• Alertas de estoque limitado para itens no carrinho\n• Relatório semanal de receita recuperada',
    category: 'carrinho-conversao',
    colorBg: 'hsl(217 91% 95%)',
    phase: 2,
    icon: 'shopping-cart',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Carrinho', 'Recuperação', 'Conversão'],
  },
  {
    slug: 'checkout-optimizer',
    name: 'Checkout Optimizer',
    emoji: '🛒',
    description: 'Reduz o abandono de checkout ao identificar e corrigir pontos de fricção',
    detailedDescription:
      'Monitora continuamente as métricas do fluxo de checkout para identificar e resolver os principais causadores de abandono.\n\nO que analisa:\n• Taxa de abandono por etapa do checkout\n• Falhas de pagamento e erros de formulário\n• Diferenças entre dispositivos (mobile vs desktop)\n• Fricção em campos e opções de envio\n\nAções geradas:\n• Recomendações de simplificação do checkout\n• Sugestões de novos métodos de pagamento\n• Melhorias de checkout sem cadastro\n• Prioridades de otimização mobile',
    category: 'carrinho-conversao',
    colorBg: 'hsl(142 76% 96%)',
    phase: 2,
    icon: 'shopping-cart',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Carrinho', 'Checkout', 'Conversão'],
  },
  {
    slug: 'upsell-recommender',
    name: 'Upsell Recommender',
    emoji: '💎',
    description: 'Sugere upsell e cross-sell personalizados no momento certo da jornada de compra',
    detailedDescription:
      'Usa histórico de compras e dados do carrinho em tempo real para recomendar os upgrades e complementos mais relevantes.\n\nO que analisa:\n• Conteúdo atual do carrinho e histórico do cliente\n• Padrões de co-compra e afinidade de produtos\n• Sensibilidade a preços por segmento\n• Disponibilidade de estoque e margem\n\nAções geradas:\n• Widgets de recomendação em tempo real\n• Sequências de e-mail pós-compra para upsell\n• Sugestões de kits e combos\n• Incentivos de frete grátis por valor mínimo',
    category: 'carrinho-conversao',
    colorBg: 'hsl(142 76% 96%)',
    phase: 2,
    icon: 'trending-up',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Carrinho', 'Upsell', 'Receita'],
    active: true,
  },
  {
    slug: 'conversion-optimizer',
    name: 'Conversion Optimizer',
    emoji: '🔬',
    description: 'Identifica onde os 98% que não compram abandonam',
    detailedDescription:
      'Analisa continuamente as páginas de produto, fluxo de checkout e mensagens para identificar os principais pontos de fricção.\n\nO que analisa:\n• Layout de páginas de produto e posicionamento de CTAs\n• Pontos de abandono no funil de checkout\n• Apresentação de preços e sinais de confiança\n• Gaps de conversão entre mobile e desktop\n\nAções geradas:\n• Lista priorizada de melhorias de UX\n• Sugestões de testes A/B para páginas de alto impacto\n• Reescritas de copy para CTAs com baixo desempenho\n• Recomendações de simplificação do checkout',
    category: 'carrinho-conversao',
    colorBg: 'hsl(270 70% 96%)',
    phase: 2,
    icon: 'target',
    color: '#9B6BC4',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Conversão', 'Otimização', 'Automação'],
  },

  // ── Retenção & Churn (3) ──────────────────────────────────────────────────
  {
    slug: 'churn-retention',
    name: 'Churn & Retention',
    emoji: '🛡️',
    description: 'Identifica clientes em risco 30 dias antes do churn',
    detailedDescription:
      'Usa sinais comportamentais para identificar clientes em risco de saída e aciona automaticamente fluxos de retenção.\n\nO que analisa:\n• Queda na frequência de compras\n• Queda no engajamento com e-mails e site\n• Tendências de sentimento em tickets de suporte\n• Benchmarks de churn por coorte\n\nAções geradas:\n• Alertas antecipados para clientes de alto valor\n• Sequências automáticas de reativação\n• Ofertas de incentivo personalizadas\n• Escalações para contas VIP',
    category: 'retencao-churn',
    colorBg: 'hsl(270 70% 96%)',
    phase: 3,
    icon: 'shield',
    color: '#9B6BC4',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Retenção', 'Churn', 'Predição'],
  },
  {
    slug: 'vip-relationship',
    name: 'VIP Relationship',
    emoji: '👑',
    description: 'Gerencia relacionamentos com clientes de alto valor com experiências exclusivas',
    detailedDescription:
      'Garante que seus clientes mais valiosos se sintam reconhecidos e priorizados com engajamento automatizado e profundamente personalizado.\n\nO que analisa:\n• Padrões de gasto dos clientes top tier\n• Aniversários de compra e marcos\n• Histórico de interações com o suporte\n• Preferências de produto e sinais de fidelidade\n\nAções geradas:\n• Mensagens de agradecimento personalizadas\n• Campanhas de acesso antecipado e ofertas exclusivas\n• Celebrações de aniversário e marcos\n• Roteamento de suporte prioritário',
    category: 'retencao-churn',
    colorBg: 'hsl(38 100% 95%)',
    phase: 3,
    icon: 'crown',
    color: '#D7733E',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Retenção', 'VIP', 'Relacionamento'],
    active: true,
  },
  {
    slug: 'retention-booster',
    name: 'Retention Booster',
    emoji: '🔄',
    description: 'Identifica riscos de churn e sugere fluxos de retenção personalizados',
    detailedDescription:
      'Analisa padrões de comportamento do cliente para identificar quem está em risco e gerar estratégias de retenção automatizadas.\n\nO que analisa:\n• Frequência e recência de compras\n• Sinais de engajamento do cliente\n• Taxas de abertura e clique em e-mails\n• Dados de devoluções e reclamações\n\nAções geradas:\n• Sequências de e-mail de reativação\n• Recomendações de programa de fidelidade\n• Estratégias de ofertas personalizadas\n• Fluxos de retenção por segmento de cliente',
    category: 'retencao-churn',
    colorBg: 'hsl(142 76% 96%)',
    phase: 3,
    icon: 'refresh-cw',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Retenção', 'Automação', 'Otimização'],
  },

  // ── Marketing & Campanhas (7) ─────────────────────────────────────────────
  {
    slug: 'seasonal-calendar',
    name: 'Seasonal Calendar',
    emoji: '📅',
    description: 'Mapeia 30+ datas priorizadas por potencial de receita histórico',
    detailedDescription:
      'Analisa seu catálogo e histórico de vendas para inferir seu nicho e mapear 30+ datas sazonais ranqueadas por potencial de receita. Gera briefings de campanha automaticamente 60 dias antes de cada data.\n\nO que analisa:\n• Histórico de vendas por período\n• Calendário de datas gerais e específicas do nicho\n• Performance de campanhas anteriores\n• Padrões sazonais por categoria de produto\n\nAções geradas:\n• Planejamento completo do calendário anual\n• Briefings automáticos com antecedência de 60 dias\n• Alertas progressivos: D-45, D-30, D-15\n• Conexão com o Copywriter para geração de copies',
    category: 'marketing-campanhas',
    colorBg: 'hsl(38 100% 95%)',
    phase: 1,
    icon: 'calendar',
    color: '#D7733E',
    dependencies: ['brand-dna', 'copywriter'],
    requiredConnections: ['nuvemshop'],
    tags: ['Campanha', 'Calendário', 'Sazonal'],
    active: true,
  },
  {
    slug: 'campaign-engine',
    name: 'Campaign Engine',
    emoji: '🎯',
    description: 'Planeja, cria e executa campanhas em todos os canais',
    detailedDescription:
      'Coordena o planejamento, criação e execução de campanhas completas, integrando todos os canais de comunicação.\n\nO que analisa:\n• Objetivos da campanha e segmento-alvo\n• Performance histórica por canal\n• Calendário de datas e momentos de oportunidade\n• Budget disponível e ROI esperado\n\nAções geradas:\n• Plano de campanha multicanal completo\n• Cronograma de execução com marcos\n• Distribuição de budget por canal\n• Relatórios de performance em tempo real',
    category: 'marketing-campanhas',
    colorBg: 'hsl(217 91% 95%)',
    phase: 1,
    icon: 'target',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: [],
    tags: ['Campanha', 'Multicanal', 'Execução'],
    active: true,
  },
  {
    slug: 'copywriter',
    name: 'Campaign Copywriter',
    emoji: '✍️',
    description: 'Gera copies para todos os canais em minutos, alinhado ao tom da marca',
    detailedDescription:
      'A skill de geração mais fundamental. Recebe um briefing e produz copies para todos os canais respeitando a voz da marca e limites de cada canal (SMS 160 chars, push 100 chars).\n\nO que analisa:\n• Briefing e objetivos da campanha\n• Brand DNA e tom de voz\n• Limitações técnicas de cada canal\n• Performance histórica de copies similares\n\nAções geradas:\n• 12-15 copies por briefing em todos os canais\n• Variações de assunto para testes A/B\n• Copies adaptados para cada plataforma\n• Revisão automática pelo filtro do Brand DNA',
    category: 'marketing-campanhas',
    colorBg: 'hsl(217 91% 95%)',
    phase: 1,
    icon: 'pen-line',
    color: '#648EE9',
    dependencies: ['brand-dna'],
    requiredConnections: [],
    tags: ['Campanha', 'Copy', 'Conteúdo'],
    active: true,
  },
  {
    slug: 'image-generator',
    name: 'Image Generator',
    emoji: '🖼️',
    description: 'Banners e imagens para ads, e-mail e redes sociais gerados automaticamente',
    detailedDescription:
      'Gera criativos visuais para todos os canais de marketing, alinhados ao Brand DNA e otimizados para cada plataforma.\n\nO que analisa:\n• Diretrizes visuais do Brand DNA\n• Especificações técnicas de cada canal\n• Performance de criativos anteriores\n• Tendências visuais do segmento\n\nAções geradas:\n• Banners para Google Ads e Meta Ads\n• Imagens otimizadas para e-mail marketing\n• Criativos para feed e stories no Instagram\n• Variações para testes A/B de criativos',
    category: 'marketing-campanhas',
    colorBg: 'hsl(270 70% 96%)',
    phase: 2,
    icon: 'image',
    color: '#9B6BC4',
    dependencies: ['brand-dna'],
    requiredConnections: [],
    tags: ['Campanha', 'Design', 'Criativo'],
    active: true,
  },
  {
    slug: 'email-sequencer',
    name: 'Email Sequencer',
    emoji: '📩',
    description:
      'Cria sequências de e-mail em múltiplas etapas acionadas por comportamento do cliente',
    detailedDescription:
      'Cria sequências inteligentes de e-mail que se adaptam às ações do cliente e o guiam pela jornada de compra.\n\nO que analisa:\n• Estágio do ciclo de vida e comportamento do cliente\n• Histórico de engajamento com e-mails\n• Sinais de intenção de compra\n• Padrões de conversão por segmento\n\nAções geradas:\n• Sequências de boas-vindas para novos assinantes\n• Fluxos de follow-up de carrinho abandonado\n• Fluxos de nutrição pós-compra\n• Sequências de reengajamento para contatos inativos',
    category: 'marketing-campanhas',
    colorBg: 'hsl(38 100% 95%)',
    phase: 2,
    icon: 'mail',
    color: '#D7733E',
    dependencies: ['brand-dna'],
    requiredConnections: [],
    tags: ['Campanha', 'E-mail', 'Automação'],
  },
  {
    slug: 'sms-scheduler',
    name: 'SMS Scheduler',
    emoji: '💬',
    description: 'Planeja e envia campanhas de SMS no horário ideal para cada segmento',
    detailedDescription:
      'Maximiza o engajamento com SMS enviando a mensagem certa para o cliente certo no momento mais adequado.\n\nO que analisa:\n• Fuso horário e janelas de engajamento do cliente\n• Histórico de abertura e conversão via SMS\n• Sinais de prontidão de compra por segmento\n• Status de opt-in e conformidade\n\nAções geradas:\n• Disparos de SMS promocionais com horários otimizados\n• SMS transacionais para pedidos e envios\n• Alertas de reestoque e promoções relâmpago\n• Mensagens de aniversário e marcos de fidelidade',
    category: 'marketing-campanhas',
    colorBg: 'hsl(142 76% 96%)',
    phase: 2,
    icon: 'message-square',
    color: '#5BA87B',
    dependencies: ['brand-dna'],
    requiredConnections: [],
    tags: ['Campanha', 'SMS', 'Automação'],
  },
  {
    slug: 'email-performance',
    name: 'Email Performance',
    emoji: '📊',
    description:
      'Otimiza campanhas de e-mail analisando taxas de abertura, cliques e comportamento',
    detailedDescription:
      'Monitora continuamente as métricas de e-mail marketing e sugere melhorias baseadas em dados.\n\nO que analisa:\n• Taxas de abertura e clique por segmento\n• Padrões de performance de linha de assunto\n• Otimização de horário de envio\n• Gatilhos de descadastro e spam\n\nAções geradas:\n• Sugestões de testes A/B de linha de assunto\n• Recomendações de horário de envio por segmento\n• Fluxos de limpeza de lista e reengajamento\n• Comparações de performance de templates',
    category: 'marketing-campanhas',
    colorBg: 'hsl(217 91% 95%)',
    phase: 2,
    icon: 'mail',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: [],
    tags: ['Marketing', 'E-mail', 'Otimização'],
  },

  // ── Ads & Performance (4) ─────────────────────────────────────────────────
  {
    slug: 'ad-waste-detector',
    name: 'Ad Waste Detector',
    emoji: '⚡',
    description: 'Pausa campanhas ineficientes e redistribui budget',
    detailedDescription:
      'Monitora suas campanhas publicitárias em todas as plataformas para identificar gastos desperdiçados e oportunidades de otimização.\n\nO que analisa:\n• ROAS e custo por aquisição por campanha\n• Eficiência de segmentação de público\n• Fadiga de criativo e frequência de anúncio\n• Gaps de atribuição e problemas de rastreamento\n\nAções geradas:\n• Recomendações de realocação de budget\n• Sugestões de pausa para campanhas ineficientes\n• Estratégias de refinamento de público\n• Prioridades de renovação de criativos',
    category: 'ads-performance',
    colorBg: 'hsl(38 100% 95%)',
    phase: 4,
    icon: 'zap',
    color: '#D7733E',
    dependencies: [],
    requiredConnections: [],
    tags: ['Ads', 'Otimização', 'Monitoramento'],
  },
  {
    slug: 'competitor-watch',
    name: 'Competitor Watch',
    emoji: '👁️',
    description: 'Monitora preços, mudanças de mensagem e atividade de campanhas dos concorrentes',
    detailedDescription:
      'Mantém vigilância constante sobre a presença digital dos concorrentes, rastreando mudanças de preços, mensagens e estratégias de publicidade.\n\nO que analisa:\n• Preços e promoções dos concorrentes\n• Mudanças em landing pages e mensagens\n• Padrões de criativos e gastos em ads\n• Lançamentos de novos produtos e posicionamento\n\nAções geradas:\n• Recomendações de ajuste de preço\n• Estratégias de contra-mensagem\n• Alertas de oportunidade quando concorrentes recuam\n• Relatórios de posicionamento de mercado',
    category: 'ads-performance',
    colorBg: 'hsl(270 70% 96%)',
    phase: 4,
    icon: 'eye',
    color: '#9B6BC4',
    dependencies: [],
    requiredConnections: [],
    tags: ['Concorrentes', 'Monitoramento', 'Automação'],
  },
  {
    slug: 'attribution-mapper',
    name: 'Attribution Mapper',
    emoji: '🗺️',
    description:
      'Mapeia o impacto real de cada canal de marketing na receita com modelos multi-touch',
    detailedDescription:
      'Vai além do último clique para mostrar quais canais realmente geram receita.\n\nO que analisa:\n• Jornadas de cliente multi-touch\n• Papel de assistência e conversão de cada canal\n• Tempo para conversão por canal\n• Lift incremental por canal\n\nAções geradas:\n• Scorecards de ROI por canal\n• Recomendações de realocação de budget\n• Alertas de canais subvalorizados\n• Relatórios de comparação de modelos de atribuição',
    category: 'ads-performance',
    colorBg: 'hsl(142 76% 96%)',
    phase: 3,
    icon: 'git-branch',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: [],
    tags: ['Analytics', 'Atribuição', 'Canais'],
  },
  {
    slug: 'pricing-intelligence',
    name: 'Pricing Intelligence',
    emoji: '💰',
    description: 'Rastreia preços dos concorrentes em tempo real e recomenda ajustes dinâmicos',
    detailedDescription:
      'Monitora preços dos concorrentes por produtos e categorias para manter competitividade sem sacrificar margem.\n\nO que analisa:\n• Mudanças de preços dos concorrentes por SKU/categoria\n• Cadência promocional e profundidade de desconto\n• Sinais de elasticidade de preço dos seus dados\n• Gaps de posicionamento de mercado\n\nAções geradas:\n• Recomendações de precificação dinâmica\n• Sugestões de timing para promoções\n• Alertas de otimização de margem\n• Sinalizadores de oportunidade de match de preço',
    category: 'ads-performance',
    colorBg: 'hsl(142 76% 96%)',
    phase: 4,
    icon: 'dollar-sign',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Concorrentes', 'Precificação', 'Inteligência'],
  },

  // ── Analytics & Inteligência (6) ──────────────────────────────────────────
  {
    slug: 'revenue-intelligence',
    name: 'Revenue Intelligence',
    emoji: '📈',
    description: 'Identifica padrões de receita para replicar o que funciona',
    detailedDescription:
      'Agrega dados de múltiplas fontes para revelar insights acionáveis de receita e oportunidades de crescimento.\n\nO que analisa:\n• Tendências de receita por produto, canal e segmento\n• CAC e períodos de payback\n• Padrões sazonais e previsão de demanda\n• Oportunidades de cross-sell e upsell\n\nAções geradas:\n• Playbooks de crescimento de receita\n• Recomendações de realocação de budget\n• Estratégias de bundling de produtos\n• Prioridades de otimização de canal',
    category: 'analytics-inteligencia',
    colorBg: 'hsl(142 76% 96%)',
    phase: 3,
    icon: 'trending-up',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Analytics', 'Receita', 'Crescimento'],
    active: true,
  },
  {
    slug: 'funnel-diagnostics',
    name: 'Funnel Diagnostics',
    emoji: '🔍',
    description: 'Etapa de maior abandono com receita perdida calculada',
    detailedDescription:
      'Mapeia toda a jornada do cliente, da primeira visita à compra, e identifica os maiores pontos de vazamento.\n\nO que analisa:\n• Taxas de conversão por etapa do funil\n• Padrões de abandono por dispositivo, segmento e fonte\n• Métricas de engajamento por página\n• Indicadores de fricção no checkout\n\nAções geradas:\n• Recomendações priorizadas de correção de vazamentos\n• Hipóteses de testes A/B para etapas com maior abandono\n• Tarefas de otimização por dispositivo\n• Comparações com benchmarks do funil',
    category: 'analytics-inteligencia',
    colorBg: 'hsl(217 91% 95%)',
    phase: 3,
    icon: 'filter',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Analytics', 'Funil', 'Otimização'],
    active: true,
  },
  {
    slug: 'cohort-analyzer',
    name: 'Cohort Analyzer',
    emoji: '👥',
    description: 'Analisa comportamento por coorte de aquisição para revelar padrões de retenção',
    detailedDescription:
      'Segmenta clientes por quando foram adquiridos e rastreia seu comportamento ao longo do tempo.\n\nO que analisa:\n• Curvas de retenção por mês de aquisição\n• Receita por coorte ao longo do tempo\n• Qualidade de coorte por canal\n• Impacto de aquisição sazonal\n\nAções geradas:\n• Scorecards de saúde de coorte\n• Ranking de qualidade por canal de aquisição\n• Recomendações de melhoria de retenção por coorte\n• Projeções de LTV para coortes recentes',
    category: 'analytics-inteligencia',
    colorBg: 'hsl(38 100% 95%)',
    phase: 3,
    icon: 'users',
    color: '#D7733E',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Analytics', 'Coortes', 'Retenção'],
  },
  {
    slug: 'segment-builder',
    name: 'Segment Builder',
    emoji: '🎛️',
    description:
      'Cria segmentos dinâmicos de clientes baseados em comportamento e histórico de compras',
    detailedDescription:
      'Constrói segmentos de audiência precisos que alimentam campanhas personalizadas e fluxos de retenção.\n\nO que analisa:\n• Pontuações RFM (Recência, Frequência, Valor Monetário)\n• Tags comportamentais de interações no site e e-mail\n• Afinidade por categoria de produto\n• Estágio do ciclo de vida e indicadores de risco\n\nAções geradas:\n• Definições de segmentos com critérios claros\n• Estimativas de tamanho e potencial de receita\n• Recomendações de targeting por segmento\n• Agendamentos de atualização automática de segmentos',
    category: 'analytics-inteligencia',
    colorBg: 'hsl(217 91% 95%)',
    phase: 2,
    icon: 'pie-chart',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Analytics', 'Segmentos', 'Personalização'],
  },
  {
    slug: 'task-prioritizer',
    name: 'Task Prioritizer',
    emoji: '📋',
    description: 'Top 5 ações de maior impacto entregues toda manhã',
    detailedDescription:
      'Pontua e ranqueia seu backlog de otimização com base no impacto estimado na receita e esforço de implementação.\n\nO que analisa:\n• Tarefas pendentes e seus resultados esperados\n• Impacto histórico de mudanças similares\n• Complexidade de implementação e dependências\n• Gargalos de performance atuais\n\nAções geradas:\n• Listas de tarefas ranqueadas por impacto\n• Identificação de quick wins\n• Recomendações de alocação de recursos\n• Sugestões de foco semanal',
    category: 'analytics-inteligencia',
    colorBg: 'hsl(217 91% 95%)',
    phase: 3,
    icon: 'list-ordered',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Produtividade', 'Priorização', 'Eficiência'],
  },
  {
    slug: 'share-of-voice',
    name: 'Share of Voice Tracker',
    emoji: '📊',
    description: 'Mede a visibilidade da sua marca vs concorrentes em busca, social e canais pagos',
    detailedDescription:
      'Compara a presença da sua marca com os concorrentes nos canais digitais.\n\nO que analisa:\n• Visibilidade orgânica e rankings de busca\n• Parcela de impressões em ads pagos\n• Volume de menções em redes sociais\n• Comparação de alcance e engajamento de conteúdo\n\nAções geradas:\n• Relatórios de gap de visibilidade por canal\n• Recomendações de prioridades de conteúdo e SEO\n• Sugestões de alocação de verba em ads\n• Gatilhos de campanha de awareness de marca',
    category: 'analytics-inteligencia',
    colorBg: 'hsl(270 70% 96%)',
    phase: 4,
    icon: 'bar-chart-2',
    color: '#9B6BC4',
    dependencies: [],
    requiredConnections: [],
    tags: ['Concorrentes', 'Marca', 'Monitoramento'],
  },

  // ── Atendimento & Experiência (3) ─────────────────────────────────────────
  {
    slug: 'customer-service',
    name: 'Customer Service',
    emoji: '💬',
    description: 'Atendimento automático 24/7 para rastreio, troca e pagamento',
    detailedDescription:
      'Transforma o suporte em retenção. Detecta clientes em risco e automatiza o contato personalizado via WhatsApp e E-mail.\n\nO que analisa:\n• Atrasos de entrega e sinais de sentimento negativo\n• Padrões de risco de devolução e causas raiz\n• Oportunidades de avaliação pós-entrega\n• Segmentos de clientes inativos (sem recompra em 60+ dias)\n\nAções geradas:\n• Mensagens proativas de atraso de entrega (WhatsApp)\n• Fluxos de follow-up pós-entrega (WhatsApp)\n• Campanhas de solicitação de avaliação (E-mail/WhatsApp)\n• Fluxos de recuperação de solicitação de devolução',
    category: 'atendimento-experiencia',
    colorBg: 'hsl(142 76% 96%)',
    phase: 3,
    icon: 'headphones',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Atendimento', 'Retenção', 'Automação'],
  },
  {
    slug: 'sentiment-intelligence',
    name: 'Sentiment Intelligence',
    emoji: '😊',
    description: 'Analisa sentimento do cliente em todos os pontos de contato para revelar riscos',
    detailedDescription:
      'Processa interações de clientes em tickets de suporte, avaliações, redes sociais e pesquisas para criar um mapa de sentimento em tempo real.\n\nO que analisa:\n• Tom de tickets de suporte e satisfação de resolução\n• Sentimento de avaliações por produto e categoria\n• Menções de marca nas redes sociais\n• Respostas de pesquisas NPS e CSAT\n\nAções geradas:\n• Relatórios de tendência de sentimento e alertas\n• Análises de sentimento por produto\n• Gatilhos de escalação para picos de sentimento negativo\n• Campanhas de amplificação de sentimento positivo',
    category: 'atendimento-experiencia',
    colorBg: 'hsl(217 91% 95%)',
    phase: 3,
    icon: 'smile',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: [],
    tags: ['Atendimento', 'Sentimento', 'Inteligência'],
  },
  {
    slug: 'review-reputation',
    name: 'Review & Reputation',
    emoji: '⭐',
    description: 'Automatiza coleta de avaliações, monitora sentimento e gerencia reputação',
    detailedDescription:
      'Coleta avaliações proativamente de clientes satisfeitos e monitora o sentimento da marca para proteger e ampliar a reputação.\n\nO que analisa:\n• Sinais de satisfação pós-entrega\n• Sentimento e notas de avaliações existentes\n• Menções e feedbacks nas redes sociais\n• Benchmarks de avaliações dos concorrentes\n\nAções geradas:\n• Fluxos de solicitação de avaliação cronometrados (E-mail/WhatsApp)\n• Rascunhos de resposta para avaliações negativas\n• Campanhas de incentivo de avaliação para produtos com poucas notas\n• Relatórios de saúde da reputação',
    category: 'atendimento-experiencia',
    colorBg: 'hsl(38 100% 95%)',
    phase: 4,
    icon: 'star',
    color: '#D7733E',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Atendimento', 'Avaliações', 'Reputação'],
  },

  // ── Produto & Catálogo (3) ────────────────────────────────────────────────
  {
    slug: 'pricing-engine',
    name: 'Pricing Engine',
    emoji: '💰',
    description: 'Preço ajustado dinamicamente com margem mínima protegida',
    detailedDescription:
      'Monitora e ajusta preços em tempo real com base em demanda, concorrência e margem mínima configurada.\n\nO que analisa:\n• Demanda e velocidade de vendas por produto\n• Preços dos concorrentes em tempo real\n• Margem de contribuição por SKU\n• Sazonalidade e elasticidade de preço\n\nAções geradas:\n• Ajustes automáticos de preço dentro dos limites definidos\n• Alertas de oportunidade de aumento de margem\n• Recomendações de promoção para produtos encalhados\n• Relatórios de otimização de pricing',
    category: 'produto-catalogo',
    colorBg: 'hsl(142 76% 96%)',
    phase: 3,
    icon: 'dollar-sign',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Produto', 'Precificação', 'Margem'],
  },
  {
    slug: 'market-gap-finder',
    name: 'Market Gap Finder',
    emoji: '🧭',
    description: 'Identifica nichos e gaps de produto analisando catálogos de concorrentes',
    detailedDescription:
      'Escaneia catálogos de produtos dos concorrentes, comportamento de busca do cliente e tendências de mercado para revelar demandas não atendidas.\n\nO que analisa:\n• Cobertura do catálogo de produtos dos concorrentes\n• Demanda de busca vs oferta disponível\n• Reclamações de clientes sobre funcionalidades ausentes\n• Categorias em tendência e nichos emergentes\n\nAções geradas:\n• Relatórios de oportunidade de produto\n• Recomendações de expansão de categoria\n• Análise de gap de funcionalidades para produtos existentes\n• Previsões de demanda para novas oportunidades',
    category: 'produto-catalogo',
    colorBg: 'hsl(270 70% 96%)',
    phase: 4,
    icon: 'compass',
    color: '#9B6BC4',
    dependencies: [],
    requiredConnections: [],
    tags: ['Produto', 'Mercado', 'Oportunidades'],
  },
  {
    slug: 'inventory-alerts',
    name: 'Inventory Alerts',
    emoji: '📦',
    description: 'Monitora níveis de estoque e velocidade de vendas para prevenir rupturas',
    detailedDescription:
      'Rastreia níveis de estoque em relação à velocidade de vendas para garantir gestão de inventário otimizada.\n\nO que analisa:\n• Níveis atuais de estoque vs velocidade de vendas\n• Padrões de demanda sazonal\n• Prazos de entrega de fornecedores\n• Estoque encalhado e de baixo giro\n\nAções geradas:\n• Alertas de reposição antes de rupturas\n• Recomendações de markdown para excesso de estoque\n• Atualizações de previsão de demanda\n• Sugestões de timing para pedidos a fornecedores',
    category: 'produto-catalogo',
    colorBg: 'hsl(217 91% 95%)',
    phase: 3,
    icon: 'package',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Produto', 'Estoque', 'Alertas'],
  },

  // ── Redes Sociais (4) ─────────────────────────────────────────────────────
  {
    slug: 'social-asset-creator',
    name: 'Social Asset Creator',
    emoji: '📲',
    description: 'Criativos prontos para Instagram, Facebook e TikTok com caption e hashtags',
    detailedDescription:
      'Gera criativos completos para redes sociais, incluindo imagens, legendas e hashtags otimizados para cada plataforma.\n\nO que analisa:\n• Diretrizes de Brand DNA e identidade visual\n• Especificações de formato de cada plataforma\n• Performance de conteúdos anteriores\n• Tendências de conteúdo do segmento\n\nAções geradas:\n• Posts para feed do Instagram com legenda e hashtags\n• Criativos para Facebook Ads e posts orgânicos\n• Conteúdo otimizado para TikTok\n• Calendário de publicação com sugestões de horário',
    category: 'redes-sociais',
    colorBg: 'hsl(38 100% 95%)',
    phase: 2,
    icon: 'smartphone',
    color: '#D7733E',
    dependencies: ['brand-dna'],
    requiredConnections: [],
    tags: ['Social', 'Criativo', 'Conteúdo'],
    active: true,
  },
  {
    slug: 'video-script-creator',
    name: 'Video Script Creator',
    emoji: '🎬',
    description: 'Scripts de vídeo curto com hook validado para Reels, TikTok e Shorts',
    detailedDescription:
      'Cria scripts de vídeo curto com hooks comprovados e estrutura narrativa otimizada para cada plataforma.\n\nO que analisa:\n• Padrões de vídeos virais no segmento\n• Tom de voz e Brand DNA\n• Produtos em destaque e sazonalidade\n• Comportamento do público-alvo\n\nAções geradas:\n• Scripts de 15-60s para Reels e TikTok\n• Hooks de abertura A/B testáveis\n• Roteiros para Shorts do YouTube\n• Sugestões de música e edição por plataforma',
    category: 'redes-sociais',
    colorBg: 'hsl(0 84% 96%)',
    phase: 2,
    icon: 'video',
    color: '#E05656',
    dependencies: ['brand-dna'],
    requiredConnections: [],
    tags: ['Social', 'Vídeo', 'Conteúdo'],
    active: true,
  },
  {
    slug: 'hashtag-generator',
    name: 'Hashtag Generator',
    emoji: '#️⃣',
    description:
      'Gera conjuntos de hashtags otimizados para maximizar alcance orgânico no Instagram e TikTok',
    detailedDescription:
      'Analisa seu nicho, conteúdo e tendências da plataforma para recomendar hashtags que geram descoberta.\n\nO que analisa:\n• Tema e visual do conteúdo\n• Performance de hashtags por plataforma\n• Mix de hashtags de nicho vs gerais\n• Estratégias de hashtags dos concorrentes\n\nAções geradas:\n• Conjuntos de hashtags curados por tipo de post\n• Alertas de hashtags em tendência no seu nicho\n• Relatórios de performance de hashtags\n• Estratégias de rotação para evitar shadowban',
    category: 'redes-sociais',
    colorBg: 'hsl(217 91% 95%)',
    phase: 2,
    icon: 'hash',
    color: '#648EE9',
    dependencies: ['brand-dna'],
    requiredConnections: [],
    tags: ['Social', 'Hashtags', 'Alcance'],
  },
  {
    slug: 'influencer-finder',
    name: 'Influencer Finder',
    emoji: '🤝',
    description:
      'Identifica micro e macro influenciadores no seu nicho com métricas de engajamento autêntico',
    detailedDescription:
      'Revela parcerias com influenciadores alinhados aos valores da sua marca e demografia do público.\n\nO que analisa:\n• Sobreposição do público do influenciador com seus clientes\n• Taxa de engajamento e sinais de autenticidade\n• Alinhamento de estilo de conteúdo com o Brand DNA\n• Benchmarks de performance de parcerias anteriores\n\nAções geradas:\n• Shortlists de influenciadores ranqueados por fit score\n• Templates de mensagem de abordagem\n• Sugestões de briefing de parceria\n• Estimativas de ROI por tier de influenciador',
    category: 'redes-sociais',
    colorBg: 'hsl(142 76% 96%)',
    phase: 3,
    icon: 'users',
    color: '#5BA87B',
    dependencies: ['brand-dna'],
    requiredConnections: [],
    tags: ['Social', 'Influenciador', 'Parcerias'],
  },

  // ── Visibilidade & IA (6) ─────────────────────────────────────────────────
  {
    slug: 'brand-dna',
    name: 'Brand DNA',
    emoji: '✨',
    description: 'Brand guideline gerado em 5 min e sincronizado com tudo',
    detailedDescription:
      'A capacidade fundacional que garante que tudo seja on-brand. Extrai identidade visual, voz & tom, perfil de audiência e posicionamento de mercado da sua loja e presença social.\n\nExecução automática ao conectar sua loja. Todas as skills de geração (Copywriter, Content Engine, Campaign Generator) usam o Brand DNA como filtro de qualidade.',
    category: 'visibilidade-ia',
    colorBg: 'hsl(270 70% 96%)',
    phase: 1,
    icon: 'fingerprint',
    color: '#9B6BC4',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Foundation', 'Marca', 'Identidade'],
    isNative: true,
    active: true,
  },
  {
    slug: 'store-audit-scanner',
    name: 'Store Audit Scanner',
    emoji: '🔎',
    description: 'Escaneia sua loja por problemas de UX, gargalos de performance e gaps de SEO',
    detailedDescription:
      'Realiza auditorias completas da sua loja, identificando problemas técnicos e de UX que impactam a performance.\n\nO que analisa:\n• Velocidade de carregamento e Core Web Vitals\n• Meta tags de SEO, dados estruturados e indexação\n• Responsividade e usabilidade mobile\n• Links quebrados e erros 404\n\nAções geradas:\n• Lista priorizada de correções por gravidade de impacto\n• Recomendações de otimização de SEO\n• Tarefas de melhoria de performance\n• Checklist de conformidade com acessibilidade',
    category: 'visibilidade-ia',
    colorBg: 'hsl(217 91% 95%)',
    phase: 4,
    icon: 'search',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Auditoria', 'SEO', 'Performance'],
  },
  {
    slug: 'checkout-auditor',
    name: 'Checkout Auditor',
    emoji: '✅',
    description: 'Audita o fluxo de checkout por fricção, gaps de confiança e gatilhos de abandono',
    detailedDescription:
      'Foca especificamente na experiência de finalização de compra para maximizar a conversão no checkout.\n\nO que analisa:\n• Disponibilidade de métodos de pagamento e taxas de falha\n• Apresentação de custo e prazo de frete\n• Posicionamento de sinais de confiança (selos de segurança, políticas)\n• Fricção em campos de formulário e taxas de erro\n\nAções geradas:\n• Recomendações de simplificação do checkout\n• Sugestões de otimização de métodos de pagamento\n• Melhorias no posicionamento de sinais de confiança\n• Melhorias de transparência no frete',
    category: 'visibilidade-ia',
    colorBg: 'hsl(142 76% 96%)',
    phase: 4,
    icon: 'check-circle',
    color: '#5BA87B',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Auditoria', 'Checkout', 'Otimização'],
  },
  {
    slug: 'data-quality-guard',
    name: 'Data Quality Guard',
    emoji: '🔒',
    description:
      'Valida rastreamento, tagging e integridade de dados em plataformas de analytics e ads',
    detailedDescription:
      'Garante que sua infraestrutura de dados seja precisa e completa para que as decisões sejam baseadas em números confiáveis.\n\nO que analisa:\n• Implementação de código de rastreamento de analytics\n• Precisão de pixels de conversão\n• Consistência de parâmetros UTM\n• Discrepâncias de dados entre plataformas\n\nAções geradas:\n• Alertas e correções de erros de rastreamento\n• Relatórios de auditoria de tags\n• Recomendações de reconciliação de dados\n• Checklists de implementação para novas campanhas',
    category: 'visibilidade-ia',
    colorBg: 'hsl(0 84% 96%)',
    phase: 4,
    icon: 'shield-check',
    color: '#E05656',
    dependencies: [],
    requiredConnections: [],
    tags: ['Auditoria', 'Dados', 'Qualidade'],
  },
  {
    slug: 'weekly-briefing',
    name: 'Weekly Briefing',
    emoji: '📰',
    description: 'Gera um resumo semanal conciso de mudanças, riscos e oportunidades na sua loja',
    detailedDescription:
      'Compila os sinais mais importantes de todas as suas fontes de dados em um relatório semanal digerível.\n\nO que analisa:\n• Mudanças de métricas semana a semana\n• Novos sinais e riscos emergentes\n• Resultados de performance de automações\n• Resumo de atividade dos concorrentes\n\nAções geradas:\n• Resumo executivo com principais takeaways\n• Top 3 ações para a semana seguinte\n• Alertas de risco que requerem atenção\n• Celebração de conquistas e acompanhamento de progresso',
    category: 'visibilidade-ia',
    colorBg: 'hsl(38 100% 95%)',
    phase: 3,
    icon: 'file-text',
    color: '#D7733E',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Produtividade', 'Relatório', 'Automação'],
  },
  {
    slug: 'compliance-scanner',
    name: 'Compliance Scanner',
    emoji: '✅',
    description:
      'Verifica sua loja por problemas de conformidade legal, privacidade e acessibilidade',
    detailedDescription:
      'Revisa sua loja em relação a regulamentos de privacidade, padrões de acessibilidade e requisitos legais.\n\nO que analisa:\n• Mecanismos de consentimento LGPD e GDPR\n• Política de cookies e divulgação de rastreamento\n• Conformidade de acessibilidade (WCAG)\n• Completude de termos, política de privacidade e política de devolução\n\nAções geradas:\n• Relatórios de gap de conformidade\n• Tarefas de implementação de consentimento de cookies\n• Prioridades de correção de acessibilidade\n• Recomendações de templates de política',
    category: 'visibilidade-ia',
    colorBg: 'hsl(217 91% 95%)',
    phase: 4,
    icon: 'check-circle',
    color: '#648EE9',
    dependencies: [],
    requiredConnections: ['nuvemshop'],
    tags: ['Auditoria', 'Conformidade', 'Privacidade'],
  },
]
