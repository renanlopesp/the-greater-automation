# Feature Specification: Single Agent + Skills Migration

**Feature Branch**: `038-single-agent-skills`
**Created**: 2026-03-23
**Status**: Draft
**Input**: Migração de Multi-Agent para Single Agent + Skills. O sistema atual tem 34 agentes especialistas + 1 orquestrador que delega via SNEW_ASK_AGENT. Precisa migrar para 1 único agente (Snew) onde o catálogo de 34 agents vira skills. Escopo: Fase 0 do roadmap — migração arquitetural.

## User Scenarios & Testing

### User Story 1 - Snew responde usando skills em vez de delegar para agents (Priority: P1)

O lojista abre o chat do Snew e faz uma pergunta que antes seria delegada para um agente especialista (ex: "gera uma copy pra minha campanha de Dia das Mães"). Em vez de o orquestrador chamar `SNEW_ASK_AGENT` para o agent `campaign-copywriter`, o Snew carrega a skill `copywriter` (prompt template + tools + knowledge) e responde diretamente, sem mudança de contexto ou chamada HTTP para outro endpoint.

**Why this priority**: É o core da migração. Se o chat não funciona com skills em vez de agents, nada mais importa. Todo o valor do produto depende do Snew conseguir ativar skills sob demanda.

**Independent Test**: Pode ser testado enviando uma mensagem no chat que antes trigava SNEW_ASK_AGENT e verificando que a resposta vem diretamente do Snew com o contexto da skill carregado.

**Acceptance Scenarios**:

1. **Given** o lojista está no chat do Snew, **When** envia uma mensagem que requer uma skill específica (ex: "escreve uma copy para Instagram"), **Then** o Snew ativa a skill `copywriter` internamente e responde com o output da skill, sem criar conversa em outro agent.
2. **Given** o lojista está no chat do Snew, **When** envia uma mensagem genérica que não requer skill (ex: "quantos pedidos tive hoje?"), **Then** o Snew responde usando os retail tools diretamente, sem ativar nenhuma skill.
3. **Given** o lojista está no chat, **When** envia uma mensagem que requer uma skill não disponível (ex: skill que depende de conexão não configurada), **Then** o Snew informa que a skill está disponível mas requer configuração, e orienta o lojista.

---

### User Story 2 - Skill registry substitui catálogo de agents (Priority: P1)

O sistema mantém um registry de skills que substitui o catálogo estático de 34 agents. Cada skill tem slug, nome, descrição, categoria, system prompt, tools disponíveis e dependências. O orquestrador consulta esse registry para saber quais skills pode usar.

**Why this priority**: Sem o registry, o orquestrador não sabe quais skills existem nem como ativá-las. É a fundação de dados da nova arquitetura.

**Independent Test**: Pode ser testado verificando que o registry existe, contém as skills migradas do catálogo de agents, e que cada skill tem os campos obrigatórios preenchidos.

**Acceptance Scenarios**:

1. **Given** o sistema é inicializado, **When** o registry de skills é consultado, **Then** retorna todas as skills disponíveis com slug, nome, descrição, categoria e status.
2. **Given** um lojista tem a skill `copywriter` ativa, **When** o sistema carrega o contexto do Snew para o chat, **Then** a skill `copywriter` aparece na lista de skills disponíveis do system prompt.
3. **Given** uma skill tem `requires_connections: ['nuvemshop']`, **When** o lojista não tem Nuvemshop conectada, **Then** a skill aparece como "disponível mas não configurada" e não é ativável.

---

### User Story 3 - Dashboard mostra skills em vez de agents (Priority: P2)

O dashboard principal que antes mostrava cards de agents (co-workers) agora mostra cards de skills agrupadas por categoria (Foundation, Campaign, Content, Retention, Analytics, Ads, Operations, Scale). Cada card mostra nome, descrição, status (ativa/disponível/requer configuração) e última execução.

**Why this priority**: É a mudança visual mais significativa para o lojista. O dashboard é a primeira tela que ele vê. Precisa refletir a nova arquitetura, mas o produto funciona mesmo com o dashboard antigo temporariamente.

**Independent Test**: Pode ser testado abrindo o dashboard e verificando que mostra skills agrupadas por categoria em vez de agent cards.

**Acceptance Scenarios**:

1. **Given** o lojista abre o dashboard, **When** a página carrega, **Then** vê cards de skills agrupadas por categoria em vez de cards de agents.
2. **Given** o lojista vê uma skill com status "disponível", **When** clica no card, **Then** vê detalhes da skill (descrição, o que faz, conexões necessárias) e pode ativá-la.
3. **Given** o lojista tem 3 skills ativas, **When** abre o dashboard, **Then** as skills ativas aparecem em destaque com informações de última execução.

---

### User Story 4 - Navegação e sidebar refletem skills (Priority: P2)

A sidebar e command menu (Cmd+K) são atualizados para refletir skills em vez de agents. A sidebar mostra seção "Skills" com categorias. O command menu permite buscar e navegar para skills.

**Why this priority**: Navegação consistente com a nova arquitetura. Sem isso o lojista vê referências a "agents" que não existem mais, criando confusão.

**Independent Test**: Pode ser testado abrindo a sidebar e command menu e verificando que mostram skills em vez de agents.

**Acceptance Scenarios**:

1. **Given** o lojista está em qualquer página, **When** olha a sidebar, **Then** vê seção "Skills" com categorias em vez de links para agents individuais.
2. **Given** o lojista está em qualquer página, **When** abre o command menu (Cmd+K) e digita um nome de skill, **Then** vê a skill nos resultados e pode navegar para ela.
3. **Given** o lojista está na sidebar, **When** não existem referências visuais a "agents", "co-workers" ou avatares de agents, **Then** a navegação é consistente com a nova arquitetura.

---

### User Story 5 - Execuções de skills são rastreadas (Priority: P3)

Quando o Snew ativa uma skill para responder uma mensagem, a execução é registrada com input, output, duração e status. O lojista pode ver o histórico de execuções de cada skill.

**Why this priority**: Observabilidade. Sem tracking, não tem como saber se skills estão funcionando, quanto demoram, ou debugar problemas. É importante mas não bloqueia o funcionamento.

**Independent Test**: Pode ser testado ativando uma skill via chat e verificando que a execução aparece no histórico.

**Acceptance Scenarios**:

1. **Given** o Snew ativa a skill `copywriter` para responder uma mensagem, **When** a skill completa, **Then** uma entrada de execução é criada com input, output estruturado, duração e status "completed".
2. **Given** uma skill falha durante execução, **When** o erro ocorre, **Then** a execução é registrada com status "failed" e mensagem de erro.
3. **Given** o lojista navega para o detalhe de uma skill, **When** abre a aba de histórico, **Then** vê as últimas execuções com data, duração e status.

---

### User Story 6 - Conversas unificadas (Priority: P3)

Todas as conversas acontecem no chat do Snew. Não existem mais conversas separadas por agent. O histórico de conversas é unificado — o lojista tem um único lugar para ver todas as interações.

**Why this priority**: Simplifica o modelo mental do lojista. Em vez de navegar entre chats de diferentes agents, tudo está em um lugar. É a consequência natural de ter um único agent.

**Independent Test**: Pode ser testado verificando que novas mensagens são salvas na tabela de conversas do orquestrador e que não são criadas conversas em tabelas de agents.

**Acceptance Scenarios**:

1. **Given** o lojista envia uma mensagem que ativa uma skill, **When** a mensagem e resposta são salvas, **Then** ambas estão na tabela de conversas do Snew (não em agent_conversations).
2. **Given** o lojista abre o histórico de conversas, **When** vê a lista, **Then** todas as conversas estão em um único lugar, independente de qual skill foi ativada.
3. **Given** existem conversas históricas nas tabelas de agents (pré-migração), **When** o sistema acessa dados históricos, **Then** os dados antigos continuam acessíveis (não são deletados) mas novas conversas vão para a tabela unificada.

---

### Edge Cases

- O que acontece quando uma skill ativa depende de outra skill que não está ativa? O sistema informa a dependência e sugere ativação.
- O que acontece quando o lojista tinha conversas com agents específicos antes da migração? Dados históricos são preservados mas não aparecem no novo fluxo de conversas.
- O que acontece quando duas skills são necessárias na mesma resposta (ex: seasonal-calendar + copywriter para gerar um briefing com copies)? O Snew compõe as skills sequencialmente no mesmo fluxo.
- O que acontece se o registry de skills está vazio (novo team sem skills ativas)? O Snew funciona como chat genérico com retail tools, e sugere ativar skills.
- O que acontece com workflows existentes vinculados a agents? Workflows migram para a nova estrutura de skills mantendo vínculo funcional.

## Requirements

### Functional Requirements

- **FR-001**: O sistema DEVE manter um registry de skills com slug, nome, descrição, categoria, system prompt, tools, knowledge, dependências e status.
- **FR-002**: O Snew (único agent) DEVE carregar skills disponíveis no seu system prompt e ativá-las sob demanda durante o chat.
- **FR-003**: O sistema DEVE substituir os tools `SNEW_ASK_AGENT`, `SNEW_LIST_AGENTS`, `SNEW_GET_AGENT`, `SNEW_CREATE_AGENT` por equivalentes de skills (`SNEW_LIST_SKILLS`, `SNEW_GET_SKILL`, `SNEW_RUN_SKILL`).
- **FR-004**: Todo chat DEVE passar por um único endpoint. O endpoint de chat por agent DEVE ser deprecado.
- **FR-005**: O dashboard DEVE mostrar skills agrupadas por categoria em vez de cards de agents.
- **FR-006**: A sidebar DEVE mostrar seção "Skills" em vez de links para agents individuais.
- **FR-007**: O command menu DEVE permitir buscar e navegar para skills.
- **FR-008**: O sistema DEVE registrar execuções de skills com input, output, duração e status.
- **FR-009**: Novas conversas DEVEM ser salvas na tabela unificada de conversas do Snew. Tabelas de conversas por agent DEVEM ser marcadas como legacy.
- **FR-010**: O sistema DEVE migrar as 34 definições de agents do catálogo para definições de skills no registry.
- **FR-011**: Skills com dependências DEVEM validar que as skills dependentes estão ativas antes de executar.
- **FR-012**: Skills com conexões obrigatórias DEVEM verificar que as conexões estão configuradas antes de ativar.
- **FR-013**: O sistema DEVE preservar dados históricos das tabelas de agents (conversas, mensagens) sem deletá-los.
- **FR-014**: Workflows existentes vinculados a agents DEVEM ser migrados para a nova estrutura de skills.

### Key Entities

- **Skill**: Unidade de capacidade do Snew. Contém prompt template, tools disponíveis, knowledge base, schema de input/output, dependências e status. Substitui o conceito de "agent especialista".
- **Skill Execution**: Registro de uma execução de skill — input recebido, output gerado, duração, status (running/completed/failed), qual conversa triggou.
- **Skill Registry**: Coleção de todas as skills disponíveis para um team. Combina definições estáticas (code) com estado por team (ativa/inativa, configurações).
- **Conversation (unificada)**: Toda interação do lojista com o Snew, independente de qual skill foi ativada. Substitui agent_conversations.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Todas as interações que antes passavam por delegação inter-agent agora são resolvidas diretamente pelo Snew via skills, sem chamada para endpoints de agents.
- **SC-002**: O lojista consegue usar o chat do Snew e receber respostas com contexto de skills em menos de 5 segundos (tempo de resposta não degrada vs. modelo anterior).
- **SC-003**: O dashboard mostra skills agrupadas por categoria, sem nenhuma referência visual a "agents", "co-workers" ou avatares de agents.
- **SC-004**: 100% das 34 definições de agents estão migradas para o registry de skills com campos obrigatórios preenchidos.
- **SC-005**: Dados históricos de conversas com agents (pré-migração) continuam acessíveis e não são perdidos.
- **SC-006**: Toda execução de skill é registrada com input, output, duração e status rastreáveis.
- **SC-007**: A navegação (sidebar + command menu) é consistente — zero referências a "agents" como entidades separadas.

## Assumptions

- O Snew continua existindo como uma row na tabela `agents` (é o único agent). A tabela não é deletada, apenas simplificada.
- Skills do registry podem ser estáticas (definidas em código) com estado por team no banco (ativa/inativa). Não é necessário CRUD completo de skills pelo lojista na Fase 0.
- A migração de dados históricos é conservadora: tabelas antigas ficam como legacy, novos dados vão para tabelas novas. Não há migration destrutiva.
- O endpoint de chat por agent é deprecado mas não removido imediatamente — pode retornar erro ou redirect para o endpoint único.
- A Fase 0 não inclui implementação de novas skills (Brand DNA, Campaign Generator, etc.) — apenas a infraestrutura para que skills possam ser adicionadas.

## Scope Boundaries

### Incluído nesta feature

- Tabelas `skills` e `skill_executions` no banco
- Skill registry com as 34 definições migradas
- Skill loader e executor
- Refatoração de platform tools (remover tools de agent, adicionar tools de skill)
- Refatoração do chat route (skill invocation direta)
- Unificação de conversas (novas conversas na tabela do orquestrador)
- Refatoração de UI (dashboard, sidebar, command menu, pages)
- Deprecação de rotas e tabelas de agents

### Excluído desta feature (Fases futuras)

- Brand DNA (Fase 1)
- Copywriter como skill real com Brand DNA filter (Fase 1)
- Seasonal Calendar com cruzamento de nicho (Fase 1)
- Campaign Generator, Image Generator, Social Assets (Fase 2)
- Retention Engine, Inventory Manager, Ops Pilot (Fase 3)
- Tabelas `brand_dna`, `seasonal_calendar` (Fase 1)
- UI de Brand DNA, calendário, campaign preview (Fases 1-2)
