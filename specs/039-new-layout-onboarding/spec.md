# Feature Specification: New Layout + Onboarding Flow

**Feature Branch**: `039-new-layout-onboarding`
**Created**: 2026-03-23
**Status**: Draft
**Input**: Reimplementar o layout completo do Relay baseado no protótipo snew-ai-core. Inclui novo layout, home, skills pages, apps page, onboarding flow, e Brand DNA page.

**Reference**: Protótipo em `/home/renanl/Projects/snew-ai-core/` (Vite + React Router). Screenshots capturados: `ref-home.png`, `ref-skills.png`, `ref-skill-detail-seasonal.png`, `ref-onboarding.png`, `ref-onboarding-connect.png`, `ref-onboarding-analyzing.png`, `ref-onboarding-brand-dna.png`.

## User Scenarios & Testing

### User Story 1 - New Layout with Icon Sidebar + TopBar (Priority: P1)

O lojista abre o Snew e vê um layout limpo com sidebar icon-only (56px colapsada, 240px expandida) à esquerda e topbar no topo. A sidebar mostra: Home, New Chat, Skills, Apps, History como ícones com tooltip. No rodapé da sidebar, as skills ativas aparecem com emoji e nome. A topbar mostra botões de Feedback, Support, notificações e avatar do usuário. O layout é responsivo — no mobile a sidebar vira overlay com backdrop blur.

**Why this priority**: O layout é o container de tudo. Sem ele, nenhuma outra página funciona corretamente. É a fundação visual.

**Independent Test**: Abrir qualquer página do sistema e verificar que sidebar + topbar renderizam corretamente. Clicar nos itens de navegação e verificar routing.

**Acceptance Scenarios**:

1. **Given** o lojista está logado, **When** abre qualquer página, **Then** vê sidebar icon-only à esquerda com 5 itens de navegação (Home, New Chat, Skills, Apps, History) e topbar no topo.
2. **Given** o lojista está em desktop, **When** clica no logo da sidebar, **Then** a sidebar expande/colapsa com animação suave.
3. **Given** o lojista está em mobile, **When** clica no menu hamburger, **Then** a sidebar abre como overlay com backdrop blur, e clicar fora fecha.
4. **Given** o lojista tem skills ativas, **When** olha o rodapé da sidebar, **Then** vê as skills ativas com emoji e nome (ex: "📅 Seasonal Calendar").
5. **Given** o lojista está em qualquer página, **When** olha a topbar, **Then** vê botões de Feedback, Support, ícone de notificações e avatar com iniciais.

---

### User Story 2 - New Home Page (Priority: P1)

O lojista abre a home e vê uma interface centralizada no ask bar ("Ask something about your store...") com 3 quick suggestions abaixo. Logo depois, uma seção "Activity" mostra itens acionáveis (briefings para aprovar, campanhas sem ação, tarefas em andamento). Abaixo, "Active Skills" mostra pills com nome da skill e tempo desde última execução.

**Why this priority**: A home é a primeira tela que o lojista vê. Define a experiência do produto. Precisa ser chat-first, não dashboard de cards.

**Independent Test**: Abrir a home e verificar ask bar, suggestions, activity feed e active skills renderizam.

**Acceptance Scenarios**:

1. **Given** o lojista abre a home, **When** a página carrega, **Then** vê um ask bar centralizado com placeholder "Ask something about your store..." e botão de envio.
2. **Given** a home carregou, **When** olha abaixo do ask bar, **Then** vê 3 quick suggestion pills clicáveis (ex: "Quais são as melhores oportunidades sazonais?").
3. **Given** existem itens de atividade, **When** olha a seção Activity, **Then** vê lista de itens com ícone de status (warning/running), descrição e botão de ação (Approve/Generate).
4. **Given** existem skills ativas, **When** olha a seção "Active Skills", **Then** vê pills com nome da skill, indicador verde e tempo desde última execução (ex: "Seasonal Calendar · 2h").

---

### User Story 3 - Skills Library Page Redesigned (Priority: P2)

O lojista navega para /skills e vê a skill library redesenhada com: sidebar de filtros à esquerda (tabs All/Active/Recommended + categorias em PT-BR), header com título + contagem + search bar, e grid de skill cards com emoji icon, nome, descrição e badge "Active" quando ativa.

**Why this priority**: A skill library é onde o lojista descobre e ativa capacidades. O redesign com categorias em PT-BR e visual mais rico é essencial para o produto.

**Independent Test**: Abrir /skills e verificar filtros, search e cards renderizam com dados do skill registry.

**Acceptance Scenarios**:

1. **Given** o lojista abre /skills, **When** a página carrega, **Then** vê header "Skills" com contagem (ex: "38 capabilities... 8 active"), search bar, e grid de cards.
2. **Given** a skills page carregou, **When** olha a sidebar de filtros, **Then** vê tabs (All/Active/Recommended) e categorias em PT-BR (ex: "Marketing & Campanhas", "Retenção & Churn") com contagem.
3. **Given** o lojista clica em uma categoria, **When** o filtro é aplicado, **Then** a grid mostra apenas skills daquela categoria.
4. **Given** o lojista digita no search, **When** filtra por texto, **Then** a grid mostra apenas skills que contêm o termo no nome ou descrição.
5. **Given** uma skill está ativa, **When** o card renderiza, **Then** mostra badge verde "Active" no canto superior direito.

---

### User Story 4 - Rich Skill Detail Page (Priority: P2)

O lojista clica em um skill card e vê a página de detalhe com: header (emoji + nome + badge Active), seção About (descrição longa), stats (3 métricas chave), "What it does" (lista de ações com badges de frequência), "Expected result" (lista de resultados), "Configuration" (autonomy level, briefing advance, custom dates), "Required connections", "Connected skills" e "Outputs" (briefings, calendários, relatórios).

**Why this priority**: O detalhe da skill é onde o lojista entende o valor e configura a skill. Sem ele, a ativação é cega.

**Independent Test**: Abrir /skills/seasonal-calendar e verificar todas as seções renderizam.

**Acceptance Scenarios**:

1. **Given** o lojista abre /skills/seasonal-calendar, **When** a página carrega, **Then** vê header com emoji "📅", nome "Seasonal Calendar", e botão "Active" com check.
2. **Given** a página carregou, **When** scrolla, **Then** vê seções: About, stats (30+/D-60/auto), What it does (6 itens com badges), Expected result (4 itens), Configuration, Required connections, Connected skills, Outputs.
3. **Given** a seção Configuration mostra, **When** o lojista altera "Autonomy level" de "With approval" para "Automatic", **Then** a preferência é salva.
4. **Given** a seção Outputs mostra, **When** o lojista clica em "Full Year Calendar", **Then** navega para a visualização do calendário.

---

### User Story 5 - Onboarding Flow (Priority: P2)

Um novo lojista acessa o Snew pela primeira vez e passa por um fluxo de onboarding de 4 etapas: (1) Welcome — "Your AI-powered CMO" com botão "Connect your store", (2) Connect — escolher plataforma (Shopify/Nuvemshop), (3) Analyzing — loading com progresso (scanning products, extracting brand, mapping dates), (4) Brand DNA — página conversacional onde o Snew apresenta o que entendeu da marca (identidade, tom de voz, diagnóstico, oportunidades, projeção de receita, skills recomendadas).

**Why this priority**: O onboarding é o "wow moment" — conectou loja → recebeu análise completa em segundos. É o que vende o produto. Mas depende do layout estar pronto.

**Independent Test**: Navegar pelo fluxo completo /onboarding → /onboarding/connect → /onboarding/analyzing → /onboarding/brand-dna.

**Acceptance Scenarios**:

1. **Given** o lojista é novo, **When** acessa /onboarding, **Then** vê tela fullscreen (sem sidebar) com logo Snew, "Your AI-powered CMO" e botão "Connect your store".
2. **Given** o lojista clicou "Connect your store", **When** vê a tela de connect, **Then** pode escolher entre Shopify e Nuvemshop com cards visuais.
3. **Given** o lojista conectou a loja, **When** vê a tela de analyzing, **Then** vê progresso com checklist animado (products scanned, brand DNA generated, dates mapped).
4. **Given** a análise completou, **When** vê a tela de Brand DNA, **Then** vê o Snew apresentando: identidade da marca, tom de voz (palavras usar/evitar), diagnóstico de performance (forças e alertas), oportunidades identificadas (4 cards com bordas coloridas), projeção de receita (R$ sem/com Snew), e 3 skills recomendadas com toggles.
5. **Given** o lojista está na tela de Brand DNA, **When** clica "Começar com essas habilidades", **Then** as skills selecionadas são ativadas e o lojista é redirecionado para a home.

---

### User Story 6 - Apps Page (Priority: P3)

O lojista navega para /apps e vê a lista de aplicativos conectáveis com search bar, aviso de segurança ("Credentials are encrypted..."), e grid de app cards com emoji, nome, descrição e seta de navegação. Inclui 13 apps: Shopify, Gmail, Google Analytics, Meta Ads, Google Ads, Klaviyo, Slack, Notion, Airtable, Stripe, HubSpot, WhatsApp Business, Telegram.

**Why this priority**: Conectar apps é necessário para skills funcionarem, mas a página em si é simples e pode ser implementada por último.

**Independent Test**: Abrir /apps e verificar lista de apps renderiza com search funcional.

**Acceptance Scenarios**:

1. **Given** o lojista abre /apps, **When** a página carrega, **Then** vê header "Apps" com descrição, aviso de segurança, search bar e grid de 13 app cards.
2. **Given** o lojista digita no search, **When** filtra por "Shopify", **Then** mostra apenas o card do Shopify.
3. **Given** um app está conectado, **When** o card renderiza, **Then** mostra indicador de "Connected" no card.

---

### Edge Cases

- O que acontece quando o lojista não tem nenhuma skill ativa? A seção "Active Skills" na home e na sidebar mostra estado vazio com sugestão para ativar skills.
- O que acontece quando a sidebar está colapsada e o lojista hover sobre um ícone? Mostra tooltip com o nome do item.
- O que acontece quando o onboarding falha na etapa de analyzing? Mostra mensagem de erro com opção de retry.
- O que acontece quando o lojista já completou o onboarding e acessa /onboarding? Redireciona para a home.
- O que acontece em tela muito pequena (< 375px)? Layout se adapta com sidebar overlay e conteúdo single-column.
- O que acontece quando o Brand DNA não consegue extrair dados suficientes? Mostra resultado parcial com indicação do que faltou.

## Requirements

### Functional Requirements

- **FR-001**: O layout DEVE ter sidebar icon-only (56px colapsada, 240px expandida) com 5 itens de navegação: Home, New Chat, Skills, Apps, History.
- **FR-002**: A sidebar DEVE mostrar skills ativas com emoji no rodapé, abaixo da navegação principal.
- **FR-003**: A sidebar DEVE ser responsiva — overlay com backdrop blur em mobile, fixa em desktop.
- **FR-004**: A topbar DEVE mostrar botões de Feedback, Support, notificações e avatar do usuário.
- **FR-005**: A home DEVE ter ask bar centralizado como elemento principal, com 3 quick suggestions abaixo.
- **FR-006**: A home DEVE ter seção "Activity" com itens acionáveis (status + descrição + botão de ação).
- **FR-007**: A home DEVE ter seção "Active Skills" com pills mostrando nome e tempo desde última execução.
- **FR-008**: A skills page DEVE ter sidebar de filtros com tabs (All/Active/Recommended) e categorias em PT-BR.
- **FR-009**: A skills page DEVE ter search funcional que filtra por nome e descrição.
- **FR-010**: Skill cards DEVEM mostrar emoji icon, nome, descrição e badge "Active" quando ativa.
- **FR-011**: A skill detail page DEVE mostrar: About, stats, What it does, Expected result, Configuration, Required connections, Connected skills, e Outputs.
- **FR-012**: A seção Configuration da skill detail DEVE permitir alterar: autonomy level (com aprovação/automático), briefing advance (D-90/D-60/D-45/D-30).
- **FR-013**: O onboarding DEVE ser fullscreen (sem sidebar/topbar) com 4 etapas: Welcome, Connect, Analyzing, Brand DNA.
- **FR-014**: A etapa "Connect" DEVE oferecer Shopify e Nuvemshop como opções de plataforma.
- **FR-015**: A etapa "Analyzing" DEVE mostrar progresso com checklist animado (products, brand, dates).
- **FR-016**: A etapa "Brand DNA" DEVE apresentar: identidade da marca, tom de voz (palavras usar/evitar com tags coloridas), diagnóstico de performance, oportunidades (cards com bordas coloridas), projeção de receita, e skills recomendadas com toggles.
- **FR-017**: A apps page DEVE listar 13 apps conectáveis com search, aviso de segurança e indicador de conexão.
- **FR-018**: Categorias de skills DEVEM estar em PT-BR: "Carrinho & Conversão", "Retenção & Churn", "Marketing & Campanhas", "Ads & Performance", "Analytics & Inteligência", "Atendimento & Experiência", "Produto & Catálogo", "Redes Sociais", "Visibilidade & IA".
- **FR-019**: O skill registry DEVE ser expandido de 31 para 38 skills para cobrir todas as categorias do protótipo.

### Key Entities

- **Skill (expanded)**: Adiciona campos para: emoji icon, stats (array de key metrics), what_it_does (lista de ações com frequência), expected_results (lista), configuration_schema (autonomy level, briefing advance, custom options), connected_skills (skills que se comunicam).
- **Brand DNA**: Entidade persistida com: identidade da marca, tom de voz (usar/evitar), diagnóstico (forças/alertas), oportunidades identificadas, projeção de receita.
- **App Connection**: Aplicativo conectável com: nome, emoji, descrição, status de conexão, plataforma.
- **Activity Item**: Item de atividade com: tipo (warning/running/completed), descrição, ação associada, skill de origem, timestamp.

## Success Criteria

### Measurable Outcomes

- **SC-001**: O layout (sidebar + topbar) renderiza corretamente em todas as páginas, sem sobreposição ou overflow, em telas de 375px a 2560px.
- **SC-002**: A navegação da sidebar permite acessar todas as 5 seções (Home, New Chat, Skills, Apps, History) com routing funcional.
- **SC-003**: A home carrega em menos de 2 segundos e mostra ask bar, suggestions, activity e active skills.
- **SC-004**: A skills page mostra todas as skills do registry, filtráveis por categoria e pesquisáveis por texto.
- **SC-005**: A skill detail mostra todas as seções definidas (About, stats, What it does, Expected result, Configuration, Connections, Connected skills, Outputs).
- **SC-006**: O fluxo de onboarding completo (4 etapas) é navegável do início ao fim sem erros.
- **SC-007**: A Brand DNA page apresenta todas as seções do protótipo: identidade, tom de voz, diagnóstico, oportunidades, projeção e skill activation.
- **SC-008**: Zero referências visuais a "agents" ou "co-workers" em toda a interface.

## Assumptions

- O onboarding Brand DNA na Fase 0 desta feature será visual-only (mock data como no protótipo). A integração real com scraping/análise vem na Fase 1 do roadmap CMO.
- A etapa "Analyzing" do onboarding usa dados simulados com timer para demonstrar o fluxo. A análise real será conectada posteriormente.
- A apps page mostra os 13 apps mas a funcionalidade de conexão real já existe no sistema (Composio). Esta feature apenas cria a nova UI.
- As categorias de skills em PT-BR são labels visuais mapeados para as categorias inglesas do banco (`foundation`, `campaign`, etc.).
- A configuração de skills (autonomy level, briefing advance) será persistida no campo `config` da tabela `skills` existente.
- A feature assume que a branch `038-single-agent-skills` já foi mergeada (tabelas skills, skill_executions existem).

## Scope Boundaries

### Incluído nesta feature

- Novo layout (sidebar icon-only + topbar) substituindo o layout atual
- Nova home (ask bar + activity feed + active skills)
- Skills page redesenhada (categorias PT-BR, emoji icons, tabs, search)
- Skill detail page rica (about, stats, what it does, config, connections, outputs)
- Onboarding flow de 4 etapas (visual, com mock data)
- Brand DNA page conversacional (visual, com mock data)
- Apps page com 13 apps
- Expansão do skill registry de 31 para 38 skills
- Categorias em PT-BR mapeadas para o banco

### Excluído desta feature

- Brand DNA real (scraping, análise de catálogo, Instagram) — Fase 1 CMO
- Seasonal Calendar funcional (datas reais, briefings reais) — Fase 1 CMO
- Copywriter funcional — Fase 1 CMO
- Conexão real com Shopify/Nuvemshop no onboarding (já existe em outra rota)
- Campaign package, image generation, video scripts — Fase 2 CMO
- Retention engine, inventory manager — Fase 3 CMO
