# SNEW CMO — Gap Analysis & Plano de Migração

> Fontes: `snew_milkes_simulation.docx.pdf` + `snew_product_roadmap.docx.md`
> Análise: 2026-03-23

---

## Decisão Arquitetural: Single Agent + Skills

O sistema migra de **multi-agent para single-agent**:

| Antes                                                  | Depois                                                |
| ------------------------------------------------------ | ----------------------------------------------------- |
| 34 agentes especialistas                               | 1 agente (Snew) com N skills                          |
| Orquestrador delega via `SNEW_ASK_AGENT`               | Snew ativa skills diretamente                         |
| Cada agente tem chat, conversas, system prompt próprio | Um único chat, skills injetam contexto sob demanda    |
| Dashboard mostra cards de agentes                      | Dashboard mostra skills, calendário, ações, Brand DNA |
| `/api/agents/[id]/chat` por agente                     | `/api/chat` único                                     |

**Regra de ouro do roadmap**: toda skill DEVE ser agentic. Se o output é só relatório/análise, não é skill. O output deve ser uma AÇÃO executada ou um asset pronto pra usar. Detectar → Analisar → Decidir → EXECUTAR → Medir.

---

## Parte 1 — Gap vs. Simulação Milkes

O documento Milkes descreve 6 capacidades. Status atual:

```
Capacidade                    Infraestrutura    Implementação    UI/Output
─────────────────────────────────────────────────────────────────────────
1. Brand DNA                  ░░░░░░░░░░  10%   ░░░░░░░░░░  5%   ░░░░░░░░░░  0%
2. Diagnóstico CMO            ░░░░░░░░░░   5%   ░░░░░░░░░░  0%   ░░░░░░░░░░  0%
3. Top 5 Ações                ░░░░░░░░░░  10%   ░░░░░░░░░░  5%   ░░░░░░░░░░  0%
4. Seasonal Calendar          ██████░░░░  60%   ███░░░░░░░  30%  ░░░░░░░░░░  0%
5. Preview Campanha           ████░░░░░░  40%   ██░░░░░░░░  25%  ░░░░░░░░░░  0%
6. Impacto Projetado          ░░░░░░░░░░   5%   ░░░░░░░░░░  0%   ░░░░░░░░░░  0%
```

**O sistema está ~20-25% do caminho.** A infra de chat, tools e workflows é sólida. Falta a inteligência CMO e a UI estruturada.

---

## Parte 2 — Mapa de Migração: Agents → Skills

### 2.1 O que REMOVER

| Arquivo/Conceito                                                             | O que é                                                    | Por que remover                                        |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| `SNEW_ASK_AGENT` em `src/lib/ai/platform-tools.ts`                           | Tool que delega pro agent via POST `/api/agents/[id]/chat` | Não existe mais delegação inter-agente                 |
| `SNEW_LIST_AGENTS` em `platform-tools.ts`                                    | Lista agents do team                                       | Substituída por `SNEW_LIST_SKILLS`                     |
| `SNEW_GET_AGENT` em `platform-tools.ts`                                      | Detalhe de um agent                                        | Substituída por `SNEW_GET_SKILL`                       |
| `SNEW_CREATE_AGENT` em `platform-tools.ts`                                   | Cria agent com system prompt                               | Não se cria mais agents; skills vêm do registry        |
| `src/data/agents.ts` (catálogo de 34 agents)                                 | Definições estáticas dos "co-workers"                      | Migra para `src/data/skills.ts` como skill definitions |
| `src/components/chat/orchestrator-chat-wrapper.tsx` (CoworkerSuggestionCard) | Cards de sugestão de "co-workers" no chat                  | Conceito de co-workers deixa de existir                |
| `src/hooks/use-coworker-avatars.ts`                                          | Avatares dos co-workers                                    | Co-workers não existem mais                            |
| `/api/agents/[id]/chat/route.ts`                                             | Endpoint de chat por agent                                 | Todo chat passa por `/api/chat`                        |
| `src/components/agents/agents-discover-client.tsx`                           | Página "discover" de 34 agents                             | Substituída por skill library                          |
| `src/app/(dashboard)/agents/page.tsx` (catálogo)                             | Página `/agents` com "install agent"                       | Vira `/skills` com library de skills                   |

### 2.2 O que REFATORAR

| Arquivo                                             | Mudança                                                                                                                                                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`src/lib/ai/platform-tools.ts`**                  | Remover 4 tools de agent. Adicionar: `SNEW_LIST_SKILLS`, `SNEW_GET_SKILL`, `SNEW_RUN_SKILL`, `SNEW_GET_BRAND_DNA`                                                                               |
| **`src/app/api/chat/route.ts`**                     | Orquestrador carrega skills disponíveis no system prompt. Quando precisa de uma skill, injeta o prompt template + tools + knowledge da skill no contexto. Sem chamada HTTP para outro endpoint. |
| **`src/lib/ai/agent-chat.ts`**                      | Renomear para `src/lib/ai/chat-engine.ts`. `buildAgentSystemPrompt()` → `buildSystemPrompt()`. Aceita skills como input em vez de agent config.                                                 |
| **`src/lib/ai/load-agent-context.ts`**              | Renomear para `src/lib/ai/load-chat-context.ts`. Em vez de carregar config de 1 agent, carrega config do Snew + skills disponíveis + Brand DNA da loja.                                         |
| **`src/lib/actions/agents.ts`**                     | Remover `createAgent()`, `deleteAgent()`. Manter `updateAgentConfig()` apenas para o Snew (o único agent).                                                                                      |
| **`src/lib/queries/agents.ts`**                     | Simplificar. `fetchAgent()` sempre retorna o Snew. Adicionar `fetchSkills()`, `fetchSkillBySlug()`.                                                                                             |
| **`src/hooks/use-agent-chat.ts`**                   | Renomear para `use-chat.ts`. Sempre aponta para `/api/chat`. Remove lógica de agent-specific routing.                                                                                           |
| **`src/hooks/use-agents.ts`**                       | Substituir por `use-skills.ts`. Busca skills do registry em vez de agents do banco.                                                                                                             |
| **Dashboard (`agents-grid.tsx`, `agent-card.tsx`)** | Refatorar para mostrar skills agrupadas por categoria. Cards mostram: nome, descrição, status (ativa/disponível), última execução.                                                              |
| **Sidebar (`app-sidebar.ts`)**                      | Remover links de agents individuais. Adicionar seção "Skills" com categorias.                                                                                                                   |
| **Command menu (`command-menu.tsx`)**               | Substituir comandos de agent por comandos de skill.                                                                                                                                             |

### 2.3 O que MANTER (com rename)

| De                                       | Para                                      | Motivo                                                                                  |
| ---------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `agents` table                           | Manter (1 row = Snew)                     | O Snew ainda é um "agent" no banco — só existe um                                       |
| `agent_skills` table                     | `skills` table (novo schema)              | Skill model precisa ser estendido com slug, category, input/output schema, dependencies |
| `agent_conversations` + `agent_messages` | `conversations` + `conversation_messages` | Unificar. Tudo é conversa do Snew.                                                      |
| `agent_workflows`                        | `skill_workflows`                         | Workflows são acionados por skills, não por agents                                      |
| `src/components/agent-detail/`           | `src/components/skill-detail/`            | UI de detalhe de skill (config, histórico, conhecimento)                                |
| `src/hooks/use-orchestrator-chat.ts`     | `src/hooks/use-chat.ts`                   | Só existe um chat                                                                       |

### 2.4 O que CRIAR

#### Banco de dados — Nova tabela `skills`

```sql
create table skills (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id),
  slug text not null,                          -- 'brand-dna', 'copywriter', 'seasonal-calendar'
  name text not null,
  description text,
  category text not null,                      -- 'foundation', 'campaign', 'retention', 'scale'
  phase int not null default 1,                -- roadmap phase (1-4)

  -- Skill execution context
  system_prompt text,                          -- prompt template injetado quando skill ativa
  tools jsonb default '[]',                    -- tools disponíveis para esta skill
  knowledge jsonb default '[]',                -- documentos/contexto carregados
  input_schema jsonb,                          -- JSON Schema do input esperado
  output_schema jsonb,                         -- JSON Schema do output (structured output)

  -- Dependencies & state
  dependencies text[] default '{}',            -- slugs de skills que precisam rodar antes
  status text not null default 'available',    -- 'available' | 'active' | 'running' | 'deprecated'
  is_native boolean default false,             -- true = capacidade nativa do orquestrador (Brand DNA)
  requires_connections text[] default '{}',    -- app connections necessárias (ex: 'nuvemshop', 'mailchimp')

  -- Metadata
  icon text,                                   -- lucide icon name
  color text,                                  -- cor do card
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(team_id, slug)
);
```

#### Banco de dados — Nova tabela `skill_executions`

```sql
create table skill_executions (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references skills(id),
  team_id uuid references teams(id),
  conversation_id uuid references conversations(id),

  -- Execution
  input jsonb,                                 -- dados de entrada
  output jsonb,                                -- resultado estruturado
  status text not null default 'running',      -- 'running' | 'completed' | 'failed'
  duration_ms int,

  -- Context
  triggered_by text default 'user',            -- 'user' | 'auto' | 'skill' (chain)
  parent_execution_id uuid,                    -- se foi triggada por outra skill

  created_at timestamptz default now(),
  completed_at timestamptz
);
```

#### Banco de dados — Nova tabela `brand_dna`

```sql
create table brand_dna (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) unique,

  -- Perfil
  store_name text,
  store_url text,
  niche text,                                  -- 'moda bebe', 'cosmeticos', etc.
  average_ticket numeric,
  platform text,                               -- 'nuvemshop' | 'shopify'

  -- Identidade visual
  palette jsonb,                               -- { primary, secondary, accent, neutral, bg }
  typography jsonb,                             -- { heading, body, style }
  photography_style text,
  packaging_style text,

  -- Voz e tom
  tone text,                                   -- 'afetuoso e emocional', etc.
  audience text,                               -- 'mãe 25-40 anos, classe A/B'
  words_to_use text[],
  words_to_avoid text[],
  cta_style text,
  emoji_policy text,

  -- Posicionamento
  positioning text,                            -- insight de posicionamento
  differentials text[],                        -- diferenciais competitivos
  social_proof text[],                         -- provas sociais (celebridades, reviews, etc.)

  -- Metadata
  generated_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_confirmed boolean default false,          -- lojista revisou e confirmou
  raw_analysis jsonb                           -- dados brutos da análise (scraping, catalog, social)
);
```

#### Banco de dados — Nova tabela `seasonal_calendar`

```sql
create table seasonal_calendar (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id),

  date date not null,                          -- data do evento
  name text not null,                          -- 'Dia das Mães', 'Black Friday'
  category text not null,                      -- 'geral' | 'nicho' | 'continuo'
  relevance_score numeric,                     -- 0-100, calculado por nicho
  status text,                                 -- 'ativa' | 'urgente' | 'planejada' | 'ignorada'

  -- CMO content
  insight text,                                -- insight CMO específico para esta loja
  suggested_actions jsonb,                     -- ações sugeridas com skill executora
  estimated_revenue numeric,                   -- projeção de receita

  -- Campaign link
  campaign_id uuid,                            -- se já tem campanha gerada
  briefing_generated_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(team_id, date, name)
);
```

#### Código — Novos arquivos

| Arquivo                                              | Responsabilidade                                                                                                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/skills.ts`                                 | Registry de skills (substitui `agents.ts`). Definição estática de todas as skills com slug, name, category, phase, dependencies, system_prompt template.                              |
| `src/lib/ai/skill-loader.ts`                         | `loadSkill(slug)` → monta contexto de execução: system prompt + tools + knowledge + Brand DNA. `loadSkillsForOrchestrator()` → lista skills disponíveis para o system prompt do Snew. |
| `src/lib/ai/skill-executor.ts`                       | `executeSkill(slug, input, conversationId)` → roda a skill, persiste input/output em `skill_executions`, retorna resultado estruturado.                                               |
| `src/lib/ai/brand-dna-tools.ts`                      | Tools específicos do Brand DNA: `SCRAPE_STORE_URL`, `ANALYZE_CATALOG`, `ANALYZE_SOCIAL`, `SAVE_BRAND_DNA`, `GET_BRAND_DNA`.                                                           |
| `src/lib/ai/campaign-tools.ts`                       | Tools de campanha: `GENERATE_MESSAGING`, `SELECT_PRODUCTS`, `BUILD_TIMELINE`, `GENERATE_COPIES`, `GENERATE_VIDEO_SCRIPT`.                                                             |
| `src/hooks/use-skills.ts`                            | Hook para buscar skills do team (substitui `use-agents.ts`).                                                                                                                          |
| `src/hooks/use-brand-dna.ts`                         | Hook para ler/editar Brand DNA do team.                                                                                                                                               |
| `src/hooks/use-seasonal-calendar.ts`                 | Hook para ler calendário sazonal do team.                                                                                                                                             |
| `src/components/skills/skill-card.tsx`               | Card de skill para dashboard (substitui `agent-card.tsx`).                                                                                                                            |
| `src/components/skills/skill-library.tsx`            | Grid de skills disponíveis por categoria (substitui agents discover).                                                                                                                 |
| `src/components/skills/skill-detail.tsx`             | Detalhe de skill: descrição, config, últimas execuções, outputs.                                                                                                                      |
| `src/components/brand-dna/brand-dna-view.tsx`        | Visualização do Brand DNA (paleta, tom, vocabulário).                                                                                                                                 |
| `src/components/brand-dna/brand-dna-editor.tsx`      | Edição inline do Brand DNA pelo lojista.                                                                                                                                              |
| `src/components/calendar/seasonal-calendar-view.tsx` | Tabela visual do calendário sazonal com cores por status.                                                                                                                             |
| `src/components/calendar/date-briefing.tsx`          | Briefing expandido de uma data sazonal.                                                                                                                                               |
| `src/components/campaign/campaign-preview.tsx`       | Preview completo de campanha (messaging, produtos, timeline, copies, scripts).                                                                                                        |
| `src/components/dashboard/top-actions.tsx`           | Top 5 ações priorizadas com estimativa de impacto.                                                                                                                                    |
| `src/components/dashboard/cmo-diagnostic.tsx`        | Cards de forças/oportunidades/riscos.                                                                                                                                                 |
| `src/app/(dashboard)/skills/page.tsx`                | Página `/skills` — library de skills (substitui `/agents`).                                                                                                                           |
| `src/app/(dashboard)/brand-dna/page.tsx`             | Página `/brand-dna` — visualização e edição.                                                                                                                                          |
| `src/app/(dashboard)/calendar/page.tsx`              | Página `/calendar` — calendário sazonal.                                                                                                                                              |

---

## Parte 3 — Plano de Desenvolvimento por Fase

### Fase 0 — Migração Arquitetural (BLOQUEANTE)

> Sem essa fase, nada do resto funciona. Não é feature — é refatoração.

**Escopo**: Transformar a infra multi-agent em single-agent + skills.

#### 0.1 — Tabela `skills` + migration

- Criar tabela `skills` (schema acima)
- Criar tabela `skill_executions`
- Migration para popular skills iniciais a partir do catálogo de 34 agents

#### 0.2 — Skill registry (`src/data/skills.ts`)

- Migrar `src/data/agents.ts` → `src/data/skills.ts`
- Cada entrada vira: `{ slug, name, description, category, phase, icon, dependencies, systemPrompt, tools, requiredConnections }`
- Categorias: `foundation`, `campaign`, `content`, `retention`, `analytics`, `ads`, `operations`, `scale`

#### 0.3 — Skill loader + executor

- `loadSkill(slug)` → resolve system prompt + tools + knowledge + Brand DNA
- `executeSkill(slug, input)` → roda e persiste resultado
- Orquestrador usa skill loader para montar contexto sob demanda

#### 0.4 — Refatorar platform tools

- Remover: `SNEW_ASK_AGENT`, `SNEW_LIST_AGENTS`, `SNEW_GET_AGENT`, `SNEW_CREATE_AGENT`
- Adicionar: `SNEW_LIST_SKILLS`, `SNEW_GET_SKILL`, `SNEW_RUN_SKILL`, `SNEW_GET_BRAND_DNA`

#### 0.5 — Refatorar chat route

- `/api/chat/route.ts`: carregar skills disponíveis no system prompt do Snew
- Quando Snew decide usar uma skill, injeta o prompt template + tools da skill no fluxo
- Sem HTTP call para outro endpoint

#### 0.6 — Unificar conversas

- Toda conversa é do Snew → tabela `conversations` + `conversation_messages`
- Deprecar `agent_conversations` + `agent_messages` (manter dados históricos, nova inserção só nas novas tabelas)

#### 0.7 — Refatorar UI

- Dashboard: `agents-grid` → `skills-grid` (agrupado por categoria)
- Sidebar: remover links de agents individuais, adicionar "Skills" section
- `/agents` → `/skills` (skill library com ativação)
- Remover: CoworkerSuggestionCard, coworker avatars

**Definição de pronto da Fase 0**: Snew é o único agent. Skills estão no registry. Chat funciona via `/api/chat` com skill loading. Dashboard mostra skills. Nenhuma referência a "co-workers" ou multi-agent.

---

### Fase 1 — Foundation (Brand DNA + Copywriter + Seasonal Calendar)

> "Se essa fase não convence, nada do resto importa." — Roadmap
>
> Entregável: demo de 3 minutos. Conectar loja → Brand DNA → Calendário → Briefing → Copies prontas.

#### 1.1 — Brand DNA (nativo do orquestrador)

| Tarefa                                                      | Complexidade | Dependência           |
| ----------------------------------------------------------- | ------------ | --------------------- |
| Tabela `brand_dna` + migration                              | Baixa        | Fase 0                |
| Tool `SCRAPE_STORE_URL` (cores, tipografia, estilo)         | Média        | Nenhuma               |
| Tool `ANALYZE_CATALOG` (naming, preço, categorias → nicho)  | Baixa        | API Nuvemshop/Shopify |
| Tool `ANALYZE_SOCIAL` (tom, emoji, frequência)              | Média        | Instagram público     |
| Geração do BrandDNA JSON estruturado via LLM                | Baixa        | Tools acima           |
| Tool `SAVE_BRAND_DNA` + `GET_BRAND_DNA`                     | Baixa        | Tabela pronta         |
| UI: tela de visualização/edição do Brand DNA                | Média        | Frontend              |
| Auto-trigger no onboarding (conectou loja → roda brand-dna) | Média        | Skill executor        |

**Pronto quando**: Lojista conecta loja → em 10s tem Brand DNA completo → pode editar → o perfil alimenta todas as skills.

#### 1.2 — Copywriter (skill)

| Tarefa                                                              | Complexidade | Dependência      |
| ------------------------------------------------------------------- | ------------ | ---------------- |
| Skill definition com system prompt + Brand DNA context              | Baixa        | Brand DNA        |
| Engine de geração de copy por canal                                 | Média        | LLM + Brand DNA  |
| Templates de formato por canal (e-mail, WA, ads, social, push, SMS) | Baixa        | Nenhuma          |
| Filtro de Brand DNA (tom, vocabulário, palavras proibidas)          | Média        | Brand DNA pronto |
| Variações A/B de subject lines                                      | Baixa        | LLM              |
| Contagem de caracteres por canal (SMS 160, push 100)                | Baixa        | Nenhuma          |
| Interface de edição inline                                          | Média        | Frontend         |

**Pronto quando**: Recebe briefing → gera messaging central + 12-15 copies para todos os canais → respeita Brand DNA + limites do canal → editável → exportável.

#### 1.3 — Seasonal Calendar (skill)

| Tarefa                                                      | Complexidade | Dependência          |
| ----------------------------------------------------------- | ------------ | -------------------- |
| Tabela `seasonal_calendar` + migration                      | Baixa        | Fase 0               |
| Análise de catálogo + inferência de nicho                   | Média        | API Nuvemshop + LLM  |
| Banco de 30+ datas sazonais (gerais + nicho)                | Baixa        | Curadoria + LLM      |
| Cálculo de score por data (histórico × relevância ao nicho) | Média        | Orders API           |
| Countdown dinâmico (D-X) + status (Ativa/Urgente/Futura)    | Baixa        | Nenhuma              |
| Geração de briefing automático no D-60                      | Média        | LLM + dados da loja  |
| Alertas progressivos (D-45/D-30/D-15)                       | Baixa        | Job scheduler (cron) |
| Conexão com Copywriter (gerar copies do briefing)           | Baixa        | Skill 1.2 pronta     |
| UI: tela de calendário anual (timeline/tabela)              | Alta         | Frontend             |
| UI: tela de briefing expandido                              | Média        | Frontend             |
| Modo de edição (add/remove/ignorar datas)                   | Média        | Frontend             |

**Pronto quando**: Calendário com 30+ datas aparece em segundos → cada data com score e status → briefing no D-60 → copies geradas → alertas funcionando.

#### Entregável da Fase 1

> Conectar loja → Brand DNA gerado → calendário com 30+ datas → clicar em data → briefing completo → copies prontas para todos os canais.

**O que NÃO entra**: Geração de imagens (só texto). Publicação automática. Criação de ads. Envio de e-mail (copies prontas pra copiar, não pra disparar).

---

### Fase 2 — Campaign Package Completo

> Depende de: Fase 1 completa.
>
> Entregável: lojista aprova briefing → campanha completa com 24 assets (copies + imagens + social + video scripts).

#### 2.1 — Image Generator (skill)

| Tarefa                                                         | Complexidade |
| -------------------------------------------------------------- | ------------ |
| Mock engine (placeholders com cores da marca + texto)          | Baixa        |
| Formatos por canal (1080x1080, 1080x1920, 600x200)             | Baixa        |
| Integração com tool de imagem real (DALL-E/Flux/Ideogram) — v2 | Alta         |
| Hosting de imagens (S3/CDN)                                    | Média        |
| Interface de preview + regenerate                              | Média        |

#### 2.2 — Social Asset Creator (skill)

| Tarefa                                            | Complexidade |
| ------------------------------------------------- | ------------ |
| Adaptação de copy por plataforma (IG, FB, TikTok) | Baixa        |
| Geração de hashtags por nicho + trending          | Média        |
| Integração Meta Graph API (publicação IG + FB)    | Alta         |
| Download/export ZIP                               | Baixa        |
| Preview visual (mockup de feed/stories)           | Média        |

#### 2.3 — Video Script Creator (skill)

| Tarefa                                          | Complexidade |
| ----------------------------------------------- | ------------ |
| Engine de hooks (3 variações)                   | Baixa        |
| Scripts com marcações de tempo (30s e 60s)      | Média        |
| Notas de produção (trilha, formato, transições) | Baixa        |
| Kit de produção exportável (script + shot list) | Baixa        |

#### 2.4 — Campaign Package (tela unificada)

| Tarefa                                                       | Complexidade |
| ------------------------------------------------------------ | ------------ |
| Tela com tabs (All, Copies, Images, Social, Video, Timeline) | Alta         |
| Integração com e-mail tool (Mailchimp, Shopify Email)        | Alta         |
| Criação de ads em draft no Meta Ads (PAUSED)                 | Alta         |
| Timeline com assets vinculados por data                      | Média        |
| Botão "Launch campaign" (modo com aprovação)                 | Média        |

---

### Fase 3 — Retenção e Operações

> Entregável: clientes em risco reativados automaticamente, estoque monitorado, top 5 ações diárias.

#### 3.1 — Retention Engine (skill)

- Segmentação por comportamento (win-back, nurture, VIP)
- Fluxo multi-touch (3 toques em 7 dias)
- Cupom único por cliente
- Disparo via e-mail tool conectada
- Relatório de retenção

#### 3.2 — Inventory Manager (skill)

- Monitoramento de estoque em tempo real por SKU
- Previsão de ruptura (D-7, D-3, D-1)
- Ordem de compra (PDF/e-mail)
- Pausa automática de ads de produto sem estoque
- Badge "últimas unidades" na loja

#### 3.3 — Ops Pilot (skill)

- Agregador de outputs de todas as skills ativas
- Ranqueamento por impacto estimado em receita
- Top 5 ações diárias por e-mail e na home
- Briefing semanal executivo (toda segunda)
- Botões de ação em cada item (approve, activate, etc.)

---

### Fase 4 — Escala

> Entregável: plataforma completa de CMO com 13+ skills.

- **4.1 Ad Campaign Manager** — Pausa ineficientes, redistribui budget, detecta fadiga de criativo
- **4.2 Financial Pulse** — P&L simplificado, detecção de anomalias
- **4.3 Customer Service Agent** — Chat widget 24/7 na loja
- **4.4 Review Collector** — Solicita reviews pós-entrega, responde negativos com tom da marca
- **4.5 Competitor Intelligence** — Monitora concorrentes via Meta Ad Library + homepage

---

## Parte 4 — Impacto no Codebase (Inventário Completo)

### Arquivos para DELETAR

| Arquivo                                                                            | Motivo                                                       |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/data/agents.ts`                                                               | Catálogo de 34 agents → substituído por `src/data/skills.ts` |
| `src/components/agents/agents-discover-client.tsx`                                 | Página discover → substituída por skill library              |
| `src/hooks/use-coworker-avatars.ts`                                                | Co-workers não existem mais                                  |
| `src/components/chat/orchestrator-chat-wrapper.tsx` (CoworkerSuggestionCard logic) | Sugestão de co-workers removida                              |

### Arquivos para REFATORAR (alto impacto)

| Arquivo                                       | Mudança                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/lib/ai/platform-tools.ts` (~1700 linhas) | Remover 4 tools SNEW*\*\_AGENT. Adicionar SNEW*\*\_SKILL + SNEW_GET_BRAND_DNA. |
| `src/app/api/chat/route.ts`                   | Carregar skills no system prompt. Skill invocation direta (sem HTTP).          |
| `src/lib/ai/agent-chat.ts`                    | → `chat-engine.ts`. Aceitar skills como input.                                 |
| `src/lib/ai/load-agent-context.ts`            | → `load-chat-context.ts`. Carregar Snew config + skills + Brand DNA.           |
| `src/lib/actions/agents.ts`                   | Simplificar — só CRUD do Snew (único agent).                                   |
| `src/lib/queries/agents.ts`                   | Adicionar `fetchSkills()`, `fetchSkillBySlug()`.                               |
| `src/hooks/use-agent-chat.ts`                 | → `use-chat.ts`. Sempre aponta para `/api/chat`.                               |
| `src/hooks/use-agents.ts`                     | → `use-skills.ts`.                                                             |
| `src/components/dashboard/agents-grid.tsx`    | → `skills-grid.tsx`. Agrupa por categoria.                                     |
| `src/components/dashboard/agent-card.tsx`     | → `skill-card.tsx`.                                                            |
| `src/app/(dashboard)/agents/page.tsx`         | → `/skills/page.tsx`. Skill library.                                           |
| `src/app/(dashboard)/agents/[id]/page.tsx`    | → `/skills/[slug]/page.tsx`. Detalhe de skill.                                 |
| `src/components/app-sidebar.ts`               | Remover agent links. Adicionar Skills section.                                 |
| `src/components/command-menu.tsx`             | Substituir comandos de agent por skill.                                        |

### Migrations necessárias

| Migration                        | Tabela                                                              |
| -------------------------------- | ------------------------------------------------------------------- |
| `create_skills_table`            | `skills` — registry de skills                                       |
| `create_skill_executions_table`  | `skill_executions` — histórico de execuções                         |
| `create_brand_dna_table`         | `brand_dna` — identidade da marca                                   |
| `create_seasonal_calendar_table` | `seasonal_calendar` — calendário sazonal                            |
| `seed_initial_skills`            | Popular skills da Fase 1 (brand-dna, copywriter, seasonal-calendar) |
| `deprecate_agent_conversations`  | Marcar `agent_conversations` + `agent_messages` como legacy         |

### Arquivos para CRIAR

| Arquivo                                              | Responsabilidade                                  |
| ---------------------------------------------------- | ------------------------------------------------- |
| `src/data/skills.ts`                                 | Registry de skills (34 entradas migradas + novas) |
| `src/lib/ai/skill-loader.ts`                         | `loadSkill(slug)`, `loadSkillsForOrchestrator()`  |
| `src/lib/ai/skill-executor.ts`                       | `executeSkill(slug, input, conversationId)`       |
| `src/lib/ai/brand-dna-tools.ts`                      | Tools de Brand DNA (scrape, analyze, save, get)   |
| `src/lib/ai/campaign-tools.ts`                       | Tools de campanha (messaging, timeline, copies)   |
| `src/hooks/use-skills.ts`                            | Query hook para skills                            |
| `src/hooks/use-brand-dna.ts`                         | Query hook para Brand DNA                         |
| `src/hooks/use-seasonal-calendar.ts`                 | Query hook para calendário                        |
| `src/components/skills/skill-card.tsx`               | Card de skill para grid                           |
| `src/components/skills/skill-library.tsx`            | Grid de skills por categoria                      |
| `src/components/skills/skill-detail.tsx`             | Detalhe com config/execuções                      |
| `src/components/brand-dna/brand-dna-view.tsx`        | Visualização do Brand DNA                         |
| `src/components/brand-dna/brand-dna-editor.tsx`      | Edição inline                                     |
| `src/components/calendar/seasonal-calendar-view.tsx` | Tabela visual do calendário                       |
| `src/components/calendar/date-briefing.tsx`          | Briefing expandido por data                       |
| `src/components/campaign/campaign-preview.tsx`       | Preview completo de campanha                      |
| `src/components/dashboard/top-actions.tsx`           | Top 5 ações priorizadas                           |
| `src/components/dashboard/cmo-diagnostic.tsx`        | Cards de forças/oportunidades/riscos              |
| `src/app/(dashboard)/skills/page.tsx`                | Página `/skills`                                  |
| `src/app/(dashboard)/brand-dna/page.tsx`             | Página `/brand-dna`                               |
| `src/app/(dashboard)/calendar/page.tsx`              | Página `/calendar`                                |

---

## Parte 5 — Sequência de Execução

```
Fase 0 (Migração Agents → Skills)           ← BLOQUEANTE
  0.1 Tabelas skills + skill_executions
  0.2 src/data/skills.ts (registry)
  0.3 skill-loader.ts + skill-executor.ts
  0.4 Refatorar platform-tools.ts
  0.5 Refatorar /api/chat/route.ts
  0.6 Unificar conversas
  0.7 Refatorar UI (dashboard, sidebar, pages)
  ↓
Fase 1 (Foundation — Brand DNA + Copywriter + Calendar)
  1.1 Tabela brand_dna + brand-dna-tools.ts
  1.2 Skill copywriter (system prompt + Brand DNA filter)
  1.3 Tabela seasonal_calendar + skill seasonal-calendar
  1.4 UI: Brand DNA view/editor
  1.5 UI: Seasonal calendar view + briefing
  1.6 Pipeline de onboarding (conectou → Brand DNA → Calendar auto)
  ↓
Fase 2 (Campaign Package)
  2.1 Image Generator (mock first, real later)
  2.2 Social Asset Creator
  2.3 Video Script Creator
  2.4 Campaign Package (tela unificada com tabs)
  ↓
Fase 3 (Retenção + Operações)
  3.1 Retention Engine
  3.2 Inventory Manager
  3.3 Ops Pilot (top 5 diário + briefing semanal)
  ↓
Fase 4 (Escala)
  4.1 Ad Campaign Manager
  4.2 Financial Pulse
  4.3 Customer Service Agent
  4.4 Review Collector
  4.5 Competitor Intelligence
```

---

## Timeline Estimada

| Fase  | Escopo                                      | Estimativa      | Milestone           |
| ----- | ------------------------------------------- | --------------- | ------------------- |
| **0** | **Migração agents → skills**                | **2-3 semanas** | **Infra pronta**    |
| **1** | **Brand DNA + Copywriter + Calendar**       | **6-8 semanas** | **Demo funcional**  |
| 2     | Image Gen + Social + Video + Package        | 6-8 semanas     | Campanha completa   |
| 3     | Retention + Inventory + Ops Pilot           | 6-8 semanas     | Retenção ativa      |
| 4     | Ads + Financial + CS + Reviews + Competitor | 8-12 semanas    | Plataforma completa |

**Marcos críticos**:

- **Primeira demo** (fim Fase 1): conceito funciona, lojista vê valor em 3 min
- **Primeiro lojista real** (início Fase 2): funciona com dados reais
- **Primeira campanha executada** (meio Fase 2): lojista publicou assets gerados pelo Snew
- **Primeira retenção medida** (fim Fase 3): clientes reativados com receita atribuída
- **10 lojistas ativos** (fim Fase 4): produto funciona em escala mínima

---

## Decisões Pendentes

| Decisão                                   | Impacto | Quando                | Opções                                    |
| ----------------------------------------- | ------- | --------------------- | ----------------------------------------- |
| Tool de geração de imagem                 | Alto    | Antes da Fase 2       | DALL-E / Flux / Ideogram / Engine própria |
| WhatsApp: API oficial ou export           | Médio   | Fase 3                | Meta Cloud API / Twilio / Export          |
| Widget de chat CS: próprio ou open-source | Alto    | Antes da Fase 4       | Custom / Chatwoot / Tawk.to               |
| Nuvemshop sem custo de produto            | Médio   | Fase 3                | Input manual / CSV / ERP                  |
| Shopify vs. Nuvemshop: priorizar qual     | Alto    | Fase 1                | Shopify first (API completa) ou ambos     |
| Pricing do produto                        | Alto    | Antes de lojista real | Por skill / Bundle / Flat fee             |
