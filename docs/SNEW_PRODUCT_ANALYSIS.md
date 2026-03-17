# Snew -- Analise Completa do Produto

## 1. Visao Geral

### O que e o Snew

Snew e uma plataforma de automacao inteligente para e-commerce que opera por meio de **co-workers de IA especializados**. Diferente de ferramentas tradicionais que oferecem funcionalidades isoladas (um chatbot aqui, um dashboard la), o Snew cria uma equipe completa de agentes autonomos que trabalham 24/7 monitorando, analisando e agindo sobre os dados da loja do usuario.

Cada co-worker tem uma especialidade -- atendimento ao cliente, analise de vendas, monitoramento de concorrentes, otimizacao de marketing -- e todos compartilham o mesmo ecossistema de dados, permitindo inteligencia cruzada que seria impossivel com ferramentas separadas.

### Proposta de Valor Central

**"Sua equipe de especialistas que nunca dorme."**

O Snew transforma operacoes de e-commerce que normalmente exigem 4-6 profissionais dedicados (analista de dados, atendente, gestor de marketing, comprador, gerente de estoque) em automacoes inteligentes operadas por co-workers de IA. O resultado: decisoes mais rapidas, zero tarefas repetitivas, e oportunidades que nunca seriam detectadas manualmente.

Metricas de impacto observadas:

- **R$4.200/dia** em receita recuperada via reengajamento automatico de carrinhos
- **156 tickets/dia** respondidos sem intervencao humana, com 94% de satisfacao
- **~3 horas/dia** economizadas vs. analise manual
- **Tempo de resposta de 2 minutos** no atendimento (vs. media de 24h+ no setor)

### Modelo de Operacao

O Snew opera com um modelo de **orquestracao central + especialistas**:

1. **Orquestrador (Snew)** -- Agente central que recebe qualquer pergunta do usuario e direciona ao especialista certo ou responde diretamente. Funciona como o "gerente" da equipe de co-workers.
2. **Estoquista** -- Monitora estoque, alerta sobre produtos acabando, planeja reposicoes.
3. **Vigia de Preco** -- Acompanha precos dos concorrentes e alerta sobre oportunidades de precificacao.
4. **Analista de Vendas** -- Gera relatorios de vendas, resumos diarios e analises financeiras.
5. **Atendente** -- Responde clientes, cria respostas padrao e gerencia comunicacao.

Alem dos 5 agentes provisionados automaticamente, o usuario tem acesso a um catalogo de **27 co-workers especializados** que podem ser ativados conforme necessidade.

### Como Funciona na Pratica

1. **Onboarding** -- O usuario conecta sua plataforma de e-commerce (Shopify ou Nuvemshop), seleciona o segmento da loja (roupas, eletronicos, alimentos, etc.) e escolhe prioridades (controle de estoque, resumo de vendas, monitoramento de concorrencia).
2. **Provisionamento automatico** -- O sistema cria 4 agentes especializados + 1 orquestrador, cada um com knowledge skills customizadas para o segmento da loja e workflows pre-configurados com triggers automaticos.
3. **Operacao continua** -- Os co-workers comecam a trabalhar imediatamente: monitorando estoque a cada 6h, enviando resumos diarios de vendas as 21h, alertando sobre novos pedidos a cada hora -- tudo via Telegram.
4. **Dashboard inteligente** -- O usuario acompanha tudo pelo dashboard com greeting personalizado, metricas em tempo real, co-workers em acao, oportunidades detectadas e AskBar para perguntas livres.

---

## 2. Produto e Features

### 2.1 Co-Workers (Agentes de IA)

O Snew oferece um catalogo de 27 co-workers organizados em 6 categorias, cada um projetado para resolver problemas especificos do e-commerce.

#### Customer Service (6 agentes)

**Customer Service Agent** -- O co-worker de atendimento principal. Detecta clientes em risco e automatiza outreach personalizado via WhatsApp e Email. Analisa atrasos de entrega, padroes de reembolso, oportunidades de review pos-entrega, segmentos de clientes inativos e scores NPS. Resultados tipicos: reducao de 20-35% na taxa de reembolso e aumento de 15-25% na taxa de recompra.

**Upsell & Retention Agent** -- Identifica oportunidades de cross-sell e upsell baseadas em historico de compras e comportamento de navegacao. Gera recomendacoes personalizadas de produtos, ofertas de bundles e upgrade para compradores recorrentes, e sequencias de upsell pos-compra. Resultado tipico: aumento de 15-30% no ticket medio.

**Review & Reputation Agent** -- Automatiza coleta de reviews e monitora sentimento da marca. Solicita reviews no momento certo (pos-entrega), alerta sobre reviews negativos em tempo real e responde automaticamente com contexto. Resultado tipico: aumento de 40-60% no volume de reviews e nota media de 4.7 estrelas.

**Churn Prediction Agent** -- Preve quais clientes estao prestes a sair usando sinais comportamentais: queda na frequencia de compra, reducao de engajamento com emails, tendencia de sentimento em tickets de suporte. Gera alertas antecipados para clientes de alto valor e inicia sequencias automaticas de win-back. Resultado tipico: reducao de 25-40% no churn evitavel.

**VIP Relationship Agent** -- Gerencia relacionamento com os 20% de clientes que geram 60% da receita. Identifica e segmenta VIPs, envia ofertas exclusivas e acesso antecipado, celebra aniversarios e marcos de compra. Resultado tipico: aumento de 20-35% na retencao VIP e frequencia de compra 3x maior.

**Sentiment Intelligence Agent** -- Analisa sentimento do cliente em todos os touchpoints -- tickets de suporte, reviews, redes sociais e pesquisas. Mapeia sentimento em tempo real, detecta crises em menos de 1 hora e dispara campanhas de amplificacao de sentimento positivo. Resultado tipico: reducao de 28% em reclamacoes em 60 dias.

#### Marketing (5 agentes)

**Conversion Optimizer** -- Analisa continuamente paginas de produto, fluxo de checkout e messaging para identificar pontos de friccao. Executa diagnosticos de UX, sugere testes A/B para paginas de alto impacto e reescreve CTAs com baixa performance. Resultado tipico: melhoria de 10-25% na taxa de conversao em 30 dias.

**Retention Booster** -- Identifica riscos de churn e sugere fluxos de retencao. Analisa padroes de frequencia e recencia de compra, taxas de abertura de email e dados de devolucao. Gera sequencias de win-back por email, recomendacoes de programa de fidelidade e estrategias de oferta personalizadas. Resultado tipico: aumento de 28% no ticket medio.

**Ad Waste Detector** -- Monitora campanhas publicitarias no Meta Ads e Google Ads para identificar desperdicio de budget. Detecta campanhas com custo sem retorno, recomenda realocacao de budget e alerta sobre fadiga criativa. Resultado tipico: reducao de 20-40% em gasto desperdicado e ROAS medio de 2.4x.

**Content Engine** -- Monitora tendencias, conteudo de concorrentes e engajamento do publico para gerar estrategias de conteudo. Cria calendario editorial automatico, copies prontos para cada canal e sugestoes de blog posts otimizados para SEO. Resultado tipico: 30 posts gerados por semana e aumento de 65% no engajamento organico.

**Email Performance Agent** -- Otimiza campanhas de email analisando taxas de abertura e clique por segmento, performance de subject lines, otimizacao de horario de envio e triggers de descadastro. Resultado tipico: melhoria de 4x na taxa de conversao de email e reducao de 45% em descadastros.

#### Competitors (4 agentes)

**Competitor Watch** -- Monitora presenca digital dos concorrentes, rastreando mudancas de preco, messaging, criativos de ads e lancamentos de produto. Alerta imediato sobre mudancas criticas em menos de 1 hora. Gera relatorios competitivos semanais e recomendacoes de counter-messaging.

**Pricing Intelligence** -- Monitora precos dos concorrentes em tempo real, SKU por SKU. Utiliza o sistema de price monitors que automaticamente cria workflows agendados (a cada 4-6h) para scraping de URLs, extracao de preco, salvamento em historico e alerta via Telegram quando precos mudam alem do threshold. Resultado tipico: otimizacao de margem de +12% com preco dinamico por SKU e margem minima protegida.

**Market Gap Finder** -- Identifica nichos mal atendidos e gaps de produto analisando catalogos de concorrentes, demanda de busca vs. oferta disponivel e reclamacoes em reviews de clientes. Resultado tipico: 3-5 oportunidades identificadas por analise com forecasts de demanda para novas oportunidades.

**Share of Voice Tracker** -- Mede visibilidade da marca vs. concorrentes em busca organica, share de impressao de ads pagos, volume de mencoes em redes sociais e comparacao de alcance de conteudo. Resultado tipico: visibilidade organica 3x maior e ranking monitorado diariamente vs. 5 concorrentes.

#### Analytics (4 agentes)

**Revenue Intelligence** -- Agrega dados de multiplas fontes para surfar insights acionaveis de receita. Analisa tendencias de receita por produto, canal e segmento, custo de aquisicao e periodos de payback, padroes sazonais e oportunidades de cross-sell. Resultado tipico: +18% de receita incremental e identificacao de 3 segmentos de oportunidades ocultas.

**Cohort Analyzer** -- Segmenta clientes por data de aquisicao e rastreia comportamento ao longo do tempo: curvas de retencao, receita por coorte, qualidade de coorte por canal e impacto de aquisicao sazonal. Resultado tipico: LTV real calculado por grupo de aquisicao e antecipacao de coortes em queda em -22%.

**Funnel Diagnostics** -- Mapeia toda a jornada do cliente da primeira visita ate a compra, identificando os maiores vazamentos: taxas de conversao step-by-step, padroes de drop-off por device/segmento/source, metricas de engajamento por pagina. Resultado tipico: +22% de conversao pos-diagnostico com mapa completo do funil etapa a etapa.

**Attribution Mapper** -- Vai alem do ultimo clique para mostrar quais canais realmente geram receita, usando 7 modelos de atribuicao comparados. Mapeia jornadas multi-touch, identifica canais assistentes vs. conversores e gera scorecards de ROI por canal. Resultado tipico: +18% de ROI de marketing e revelacao do canal real de conversao.

#### Audit (4 agentes)

**Store Audit Scanner** -- Auditoria abrangente da loja em 47 pontos: velocidade de pagina e Core Web Vitals, meta tags SEO e dados estruturados, responsividade mobile e links quebrados. Resultado tipico: relatorio completo em menos de 24h com +15% de performance pos-correcao.

**Checkout Auditor** -- Foco especifico na experiencia de conclusao de compra: disponibilidade e taxas de falha de metodos de pagamento, apresentacao de custo de frete, posicionamento de sinais de confianca e friccao em campos de formulario. Resultado tipico: reducao de 10-20% no abandono de carrinho e 30+ pontos de friccao mapeados.

**Data Quality Guard** -- Garante que a infraestrutura de dados e precisa e completa: implementacao de codigos de tracking, acuracia de pixels de conversao, consistencia de parametros UTM e discrepancias entre plataformas. Resultado tipico: 100% de precisao de rastreamento e zero conversoes duplicadas.

**Compliance Scanner** -- Verifica a loja contra regulamentacoes de privacidade (LGPD/RGPD), padroes de acessibilidade (WCAG) e requisitos legais. Resultado tipico: relatorio completo de compliance em menos de 24h com checklist de acessibilidade.

#### Productivity (4 agentes)

**Task Prioritizer** -- Ranqueia o backlog de otimizacao por impacto estimado em receita e esforco de implementacao. Identifica quick wins, gera listas de tarefas ranqueadas por impacto e sugere areas de foco semanal. Resultado tipico: foco 3x maior nas tarefas certas e +40% de velocidade de execucao.

**Weekly Briefing Agent** -- Compila os sinais mais importantes de todas as fontes de dados em um relatorio semanal conciso: mudancas week-over-week, novos sinais e riscos emergentes, resultados de automacoes e resumo de atividade competitiva. Resultado tipico: informar-se em 5 minutos por semana sem perder nenhum sinal critico.

**Workflow Automator** -- Identifica tarefas manuais repetitivas e cria workflows automatizados. Conecta ferramentas automaticamente, cria fluxos personalizados e configura alertas e notificacoes. Resultado tipico: 8 horas economizadas por semana e reducao de 90% em tarefas manuais repetitivas.

**Inventory Alerts Agent** -- Monitora niveis de estoque contra velocidade de vendas para garantir gestao otima de inventario. Alerta D-7 de antecedencia antes de stockouts, monitora giro por SKU e gera previsoes de demanda. Resultado tipico: reducao de 95% em ruptura de estoque.

#### Integracao Entre Co-Workers

Os co-workers nao operam isoladamente -- eles compartilham contexto e se complementam:

- O **Competitor Watch** detecta uma mudanca de preco --> o **Pricing Intelligence** calcula o impacto na margem --> o **Task Prioritizer** prioriza a acao
- O **Customer Service Agent** detecta aumento de reclamacoes --> o **Sentiment Intelligence** mapeia a causa --> o **Store Audit Scanner** audita o ponto de friccao
- O **Revenue Intelligence** identifica queda em segmento --> o **Cohort Analyzer** isola a coorte afetada --> o **Churn Prediction** inicia retencao preventiva

### 2.2 Dashboard Inteligente

O dashboard e o centro nervoso do Snew, projetado para dar visibilidade completa em menos de 30 segundos.

**Greeting Personalizado** -- O sistema gera saudacoes contextuais baseadas no dia da semana, horario e nome do usuario. Na segunda de manha: "Nova semana. Seus agentes ja estao trabalhando." No sabado a noite: "20h. Pico de compras em 2 horas. Tudo pronto." Cada saudacao e acompanhada de um subtitulo contextual que informa o que aconteceu desde a ultima visita.

**Metricas em Tempo Real** -- Cards de metricas mostram: agentes ativos agora (com indicador "Live" pulsante), receita recuperada hoje, carrinhos salvos, perguntas resolvidas e horas economizadas. Cada metrica inclui comparativo (ex: "+18% vs. semana passada").

**AskBar** -- Campo de texto central onde o usuario pode perguntar qualquer coisa sobre sua loja em linguagem natural. Exemplos de sugestoes rapidas: "Quais carrinhos tem maior chance de conversao?", "Aprovar sequencia WhatsApp de recuperacao", "Quais clientes estao em risco de churn?". As perguntas sao roteadas automaticamente ao agente orquestrador que direciona para o especialista adequado.

**Intent Cards** -- Carrossel paginado com 12 cards de acoes rapidas organizados por categoria (marketing, conversao, retencao, competitividade, receita, suporte, performance, catalogo). Cada card apresenta um titulo provocativo (ex: "Sua loja aparece quando o ChatGPT recomenda produtos?"), categoria e numero de co-workers envolvidos. Ao clicar, abre um modal com detalhes e acao direta.

**Co-Workers em Acao** -- Grid visual mostrando os co-workers que estao trabalhando ativamente, cada um com indicador verde pulsante, resumo do que esta fazendo e resultado recente. Exemplo: "Customer Service -- respondeu 156 perguntas automaticamente nas ultimas 8h com 94% de satisfacao". Ao clicar, abre um drawer lateral com KPIs detalhados (receita recuperada, carrinhos reengajados, taxa de conversao) e log de atividades com timeline visual.

**Oportunidades Detectadas** -- Lista de insights proativos identificados pelos co-workers com avatar do agente, resumo da oportunidade, valor estimado e nivel de confianca. Exemplo: "Taxa de abandono no checkout mobile 34% maior que desktop, com 89 sessoes afetadas hoje. Acao imediata pode recuperar ~R$3.200." Ao clicar, abre um drawer com analise completa: dados identificados, raciocinio do co-worker, fontes utilizadas e acao sugerida.

**Co-Worker Recomendado** -- Secao que sugere ativacao de um co-worker inativo baseado no potencial detectado nos dados da loja. Exemplo: "Marketing Agent -- Seus clientes ativos tem alto potencial de upsell. Estimamos R$8.400/mes em receita adicional."

### 2.3 Workspace do Agente

Cada co-worker tem seu proprio workspace acessivel via `/agents/[id]`, com layout de 2 paineis.

**Painel Esquerdo:**

- Avatar animado do agente com gradiente e padrao de pontos concentricos pulsantes
- Nome e descricao do agente
- Secao de Skills: cards com emoji, nome da skill e ultimo horario de execucao
- Botao "New skill" para adicionar novas habilidades
- Chat input na parte inferior para conversar diretamente com o co-worker

**Painel Direito:**

- **Aba Hoje**: Heatmap de atividade estilo GitHub (6 meses de dados), com intensidade de cor por volume de execucoes. Indicadores de progresso (steps e AI credits usados).
- **Aba Resultados**: KPIs do agente e relatorios gerados.
- **Aba Configurar**: Personalizacao do comportamento, modelo de IA, prompt do sistema.
- **Aba Conexoes**: Apps integrados que o agente utiliza.
- Historico de runs com status, duracao e recursos utilizados.

### 2.4 Chat com IA

O chat e o canal principal de interacao com cada co-worker.

- **Conversacional**: O usuario conversa em linguagem natural, pedindo analises, aprovando acoes ou fazendo perguntas sobre a loja.
- **Tool Calls em Tempo Real**: O agente executa acoes durante a conversa -- consulta estoque (STORE_QUERY_STOCK), verifica vendas (STORE_QUERY_SALES), lista pedidos (STORE_LIST_ORDERS), consulta margens (STORE_QUERY_MARGINS), cria monitores de preco (STORE_ADD_PRICE_MONITOR), e executa acoes via Composio (Shopify, Gmail, Google Analytics, etc.).
- **Reasoning Visivel**: O co-worker mostra seu processo de pensamento, permitindo ao usuario entender o "por que" de cada recomendacao.
- **Feedback**: Sistema de like/dislike para cada resposta, alimentando melhoria continua.
- **Historico**: Todas as conversas sao salvas e acessiveis, permitindo retomar contexto a qualquer momento.
- **Criacao de Workflows via Chat**: O usuario pode pedir ao co-worker que automatize algo ("monitora o preco desse concorrente") e o agente cria automaticamente um workflow visivel e editavel usando SNEW_CREATE_WORKFLOW.

### 2.5 Workflows e Automacoes

O sistema de workflows e o motor de automacao do Snew.

**Editor Visual** -- Interface de 3 paineis: assistente de IA (esquerda, 320px colapsavel), canvas de steps (centro) e painel de configuracao (direita, ao selecionar um step). O canvas apresenta steps em sequencia vertical com linhas conectoras visuais.

**Triggers Suportados (9 tipos):**

- **Manual** -- Execucao por clique de botao
- **Scheduled (Cron)** -- Execucao recorrente com expressoes cron e timezone (ex: "0 21 \* \* \*" para resumo diario as 21h)
- **Webhook** -- Acionado por requests HTTP customizados
- **App Events** -- Acionado por eventos em apps conectados via Composio
- **Email (Mailhook)** -- Acionado por emails enviados a endereco unico
- **Form** -- Acionado por submissao de formulario
- **RSS** -- Acionado por novos itens em feeds RSS
- **Table** -- Acionado por atualizacao em tabela
- **MCP Server** -- Cria servidor MCP para integracao com Cursor/Claude

**Steps Suportados (8 tipos):**

- **App** -- Executa acoes em apps conectados (Shopify Get Products, Gmail Send Email, etc.)
- **AI** -- Processamento com IA (sumarizar, extrair, transformar dados)
- **HTTP** -- Requests HTTP customizados
- **Flow Control** -- Condicionais, loops, espera
- **Human in the Loop** -- Pausa para aprovacao humana
- **Utility** -- Formatacao, conversao de dados, envio via Telegram
- **Web Scraping** -- Extracao de dados de websites
- **Sequence** -- Grupos reutilizaveis de steps

**Execucao Autonoma** -- Workflows sao criados automaticamente durante o onboarding e podem ser criados pelo agente via chat. Cada workflow segue um pipeline de 3 steps: buscar dados do app --> processar com IA --> enviar resultado (Telegram, email, etc.). Workflows publicados executam automaticamente conforme seus triggers.

### 2.6 Integracoes (Apps)

O Snew se conecta a um ecossistema de apps via Composio SDK e conexoes nativas.

**Apps Suportados:**

- **Shopify** -- Plataforma de e-commerce: pedidos, produtos, clientes (conectado nativamente)
- **Nuvemshop** -- Plataforma de e-commerce brasileira (conectado nativamente)
- **Gmail** -- Campanhas de email, notificacoes e comunicacao com clientes
- **Google Analytics** -- Trafego, tracking de conversao e insights de audiencia
- **Meta Ads** -- Campanhas de publicidade no Facebook e Instagram
- **Google Ads** -- Campanhas de busca e display
- **WhatsApp Business** -- Mensagens com clientes, respostas automatizadas e listas de broadcast
- **Slack** -- Mensagens de equipe, alertas e notificacoes de workflow
- **Stripe** -- Processamento de pagamentos, assinaturas e relatorios financeiros
- **HubSpot** -- CRM, automacao de marketing e pipeline de vendas
- **Notion** -- Base de conhecimento, documentacao e gestao de projetos
- **Klaviyo** -- Automacao de marketing por email e SMS
- **Airtable** -- Hibrido planilha-banco de dados para gestao de dados estruturados

Alem desses, o sistema suporta 100+ integracoes adicionais em 31 categorias via Composio, incluindo CRM, Payments, Social Media, Project Management, Analytics, Communication e mais.

**Fluxo de Conexao** -- O usuario conecta apps via OAuth flow diretamente da secao "Manage Apps" nas configuracoes. Cada app mostra status de conexao e permite conectar/desconectar com um clique.

### 2.7 Skills (Conhecimento e Procedimentos)

Skills sao o conhecimento e os procedimentos que cada co-worker utiliza para operar.

**Knowledge Skills** -- Base de conhecimento especializada injetada durante o provisionamento. Cada agente recebe skills customizadas para o segmento da loja (roupas, eletronicos, alimentos, cosmeticos, casa/decoracao, esportes, pet, outros). Exemplo: o Estoquista de uma loja de roupas recebe conhecimento sobre grades de tamanho (XS a XL), sazonalidade de colecoes, analise ABC para moda, e alertas sobre tamanhos M/L que esgotam primeiro.

**Procedure Skills** -- Processos step-by-step que o agente segue. Exemplo: o Vigia de Preco sabe como usar STORE_ADD_PRICE_MONITOR para criar um monitor automatico que faz scraping a cada 4-6h, salva historico de precos e alerta via Telegram quando ha mudanca significativa.

**Domain Skills** -- Skills pre-configuradas por dominio de conhecimento:

- _Marketing_: Brand Tone Guide (principios de voz da marca), Social Media Best Practices (dicas por plataforma)
- _Customer Service_: Escalation Framework, FAQ Templates
- _Analytics_: KPI Definitions, Reporting Best Practices

**Criacao Autonoma** -- Co-workers podem criar novas skills durante conversas usando as ferramentas SNEW_CREATE_KNOWLEDGE_SKILL e SNEW_CREATE_PROCEDURE_SKILL, expandindo seu proprio conhecimento de forma autonoma e organica.

### 2.8 Notificacoes Proativas

Os co-workers nao esperam ser perguntados -- eles detectam oportunidades e riscos proativamente.

**Sistema de Oportunidades** -- O dashboard exibe oportunidades detectadas automaticamente com:

- Avatar e nome do co-worker que detectou
- Resumo da oportunidade em linguagem clara
- Valor estimado (ex: "~R$3.200")
- Nivel de impacto e confianca
- Timestamp de deteccao

**Drawer de Detalhes** -- Ao clicar em uma oportunidade, abre um painel lateral com:

- Dados identificados (lista de findings com metricas especificas)
- Raciocinio do co-worker (explicacao de por que isso importa)
- Fontes (Shopify Checkout Analytics, GA4, Hotjar, etc.)
- Acao sugerida (recomendacao concreta e acionavel)

**Notificacoes via Telegram** -- Workflows automaticos enviam alertas em tempo real:

- Alerta de Estoque Baixo: a cada 6h, identifica produtos com 5 unidades ou menos
- Resumo Diario de Vendas: as 21h, com total de pedidos, receita, top produtos e breakdown de pagamentos
- Notificacao de Novo Pedido: a cada hora, notifica sobre pedidos recebidos

### 2.9 Onboarding

O onboarding do Snew e projetado para entregar valor em minutos, nao semanas.

**Passo 1: Conexao da Plataforma** -- O usuario seleciona sua plataforma de e-commerce (Shopify, Nuvemshop, Mercado Livre ou sem loja online) e conecta via OAuth.

**Passo 2: Configuracao da Loja** -- Selecao de segmento entre 8 opcoes (Roupas e Acessorios, Eletronicos, Alimentos e Bebidas, Cosmeticos e Beleza, Casa e Decoracao, Esportes e Fitness, Pet Shop, Outros) e definicao de prioridades (Controle de Estoque, Monitorar Concorrencia, Resumo de Vendas, Atendimento ao Cliente, Alertas de Pedidos).

**Passo 3: Provisionamento Automatico** -- O sistema executa o provisionamento completo:

1. Cria o registro da loja com segmento e prioridades
2. Cria 5 agentes especializados (Orquestrador + Estoquista + Vigia de Preco + Analista de Vendas + Atendente)
3. Injeta knowledge skills customizadas por segmento em cada agente
4. Cria workflows pre-configurados baseados nas prioridades:
   - Prioridade "Controle de Estoque" --> Workflow "Alerta de Estoque Baixo" (cron: a cada 6h)
   - Prioridade "Resumo de Vendas" --> Workflow "Resumo Diario de Vendas" (cron: 21h diario)
   - Prioridade "Alertas de Pedidos" --> Workflow "Notificacao de Novo Pedido" (cron: a cada hora)
5. Configura alerta global de estoque (threshold: 5 unidades)
6. Marca a equipe como tendo loja conectada

**Tempo ate primeiro valor**: Primeiro co-worker operacional em menos de 5 minutos apos conexao.

### 2.10 Multi-idioma e Temas

**Idiomas** -- Suporte completo para Portugues (Brasil) e Ingles, com sistema de i18n baseado em cookies. O greeting do dashboard se adapta ao idioma selecionado, e todos os labels da interface sao traduzidos.

**Temas** -- Dark mode e Light mode com deteccao automatica de preferencia do sistema via next-themes. Todas as cores utilizam CSS variables em espaco OKLCH para consistencia visual perfeita em ambos os temas. Toggle de tema acessivel no sidebar.

**Preferencias Salvas** -- Estado do sidebar (expandido/colapsado), preferencia de idioma e tema sao persistidos via localStorage para experiencia consistente entre sessoes.

---

## 3. Arquitetura Tecnica

**Stack Principal:**

- **Frontend**: Next.js 16.1.6 com App Router, React 19.2.3, TypeScript 5 em modo strict
- **UI**: shadcn/ui (estilo new-york), Radix UI, Tailwind CSS v4 (configuracao CSS-first)
- **Estado**: TanStack React Query (server state com SSR hydration), Zustand (client state no editor de workflows)
- **IA**: Vercel AI SDK com jsonSchema, suporte a streaming e function calling
- **Backend**: Supabase PostgreSQL com RLS em todas as tabelas, Supabase Auth com cookies
- **Integracoes**: Composio SDK para 100+ apps, Nuvemshop API nativa
- **Mensageria**: Telegram Bot API para notificacoes proativas

**Padroes Arquiteturais:**

- **Server Components por padrao**: Data fetching no servidor, passando initialData para Client Components com React Query para live updates
- **Real-time via Supabase Realtime**: Progresso de execucao de workflows, status de agentes
- **Edge Functions**: Processamento de webhooks e triggers de app events
- **Composio SDK**: Abstrai OAuth e execucao de acoes em apps externos
- **Orquestracao de agentes**: Sistema de chat com tool calling onde o agente pode executar acoes reais (consultar banco, chamar APIs, criar workflows) durante a conversa

**Banco de Dados (12+ tabelas com RLS):**

- `profiles`, `teams`, `team_members` -- Usuarios e equipes
- `agents`, `agent_skills`, `agent_conversations`, `agent_messages` -- Sistema de agentes
- `workflows`, `workflow_triggers`, `workflow_steps`, `workflow_runs` -- Motor de automacao
- `app_connections` -- Integracoes OAuth
- `stores`, `store_products`, `store_stock_alerts` -- Dados de varejo
- `trigger_subscriptions`, `agent_workflows`, `agent_workflow_runs` -- Automacoes de agentes

---

## 4. ICP (Ideal Customer Profile)

### 4.1 Perfil Primario

**Tamanho da empresa:** PMEs de e-commerce com faturamento de R$50k-R$2M/mes (10-100 pedidos/dia). Grandes o suficiente para ter dor real de operacao, pequenas o suficiente para nao ter equipe dedicada para cada funcao.

**Setor/Vertical:** E-commerce D2C (Direct to Consumer) nos segmentos de moda/acessorios, eletronicos, cosmeticos/beleza, casa/decoracao, esportes/fitness, pet shop e alimentos. A plataforma suporta explicitamente esses 8 segmentos com knowledge skills customizadas.

**Cargo do decisor:** Dono(a) da loja, CEO, Head de E-commerce ou Gerente de Operacoes. Pessoa que acumula multiplas funcoes e sente diretamente a dor de nao ter tempo para tudo.

**Maturidade digital:** Intermediaria -- ja usa Shopify ou Nuvemshop, tem Google Analytics configurado, faz campanhas no Meta Ads, mas ainda depende de planilhas e processos manuais para monitoramento e analise.

**Dor principal:** "Estou crescendo mas nao consigo contratar rapido o suficiente. Preciso de um analista de dados, um atendente, alguem monitorando estoque e concorrencia -- mas nao tenho budget para 4-5 salarios."

### 4.2 Perfil Secundario

**Agencias de e-commerce** que gerenciam multiplas lojas e precisam escalar operacoes sem escalar headcount proporcionalmente. O modelo de co-workers por loja permite atender mais clientes com a mesma equipe.

**Marcas em fase de escala** (R$2M-R$10M/mes) que ja tem equipe mas precisam de eficiencia operacional e inteligencia de dados que humanos sozinhos nao conseguem entregar (monitoramento 24/7, analise em tempo real, deteccao proativa de oportunidades).

### 4.3 Anti-ICP (quem NAO e o cliente)

- **Lojas com menos de R$10k/mes**: Nao geram volume de dados suficiente para os co-workers entregarem valor significativo.
- **Empresas com equipes de data science maduras**: Ja possuem tooling customizado e processos internos que competem com a proposta do Snew.
- **Lojas sem plataforma digital** (puramente fisicas): O Snew depende de integracao com Shopify/Nuvemshop para data pipeline.
- **Negocios B2B com ciclos de venda longos**: O produto e otimizado para e-commerce B2C com alta frequencia transacional.

---

## 5. Analise SWOT

### 5.1 Forcas (Strengths)

**Modelo de co-workers especializados** -- Diferente de uma unica IA generica, cada co-worker tem expertise de dominio (knowledge skills por segmento, ferramentas especificas, prompts otimizados). Isso gera resultados mais precisos e confiantes que um chatbot generalista.

**Provisionamento automatico com valor imediato** -- Em menos de 5 minutos apos conexao, a loja ja tem 5 agentes operando com workflows automaticos. Nao ha periodo de "setup" de semanas como em ferramentas tradicionais de BI ou automacao.

**27 agentes pre-construidos** -- Catalogo extenso com value props claras e metricas de resultado esperado para cada um. O wizard de instalacao mostra estatisticas de impacto (ex: "< 2min tempo de resposta, 94% satisfacao, R$0 custo por ticket").

**Transparencia de raciocinio** -- Os co-workers mostram seus findings, raciocinio, fontes e acao sugerida. O usuario nunca recebe uma "caixa preta" -- entende por que cada recomendacao e feita.

**Integracao profunda com ecossistema** -- 100+ apps via Composio + integracoes nativas com Shopify e Nuvemshop. O agente nao apenas analisa -- ele executa acoes reais (envia emails, cria campanhas, atualiza precos).

**Stack tecnologico moderno** -- Next.js 16, React 19, Server Components, Vercel AI SDK com streaming. Performance e DX de ponta que permite iteracao rapida.

### 5.2 Fraquezas (Weaknesses)

**Dependencia de plataformas terceiras** -- O valor do Snew depende da qualidade dos dados vindos de Shopify, Nuvemshop, Google Analytics, etc. Se APIs mudam ou ficam instáveis, o impacto e direto.

**Curva de confianca** -- Donos de loja podem hesitar em delegar decisoes criticas (precificacao, atendimento, messaging) a uma IA. Requer educacao de mercado sobre o modelo de "co-worker" vs. "substituto".

**Complexidade de onboarding para lojas sem dados historicos** -- Lojas novas terao co-workers com menos insights iniciais, reduzindo o "wow moment" do primeiro dia.

**Cobertura de plataformas** -- Atualmente limitado a Shopify e Nuvemshop. Mercado Livre esta indisponivel e nao ha suporte para WooCommerce, VTEX ou outras plataformas brasileiras relevantes.

### 5.3 Oportunidades (Opportunities)

**Mercado de IA para e-commerce em explosao** -- O mercado global de IA para e-commerce deve ultrapassar US$16 bilhoes ate 2028. PMEs sao o segmento mais mal atendido.

**Expansao para LATAM** -- Com suporte nativo a PT-BR e Nuvemshop (maior plataforma de e-commerce da America Latina), o Snew tem posicao privilegiada para expandir regionalmente.

**Marketplace de co-workers** -- O catalogo de 27 agentes pode evoluir para um marketplace onde terceiros criam co-workers especializados (ex: co-worker para nicho de joias, co-worker para dropshipping).

**Verticalizacao por segmento** -- As knowledge skills por segmento (8 segmentos x 4 roles = 32 skill sets) podem ser aprofundadas com dados de benchmark anonimizados entre lojas do mesmo segmento.

**Integracao com WhatsApp Business API** -- Possibilidade de o co-worker de atendimento operar diretamente no WhatsApp da loja, respondendo clientes em tempo real.

### 5.4 Ameacas (Threats)

**Shopify Magic e concorrentes nativos** -- Shopify esta investindo pesado em IA nativa (Sidekick/Magic). Se oferecerem funcionalidades comparaveis dentro da propria plataforma, reduz o incentivo de usar ferramentas externas.

**Comoditizacao de IA** -- Com modelos cada vez mais baratos e acessiveis, a barreira de entrada para concorrentes cai. Diferenciais de UX e dados se tornam mais importantes que a IA em si.

**Regulamentacao de dados** -- LGPD e regulamentacoes futuras podem restringir como dados de clientes sao processados por agentes de IA, exigindo investimento em compliance.

**Fadiga de ferramentas de IA** -- O mercado esta saturado de promessas de "IA que resolve tudo". Usuarios mais ceticos exigem prova de ROI rapida.

---

## 6. Diferenciais Competitivos

### vs. Tidio / Intercom (Chatbots de atendimento)

O Snew nao e um chatbot -- e uma equipe completa. Tidio e Intercom resolvem apenas atendimento. O Snew resolve atendimento, vendas, marketing, estoque, concorrencia e analytics com co-workers que se comunicam entre si. O Customer Service Agent do Snew e apenas 1 dos 27 co-workers disponiveis.

### vs. HubSpot AI / Salesforce Einstein

Essas ferramentas adicionam IA a um CRM existente. O Snew e AI-first: os co-workers sao o produto, nao um complemento. Alem disso, o preco do HubSpot (R$5.000+/mes para features de IA) e proibitivo para PMEs.

### vs. Shopify Magic / Sidekick

Shopify Magic e limitado ao ecossistema Shopify e oferece funcionalidades genericas. O Snew oferece agentes especializados por segmento de mercado com knowledge skills customizadas. Alem disso, funciona com multiplas plataformas (Shopify + Nuvemshop).

### vs. Zapier / Make (Automacao)

Zapier conecta apps mas nao tem inteligencia. O Snew nao apenas conecta -- analisa, decide e age. Um workflow no Snew pode: buscar dados -> analisar com IA -> decidir a acao -> executar -> notificar. Zapier faz apenas o "conecta e executa".

### Moat Tecnologico

- **Orquestracao de agentes com tool calling**: Cada co-worker pode executar acoes reais durante conversas, nao apenas responder perguntas
- **Knowledge skills por segmento**: 32 knowledge skill sets customizados (8 segmentos x 4 roles) que agentes genericos nao possuem
- **Pipeline de workflows AI-native**: Steps de IA como cidadaos de primeira classe no motor de automacao

### Moat de Dados

- **Historico de precos de concorrentes**: Cada monitor de preco cria historico proprietario que se torna mais valioso com o tempo
- **Benchmarks por segmento**: Com escala, dados anonimizados entre lojas do mesmo segmento criam benchmarks exclusivos
- **Skills auto-geradas**: Co-workers criam e refinam skills durante conversas, acumulando conhecimento proprietario da loja

### Moat de Experiencia

- **Onboarding em 5 minutos**: Concorrentes levam dias/semanas para setup
- **Dashboard com greeting contextual**: UX que faz o usuario sentir que os co-workers realmente trabalharam enquanto ele dormia
- **Transparencia de raciocinio**: Drawer de oportunidades mostra findings, fontes e logica -- construindo confianca que concorrentes "caixa preta" nao conseguem

---

## 7. Modelo de Negocio

### Estrutura de Planos

**Freemium com creditos** -- O modelo e desenhado para demonstrar valor antes de cobrar:

- **Free**: 1 co-worker ativo, workflows limitados, 100 mensagens de chat/mes, integracao com 1 plataforma
- **Pro**: Todos os 27 co-workers, workflows ilimitados, 5.000 mensagens de chat/mes, todas as integracoes, notificacoes Telegram
- **Business**: Tudo do Pro + co-workers customizados, API access, SLA de suporte, multi-loja

### Metricas de Valor

O pricing e ancorado em metricas de resultado tangivel:

- **Receita recuperada** -- R$4.200/dia em carrinhos reengajados e clientes reativados
- **Tempo economizado** -- ~3 horas/dia vs. analise manual, 8h/semana em automacoes
- **Custo evitado** -- R$0 por ticket de atendimento (vs. R$5-15 com atendente humano)
- **Oportunidades detectadas** -- Insights proativos com valor estimado (ex: "~R$3.200 recuperaveis")

O retorno sobre investimento tipico e de 4-10x o custo da assinatura.

---

## 8. Roadmap Estrategico

### Curto Prazo (Q2 2026)

- **Expansao de plataformas**: Suporte a Mercado Livre e WooCommerce
- **Notificacoes in-app**: Sistema completo de notificacoes por categoria dentro da plataforma
- **Agent-to-agent communication**: Co-workers se comunicando diretamente para resolver problemas cross-domain
- **Marketplace de workflows**: Templates de automacao compartilhaveis entre usuarios

### Medio Prazo (Q3-Q4 2026)

- **WhatsApp como canal de atendimento**: Co-worker de CS operando diretamente no WhatsApp da loja
- **Benchmarks de segmento**: Dados anonimizados entre lojas do mesmo segmento para benchmarking automatico
- **Co-workers custom**: Interface para usuarios criarem seus proprios co-workers com prompts e tools customizados
- **Multi-loja**: Gestao de multiplas lojas com co-workers compartilhados
- **Mobile app**: Aplicativo nativo para monitoramento e aprovacoes on-the-go

### Longo Prazo (2027)

- **Marketplace de co-workers**: Terceiros publicam co-workers especializados (nicho de joias, dropshipping, B2B)
- **Autonomous execution mode**: Co-workers executam acoes pre-aprovadas sem intervencao humana
- **Predictive commerce**: Antecipacao de demanda, precificacao dinamica automatica, gestao autonoma de estoque
- **LATAM expansion**: Localizacao para espanhol, suporte a plataformas regionais (VTEX, Tiendanube, MercadoShops)

---

## 9. Metricas de Sucesso

### North Star Metric

**Receita recuperada/protegida pelos co-workers por loja por mes (R$)** -- Essa metrica captura diretamente o valor que o Snew gera: carrinhos recuperados, vendas de upsell, churn prevenido, desperdicio de ads eliminado.

### KPIs Primarios

| Metrica                                                             | Alvo                |
| ------------------------------------------------------------------- | ------------------- |
| Tempo ate primeiro valor (onboarding -> primeiro insight acionavel) | < 5 minutos         |
| Lojas ativas com co-workers operando                                | Crescimento 15% MoM |
| Receita mensal recuperada por loja                                  | > R$10.000          |
| Retencao de lojas (30 dias)                                         | > 85%               |
| NPS                                                                 | > 50                |

### KPIs Secundarios

| Metrica                                       | Alvo        |
| --------------------------------------------- | ----------- |
| Co-workers ativos por loja                    | > 3 (media) |
| Mensagens de chat por loja/semana             | > 20        |
| Workflows automaticos executados por loja/dia | > 5         |
| Taxa de ativacao de co-workers recomendados   | > 30%       |
| Oportunidades detectadas por loja/semana      | > 5         |
| Tempo medio de resposta do atendimento        | < 2 minutos |
| Taxa de satisfacao de atendimento automatico  | > 90%       |
| Tickets resolvidos sem intervencao humana     | > 85%       |

---

## 10. Conclusao

### Resumo Executivo

O Snew resolve um problema fundamental do e-commerce brasileiro: PMEs que crescem mas nao conseguem escalar operacoes na mesma velocidade. Ao transformar funcoes criticas (atendimento, analise, monitoramento, marketing) em co-workers de IA especializados que operam 24/7, o Snew entrega capacidade de equipes de 4-5 profissionais a uma fracao do custo.

Com um catalogo de 27 co-workers pre-construidos, suporte a 100+ integracoes, knowledge skills customizadas por segmento de mercado, e um motor de automacao que combina IA com acoes reais em apps externos, o Snew nao e mais uma ferramenta de IA generica -- e um OS de operacoes para e-commerce.

### Por que Agora

- **Custos de IA em queda**: Modelos poderosos agora custam centavos por interacao, viabilizando agentes autonomos 24/7 para PMEs
- **Maturidade de APIs**: Shopify, Nuvemshop, Meta e Google oferecem APIs robustas que permitem integracao profunda
- **Gap de mercado**: Ferramentas existentes sao ou muito caras (HubSpot) ou muito limitadas (chatbots). O espaco de "equipe completa de IA para PMEs" esta aberto
- **Mercado brasileiro em crescimento**: E-commerce brasileiro cresceu 10% em 2025 com 100M+ compradores online. PMEs sao 70% das lojas mas tem acesso a apenas 10% das ferramentas de inteligencia

### Visao de Futuro

O Snew caminha para se tornar o **sistema operacional de inteligencia do e-commerce** -- onde cada loja tem uma equipe de co-workers especializados que nao apenas automatizam tarefas, mas tomam decisoes inteligentes de forma autonoma. O futuro e um e-commerce onde o dono da loja foca em estrategia e criatividade enquanto seus co-workers cuidam de tudo mais: desde responder um cliente no WhatsApp as 3h da manha ate detectar uma oportunidade de precificacao que geraria R$50k extras no trimestre.

A visao final: **"Nenhuma oportunidade perdida. Nenhum cliente ignorado. Nenhuma decisao no escuro."**
