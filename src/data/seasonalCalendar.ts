export interface SeasonalDate {
  id: string;
  label: string;
  date: string;
  month: string;
  daysUntil: number | null;
  status: 'urgente' | 'preparando' | 'planejado' | 'concluido';
  potential: string;
  description: string;
  quote?: string;
  sections?: { label: string; id: string }[];
  actions?: { label: string; status: 'concluido' | 'pendente' }[];
  continueWith: string[];
}

export interface SeasonalCalendarData {
  title: string;
  subtitle: string;
  description: string;
  potentialTotal: string;
  dates: SeasonalDate[];
}

export const seasonalCalendar: SeasonalCalendarData = {
  title: 'Calendário Sazonal 2026',
  subtitle: '10 datas · 3 precisam de ação imediata',
  description: 'Datas sazonais priorizadas para a Milkes, com potencial estimado de receita e status de preparação.',
  potentialTotal: 'R$ 548k',

  dates: [
    {
      id: 'pascoa',
      label: 'Páscoa',
      date: '5 Abr',
      month: 'Abr',
      daysUntil: 7,
      status: 'urgente',
      potential: 'R$ 28k',
      description: 'Faltam 7 dias. Ainda dá tempo — mas só se agir agora.\n\nPáscoa pra Milkes não é sobre chocolate. É sobre o primeiro coelhinho do bebê, a foto que a vovó vai guardar pra sempre, a peça que fica na memória muito depois que o chocolate acaba.\n\nO problema: quem compra Milkes nessa época deixa pra última hora. Eles precisam saber que ainda chega antes do domingo.\n\nUma campanha de urgência com prazo de entrega claro converte muito bem. Não é necessário desconto — é necessário clareza.',
      quote: 'O primeiro coelhinho dela. Em tricô. Com o nome bordado.',
      actions: [
        { label: 'Campanha Instagram com contagem regressiva', status: 'pendente' },
        { label: 'E-mail para base: "Ainda dá tempo"', status: 'pendente' },
        { label: 'WhatsApp VIP com prazo de entrega garantido', status: 'pendente' },
      ],
      sections: [
        { label: 'Produtos em destaque · 3', id: 'produtos' },
        { label: 'Copies · 3 canais', id: 'copies' },
        { label: 'Prazo de entrega garantido', id: 'prazo' },
      ],
      continueWith: [
        'Criar copy urgência Páscoa para Instagram',
        'Ver produtos com entrega garantida até Páscoa',
        'Ativar campanha de WhatsApp para VIPs',
      ],
    },
    {
      id: 'dia-das-maes',
      label: 'Dia das Mães',
      date: '11 Mai',
      month: 'Mai',
      daysUntil: 45,
      status: 'preparando',
      potential: 'R$ 78k',
      description: 'Essa é a data. A maior do ano pra Milkes.\n\nAvós, tias e madrinhas não compram roupa. Elas compram um momento — o primeiro Dia das Mães dela como mãe, o primeiro do neném. E uma peça tricô com o nome bordado entrega exatamente isso.\n\nTicket médio nessa data: R$ 312. Quase o dobro do mês anterior. A janela mais quente: D-14 até D-3. É quando as decisões acontecem.\n\nConceito, copies, assets e timeline já estão prontos.',
      quote: 'A memória mais bonita que você pode dar pra ela.',
      sections: [
        { label: 'Os que mais vendem nessa data · 5', id: 'produtos' },
        { label: 'E-mail VIP · template pronto pra disparar', id: 'email' },
        { label: 'Copies · Instagram, WhatsApp, E-mail, SMS, Google Ads', id: 'copies' },
        { label: 'Assets · 4 criativos prontos pra publicar', id: 'assets' },
        { label: 'Script Reels · hook testado + versão curta', id: 'script' },
        { label: 'Timeline D-45 · o que fazer em cada semana', id: 'timeline' },
      ],
      continueWith: [
        'Ver copies para todos os canais',
        'Gerar assets visuais da campanha',
        'Editar o conceito criativo',
        'Ver timeline completa',
      ],
    },
    {
      id: 'dia-dos-namorados',
      label: 'Dia dos Namorados',
      date: '12 Jun',
      month: 'Jun',
      daysUntil: 78,
      status: 'planejado',
      potential: 'R$ 22k',
      description: 'O contexto que converte: ele quer dar um presente diferente.\n\nNão uma flor. Não um perfume. Algo que mostre que entendeu o momento mais importante da vida dela — o bebê que chegou.\n\nUma peça Milkes com o nome do filho, dada pelo pai no Dia dos Namorados. Isso é o presente que ela conta pra sempre.\n\nÂngulo: "o presente que ela não esperava, mas que vai amar".',
      quote: 'Ele não sabia o que dar. Até descobrir a Milkes.',
      sections: [
        { label: 'Copies · 3 canais', id: 'copies' },
        { label: 'Timeline · D-78', id: 'timeline' },
      ],
      continueWith: [
        'Criar copies para Dia dos Namorados',
        'Ver produtos indicados para presente de casal',
        'Definir oferta de kit presente',
      ],
    },
    {
      id: 'nascimento-cha-revelacao',
      label: 'Nascimento & Chá de Revelação',
      date: 'Ano todo',
      month: 'Contínuo',
      daysUntil: null,
      status: 'preparando',
      potential: 'R$ 64k',
      description: 'Essa não tem data no calendário — mas é o que mais vende.\n\nTodo mês alguém na base da Milkes tem um bebê chegando, ou vai num chá de revelação, ou quer dar o presente mais bonito do chá de bebê. Esse fluxo não para.\n\nBody personalizado com nome e saída maternidade são os mais presenteados do ano inteiro. E quem comprou uma vez como presente geralmente volta pra comprar pra si mesma.\n\nEsse é o produto de entrada. A primeira Milkes.',
      quote: 'Cada nascimento é uma estreia. A peça tem que estar à altura.',
      sections: [
        { label: 'Kit saída maternidade', id: 'kit-maternidade' },
        { label: 'Body personalizado com nome', id: 'body' },
        { label: 'Manta maternidade', id: 'manta' },
        { label: 'Copies evergreen · 4 canais', id: 'copies' },
      ],
      continueWith: [
        'Ver copies evergreen para nascimentos',
        'Criar campanha de chá de bebê',
        'Ver produtos mais presenteados',
      ],
    },
    {
      id: 'dia-dos-pais',
      label: 'Dia dos Pais',
      date: '14 Ago',
      month: 'Ago',
      daysUntil: 141,
      status: 'planejado',
      potential: 'R$ 31k',
      description: 'Quem presenteia o pai de bebê?\n\nA vovó. A tia. A madrinha. E às vezes a mãe, que quer dar algo especial pro primeiro Dia dos Pais dele.\n\nO ângulo que funciona: o presente é pra o bebê, mas emociona o pai. Uma peça com o nome do filho no dia que ele comemora ser pai pela primeira vez. Não tem como errar.\n\nKit pai + bebê tem ticket médio 35% acima do produto avulso.',
      quote: 'Papai de bebê merece um presente à altura desse amor novo.',
      sections: [
        { label: 'Kit pai + bebê · 2 opções', id: 'kit' },
        { label: 'Copies · 3 canais', id: 'copies' },
        { label: 'Timeline · D-141', id: 'timeline' },
      ],
      continueWith: [
        'Criar copies para Dia dos Pais',
        'Ver kits pai + bebê',
        'Definir produtos em destaque',
      ],
    },
    {
      id: 'dia-das-avos',
      label: 'Dia das Avós',
      date: '26 Jul',
      month: 'Jul',
      daysUntil: 122,
      status: 'planejado',
      potential: 'R$ 18k',
      description: 'A avó é a melhor cliente da Milkes.\n\nE no Dia das Avós, ela vira o presente. O neto presenteia ela com uma peça que tem o nome dele bordado — que ela vai usar, guardar, mostrar pra todo mundo.\n\nInversão total do fluxo. Em vez de "avó que compra pra neto", vira "pai/mãe que presenteia a avó com memória do neto".\n\nAlta conversão porque a decisão é emocional e rápida. Sobreposição com a base compradora do Dia das Mães — re-engajar essa lista.',
      quote: 'Ela ajudou a criar. Merece uma memória pra chamar de sua.',
      sections: [
        { label: 'Copies · 3 canais', id: 'copies' },
        { label: 'E-mail para base de avós compradoras', id: 'email' },
      ],
      continueWith: [
        'Criar campanha para Dia das Avós',
        'Ver lista de compradores frequentes (avós)',
        'Criar copy emocional de avó + neto',
      ],
    },
    {
      id: 'dia-dos-avos',
      label: 'Dia dos Avós',
      date: '26 Jul',
      month: 'Jul',
      daysUntil: 122,
      status: 'planejado',
      potential: 'R$ 14k',
      description: 'Mesma data que Dia das Avós. Oportunidade de campanha unificada "Vovó e Vovô" com dois ângulos distintos: a avó que presenteia, e o neto que presenteia os avós. Kit com peça do bebê para os dois.',
      quote: 'Vovô também merece guardar essa memória.',
      sections: [
        { label: 'Kit avós · presente duplo', id: 'kit' },
        { label: 'Copies · 2 canais', id: 'copies' },
      ],
      continueWith: [
        'Criar campanha unificada Avós',
        'Ver kit presente para os dois avós',
      ],
    },
    {
      id: 'dia-das-criancas',
      label: 'Dia das Crianças',
      date: '12 Out',
      month: 'Out',
      daysUntil: 197,
      status: 'planejado',
      potential: 'R$ 24k',
      description: 'Essa é a última grande data antes do Natal.\n\nE é a data em que o cliente mais sente urgência emocional: "ela ainda cabe nessa fase". Bebês crescem rápido demais. A Milkes vende exatamente isso — a fase que passa.\n\nAvós, padrinhos e tios buscam o presente mais bonito. Suéter e body personalizado com nome são os campeões de venda.\n\nÂngulo que funciona: "aproveite enquanto ela ainda cabe".',
      quote: 'Ela ainda é pequena o suficiente pra usar Milkes. Aproveite.',
      sections: [
        { label: 'Produtos em destaque · 4', id: 'produtos' },
        { label: 'Copies · 3 canais', id: 'copies' },
        { label: 'Timeline · D-197', id: 'timeline' },
      ],
      continueWith: [
        'Criar copies para Dia das Crianças',
        'Ver produtos para bebês de 1 a 3 anos',
        'Definir kit presente',
      ],
    },
    {
      id: 'black-friday',
      label: 'Black Friday',
      date: '27 Nov',
      month: 'Nov',
      daysUntil: 242,
      status: 'planejado',
      potential: 'R$ 52k',
      description: 'Aqui a estratégia é diferente das outras marcas — e tem que ser.\n\nDesconto em peça artesanal e personalizada deprecia o que a Milkes levou anos pra construir. A proposta não é baratear. É criar escassez e exclusividade.\n\nEstratégia recomendada:\n— Acesso antecipado pra clientes VIP (D-3)\n— Frete grátis sem mínimo por 48h\n— Kit presente exclusivo Black Friday com embalagem especial\n— Nunca desconto direto no produto\n\nQuem compra Milkes na Black Friday não estava esperando desconto. Estava esperando uma razão pra comprar.',
      quote: 'Black Friday da Milkes: não é desconto. É acesso.',
      sections: [
        { label: 'Estratégia: sem desconto no produto', id: 'estrategia' },
        { label: 'Oferta VIP: acesso antecipado', id: 'vip' },
        { label: 'Kit presente exclusivo Black Friday', id: 'kit' },
        { label: 'Timeline · D-242', id: 'timeline' },
      ],
      continueWith: [
        'Definir estratégia de Black Friday',
        'Criar oferta VIP de acesso antecipado',
        'Ver kit exclusivo Black Friday',
        'Ver timeline detalhada',
      ],
    },
    {
      id: 'natal',
      label: 'Natal',
      date: '25 Dez',
      month: 'Dez',
      daysUntil: 270,
      status: 'planejado',
      potential: 'R$ 98k',
      description: 'Parece longe. Não é.\n\nNatal é a segunda maior data da Milkes — e a que mais exige planejamento antecipado. Toda a família presenteia o bebê ao mesmo tempo: avós, tios, padrinhos, amigos. O risco de estoque estourar é real. Quem planejou em setembro vendeu em dezembro. Quem deixou pra outubro ficou sem produto.\n\nColeção temática + kit presente + comunicação em camadas (D-60, D-30, D-7, D-1). Ticket médio no Natal: 60% acima da média anual.',
      quote: 'O primeiro Natal dele tem que ter uma peça que vai durar pra sempre.',
      sections: [
        { label: 'Coleção Natal · 6 peças', id: 'colecao' },
        { label: 'Kit presente Natal', id: 'kit' },
        { label: 'Copies · 5 canais', id: 'copies' },
        { label: 'Timeline · D-270', id: 'timeline' },
        { label: 'Planejamento de estoque', id: 'estoque' },
      ],
      continueWith: [
        'Ver briefing de Natal',
        'Planejar kits e combos',
        'Criar copies natalinas',
        'Ver calendário de conteúdo',
      ],
    },
  ],
};
