export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  agentName?: string
  agentEmoji?: string
  timestamp: string
}

export interface Conversation {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  date: 'today' | 'yesterday' | 'older'
  messages: Message[]
}

export const conversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Analise de clientes inativos',
    lastMessage: 'Identifiquei 284 clientes sem compra ha 45+ dias...',
    timestamp: '14:22',
    date: 'today',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'Quais clientes estao inativos ha mais de 45 dias?',
        timestamp: '14:20',
      },
      {
        id: 'm2',
        role: 'assistant',
        content:
          'Identifiquei 284 clientes sem compra ha 45+ dias. O segmento representa R$12.600 em receita em risco.\n\nOs principais grupos:\n- 142 clientes com ticket medio acima de R$150 (prioridade alta)\n- 89 clientes com 2+ compras anteriores (potencial win-back)\n- 53 clientes com ultima compra no ultimo trimestre\n\nRecomendo uma campanha de win-back segmentada via WhatsApp para o grupo de alta prioridade. Taxa historica de recuperacao: 38%.',
        agentName: 'Customer Service',
        agentEmoji: '\u{1F4AC}',
        timestamp: '14:22',
      },
    ],
  },
  {
    id: 'conv-2',
    title: 'Desempenho de campanhas Meta Ads',
    lastMessage: "A campanha 'Verao 2024' teve o melhor ROAS...",
    timestamp: '11:30',
    date: 'today',
    messages: [
      {
        id: 'm3',
        role: 'user',
        content: 'Como estao as campanhas do Meta Ads este mes?',
        timestamp: '11:28',
      },
      {
        id: 'm4',
        role: 'assistant',
        content:
          "A campanha 'Verao 2024' teve o melhor ROAS do mes: 4.8x com custo por aquisicao de R$18.50. O investimento total foi R$3.200 com retorno de R$15.360.\n\nA campanha 'Generica - Feed' esta com ROAS de 1.9x e recomendo pausar ou realocar budget.",
        agentName: 'Ad Waste Detector',
        agentEmoji: '\u{1F6A8}',
        timestamp: '11:30',
      },
    ],
  },
  {
    id: 'conv-3',
    title: 'Top produtos da semana',
    lastMessage: 'Os 5 produtos com maior receita esta semana...',
    timestamp: '09:15',
    date: 'today',
    messages: [
      {
        id: 'm5',
        role: 'user',
        content: 'Quais sao os top produtos desta semana?',
        timestamp: '09:13',
      },
      {
        id: 'm6',
        role: 'assistant',
        content:
          'Os 5 produtos com maior receita esta semana:\n\n1. Kit Skincare Premium - R$4.200 (42 vendas)\n2. Serum Vitamina C - R$2.800 (78 vendas)\n3. Protetor Solar FPS 50 - R$2.100 (63 vendas)\n4. Mascara Hidratante - R$1.900 (54 vendas)\n5. Oleo de Rosa Mosqueta - R$1.600 (48 vendas)\n\nDestaque: Kit Skincare Premium teve 32% de aumento vs. semana anterior.',
        agentName: 'Revenue Intelligence',
        agentEmoji: '\u{1F4B9}',
        timestamp: '09:15',
      },
    ],
  },
  {
    id: 'conv-4',
    title: 'Precos dos concorrentes',
    lastMessage: 'Detectei alteracoes de preco em 3 concorrentes...',
    timestamp: '16:45',
    date: 'yesterday',
    messages: [
      {
        id: 'm7',
        role: 'user',
        content: 'Os concorrentes mudaram algum preco recentemente?',
        timestamp: '16:43',
      },
      {
        id: 'm8',
        role: 'assistant',
        content:
          "Detectei alteracoes de preco em 3 concorrentes nas ultimas 48h:\n\n- Concorrente A: reduziu 15% em eletronicos (3 SKUs)\n- Concorrente B: aumentou 8% na linha premium\n- Concorrente C: lancou promocao 'compre 2 leve 3'\n\nRecomendo ajustar precos nos 3 SKUs de eletronicos para manter competitividade.",
        agentName: 'Competitor Watch',
        agentEmoji: '\u{1F441}',
        timestamp: '16:45',
      },
    ],
  },
  {
    id: 'conv-5',
    title: 'Relatorio semanal de performance',
    lastMessage: 'Resumo da semana: receita total R$28.400...',
    timestamp: '10:00',
    date: 'yesterday',
    messages: [
      {
        id: 'm9',
        role: 'user',
        content: 'Gere o relatorio semanal',
        timestamp: '09:58',
      },
      {
        id: 'm10',
        role: 'assistant',
        content:
          'Resumo da semana:\n\n- Receita total: R$28.400 (+12% vs. semana anterior)\n- Pedidos: 342 (+8%)\n- Ticket medio: R$83 (+4%)\n- Taxa de conversao: 3.2% (+0.3pp)\n- Novos clientes: 89\n- Clientes retornantes: 253\n\nDestaques:\n- Campanha de retencao recuperou R$4.800\n- 3 oportunidades de upsell identificadas\n- NPS subiu de 72 para 76',
        agentName: 'Weekly Briefing',
        agentEmoji: '\u{1F4F0}',
        timestamp: '10:00',
      },
    ],
  },
  {
    id: 'conv-6',
    title: 'Otimizacao do checkout',
    lastMessage: 'Encontrei 4 pontos de friccao no checkout...',
    timestamp: '14:30',
    date: 'older',
    messages: [
      {
        id: 'm11',
        role: 'user',
        content: 'Analise o checkout e sugira melhorias',
        timestamp: '14:28',
      },
      {
        id: 'm12',
        role: 'assistant',
        content:
          'Encontrei 4 pontos de friccao no checkout:\n\n1. Campo de CEP sem auto-complete (34% de abandono nesta etapa)\n2. Frete nao visivel antes do checkout (18% abandonam ao ver o preco)\n3. Apenas 2 opcoes de pagamento (media do setor: 4+)\n4. Formulario nao adaptado para mobile (28% de abandono mobile)\n\nImpacto estimado da correcao: +15% na conversao do checkout.',
        agentName: 'Checkout Auditor',
        agentEmoji: '\u{1F6D2}',
        timestamp: '14:30',
      },
    ],
  },
]
