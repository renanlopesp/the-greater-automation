/**
 * Campaign Data — Seasonal Calendar Skill
 *
 * Static types and data for the Seasonal Calendar skill UI.
 * Self-contained: no external imports required.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProductTag =
  | 'best-seller'
  | 'liberar-estoque'
  | 'cross-sell'
  | 'lancamento'
  | 'alta-margem'

export interface CampaignProduct {
  name: string
  price: number
  tag: ProductTag
  stock?: number
}

export interface CampaignConcept {
  slogan: string
  description: string
  products: CampaignProduct[]
  alternates: { slogan: string; description: string }[]
}

export interface CampaignCopy {
  channel: string
  timing: string
  text: string
}

export interface CampaignAsset {
  label: string
  ratio: string
  bg: string
}

export interface CampaignVideoScript {
  title: string
  duration: string
  content: string
}

export interface CampaignTimelineItem {
  day: string
  actions: string[]
}

export interface FullCampaign {
  intro: string
  concept: CampaignConcept
  selectedProducts: CampaignProduct[]
  emailSubject: string
  emailPreview: string
  copies: CampaignCopy[]
  assets: CampaignAsset[]
  videoScripts: CampaignVideoScript[]
  timeline: CampaignTimelineItem[]
}

export interface SeasonalDate {
  id: string
  name: string
  month: string
  day: number
  date: string
  potentialValue: string
  status: 'done' | 'active' | 'ready' | 'pending'
}

// ---------------------------------------------------------------------------
// productTagConfig
// ---------------------------------------------------------------------------

export function productTagConfig(tag: ProductTag): {
  label: string
  bg: string
  color: string
} {
  switch (tag) {
    case 'best-seller':
      return {
        label: 'Best-seller',
        bg: 'var(--green-bg)',
        color: 'var(--green)',
      }
    case 'liberar-estoque':
      return {
        label: 'Liberar estoque',
        bg: 'var(--amber-bg)',
        color: 'var(--amber)',
      }
    case 'cross-sell':
      return {
        label: 'Cross-sell',
        bg: 'hsl(210 80% 93%)',
        color: 'hsl(210 70% 40%)',
      }
    case 'lancamento':
      return {
        label: 'Lançamento',
        bg: 'hsl(270 60% 93%)',
        color: 'hsl(270 60% 45%)',
      }
    case 'alta-margem':
      return {
        label: 'Alta margem',
        bg: 'var(--green-bg)',
        color: 'var(--green)',
      }
  }
}

// ---------------------------------------------------------------------------
// SEASONAL_DATES
// ---------------------------------------------------------------------------

export const SEASONAL_DATES: SeasonalDate[] = [
  {
    id: 'liquidacao-verao',
    name: 'Liquidação de Verão',
    month: 'JAN',
    day: 15,
    date: '15 jan',
    potentialValue: 'R$ 28k',
    status: 'done',
  },
  {
    id: 'carnaval',
    name: 'Carnaval',
    month: 'FEB',
    day: 28,
    date: '28 fev',
    potentialValue: 'R$ 15k',
    status: 'done',
  },
  {
    id: 'dia-do-consumidor',
    name: 'Dia do Consumidor',
    month: 'MAR',
    day: 15,
    date: '15 mar',
    potentialValue: 'R$ 32k',
    status: 'active',
  },
  {
    id: 'inicio-do-outono',
    name: 'Início do Outono',
    month: 'MAR',
    day: 20,
    date: '20 mar',
    potentialValue: 'R$ 8k',
    status: 'active',
  },
  {
    id: 'pascoa',
    name: 'Páscoa',
    month: 'APR',
    day: 20,
    date: '20 abr',
    potentialValue: 'R$ 45k',
    status: 'active',
  },
  {
    id: 'dia-das-maes',
    name: 'Dia das Mães',
    month: 'MAY',
    day: 11,
    date: '11 mai',
    potentialValue: 'R$ 78k',
    status: 'ready',
  },
  {
    id: 'dia-dos-namorados',
    name: 'Dia dos Namorados',
    month: 'JUN',
    day: 12,
    date: '12 jun',
    potentialValue: 'R$ 52k',
    status: 'pending',
  },
  {
    id: 'festa-junina',
    name: 'Festa Junina',
    month: 'JUN',
    day: 24,
    date: '24 jun',
    potentialValue: 'R$ 12k',
    status: 'pending',
  },
  {
    id: 'dia-do-bebe',
    name: 'Dia do Bebê',
    month: 'AUG',
    day: 11,
    date: '11 ago',
    potentialValue: 'R$ 18k',
    status: 'pending',
  },
  {
    id: 'dia-dos-pais',
    name: 'Dia dos Pais',
    month: 'AUG',
    day: 10,
    date: '10 ago',
    potentialValue: 'R$ 44k',
    status: 'pending',
  },
  {
    id: 'dia-do-cliente',
    name: 'Dia do Cliente',
    month: 'SEP',
    day: 15,
    date: '15 set',
    potentialValue: 'R$ 14k',
    status: 'pending',
  },
  {
    id: 'dia-das-criancas',
    name: 'Dia das Crianças',
    month: 'OCT',
    day: 12,
    date: '12 out',
    potentialValue: 'R$ 61k',
    status: 'pending',
  },
  {
    id: 'black-friday',
    name: 'Black Friday',
    month: 'NOV',
    day: 27,
    date: '27 nov',
    potentialValue: 'R$ 120k',
    status: 'pending',
  },
  {
    id: 'cyber-monday',
    name: 'Cyber Monday',
    month: 'DEC',
    day: 1,
    date: '1 dez',
    potentialValue: 'R$ 22k',
    status: 'pending',
  },
  {
    id: 'natal',
    name: 'Natal',
    month: 'DEC',
    day: 25,
    date: '25 dez',
    potentialValue: 'R$ 85k',
    status: 'pending',
  },
]

// ---------------------------------------------------------------------------
// CAMPAIGN_DATA
// ---------------------------------------------------------------------------

export const CAMPAIGN_DATA: Record<string, FullCampaign> = {
  'liquidacao-verao': {
    intro:
      'Janeiro é o mês em que mães renovam o guarda-roupa do bebê para o verão — e estão dispostas a gastar. Sua loja tem peças de verão com estoque sobrando. A estratégia certa não é fazer promoção de liquidação. É criar urgência de coleção limitada.',

    concept: {
      slogan: 'Peças que esgotam rápido. Hoje, são suas.',
      description:
        'Acesso exclusivo a peças limitadas. Sem linguagem de desconto — a narrativa é de escassez e curadoria, não de saldo. Clientes VIP têm acesso 24h antes do público geral.',
      products: [
        { name: 'Body Manga Curta', price: 89, tag: 'best-seller' },
        { name: 'Conjunto Verão Tricot', price: 189, tag: 'liberar-estoque' },
        { name: 'Sapatinho Linha Baby', price: 69, tag: 'cross-sell' },
      ],
      alternates: [
        {
          slogan: 'O verão mais bonito do bebê começa aqui.',
          description:
            'Foco emocional: a primeira memória do verão. Ideal se a base de clientes for mais jovem e conectada ao universo de maternidade lifestyle.',
        },
        {
          slogan: 'Últimas peças. Primeira vez no preço de liquidação.',
          description:
            'Abordagem mais direta com foco em preço — adequado se o público é mais sensível a desconto e a margem permite ser mais agressivo.',
        },
      ],
    },

    selectedProducts: [
      { name: 'Body Manga Curta', price: 89, tag: 'best-seller', stock: 47 },
      {
        name: 'Conjunto Verão Tricot',
        price: 189,
        tag: 'liberar-estoque',
        stock: 23,
      },
      { name: 'Sapatinho Linha Baby', price: 69, tag: 'cross-sell', stock: 61 },
      { name: 'Macacão Linho', price: 159, tag: 'alta-margem', stock: 14 },
      { name: 'Chapéu de Praia Baby', price: 49, tag: 'lancamento', stock: 38 },
    ],

    emailSubject: 'Acesso antecipado: peças de verão antes de acabar',
    emailPreview: 'Só para quem já comprou com a gente — 24h de vantagem antes do público geral.',

    copies: [
      {
        channel: 'WhatsApp VIP',
        timing: 'D-7',
        text: 'Oi, [nome]! 🌞 Você é das primeiras a saber: nossa liquidação de verão abre amanhã só para clientes VIP. Peças selecionadas a partir de R$49 — e algumas com menos de 20 unidades. Entra na lista de acesso antecipado? É só confirmar aqui.',
      },
      {
        channel: 'WhatsApp Geral',
        timing: 'D-1',
        text: 'Liquidação de Verão começa amanhã! 🛍️ Bodies, conjuntos e acessórios — tudo com preço especial por tempo limitado. Algumas peças já estão quase esgotadas. Amanhã às 10h abre para todo mundo. Fique de olho!',
      },
      {
        channel: 'Instagram Caption',
        timing: 'D-0',
        text: 'Não é promoção. É curadoria com preço de oportunidade. ☀️\n\nPeças de verão selecionadas — aquelas que a gente ama mas que precisam ir pra um novo lar antes do outono chegar.\n\nEstoque limitado. Link na bio.',
      },
      {
        channel: 'Meta Ad',
        timing: 'D-15',
        text: 'Última chance: bodies de verão a partir de R$89. Frete grátis acima de R$150. Só até domingo ou enquanto durar o estoque.',
      },
      {
        channel: 'SMS',
        timing: 'D-3',
        text: 'SNEW: Sua reserva expira em 24h. Conjunto Verão Tricot (R$189→R$149) ainda disponível. Finaliza aqui: [link]',
      },
    ],

    assets: [
      {
        label: 'Stories 9:16',
        ratio: '9:16',
        bg: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 50%, #d97706 100%)',
      },
      {
        label: 'Feed 1:1',
        ratio: '1:1',
        bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)',
      },
      {
        label: 'Banner E-mail',
        ratio: '3:1',
        bg: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
      },
      {
        label: 'Stories Meta Ad',
        ratio: '9:16',
        bg: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)',
      },
    ],

    videoScripts: [
      {
        title: 'Reels 30s',
        duration: '30 segundos',
        content:
          "0-3s: Close em tag de preço sendo virada — de R$189 para R$149.\n3-8s: Mãe abrindo caixa, bebê com o conjunto novo.\n8-15s: Slideshow rápido de 4 peças com preço na tela.\n15-22s: Detalhe do tecido, etiqueta da marca, acabamento.\n22-28s: Bebê usando a peça — sorrindo.\n28-30s: Logo + CTA: 'Só até domingo. Link na bio.'",
      },
      {
        title: 'Reels 60s',
        duration: '60 segundos',
        content:
          "0-5s: Hook — 'Essas peças sumiram do site em 3 horas. A gente repôs por último vez.'\n5-20s: Storytelling — como a coleção de verão foi criada, tecidos escolhidos.\n20-35s: Try-on com bebê real — 3 looks diferentes.\n35-45s: Mãe falando sobre qualidade (depoimento espontâneo).\n45-55s: Tela com preços e peças disponíveis.\n55-60s: CTA + urgência: 'Estoque limitado. Link na bio agora.'",
      },
    ],

    timeline: [
      {
        day: 'D-45',
        actions: [
          'Levantar estoque de peças de verão',
          'Definir quais entram na liquidação',
          'Criar lista de clientes VIP (últimas 3 compras)',
        ],
      },
      {
        day: 'D-30',
        actions: [
          'Produção de fotos e vídeos das peças selecionadas',
          'Briefing de copy para todos os canais',
          'Configurar página de acesso antecipado no site',
        ],
      },
      {
        day: 'D-15',
        actions: [
          'Subir Meta Ads com público de retargeting',
          "Disparar e-mail de 'prévia exclusiva' para lista VIP",
          'Agendar posts de aquecimento no Instagram',
        ],
      },
      {
        day: 'D-7',
        actions: [
          'WhatsApp para clientes VIP com link de acesso antecipado',
          'Ativar campanha de lookalike no Meta',
          'Publicar primeiro Reels de aquecimento',
        ],
      },
      {
        day: 'D-1',
        actions: [
          'WhatsApp para base geral — abertura amanhã',
          'Stories de contagem regressiva',
          'Verificar estoque e atualizar quantidades no site',
        ],
      },
      {
        day: 'D-Day',
        actions: [
          'Abrir vendas às 10h',
          'Publicar Reels principal + Stories com link',
          'Monitorar estoque a cada 2h e atualizar comunicação',
          'SMS para quem abandonou carrinho às 18h',
        ],
      },
    ],
  },

  'dia-das-maes': {
    intro:
      'Dia das Mães é a maior data do varejo infantil — e também a mais disputada. A diferença entre uma campanha mediana e uma que converte está na emoção. Mães não compram roupa: compram a memória de ver o filho bem vestido naquele dia especial. Sua estratégia precisa capturar isso.',

    concept: {
      slogan: 'A memória mais bonita que você pode dar pra ela.',
      description:
        'Emocional. O presente não é a roupa, é a memória. Posicionamento de presente curado — não de produto. Foco no momento: foto com a mãe, cheiro de bebê, olhar que ela vai guardar pra sempre.',
      products: [
        { name: 'Kit Presente Completo', price: 289, tag: 'best-seller' },
        { name: 'Romper Bordado', price: 149, tag: 'best-seller' },
        { name: 'Blusa Tricot Feminina', price: 169, tag: 'liberar-estoque' },
      ],
      alternates: [
        {
          slogan: 'O presente que ela não sabia que queria.',
          description:
            'Foco na surpresa — ideal para campanhas de presente de maridos/familiares comprando para a mãe. Público: adultos que não sabem o que comprar.',
        },
        {
          slogan: 'Porque ela merece ver o bebê mais lindo do mundo.',
          description:
            'Abordagem centrada no bebê — a roupa é o presente mas a satisfação é ver o filho bonito. Ressoa com avós e familiares além da mãe.',
        },
      ],
    },

    selectedProducts: [
      {
        name: 'Kit Presente Completo',
        price: 289,
        tag: 'best-seller',
        stock: 31,
      },
      { name: 'Romper Bordado', price: 149, tag: 'best-seller', stock: 58 },
      {
        name: 'Blusa Tricot Feminina',
        price: 169,
        tag: 'liberar-estoque',
        stock: 19,
      },
      { name: 'Sapatinho Couro', price: 119, tag: 'alta-margem', stock: 42 },
      { name: 'Tiara Laço Grande', price: 49, tag: 'cross-sell', stock: 87 },
    ],

    emailSubject: 'O presente que ela vai guardar na memória (e no álbum)',
    emailPreview:
      'Peças escolhidas para o Dia das Mães mais especial — com embrulho de presente grátis.',

    copies: [
      {
        channel: 'WhatsApp VIP',
        timing: 'D-10',
        text: 'Oi, [nome]! O Dia das Mães tá chegando e a gente preparou algo especial 💛 Kit presente com embrulho grátis, bodies bordados e peças que ela vai querer fotografar. Acesso antecipado pra você: [link]. Estoque bem limitado — principalmente o Kit Presente!',
      },
      {
        channel: 'WhatsApp Geral',
        timing: 'D-3',
        text: 'Dia das Mães é domingo! 🌸 Ainda dá tempo de garantir o presente perfeito. Kit Presente Completo com embrulho grátis — entrega expressa disponível. Corre: [link]',
      },
      {
        channel: 'Instagram Caption',
        timing: 'D-7',
        text: 'Ela não precisa de mais uma lembrança qualquer. 🌷\n\nEla precisa daquela foto. Daquele look. Daquele momento que vira memória afetiva pra sempre.\n\nKit Presente Dia das Mães — com embrulho especial, cartão e entrega garantida até sábado.\n\nLink na bio. Últimas unidades.',
      },
      {
        channel: 'Meta Ad',
        timing: 'D-14',
        text: 'Dia das Mães em [X] dias. Kit Presente com embrulho grátis — entrega garantida até sábado. A partir de R$149. Ver coleção: [link]',
      },
      {
        channel: 'SMS',
        timing: 'D-1',
        text: 'SNEW: Último dia! Entrega expressa até amanhã (Dia das Mães). Kit Presente ainda disponível. Garante: [link]',
      },
    ],

    assets: [
      {
        label: 'Stories 9:16',
        ratio: '9:16',
        bg: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #f9a8d4 100%)',
      },
      {
        label: 'Feed 1:1',
        ratio: '1:1',
        bg: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)',
      },
      {
        label: 'Banner E-mail',
        ratio: '3:1',
        bg: 'linear-gradient(90deg, #f472b6 0%, #ec4899 100%)',
      },
      {
        label: 'Stories Meta Ad',
        ratio: '9:16',
        bg: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
      },
    ],

    videoScripts: [
      {
        title: 'Reels 30s',
        duration: '30 segundos',
        content:
          "0-3s: Mãe abrindo caixinha com laço — expressão de surpresa.\n3-10s: Bebê com Romper Bordado no colo da mãe — close no bordado.\n10-18s: Slideshow das peças do Kit Presente com fundo neutro.\n18-25s: Mãe e bebê juntos — foto de família espontânea.\n25-28s: 'Embrulho grátis + entrega garantida até sábado'\n28-30s: Logo + 'Link na bio'",
      },
      {
        title: 'Reels 60s',
        duration: '60 segundos',
        content:
          "0-5s: Hook — 'A foto que ela vai mostrar pra todo mundo começa com essa peça.'\n5-20s: Processo de embalar o Kit Presente — papel de seda, laço, cartão escrito à mão.\n20-35s: Bebê sendo vestido no Romper Bordado — detalhes do bordado em close.\n35-48s: Sessão de fotos mãe + bebê — momentos espontâneos e emocionais.\n48-55s: Depoimento rápido: mãe recebendo o kit e reagindo.\n55-60s: CTA: 'Garante o Kit Presente. Entrega até sábado. Link na bio.'",
      },
    ],

    timeline: [
      {
        day: 'D-45',
        actions: [
          'Definir produtos do Kit Presente e embalagem',
          'Produção de fotos e vídeo temático mãe + bebê',
          'Criar página de destino dedicada ao Dia das Mães',
        ],
      },
      {
        day: 'D-30',
        actions: [
          'Configurar entrega expressa com prazo garantido',
          'Briefing de copy para todos os canais',
          'Criar segmentação de clientes: compraram no ano passado',
        ],
      },
      {
        day: 'D-14',
        actions: [
          'Ativar Meta Ads — objetivo conversão, público frio',
          "Disparar e-mail de 'presente perfeito' para base completa",
          'Publicar primeiro Reels de aquecimento',
        ],
      },
      {
        day: 'D-7',
        actions: [
          'WhatsApp VIP com acesso antecipado ao Kit',
          'Aumentar orçamento de Meta Ads',
          'Stories diários de countdown',
        ],
      },
      {
        day: 'D-3',
        actions: [
          'WhatsApp geral com urgência de entrega',
          'Reels principal no ar',
          'Ativar opção de entrega expressa no checkout',
        ],
      },
      {
        day: 'D-Day',
        actions: [
          'Post comemorativo — Feliz Dia das Mães',
          'Stories com fotos de clientes (repost UGC)',
          'WhatsApp de agradecimento para quem comprou',
          'Iniciar planejamento da próxima data',
        ],
      },
    ],
  },

  pascoa: {
    intro:
      'Páscoa é uma data profundamente emocional para famílias com bebês e crianças pequenas. A primeira Páscoa, a foto com a roupa de coelhinho, o registro que vai no álbum de família — esse é o produto real que você está vendendo. Posicione como momento, não como roupa.',

    concept: {
      slogan: 'A roupa da foto que ela vai guardar pra sempre.',
      description:
        'Primeira Páscoa como momento instagramável. A peça não é roupa — é o cenário da memória. Mães que compram para a Páscoa já estão pensando na foto; a copy confirma essa intenção e elimina a hesitação.',
      products: [
        {
          name: 'Romper Orelha Peludinha',
          price: 139,
          tag: 'best-seller',
        },
        { name: 'Touca Coelhinho', price: 49, tag: 'cross-sell' },
        { name: 'Body Páscoa Básico', price: 79, tag: 'liberar-estoque' },
      ],
      alternates: [
        {
          slogan: 'Coelhinho de verdade não precisa de chocolate.',
          description:
            'Tom mais lúdico e bem-humorado — funciona melhor em Stories e Reels. Público mais jovem, primeira maternidade, amantes de aesthetics de bebê.',
        },
        {
          slogan: 'O look da Páscoa que vai parar no feed de todo mundo.',
          description:
            'Social-proof antecipado — você está comprando um look que vai viralizar. Ressoa com mães que compartilham muito nas redes sociais.',
        },
      ],
    },

    selectedProducts: [
      {
        name: 'Romper Orelha Peludinha',
        price: 139,
        tag: 'best-seller',
        stock: 44,
      },
      { name: 'Touca Coelhinho', price: 49, tag: 'cross-sell', stock: 92 },
      {
        name: 'Body Páscoa Básico',
        price: 79,
        tag: 'liberar-estoque',
        stock: 33,
      },
      { name: 'Meia Antiderrapante', price: 29, tag: 'cross-sell', stock: 120 },
      {
        name: 'Sapatinho Lacinho',
        price: 89,
        tag: 'alta-margem',
        stock: 27,
      },
    ],

    emailSubject: 'A foto de Páscoa mais fofa da sua timeline',
    emailPreview:
      'Romper Orelha Peludinha + Touca Coelhinho — looks prontos para o clique perfeito.',

    copies: [
      {
        channel: 'WhatsApp VIP',
        timing: 'D-14',
        text: 'Oi, [nome]! Chegaram os looks de Páscoa 🐰 O Romper Orelha Peludinha tá lindo — e tem poucas unidades. Separei acesso antecipado pra você antes de abrir pro público. Dá uma olhada: [link]. A foto vai ficar incrível! 🌸',
      },
      {
        channel: 'WhatsApp Geral',
        timing: 'D-5',
        text: 'Páscoa chegando e os looks de coelhinho já estão esgotando! 🐣 Romper Orelha Peludinha + Touca Coelhinho — o duo perfeito para a foto mais fofa do ano. Entrega garantida antes do domingo de Páscoa: [link]',
      },
      {
        channel: 'Instagram Caption',
        timing: 'D-10',
        text: 'Ela vai crescer. A foto fica pra sempre. 🐰\n\nRomper Orelha Peludinha — feito pra ser o look da Páscoa que você vai mostrar pra todo mundo por anos.\n\nEstoque limitado. Entrega garantida antes do domingo.\n\nLink na bio 🌸',
      },
      {
        channel: 'Meta Ad',
        timing: 'D-20',
        text: 'Páscoa em [X] dias. Look de coelhinho com entrega garantida. Romper Orelha Peludinha a partir de R$139. Kit completo disponível. Ver looks: [link]',
      },
      {
        channel: 'SMS',
        timing: 'D-2',
        text: 'SNEW: Último dia com entrega garantida pra Páscoa! Romper Orelha Peludinha ainda disponível — só até hoje à meia-noite. Garante: [link]',
      },
    ],

    assets: [
      {
        label: 'Stories 9:16',
        ratio: '9:16',
        bg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%)',
      },
      {
        label: 'Feed 1:1',
        ratio: '1:1',
        bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)',
      },
      {
        label: 'Banner E-mail',
        ratio: '3:1',
        bg: 'linear-gradient(90deg, #34d399 0%, #10b981 100%)',
      },
      {
        label: 'Stories Meta Ad',
        ratio: '9:16',
        bg: 'linear-gradient(135deg, #10b981 0%, #065f46 100%)',
      },
    ],

    videoScripts: [
      {
        title: 'Reels 30s',
        duration: '30 segundos',
        content:
          "0-3s: Close nas orelhinhas peludinhas do Romper — câmera lenta.\n3-10s: Bebê sendo vestido — mãe colocando a Touca Coelhinho.\n10-18s: Bebê 'descobrindo' as próprias orelhas — reação fofa.\n18-25s: Mini sessão de fotos — vários ângulos, momentos espontâneos.\n25-28s: 'Entrega garantida antes da Páscoa. Estoque limitado.'\n28-30s: Logo + 'Link na bio 🐰'",
      },
      {
        title: 'Reels 60s',
        duration: '60 segundos',
        content:
          "0-5s: Hook — 'Essa é a foto que ela vai mostrar pra todo mundo quando crescer.'\n5-18s: Unboxing do Romper + Touca — detalhe na pelúcia das orelhas, qualidade do tecido.\n18-32s: Vestindo o bebê — passo a passo, close nos detalhes.\n32-45s: Sessão de fotos improvisada em casa — luz natural, momentos reais.\n45-55s: Mãe olhando a foto tirada — 'Ficou perfeito!'\n55-60s: CTA: 'Garante o look de Páscoa. Entrega até sexta. Link na bio.'",
      },
    ],

    timeline: [
      {
        day: 'D-45',
        actions: [
          'Definir coleção de Páscoa — peças, cores, kits',
          'Produção fotográfica temática (bebê + elementos de Páscoa)',
          'Criar página de coleção dedicada no site',
        ],
      },
      {
        day: 'D-30',
        actions: [
          'Briefing completo de copy para todos os canais',
          'Configurar kits de presente (Romper + Touca + embrulho)',
          'Planejar sequência de posts de aquecimento',
        ],
      },
      {
        day: 'D-20',
        actions: [
          'Ativar Meta Ads — campanha de awareness com looks',
          'Primeiro e-mail para base completa',
          'Publicar Reels de introdução da coleção',
        ],
      },
      {
        day: 'D-10',
        actions: [
          'WhatsApp VIP — acesso antecipado',
          'Instagram Caption principal no ar',
          'Aumentar budget Meta Ads para conversão',
        ],
      },
      {
        day: 'D-5',
        actions: [
          'WhatsApp geral com urgência de estoque',
          'Stories diários com countdown',
          'Reels principal + Reels 60s no ar',
        ],
      },
      {
        day: 'D-Day',
        actions: [
          'Post de Feliz Páscoa — conteúdo comemorativo',
          'Repost de UGC: fotos de bebês com os looks',
          'Encerrar campanhas pagas após o domingo',
          'Analisar resultados e documentar aprendizados',
        ],
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

export function getCampaignData(dateIdOrName: string): FullCampaign | null {
  // Try direct id lookup first
  if (CAMPAIGN_DATA[dateIdOrName]) {
    return CAMPAIGN_DATA[dateIdOrName]
  }

  // Try matching by name from SEASONAL_DATES
  const match = SEASONAL_DATES.find((d) => d.name.toLowerCase() === dateIdOrName.toLowerCase())
  if (match && CAMPAIGN_DATA[match.id]) {
    return CAMPAIGN_DATA[match.id]
  }

  return null
}

export function getSeasonalDates(): SeasonalDate[] {
  return SEASONAL_DATES
}
