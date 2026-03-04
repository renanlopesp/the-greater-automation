# Relay Platform - Documentacao Completa de Funcionalidades

> **Ultima atualizacao**: 2026-03-03
> **Versao**: Next.js 16.1.6, React 19.2.3, TypeScript 5

Relay e uma plataforma de automacao com IA para e-commerce, construida com Next.js 16 e integrada com Nuvemshop, Shopify, Composio (200+ apps), Telegram e Stripe. O sistema combina agentes de IA especializados, workflows visuais e ferramentas de retail intelligence para automatizar operacoes de loja.

---

## Indice

1. [Visao Geral da Arquitetura](#1-visao-geral-da-arquitetura)
2. [Autenticacao e Gerenciamento de Usuarios](#2-autenticacao-e-gerenciamento-de-usuarios)
3. [Onboarding](#3-onboarding)
4. [Dashboard](#4-dashboard)
5. [Workspace](#5-workspace)
6. [Sistema de Agentes](#6-sistema-de-agentes)
7. [Chat com Agentes](#7-chat-com-agentes)
8. [Skills de Agentes](#8-skills-de-agentes)
9. [Sistema de Workflows](#9-sistema-de-workflows)
10. [Editor Visual de Workflows](#10-editor-visual-de-workflows)
11. [Execucao de Workflows](#11-execucao-de-workflows)
12. [Ferramentas de Retail (STORE\_\*)](#12-ferramentas-de-retail-store_)
13. [Integracao Nuvemshop](#13-integracao-nuvemshop)
14. [Sincronizacao de Dados](#14-sincronizacao-de-dados)
15. [Webhooks Nuvemshop](#15-webhooks-nuvemshop)
16. [Alertas de Estoque](#16-alertas-de-estoque)
17. [Notificacoes de Pedidos](#17-notificacoes-de-pedidos)
18. [Carrinhos Abandonados](#18-carrinhos-abandonados)
19. [Resumo Diario de Vendas](#19-resumo-diario-de-vendas)
20. [Monitoramento de Precos](#20-monitoramento-de-precos)
21. [Previsao de Demanda](#21-previsao-de-demanda)
22. [Analise RFM de Clientes](#22-analise-rfm-de-clientes)
23. [Analise ABC de Produtos](#23-analise-abc-de-produtos)
24. [Estimativa de LTV](#24-estimativa-de-ltv)
25. [Sugestao de Bundles](#25-sugestao-de-bundles)
26. [Sugestao de Preco](#26-sugestao-de-preco)
27. [Previsao de Churn](#27-previsao-de-churn)
28. [Analise de Cohort](#28-analise-de-cohort)
29. [Markdown Optimization](#29-markdown-optimization)
30. [Simulacao de Elasticidade](#30-simulacao-de-elasticidade)
31. [Integracao Composio](#31-integracao-composio)
32. [Integracao Telegram](#32-integracao-telegram)
33. [Paginas de Produtos](#33-paginas-de-produtos)
34. [Historico de Execucoes (Runs)](#34-historico-de-execucoes-runs)
35. [Configuracoes](#35-configuracoes)
36. [Billing e Planos (Stripe)](#36-billing-e-planos-stripe)
37. [Cron Jobs e Agendamento](#37-cron-jobs-e-agendamento)
38. [Esquema do Banco de Dados](#38-esquema-do-banco-de-dados)
39. [Rotas de API](#39-rotas-de-api)
40. [Infraestrutura e Stack Tecnico](#40-infraestrutura-e-stack-tecnico)
41. [Gerenciamento de Estado](#41-gerenciamento-de-estado)
42. [Componentes UI Customizados](#42-componentes-ui-customizados)
43. [Gestao de Fornecedores](#43-gestao-de-fornecedores)
44. [Traducao PT-BR](#44-traducao-pt-br)

---

## 1. Visao Geral da Arquitetura

**Relay** e uma plataforma SaaS que combina:

- **Agentes de IA** especializados que entendem o dominio de retail
- **Workflows visuais** com 8 tipos de steps e 9 tipos de triggers
- **Integracao nativa** com Nuvemshop, Shopify e 200+ apps via Composio
- **Messaging via Telegram** para alertas e interacao com agentes
- **Retail Intelligence** com RFM, ABC, LTV, churn, cohort, bundles, pricing, markdown, elasticidade, previsao de demanda e monitoramento de precos

**Arquivo principal de configuracao**: `src/app/layout.tsx`

**Estrutura de pastas**:

```
src/
├── app/                    # Pages e API routes (App Router)
│   ├── (auth)/             # Login, Signup
│   ├── (dashboard)/        # Dashboard, Workspace, Runs, Agents, Products, Messaging
│   ├── (editor)/           # Editor visual de workflows
│   ├── (onboarding)/       # Wizard de onboarding
│   └── api/                # 39+ endpoints
├── components/             # 200+ componentes React (shadcn + custom)
├── lib/                    # Logica de negocio
│   ├── ai/                 # Agentes, tools, chat
│   ├── workflows/          # Executor de workflows
│   ├── workflow-editor/    # Step types, triggers, executors
│   ├── nuvemshop/          # Cliente API, sync, webhooks, types
│   ├── retail/             # Alertas, notificacoes, provisioning
│   ├── composio/           # Integracao Composio
│   ├── messaging/          # Telegram bot
│   ├── stripe/             # Billing
│   ├── supabase/           # Clientes Supabase
│   └── cron/               # Schedule matcher
├── stores/                 # Zustand stores
└── hooks/                  # 26 custom hooks
```

---

## 2. Autenticacao e Gerenciamento de Usuarios

**Arquivos**: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/app/(auth)/`

### Login e Signup

- **Email/senha**: Formulario nativo com Supabase Auth
- **OAuth**: Google e GitHub via Supabase Auth
- **Sessao**: JWT gerenciado via cookies (SSR-compatible)

### Times e Controle de Acesso

- **Auto-criacao de time**: Trigger `auto_create_team_on_signup` cria time automaticamente no signup
- **Roles**: `owner`, `admin`, `member`
- **Convites**: Sistema de convites por email com lookup
- **RLS**: Todas as tabelas protegidas com Row Level Security por time
- **Selecao de time**: Cookie `selected_team_id` para time ativo

### Dados do Usuario

| Campo                            | Tabela          | Descricao         |
| -------------------------------- | --------------- | ----------------- |
| id, email, full_name, avatar_url | `profiles`      | Perfil do usuario |
| team_id, role                    | `team_members`  | Membro do time    |
| steps_used, ai_credits_used      | `usage`         | Consumo mensal    |
| stripe_customer_id, status       | `subscriptions` | Assinatura        |

---

## 3. Onboarding

**Arquivo**: `src/app/(onboarding)/onboarding/page.tsx`

Wizard de 6 etapas que configura a loja e cria agentes automaticamente:

### Etapas

1. **Nome da loja** — Input de texto
2. **Segmento** — 8 opcoes: roupas, eletronicos, alimentos, cosmeticos, casa/decoracao, esportes, pet, outros
3. **Plataforma** — Nuvemshop, Shopify, Mercado Livre, manual
4. **Prioridades** — Controle de estoque, monitorar concorrencia, resumo de vendas, atendimento ao cliente, alertas de pedidos
5. **Telegram** — Conexao do bot para notificacoes
6. **Conclusao** — Tela de sucesso

### O que acontece no backend (`provisionStore`)

1. Cria/atualiza registro da loja (`stores`)
2. Cria 4 agentes especializados + 1 orquestrador
3. Cria skills de conhecimento por segmento (32 combinacoes: 8 segmentos x 4 roles)
4. Cria workflows pre-configurados baseados nas prioridades
5. Cria alerta global de estoque padrao
6. Define `has_store=true` no time

**Estado**: Persistido em `sessionStorage` para sobreviver a redirects OAuth

---

## 4. Dashboard

**Arquivo**: `src/app/(dashboard)/dashboard/page.tsx`

### Conteudo

- **Stats do time**: Execucoes hoje, agentes ativos, workflows
- **Card do orquestrador**: Agente principal com destaque
- **Grid de agentes especializados**: Cards com cores de paleta (blue, orange, green, purple), contagem de skills
- **Workflows recentes**: Lista com ultima execucao e status
- **Feedback de conexao**: Indicador de novos apps conectados

### Design dos Cards de Agentes

- Dimensoes: 208x308px
- Borda branca de 4px, border-radius 16
- 4 paletas: blue (#648EE9), orange (#D7733E), green (#5BA87B), purple (#9B6BC4)
- Mandala decorativa com mix-blend-mode: multiply

---

## 5. Workspace

**Arquivo**: `src/app/(dashboard)/workspace/page.tsx`

### Funcionalidades

- **Visualizacao em grafo**: Layout Dagre de agentes + workflows conectados
- **Visualizacao em tabela**: Com filtros, busca e paginacao
- **Sidebar de pastas**: Arvore de diretorio + breadcrumbs
- **Acoes em massa**: Deletar, mover, duplicar
- **Dialogs de criacao**: Novo agente ou workflow
- **Toggle de visualizacao**: Alternar entre grafo e tabela

---

## 6. Sistema de Agentes

**Arquivos**: `src/lib/ai/agent-chat.ts`, `src/lib/ai/platform-tools.ts`, `src/app/api/agents/`

### Modelo de Dados do Agente

| Campo                 | Tipo    | Descricao                                        |
| --------------------- | ------- | ------------------------------------------------ |
| id                    | UUID    | Identificador unico                              |
| name                  | TEXT    | Nome do agente                                   |
| system_prompt         | TEXT    | Instrucoes personalizadas                        |
| model                 | TEXT    | Modelo de IA (gpt-4o, gpt-4o-mini, o1, o3, etc.) |
| temperature           | FLOAT   | Aleatoriedade (0-1)                              |
| max_tokens            | INTEGER | Limite de output                                 |
| is_orchestrator       | BOOLEAN | Flag de orquestrador principal                   |
| automation_mode       | TEXT    | 'full', 'retail', ou false                       |
| palette               | TEXT    | Cor do card (blue, orange, green, purple)        |
| conversation_starters | JSONB   | Sugestoes iniciais de conversa                   |

### Tipos de Agentes

**Orquestrador**: Agente central que entende queries, delega para especialistas, responde diretamente. Tem acesso a todas as ferramentas do time.

**Especialistas**: Roles pre-configurados por segmento:

- **Estoquista** — Gerenciamento de estoque e alertas
- **Vigia de Preco** — Monitoramento de concorrencia
- **Caixa** — Analise de vendas e resumos
- **Atendimento** — Suporte ao cliente

### Modos de Automacao

| Modo     | Capacidades                                                     |
| -------- | --------------------------------------------------------------- |
| `full`   | Triggers Composio, app events, steps claude_agent, web scraping |
| `retail` | Simplificado: cron, web scraping, AI transform, notify          |
| `false`  | Somente leitura de knowledge/skills                             |

### Paginas do Agente

**`/agents/[id]`** — Interface de chat:

- Header compacto com avatar + status
- Checklist de setup (condicional para nao-orquestradores)
- Painel de chat com historico
- Sidebar com: workflows, skills, apps conectados, runs recentes, trigger subscriptions

**`/agents/[id]/edit`** — Editor:

- Nome, descricao, paleta, system prompt
- Selecao de modelo, temperatura, max tokens
- Conversation starters
- Atribuicao de workflows

**`/agents/new`** — Criacao de novo agente

---

## 7. Chat com Agentes

**Arquivo**: `src/lib/ai/agent-chat.ts`, `src/app/api/agents/[id]/chat/route.ts`

### Fluxo do Chat

1. POST `/api/agents/[id]/chat` recebe mensagem
2. Carrega config do agente + skills + apps conectados
3. Constroi system prompt dinamicamente (`buildAgentSystemPrompt`)
4. Executa chat streaming via Vercel AI SDK
5. Tools disponiveis: Relay (SNEW*\*) + Retail (STORE*\*) + Composio
6. Respostas progressivas para Telegram (`onIntermediateMessage`)
7. Persiste mensagens no banco

### Funcionalidades

- **Streaming**: Respostas em tempo real via Vercel AI SDK
- **Tool calling nativo**: Multi-step reasoning (max 10 steps)
- **Reasoning models**: Suporte a o1, o3, o4, gpt-5.x com `reasoningSummary`
- **Progressive messaging**: Callback para Telegram entre steps
- **Historico**: Ultimas 20 mensagens de contexto

### Conversas

- Multiplas conversas por agente
- Uma conversa ativa por vez
- Feedback (thumbs up/down) por mensagem
- Presenca em tempo real (quem esta usando o agente)

### Ferramentas da Plataforma (SNEW\_\*)

| Ferramenta                 | Descricao                                |
| -------------------------- | ---------------------------------------- |
| SNEW_CREATE_WORKFLOW       | Criar automacao                          |
| SNEW_LIST_WORKFLOWS        | Listar workflows                         |
| SNEW_UPDATE_WORKFLOW       | Atualizar workflow                       |
| SNEW_DELETE_WORKFLOW       | Deletar workflow                         |
| SNEW_TEST_WORKFLOW         | Testar workflow                          |
| SNEW_CREATE_SKILL          | Criar skill (knowledge/procedure)        |
| SNEW_LIST_SKILLS           | Listar skills                            |
| SNEW_UPDATE_SKILL          | Atualizar skill (auto-incrementa versao) |
| SNEW_GET_SKILL_CONTENT     | Carregar conteudo (fuzzy match)          |
| SNEW_EXECUTE_SKILL         | Executar procedure skill                 |
| SNEW_DELETE_SKILL          | Remover skill                            |
| SNEW_LIST_APP_CAPABILITIES | Listar acoes/triggers/auth de apps       |
| SNEW_CHECK_CONNECTIONS     | Verificar conexoes ativas                |

---

## 8. Skills de Agentes

**Arquivo**: `src/lib/ai/skill-builder-tools.ts`, tabela `agent_skills`

### Tipos de Skills

**Knowledge** — Documentacao, guias, material de referencia:

- Conteudo em markdown
- Full-text search e fuzzy matching
- 32 templates por segmento (8 segmentos x 4 roles)

**Procedure** — Workflows executaveis com parametros:

- Definicao de parametros
- Execucao via SNEW_EXECUTE_SKILL
- Versionamento automatico

### Skills por Segmento

| Segmento       | Skills Geradas                                                    |
| -------------- | ----------------------------------------------------------------- |
| Roupas         | Gestao de estoque sazonal, precificacao fashion, atendimento moda |
| Eletronicos    | Garantia e devolucao, comparacao tecnica, lancamentos             |
| Alimentos      | Validade e FIFO, regulamentacao, sazonalidade                     |
| Cosmeticos     | Ingredientes e alergias, tendencias beauty, kits                  |
| Casa/Decoracao | Ambientacao, tendencias decor, medidas                            |
| Esportes       | Equipamentos por modalidade, sazonalidade esportiva               |
| Pet            | Racas e portes, alimentacao, saude animal                         |
| Outros         | Skills genericas de e-commerce                                    |

---

## 9. Sistema de Workflows

**Arquivos**: `src/lib/workflows/`, `src/lib/workflow-editor/`

### Tipos de Trigger (9 tipos)

| Trigger     | Descricao              | Configuracao                                                  |
| ----------- | ---------------------- | ------------------------------------------------------------- |
| `manual`    | Executado pelo usuario | Formulario de inputs                                          |
| `scheduled` | Cron ou intervalo      | Expressao cron + timezone, ou intervalo (min/hora/dia/semana) |
| `webhook`   | HTTP webhook           | Token + secret HMAC-SHA256                                    |
| `app`       | Evento Composio        | App + trigger slug (ex: GITHUB_PR_OPENED)                     |
| `form`      | Formulario customizado | Campos com tipos                                              |
| `rss`       | Feed RSS               | URL do feed                                                   |
| `mailhook`  | Email webhook          | Endereco de email                                             |
| `table`     | Evento no banco        | Tabela + operacao (insert/update/delete)                      |
| `mcp`       | Servidor MCP           | Configuracao MCP                                              |

### Tipos de Step (8 tipos)

| Step            | Descricao          | Detalhes                                                        |
| --------------- | ------------------ | --------------------------------------------------------------- |
| `app`           | Acao Composio      | Executa acao em app conectado (Slack, GitHub, etc.)             |
| `ai`            | Operacao de IA     | Resumir, classificar, extrair, gerar, transformar texto         |
| `web_scraping`  | Scraping web       | Firecrawl: scrape, map, search                                  |
| `utility`       | Utilitario         | Format, parse JSON/CSV, merge, filter, map, math, send_telegram |
| `http`          | Request HTTP       | GET/POST/PUT/PATCH/DELETE customizado                           |
| `flow_control`  | Controle de fluxo  | Path (condicional), loop, wait                                  |
| `human_in_loop` | Aprovacao humana   | Approval, input, review gates                                   |
| `sequence`      | Encadear workflows | Trigger outro workflow                                          |

### Modos de Execucao

| Modo      | Comportamento               |
| --------- | --------------------------- |
| `auto`    | Executa imediatamente       |
| `confirm` | Espera aprovacao do usuario |
| `draft`   | Salva sem executar          |

---

## 10. Editor Visual de Workflows

**Arquivo**: `src/app/(editor)/workflows/[id]/edit/page.tsx`

### Layout 3 Paineis

- **Esquerda**: Configuracao do trigger (9 tipos)
- **Centro**: Canvas com trigger → steps → conexoes
- **Direita**: Configuracao do step selecionado (8 tipos)

### Funcionalidades

- **Keyboard shortcuts**: Dialog de atalhos
- **Auto-save**: Com debounce
- **Undo/Redo**: Stack de ate 50 operacoes
- **Test results tab**: Resultado de testes por step
- **Runs history tab**: Historico de execucoes
- **Status**: Draft / Published

### Store Zustand

| Estado               | Descricao                    |
| -------------------- | ---------------------------- |
| workflowId           | ID do workflow sendo editado |
| name, emoji          | Metadados do workflow        |
| trigger              | Configuracao do trigger      |
| steps                | Array de steps               |
| selectedStepId       | Step selecionado             |
| isDirty              | Alteracoes nao salvas        |
| isSaving             | Salvamento em progresso      |
| status               | draft/published              |
| undoStack, redoStack | Historico de acoes           |

---

## 11. Execucao de Workflows

**Arquivo**: `src/lib/workflows/workflow-executor.ts`, `src/lib/workflows/action-executor.ts`

### Fluxo de Execucao

1. Cria registro de run (status: `running`)
2. Avalia condicoes (dot-path: `trigger.field.nested`)
3. Se condicoes falham → `skipped`
4. Se `execution_mode='confirm'` → `waiting_confirmation`
5. Executa acoes sequencialmente (state via `{{prev.key}}`)
6. Atualiza run com resultados e duracao
7. Atualiza `last_run_at` e `run_count` do workflow

### Template Variables

| Variavel                  | Descricao                          |
| ------------------------- | ---------------------------------- |
| `{{trigger.field}}`       | Acessa campo do payload do trigger |
| `{{prev.key}}`            | Referencia output da acao anterior |
| `{{prev.content}}`        | Conteudo scrapeado                 |
| `{{prev.metadata.price}}` | Metadata extraida                  |

### Operadores de Condicao

`equals`, `not_equals`, `contains`, `not_contains`, `matches`, `exists`, `not_exists`, `gt`, `lt`, `gte`, `lte`

### Status de Execucao

`pending` → `running` → `completed` | `failed` | `skipped` | `waiting_confirmation`

---

## 12. Ferramentas de Retail (STORE\_\*)

**Arquivo**: `src/lib/ai/retail-tools.ts` (6.187 linhas)

**Entry point**: `buildRetailTools(storeId, teamId, supabaseClient?, userId?, imageAttachments?)`

### Ferramentas de Consulta (Read-Only) — 20 tools

#### STORE_QUERY_STOCK

- **O que faz**: Consulta niveis de estoque em tempo real da API da loja
- **Parametros**: `search` (nome/SKU), `low_stock_only` (boolean), `limit` (default: 20)
- **Retorna**: Produtos com estoque, published, SKU, preco, cost_price, margin_pct
- **Fonte**: NuvemshopClient.getAllProducts() + store_products (cost_price)

#### STORE_QUERY_SALES

- **O que faz**: Resumo de vendas por periodo
- **Parametros**: `period` ('today'|'yesterday'|'this_week'|'this_month')
- **Retorna**: Contagem de pedidos, receita, top produtos, comparacao com periodo anterior
- **Fonte**: NuvemshopClient.getOrders()

#### STORE_LIST_ORDERS

- **O que faz**: Lista pedidos recentes com filtros
- **Parametros**: `status` ('open'|'closed'|'cancelled'), `limit` (default: 10)
- **Retorna**: Detalhes do pedido (numero, status, pagamento, total, cliente, itens)
- **Fonte**: NuvemshopClient.getOrders()

#### STORE_QUERY_CATEGORIES

- **O que faz**: Lista categorias de produtos com hierarquia
- **Parametros**: Nenhum
- **Retorna**: Categorias com IDs, nomes, parent IDs, subcategorias
- **Fonte**: NuvemshopClient.getCategories()

#### STORE_QUERY_CUSTOMERS

- **O que faz**: Busca ou lista clientes ordenados por total gasto
- **Parametros**: `search` (nome/email), `email` (exato), `sort_by` ('total_spent'), `limit` (default: 20)
- **Retorna**: Dados do cliente (ID, nome, email, telefone, total_spent)
- **Fonte**: NuvemshopClient.getCustomers() / getAllCustomers()

#### STORE_QUERY_MARGINS

- **O que faz**: Consulta margens de lucro por produto com lucro bruto por periodo
- **Parametros**: `search`, `sort` ('lowest_margin'|'highest_margin'|'name'), `period`, `limit` (default: 20)
- **Retorna**: Produtos com margin%, valor da margem, lucro bruto do periodo
- **Fonte**: store_products.cost_price + store_orders

#### STORE_GET_ABANDONED_CHECKOUTS

- **O que faz**: Lista carrinhos abandonados com stats de recuperacao
- **Parametros**: `limit` (default: 20)
- **Retorna**: Carrinhos com URL de recuperacao, stats (notificados, recuperados, taxa%)
- **Fonte**: NuvemshopClient.getAbandonedCheckouts() + store_abandoned_cart_notifications

#### STORE_GET_STORE_INFO

- **O que faz**: Informacoes da loja (nome, dominio, plano, contato, redes sociais)
- **Parametros**: Nenhum
- **Retorna**: Detalhes da loja
- **Fonte**: NuvemshopClient.getStoreInfo()

#### STORE_GET_PAYMENT_OPTIONS

- **O que faz**: Lista metodos de pagamento disponiveis
- **Parametros**: Nenhum
- **Retorna**: Provedores de pagamento com opcoes de checkout
- **Fonte**: NuvemshopClient.getPaymentOptions()

#### STORE_QUERY_TRANSACTIONS

- **O que faz**: Transacoes de pagamento de um pedido
- **Parametros**: `order_number` (obrigatorio)
- **Retorna**: Lista de transacoes (ID, metodo, status, valor, data)
- **Fonte**: NuvemshopClient.getTransactions()

#### STORE_FORECAST_DEMAND

- **O que faz**: Previsao de demanda baseada em historico de vendas
- **Parametros**: `days` (default: 30, max: 90), `search`, `top` (default: 30, max: 50)
- **Retorna**: Categorias: restock_urgente, esgotado_vendendo, monitorar, estoque_saudavel
- **Fonte**: NuvemshopClient.getOrders() + getProduct()

#### STORE_ANALYZE_CUSTOMERS

- **O que faz**: Segmentacao RFM (Recency, Frequency, Monetary) de clientes
- **Parametros**: `days` (default: 90, max: 365), `focus` ('overview'|'repurchase'|'at_risk'), `limit` (default: 10)
- **Retorna**: Segmentos (VIP, Loyal, Promising, At Risk, Lost, New) com scores e acoes sugeridas
- **Fonte**: NuvemshopClient.getOrders() + calculateRepurchaseData()

#### STORE_ANALYZE_PRODUCTS

- **O que faz**: Classificacao ABC/Pareto de produtos por contribuicao de receita
- **Parametros**: `days` (default: 30, max: 365), `include_dead_stock` (default: true), `limit` (default: 15)
- **Retorna**: Classes A/B/C com receita, margem, giro + estoque parado
- **Fonte**: NuvemshopClient.getOrders() + getAllProducts() + store_products

#### STORE_ESTIMATE_LTV

- **O que faz**: Estima Customer Lifetime Value por segmento RFM
- **Parametros**: `days` (default: 180, max: 365), `projected_years` (default: 2, max: 5), `limit` (default: 10)
- **Retorna**: LTV medio/total, distribuicao por segmento (VIP/Loyal/Promising/At Risk/Lost/New), top clientes, faixas de distribuicao
- **Fonte**: NuvemshopClient.getOrders() + store_products (cost_price para profit LTV)

#### STORE_SUGGEST_BUNDLES

- **O que faz**: Identifica produtos comprados juntos e sugere kits/combos
- **Parametros**: `days` (default: 90, max: 365), `min_orders` (default: 3, max: 20), `limit` (default: 10)
- **Retorna**: Pares co-ocorrentes com tipo (estrategico/cross-sell/complementar), preco sugerido com desconto, margem estimada
- **Fonte**: NuvemshopClient.getOrders() + store_products (price, cost_price, stock)

#### STORE_SUGGEST_PRICE

- **O que faz**: Sugere precos otimizados baseado em custo, concorrencia e demanda
- **Parametros**: `strategy` ('competitivo'|'margem_alvo'|'baseado_demanda'|'auto'), `target_margin` (default: 30%), `min_margin` (default: 15%), `search`
- **Retorna**: Sugestoes com preco atual vs sugerido, margem atual vs nova, motivo, estrategia, confianca
- **Fonte**: store_products + store_price_monitors + store_price_history + store_orders (100% Supabase)

#### STORE_PREDICT_CHURN

- **O que faz**: Previso de churn com composite decay scoring (recency/frequency/monetary)
- **Parametros**: `days` (default: 180, max: 365), `threshold` (default: 50, score 0-100), `limit` (default: 15)
- **Retorna**: Score de risco (0-100), componentes (recency_decay, frequency_decline, monetary_decline), segmentacao por urgencia (critico/alto/medio/baixo)
- **Fonte**: NuvemshopClient.getOrders()

#### STORE_COHORT_ANALYSIS

- **O que faz**: Analise de cohort por mes/trimestre de primeira compra
- **Parametros**: `days` (default: 180, max: 365), `granularity` ('monthly'|'quarterly'), `limit` (default: 12)
- **Retorna**: Cohorts com retencao M1-M6, ticket medio, recorrencia%, receita total, comparativo entre cohorts
- **Fonte**: NuvemshopClient.getOrders()

#### STORE_MARKDOWN_OPTIMIZATION

- **O que faz**: Identifica estoque parado e sugere descontos escalonados por urgencia
- **Parametros**: `days` (default: 60, max: 180), `max_discount` (default: 50%), `min_stock` (default: 5), `limit` (default: 20)
- **Retorna**: Candidatos com dias_sem_venda, estoque, desconto sugerido (%), preco_novo, urgencia (critica/alta/media/baixa), nunca abaixo de cost_price
- **Fonte**: NuvemshopClient.getOrders() + getAllProducts() + store_products (cost_price)

#### STORE_SIMULATE_ELASTICITY

- **O que faz**: Simula impacto de mudanca de preco nas vendas usando elasticidade estimada
- **Parametros**: `price_change_pct` (default: 10, range: -50 a +100), `days` (default: 180, max: 365), `search`, `limit` (default: 20)
- **Retorna**: Por produto: elasticidade estimada, receita atual vs simulada, variacao%, confianca (baseada_em_dados/dados_limitados/estimativa_padrao)
- **Fonte**: NuvemshopClient.getOrders() + store_products

### Ferramentas de Gerenciamento (Create/Update/Delete) — 22 tools

#### STORE_UPDATE_ALERT

- **O que faz**: Atualiza thresholds de alerta de estoque ou toggle de notificacoes de pedidos
- **Parametros**: `threshold`, `product_name`, `order_notifications` (boolean)
- **Acoes**: Upsert em store_stock_alerts, update stores.settings

#### STORE_UPDATE_SCHEDULE

- **O que faz**: Configura horario do resumo diario de vendas
- **Parametros**: `time` (formato BRT: "21:00", "9", "08:30"), `enabled` (boolean)
- **Acoes**: Update stores.settings (daily_summary_hour, daily_summary_enabled)

#### STORE_DELETE_PRODUCT

- **O que faz**: Deleta produtos da loja (plataforma + banco local)
- **Parametros**: `product_ids` (array) ou `search` (nome)
- **Acoes**: NuvemshopClient.deleteProduct() + delete store_products

#### STORE_TRIGGER_SYNC

- **O que faz**: Dispara sincronizacao manual de produtos da plataforma
- **Parametros**: Nenhum
- **Retorna**: Resultado do sync (created, updated, errors)

#### STORE_UPDATE_PRODUCT

- **O que faz**: Atualiza detalhes do produto (nome, preco, descricao, estoque, published)
- **Parametros**: `search`, `name`, `price`, `stock`, `description`, `published`
- **Acoes**: Atualiza NuvemshopClient + store_products

#### STORE_CREATE_PRODUCT

- **O que faz**: Cria novo produto na loja
- **Parametros**: `name` (obrigatorio), `price` (obrigatorio), `stock`, `description`, `sku`, `published`
- **Acoes**: Cria via NuvemshopClient + store_products

#### STORE_MANAGE_CATEGORIES

- **O que faz**: Cria ou deleta categorias de produtos
- **Parametros**: `action` ('create'|'delete'), `name`, `category_id`, `parent_id`
- **Acoes**: NuvemshopClient.createCategory() ou deleteCategory()

#### STORE_MANAGE_COUPONS

- **O que faz**: Lista, cria ou deleta cupons de desconto
- **Parametros**: `action` ('list'|'create'|'delete'), `code`, `type` ('percentage'|'absolute'|'shipping'), `value`, `coupon_id`, `max_uses`, `min_price`, `start_date`, `end_date`
- **Acoes**: NuvemshopClient.getCoupons/createCoupon/deleteCoupon()

#### STORE_MANAGE_ORDERS

- **O que faz**: Fecha, reabre ou cancela pedidos
- **Parametros**: `action` ('close'|'open'|'cancel'), `order_number`, `cancel_reason`, `restock`
- **Acoes**: NuvemshopClient order methods + store_orders update

#### STORE_ADD_PRODUCT_IMAGE

- **O que faz**: Adiciona imagem a produto (auto-detecta attachment ou URL)
- **Parametros**: `search`, `image_url`, `position`
- **Acoes**: NuvemshopClient.createImage()

#### STORE_MANAGE_DRAFT_ORDERS

- **O que faz**: Gerencia pedidos manuais (rascunhos)
- **Parametros**: `action` ('list'|'create'|'confirm'|'delete'), `customer_*`, `products`, `draft_id`
- **Acoes**: NuvemshopClient draft order methods

#### STORE_MANAGE_FULFILLMENT

- **O que faz**: Gerencia envio/rastreamento de pedidos
- **Parametros**: `action` ('get'|'update_tracking'), `order_number`, `tracking_number`, `tracking_url`, `shipping_company`
- **Acoes**: NuvemshopClient.getFulfillmentOrders/updateFulfillmentOrder()

#### STORE_MANAGE_PAGES

- **O que faz**: Gerencia paginas de conteudo da loja
- **Parametros**: `action` ('list'|'create'|'update'|'delete'), `title`, `content`, `page_id`, `published`
- **Acoes**: NuvemshopClient page methods

#### STORE_UPDATE_COST

- **O que faz**: Atualiza preco de custo de um produto
- **Parametros**: `product_name`, `sku`, `cost_price` (obrigatorio)
- **Acoes**: Update store_products.cost_price

#### STORE_BULK_UPDATE_COST

- **O que faz**: Atualiza precos de custo em lote (CSV/planilha)
- **Parametros**: `entries` (array de {sku?, name?, cost_price}, max: 500)
- **Acoes**: Batch update store_products.cost_price

#### STORE_ADD_PRICE_MONITOR

- **O que faz**: Cria monitor de preco de concorrente (auto-cria workflow agendado)
- **Parametros**: `url`, `product_name`, `marketplace`, `own_product_name`, `alert_threshold_pct` (default: 5%)
- **Acoes**: Cria workflow com steps web_scraping → ai_transform → telegram

#### STORE_LIST_PRICE_MONITORS

- **O que faz**: Lista monitores de preco com ultimos precos e comparacao
- **Parametros**: `active_only` (default: true)
- **Fonte**: store_price_monitors + store_products

#### STORE_REMOVE_PRICE_MONITOR

- **O que faz**: Desativa monitor de preco e pausa workflow associado
- **Parametros**: `monitor_id` ou `product_name`
- **Acoes**: Set store_price_monitors.is_active=false, workflow.status='draft'

#### STORE_MANAGE_SUPPLIERS

- **O que faz**: Gerencia fornecedores (CRUD) — criar, listar, atualizar ou desativar
- **Parametros**: `action` ('list'|'create'|'update'|'deactivate'), `name`, `contact_email`, `contact_phone`, `lead_time_days`, `min_order_value`, `payment_terms`, `notes`, `supplier_id`
- **Acoes**: CRUD na tabela store_suppliers

#### STORE_LINK_PRODUCT_SUPPLIER

- **O que faz**: Vincula/desvincula produtos a fornecedores com preco de custo
- **Parametros**: `action` ('link'|'unlink'|'list'|'set_preferred'), `product_name`, `supplier_name`, `cost_price`, `is_preferred`
- **Acoes**: Upsert/delete em store_product_suppliers

#### STORE_SUGGEST_REORDER

- **O que faz**: Sugere produtos para reposicao baseado em estoque, velocidade de vendas e lead time do fornecedor
- **Parametros**: `urgency` ('all'|'critical'|'warning'), `supplier_name`, `days` (default: 30)
- **Retorna**: Produtos priorizados por urgencia com quantidade sugerida, valor estimado e data limite para pedido

#### STORE_COMPARE_SUPPLIERS

- **O que faz**: Compara fornecedores de um produto lado a lado (preco, lead time, pedido minimo, ultimo pedido)
- **Parametros**: `product_name`
- **Retorna**: Tabela comparativa com destaque para melhor preco e menor lead time

### Funcoes Helper

| Funcao                                        | Descricao                                |
| --------------------------------------------- | ---------------------------------------- |
| `normalizeAccents(s)`                         | Remove acentos para busca fuzzy          |
| `calculateQuintiles(values, higherIsBetter?)` | Converte valores em scores 1-5           |
| `mapRfmSegment(r, f, m)`                      | Mapeia scores RFM para label de segmento |
| `calculateRepurchaseData(orderDates)`         | Calcula intervalo medio e dias atrasado  |
| `syncShopifyProducts(...)`                    | Sync via Composio SDK                    |
| `syncNuvemshopProducts(...)`                  | Sync via API Nuvemshop                   |
| `buildSalesSummary(orders)`                   | Constroi objeto de resumo de vendas      |

---

## 13. Integracao Nuvemshop

**Arquivo**: `src/lib/nuvemshop/client.ts` (773 linhas)

### NuvemshopClient — 38+ metodos

**Rate limiting**: 500ms minimo entre requests, retry exponencial em 429, max 3 tentativas.

#### Produtos (8 metodos)

| Metodo                           | Descricao                                |
| -------------------------------- | ---------------------------------------- |
| `getProducts(page, perPage)`     | Lista paginada                           |
| `getProduct(productId)`          | Produto individual                       |
| `getAllProducts()`               | Todos os produtos (paginacao automatica) |
| `deleteProduct(productId)`       | Deletar produto                          |
| `updateProduct(productId, data)` | Atualizar nome, descricao, published     |
| `createProduct(product)`         | Criar novo produto                       |
| `getProductBySku(sku)`           | Buscar por SKU                           |
| `bulkUpdateStockPrice(updates)`  | Bulk update estoque/preco                |

#### Variantes (6 metodos)

| Metodo                                                     | Descricao                   |
| ---------------------------------------------------------- | --------------------------- |
| `getVariants(productId)`                                   | Listar variantes            |
| `getVariant(productId, variantId)`                         | Variante individual         |
| `createVariant(productId, variant)`                        | Criar variante              |
| `updateVariant(productId, variantId, data)`                | Atualizar preco/estoque/SKU |
| `deleteVariant(productId, variantId)`                      | Deletar variante            |
| `updateVariantStock(productId, action, value, variantId?)` | Ajustar estoque             |

#### Imagens (3 metodos)

`getImages`, `createImage`, `deleteImage`

#### Categorias (5 metodos)

`getCategories`, `getCategory`, `createCategory`, `updateCategory`, `deleteCategory`

#### Clientes (6 metodos)

`getCustomers`, `getAllCustomers`, `getCustomer`, `createCustomer`, `updateCustomer`, `deleteCustomer`

#### Cupons (5 metodos)

`getCoupons`, `getCoupon`, `createCoupon`, `updateCoupon`, `deleteCoupon`

#### Pedidos (7 metodos)

`getOrders`, `getOrder`, `createOrder`, `updateOrder`, `closeOrder`, `openOrder`, `cancelOrder`

#### Carrinhos Abandonados (2 metodos)

`getAbandonedCheckouts`, `getAbandonedCheckout`

#### Draft Orders (4 metodos)

`getDraftOrders`, `getDraftOrder`, `createDraftOrder`, `confirmDraftOrder`, `deleteDraftOrder`

#### Fulfillment (2 metodos)

`getFulfillmentOrders`, `updateFulfillmentOrder`

#### Loja e Pagamentos (8 metodos)

`getStoreInfo`, `getPaymentOptions`, `getTransactions`, `getPages`, `getPage`, `createPage`, `updatePage`, `deletePage`

#### Webhooks (4 metodos)

`createWebhook`, `listWebhooks`, `updateWebhook`, `deleteWebhook`

#### OAuth (1 metodo estatico)

`exchangeCodeForToken(code)` — Troca codigo de auth por access token

### Schemas Zod (17 total)

| Schema                                  | Descricao                                           |
| --------------------------------------- | --------------------------------------------------- |
| NuvemshopVariantSchema                  | Variante com SKU, preco, estoque                    |
| NuvemshopImageSchema                    | Imagem com src e posicao                            |
| NuvemshopProductSchema                  | Produto com nome/descricao i18n, variantes, imagens |
| NuvemshopOrderItemSchema                | Item de pedido                                      |
| NuvemshopOrderSchema                    | Pedido com cliente, itens, status                   |
| NuvemshopWebhookPayloadSchema           | Payload de webhook                                  |
| NuvemshopTokenResponseSchema            | Resposta OAuth                                      |
| NuvemshopAddressSchema                  | Endereco                                            |
| NuvemshopCategorySchema                 | Categoria hierarquica                               |
| NuvemshopCustomerSchema                 | Cliente com total_spent                             |
| NuvemshopCouponSchema                   | Cupom com tipo, valor, uso                          |
| NuvemshopAbandonedCheckoutSchema        | Carrinho abandonado                                 |
| NuvemshopDraftOrderSchema               | Pedido rascunho                                     |
| NuvemshopFulfillmentOrderSchema         | Fulfillment com tracking                            |
| NuvemshopFulfillmentTrackingEventSchema | Evento de rastreamento                              |
| NuvemshopStoreSchema                    | Perfil da loja                                      |
| NuvemshopWebhookResponseSchema          | Resposta de registro de webhook                     |

---

## 14. Sincronizacao de Dados

**Arquivo**: `src/lib/nuvemshop/sync.ts` (291 linhas)

### syncProducts(storeId)

- Busca todos os produtos via `getAllProducts()`
- Upsert na tabela `store_products`
- **Preserva `cost_price`** (nao sobrescreve no sync)
- Chama `checkStockAlerts()` apos sync completo
- Retorna: `{ synced, created, updated, errors }`

### syncOrders(storeId, since?)

- Busca pedidos com paginacao (50/page)
- Filtro opcional por data (`created_at_min`)
- Upsert na tabela `store_orders`
- Normaliza dados de cliente (fallback "Anonimo")
- Retorna: `{ synced, created, updated, errors }`

### syncSingleProduct(storeId, externalProductId)

- Sync de produto individual apos evento de webhook
- Preserva `cost_price`
- Chama `checkProductStockAlert()` apos sync
- Silent error handling (log only)

### Pipelines de Sync

| Trigger                 | Frequencia    | O que faz                                |
| ----------------------- | ------------- | ---------------------------------------- |
| Manual                  | Sob demanda   | POST `/api/nuvemshop/sync`               |
| Cron                    | A cada 15 min | GET `/api/nuvemshop/cron`                |
| Webhook product/updated | Evento        | syncSingleProduct()                      |
| Webhook product/created | Evento        | syncSingleProduct()                      |
| Webhook order/created   | Evento        | Sync pedido + notificacao                |
| Webhook order/paid      | Evento        | Sync pedido + re-sync produtos (estoque) |

---

## 15. Webhooks Nuvemshop

**Arquivo**: `src/lib/nuvemshop/webhooks.ts`, `src/app/api/nuvemshop/webhook/route.ts`

### Eventos Registrados

| Evento            | Handler                                      |
| ----------------- | -------------------------------------------- |
| `product/updated` | syncSingleProduct()                          |
| `product/created` | syncSingleProduct()                          |
| `order/created`   | handleOrderEvent() + sendOrderNotification() |
| `order/paid`      | handleOrderEvent() + re-sync produtos        |

### Seguranca

- Verificacao HMAC-SHA256 obrigatoria
- Secret configurado no registro do webhook
- Rejeita payloads com assinatura invalida

### Registro Automatico

- Webhooks registrados automaticamente no callback OAuth
- IDs salvos na tabela `nuvemshop_webhooks`

---

## 16. Alertas de Estoque

**Arquivo**: `src/lib/retail/stock-alerts.ts`

### Como funciona

1. `checkStockAlerts(storeId)` — Monitora todos os produtos contra thresholds
2. Verifica threshold por produto OU global
3. Respeita periodo de cooldown (default: 60 min) para evitar spam
4. Envia alerta via Telegram se breached
5. Atualiza `last_triggered_at` no alerta

### Configuracao

- **Threshold global**: Alerta quando qualquer produto <= N unidades
- **Threshold por produto**: Override para produtos especificos
- **Cooldown**: Tempo minimo entre alertas repetidos
- **Toggle**: Enable/disable via STORE_UPDATE_ALERT

---

## 17. Notificacoes de Pedidos

**Arquivo**: `src/lib/retail/order-notifications.ts`

### Como funciona

1. Webhook `order/created` dispara `sendOrderNotification()`
2. Formata mensagem com: numero do pedido, cliente, total, itens
3. Envia para chat Telegram linkado ao time
4. Respeita `settings.order_notifications_enabled` (default: true)

### Formato da Mensagem

```
🛒 Novo pedido na [Nome da Loja]!

Pedido #1234
Cliente: Maria Silva
Total: R$ 159,90

Itens:
• Racao Premium 15kg (x2)
• Coleira Ajustavel (x1)
```

---

## 18. Carrinhos Abandonados

**Arquivo**: `src/lib/retail/abandoned-cart.ts`

### Como funciona

1. `checkAbandonedCarts(storeId)` — Busca checkouts abandonados da API
2. Filtra: nao completados + mais antigos que delay (default: 60 min)
3. Deduplica via `store_abandoned_cart_notifications`
4. Envia alerta Telegram com link de recuperacao
5. `checkRecoveredCarts(storeId)` — Verifica carrinhos recuperados
6. Marca `recovered_at` e envia notificacao de sucesso

### Configuracao

- `abandoned_cart_notifications_enabled`: Toggle on/off
- `abandoned_cart_delay_minutes`: Tempo antes de notificar (default: 60)

---

## 19. Resumo Diario de Vendas

**Arquivo**: `src/lib/retail/sales-summary.ts`

### Como funciona

1. Cron diario verifica lojas com hora configurada (default: 21:00 BRT)
2. `buildSalesSummary(storeId)` — Calcula metricas do dia:
   - Contagem de pedidos e receita
   - Top 5 produtos
   - Comparacao com dia anterior (% mudanca)
   - Dados de margem (lucro bruto, margem media, produto de menor margem)
3. `formatSalesSummaryMessage()` — Formata para Telegram
4. `sendDailySummary(storeId)` — Envia para chat linkado

### Endpoint Cron

`POST /api/store/daily-summary` — Converte UTC para BRT, encontra lojas com hora correspondente

---

## 20. Monitoramento de Precos

**Arquivo**: `src/lib/retail/price-monitor.ts`

### Como funciona

1. Usuario cria monitor via STORE_ADD_PRICE_MONITOR
2. Sistema cria workflow automatico com steps:
   - `web_scraping` → Scrape da URL do concorrente (Firecrawl)
   - `ai_transform` → Extrai preco do conteudo
   - `notify` → Envia Telegram se mudou
3. Workflow executa em cron configurado

### Funcoes

| Funcao                                           | Descricao                                     |
| ------------------------------------------------ | --------------------------------------------- |
| `persistScrapedPrice(monitorId, price)`          | Salva preco, detecta mudanca, calcula %       |
| `buildPriceChangeAlert(monitor, old, new, own?)` | Formata alerta com comparacao                 |
| `extractPriceFromText(text)`                     | Extrai preco de texto (R$ 89,90, 89.90, etc.) |

### Banco de Dados

- `store_price_monitors`: Configuracao do monitor
- `store_price_history`: Historico de precos (timeline)

---

## 21. Previsao de Demanda

**Ferramenta**: STORE_FORECAST_DEMAND em `retail-tools.ts`

### Como funciona

1. Busca pedidos dos ultimos N dias (default: 30) via API
2. Agrega vendas diarias por produto
3. Busca estoque atual de cada produto (batch 10 concorrentes)
4. Calcula: media diaria, dias de estoque restante, tendencia

### Categorias de Resultado

| Categoria           | Criterio                   | Acao Sugerida       |
| ------------------- | -------------------------- | ------------------- |
| `restock_urgente`   | Estoque acaba em ≤ 7 dias  | Repor imediatamente |
| `esgotado_vendendo` | Sem estoque mas vendendo   | Receita perdida     |
| `monitorar`         | Estoque acaba em 8-14 dias | Ficar atento        |
| `estoque_saudavel`  | 14+ dias de estoque        | OK                  |

---

## 22. Analise RFM de Clientes

**Ferramenta**: STORE_ANALYZE_CUSTOMERS em `retail-tools.ts`

### Como funciona

1. Busca todos os pedidos do periodo (default: 90 dias) via API
2. Agrupa por `customer.email`: ultima compra, total de pedidos, total gasto
3. Calcula scores RFM (1-5) usando quintis:
   - **Recency**: Dias desde ultima compra (menor = melhor)
   - **Frequency**: Quantidade de pedidos (maior = melhor)
   - **Monetary**: Total gasto (maior = melhor)
4. Mapeia para segmentos usando tabela de decisao

### Segmentos

| Segmento  | Criterio RFM          | Descricao                        |
| --------- | --------------------- | -------------------------------- |
| VIP       | R≥4, F≥4, M≥4         | Alto em todas as dimensoes       |
| Loyal     | F≥3, M≥3              | Pedidos consistentes             |
| Promising | R≥4, F≤3              | Recente + construindo frequencia |
| At Risk   | R≤2, F≥3              | Era valioso, inativo             |
| Lost      | R=1                   | Muito baixa recencia             |
| New       | Pedido unico, recente | Primeiro pedido                  |

### Modos de Focus

| Focus        | O que retorna                                              |
| ------------ | ---------------------------------------------------------- |
| `overview`   | Todos os segmentos com stats e acoes sugeridas             |
| `repurchase` | Clientes com recompra atrasada e proxima recompra prevista |
| `at_risk`    | Apenas segmentos At Risk + Lost                            |

### Previsao de Recompra

- Calcula intervalo medio entre compras por cliente (min 2 pedidos)
- **Atrasado**: dias_desde_ultimo > intervalo_medio × 1.2
- **Proxima**: dentro de 5 dias do intervalo esperado

---

## 23. Analise ABC de Produtos

**Ferramenta**: STORE_ANALYZE_PRODUCTS em `retail-tools.ts`

### Como funciona

1. Busca pedidos do periodo (default: 30 dias) via API
2. Agrega receita e unidades vendidas por product_id
3. Ordena por receita decrescente, calcula % cumulativo
4. Classifica: A (ate 80%), B (80-95%), C (95-100%)
5. Busca estoque atual (batch 10 concorrentes)
6. Busca cost_price do Supabase para margens
7. Identifica estoque parado (estoque > 0, zero vendas no periodo)

### Classificacao

| Classe | Regra                         | Significado                             |
| ------ | ----------------------------- | --------------------------------------- |
| A      | Ate 80% da receita cumulativa | Produtos essenciais — priorizar estoque |
| B      | 80-95% da receita cumulativa  | Produtos complementares                 |
| C      | 95-100% da receita cumulativa | Produtos marginais — revisar            |

### Metricas por Produto

| Metrica           | Calculo                              |
| ----------------- | ------------------------------------ |
| receita           | Soma de quantity × price nos pedidos |
| pct_receita       | receita / receita_total × 100        |
| unidades_vendidas | Soma de quantity                     |
| estoque_atual     | Stock atual via API                  |
| giro              | unidades_vendidas / estoque_atual    |
| margem            | (price - cost_price) / price × 100   |

### Estoque Parado

- Busca todos os produtos via `getAllProducts()`
- Cruza com dados de vendas
- Identifica: estoque > 0 e zero vendas no periodo
- Calcula: valor_parado = estoque × preco

---

## 24. Estimativa de LTV

**Ferramenta**: STORE_ESTIMATE_LTV em `retail-tools.ts`

### Como funciona

1. Busca pedidos do periodo (default: 180 dias) via API
2. Agrupa por `customer_email`, calcula RFM scores (reusa helpers existentes)
3. Por cliente: `ticket_medio × compras_por_ano × anos_projetados`
4. Se cost_price disponivel: calcula profit-based LTV (margem × receita)
5. Agrega por segmento RFM (VIP, Loyal, Promising, At Risk, Lost, New)
6. Constroi faixas de distribuicao (R$0-500, 500-1k, 1k-2.5k, 2.5k-5k, 5k+)

### Output

| Campo             | Descricao                                                 |
| ----------------- | --------------------------------------------------------- |
| `resumo`          | Periodo, clientes analisados, ticket medio, LTV medio     |
| `por_segmento`    | LTV medio, receita atual, % da receita por segmento       |
| `top_clientes`    | Nome, email, pedidos, total gasto, LTV estimado, segmento |
| `distribuicao`    | Faixas de LTV com contagem e percentual                   |
| `acoes_sugeridas` | Recomendacoes por segmento                                |

---

## 25. Sugestao de Bundles

**Ferramenta**: STORE_SUGGEST_BUNDLES em `retail-tools.ts`

### Como funciona

1. Busca pedidos do periodo (default: 90 dias) via API
2. Filtra pedidos com 2+ produtos distintos
3. Constroi matriz de co-ocorrencia: para cada pedido, conta pares (pidA, pidB)
4. Cap de 6 produtos por pedido para evitar explosao O(n^2)
5. Filtra pares por `min_orders`, ranqueia por contagem
6. Enriquece com dados de store_products (preco, custo, estoque)
7. Classifica tipo: "estrategico" (A+C), "cross-sell", "complementar"
8. Calcula pricing: 10% desconto (12-15% para bundles estrategicos)

### Tipos de Bundle

| Tipo         | Criterio                          | Desconto |
| ------------ | --------------------------------- | -------- |
| Estrategico  | Produto classe A + classe C       | 12-15%   |
| Cross-sell   | Produtos de categorias diferentes | 10%      |
| Complementar | Produtos da mesma categoria       | 10%      |

---

## 26. Sugestao de Preco

**Ferramenta**: STORE_SUGGEST_PRICE em `retail-tools.ts`

### Como funciona

1. Busca store_products com cost_price (Supabase)
2. Busca price_monitors linkados via `own_product_id`
3. Busca price_history para trend analysis (ultimos 10 pontos por monitor)
4. Busca store_orders (ultimos 30 dias) para velocidade de vendas
5. Por produto, seleciona estrategia (auto-detectada ou escolhida pelo usuario)
6. Limita sugestoes a `min_margin` floor

### Estrategias

| Estrategia        | Criterio             | Logica                                      |
| ----------------- | -------------------- | ------------------------------------------- |
| `competitivo`     | Tem monitor de preco | Igualar/undercut concorrente (min margem)   |
| `margem_alvo`     | Tem cost_price       | Atingir margem % alvo a partir do custo     |
| `baseado_demanda` | Tem dados de vendas  | Alta demanda + baixo estoque → subir preco  |
| `auto`            | Selecao automatica   | Usa a estrategia mais relevante por produto |

### Fonte de dados

100% Supabase (sem chamadas API): store_products + store_price_monitors + store_price_history + store_orders

---

## 27. Previsao de Churn

**Ferramenta**: STORE_PREDICT_CHURN em `retail-tools.ts`

### Como funciona

1. Busca pedidos do periodo (default: 180 dias) via API
2. Filtra clientes recorrentes (2+ pedidos)
3. Calcula score composto (0-100) a partir de 3 componentes:
   - **Recency decay** (0-40 pts): baseado em ratio de atraso vs intervalo medio
   - **Frequency decline** (0-30 pts): compara taxa de compra 1a vs 2a metade
   - **Monetary decline** (0-30 pts): compara valor medio 1a vs 2a metade
4. Classifica por urgencia baseado no score

### Niveis de Urgencia

| Nivel   | Score  | Significado                       |
| ------- | ------ | --------------------------------- |
| Critico | 75-100 | Cliente quase certamente vai sair |
| Alto    | 50-74  | Risco alto, acao imediata         |
| Medio   | 30-49  | Sinais de desengajamento          |
| Baixo   | 0-29   | Saudavel, sem risco imediato      |

---

## 28. Analise de Cohort

**Ferramenta**: STORE_COHORT_ANALYSIS em `retail-tools.ts`

### Como funciona

1. Busca pedidos do periodo (default: 180 dias) via API
2. Identifica primeira compra de cada cliente → define cohort (mes ou trimestre)
3. Para cada cohort, calcula retencao nos meses seguintes (M1-M6)
4. Metricas por cohort: clientes, ticket medio, recorrencia%, receita total
5. Compara cohorts entre si para identificar tendencias

### Metricas de Retencao

| Metrica        | Calculo                                          |
| -------------- | ------------------------------------------------ |
| Retencao M1    | % dos clientes do cohort que compraram no mes +1 |
| Retencao M2-M6 | Idem para meses +2 a +6                          |
| Ticket medio   | Receita total do cohort / numero de clientes     |
| Recorrencia %  | % dos clientes com 2+ pedidos                    |

### Granularidade

- **Monthly**: Cohorts por mes de primeira compra (default)
- **Quarterly**: Cohorts por trimestre de primeira compra

---

## 29. Markdown Optimization

**Ferramenta**: STORE_MARKDOWN_OPTIMIZATION em `retail-tools.ts`

### Como funciona

1. Busca pedidos do periodo (default: 60 dias) via API para velocidade de vendas
2. Busca todos os produtos via `getAllProducts()`
3. Cruza vendas (unidades/dia) com estoque atual → calcula dias de estoque
4. Identifica candidatos: estoque > `min_stock` e baixa velocidade de vendas
5. Sugere desconto escalonado por urgencia (nunca abaixo do cost_price)
6. Calcula: valor parado no estoque, receita potencial com desconto

### Tiers de Urgencia

| Urgencia | Criterio                  | Desconto Sugerido |
| -------- | ------------------------- | ----------------- |
| Critica  | Zero vendas no periodo    | 40-50%            |
| Alta     | Vendas < 0.1 unidades/dia | 25-35%            |
| Media    | Estoque para 90+ dias     | 15-25%            |
| Baixa    | Estoque para 60-90 dias   | 10-15%            |

### Protecao de margem

- Se `cost_price` disponivel: desconto nunca leva preco abaixo do custo
- Se `cost_price` nulo: aplica desconto sem protecao (aviso no output)

---

## 30. Simulacao de Elasticidade

**Ferramenta**: STORE_SIMULATE_ELASTICITY em `retail-tools.ts`

### Como funciona

1. Busca pedidos do periodo (default: 180 dias) via API
2. Constroi dados semanais por produto: preco medio × volume vendido
3. Estima elasticidade a partir de variancia preco/volume entre semanas (mediana de point elasticities)
4. Simula impacto da mudanca de preco proposta na receita
5. Classifica confianca baseado na qualidade dos dados

### Niveis de Confianca

| Confianca         | Criterio                                        |
| ----------------- | ----------------------------------------------- |
| Baseada em dados  | 4+ semanas com variacao de preco suficiente     |
| Dados limitados   | 2-3 semanas com alguma variacao                 |
| Estimativa padrao | Sem variacao de preco → elasticidade default -1 |

### Output por Produto

| Campo            | Descricao                        |
| ---------------- | -------------------------------- |
| elasticidade     | Coeficiente estimado (ex: -1.2)  |
| receita_atual    | Receita semanal media atual      |
| receita_simulada | Receita estimada com novo preco  |
| variacao_pct     | % de mudanca na receita          |
| confianca        | Nivel de confianca da estimativa |

---

## 31. Integracao Composio

**Arquivo**: `src/lib/composio/`

### O que e

Composio e uma plataforma de integracao que conecta 200+ apps com OAuth automatico, webhooks e execucao de acoes.

### Componentes

| Arquivo               | Funcao                                                |
| --------------------- | ----------------------------------------------------- |
| `client.ts`           | Singleton Composio com VercelProvider                 |
| `composio-session.ts` | Criacao de sessao usuario (toolkit + account mapping) |
| `integrations.ts`     | Lista de apps disponiveis e metadata                  |
| `triggers.ts`         | Gerenciamento de trigger subscriptions                |
| `tool-catalog.ts`     | Descoberta e categorizacao de ferramentas             |
| `execute-with-ai.ts`  | Execucao de ferramentas com IA                        |
| `webhook-schema.ts`   | Validacao de payload de webhook                       |

### Apps Disponiveis (exemplos)

GitHub, Slack, Discord, Shopify, Google Sheets, Mailchimp, Stripe, e 200+ mais

### Triggers Disponiveis (exemplos)

- `GITHUB_PULL_REQUEST_OPENED`
- `SLACK_NEW_MESSAGE_IN_CHANNEL`
- `DISCORD_MESSAGE_CREATED`
- `GITHUB_ISSUE_CREATED`

### Fluxo de Execucao

1. `COMPOSIO_SEARCH_TOOLS` — Encontra acoes para um app
2. `COMPOSIO_GET_TOOL_SCHEMAS` — Obtem schema de parametros
3. `COMPOSIO_MULTI_EXECUTE_TOOL` — Executa acao com parametros

---

## 32. Integracao Telegram

**Arquivo**: `src/lib/messaging/telegram.ts`, `src/lib/messaging/telegram-processor.ts`

### Bot Telegram

| Funcao                      | Descricao                                         |
| --------------------------- | ------------------------------------------------- |
| `sendMessage(chatId, text)` | Envia mensagem com auto-chunking (max 4096 chars) |
| `sendChatAction(chatId)`    | Envia indicador "digitando"                       |
| `setWebhook(url, secret)`   | Registra webhook                                  |
| `deleteWebhook()`           | Remove webhook                                    |
| `getMe()`                   | Info do bot                                       |

### Fluxo de Mensagens

1. Usuario envia mensagem no Telegram
2. Webhook recebe em `/api/messaging/telegram/webhook`
3. Encontra ou cria messaging link (chat_id → conversa)
4. Carrega historico (ultimas 20 mensagens)
5. Constroi tools + system prompt do agente
6. Executa chat com `onIntermediateMessage` para updates progressivos
7. Envia resposta formatada em Markdown
8. Rastreia creditos de IA consumidos

### Messaging Links

- Conectam conta Telegram a um time/conversa
- Tabela `messaging_links`: user_id, team_id, external_chat_id, conversation_id
- Encontra agente orquestrador preferencialmente

---

## 33. Paginas de Produtos

**Arquivos**: `src/app/(dashboard)/products/page.tsx`, `src/components/products/products-client.tsx` (906 linhas)

### Funcionalidades

- **Catalogo completo**: Todos os produtos com nome, SKU, preco, custo, estoque e status de publicacao
- **Busca**: Por nome ou SKU
- **Filtros**: Status de custo (todos/sem custo/com custo) e faixa de margem (todos/baixa <20%/media 20-40%/alta >40%)
- **Ordenacao**: Por nome, SKU, preco, custo, margem %, valor de margem
- **Paginacao**: 25, 50 ou 100 itens por pagina
- **Selecao em massa**: Checkboxes para operacoes em lote

### Gestao de Custos e Margens

- **Edicao inline de custo**: Click no campo, edita, salva com Enter ou blur
- **Aplicacao de margem em lote**: Seleciona produtos, define margem % alvo, auto-calcula `cost_price = price × (1 - margin/100)`
- **Indicadores visuais de margem**: Vermelho (<20%), laranja (20-40%), verde (>40%)
- **Margem media**: Calculo automatico exibido no header

### Importacao de CSV

- Upload de CSV/TSV/TXT com dados de custo
- Auto-deteccao de colunas: SKU (sku/codigo), nome (name/nome/produto), custo (cost/custo/cost_price)
- Match por SKU primeiro, depois por nome (case-insensitive)
- Preview com: produtos encontrados, novos custos, margens calculadas, linhas nao encontradas
- Aplicacao em lote dos custos encontrados

### Cards de Estatisticas

| Card              | Descricao                                          |
| ----------------- | -------------------------------------------------- |
| Total de produtos | Contagem total do catalogo                         |
| Com custo         | Produtos com cost_price definido (indicador verde) |
| Sem custo         | Produtos sem cost_price (indicador laranja se > 0) |
| Margem media      | Media de margem % (cor por faixa de rentabilidade) |

### Integracao com Agente

- CTA card "Previsao de demanda" que direciona para o chat com o agente Snew
- Permite consultar quais produtos vao esgotar e quando repor

---

## 34. Historico de Execucoes (Runs)

**Arquivo**: `src/app/(dashboard)/runs/page.tsx`

### Funcionalidades

- Tabela filtravel de execucoes (por workflow, status, data)
- Paginacao + ordenacao
- Dropdown de selecao de workflow
- Detalhes por step com resultado e duracao
- Status: pending, running, completed, failed, skipped, waiting_confirmation

---

## 35. Configuracoes

**Arquivo**: `src/components/settings/`

### Secoes

| Secao            | O que configura                                          |
| ---------------- | -------------------------------------------------------- |
| **Time**         | Nome, logo do time                                       |
| **Plano**        | Selecao de plano (free/pro/enterprise)                   |
| **Membros**      | Adicionar/remover membros, alterar roles                 |
| **Convites**     | Convidar por email                                       |
| **Billing**      | Gerenciamento de assinatura via Stripe                   |
| **Loja**         | Nome, segmento, plataforma conectada                     |
| **Alertas**      | Threshold global de estoque                              |
| **Notificacoes** | Orders, resumo diario, carrinhos abandonados + delay     |
| **Agente**       | Preferencias de notificacao por agente (email, Telegram) |

---

## 36. Billing e Planos (Stripe)

**Arquivos**: `src/lib/stripe/`, `src/app/api/stripe/`

### Planos

| Plano          | Caracteristicas                                   |
| -------------- | ------------------------------------------------- |
| **Free**       | Steps/mes limitados, 1 membro, features basicas   |
| **Pro**        | Mais steps, mais creditos IA, colaboracao em time |
| **Enterprise** | Ilimitado, features custom, suporte prioritario   |

### Endpoints

| Rota                        | Descricao                        |
| --------------------------- | -------------------------------- |
| `POST /api/stripe/checkout` | Cria sessao de checkout Stripe   |
| `POST /api/stripe/portal`   | Redirect para portal do cliente  |
| `POST /api/stripe/webhook`  | Webhook de eventos de assinatura |

### Rastreamento de Uso

- `usage` tabela: steps_used, steps_limit, ai_credits_used, ai_credits_limit
- Atualizado a cada execucao de workflow/chat
- Limites verificados antes de execucoes

---

## 37. Cron Jobs e Agendamento

**Arquivo**: `src/lib/cron/schedule-matcher.ts`

### Jobs Ativos

| Job                   | Frequencia        | Endpoint                         | O que faz                               |
| --------------------- | ----------------- | -------------------------------- | --------------------------------------- |
| Workflows agendados   | Horario (pg_cron) | `POST /api/agent-workflows/cron` | Executa workflows com trigger scheduled |
| Relatorios de agentes | Horario           | `GET /api/agents/cron/reports`   | Gera reports (estoque, preco, vendas)   |
| Sync Nuvemshop        | A cada 15 min     | `GET /api/nuvemshop/cron`        | Sync produtos + pedidos + carrinhos     |
| Resumo diario         | Horario           | `POST /api/store/daily-summary`  | Envia resumo de vendas por Telegram     |

### Schedule Matcher

- Suporte a expressoes cron (ex: `0 9 * * 1-5`)
- Suporte a intervalos (minutos, horas, dias, semanas)
- Timezone-aware
- Boundaries: starts_at, ends_at

---

## 38. Esquema do Banco de Dados

### Tabelas Core

| Tabela             | Descricao         | Campos Principais                  |
| ------------------ | ----------------- | ---------------------------------- |
| `profiles`         | Perfis de usuario | id, email, full_name, avatar_url   |
| `teams`            | Times/workspaces  | id, name, slug, plan_id, has_store |
| `team_members`     | Membros           | team_id, user_id, role             |
| `team_invitations` | Convites          | id, team_id, email                 |

### Tabelas de Agentes

| Tabela                | Descricao          | Campos Principais                                                 |
| --------------------- | ------------------ | ----------------------------------------------------------------- |
| `agents`              | Agentes IA         | id, team_id, name, is_orchestrator, model, palette, system_prompt |
| `agent_skills`        | Skills             | id, agent_id, name, type, content, version                        |
| `agent_conversations` | Conversas          | id, agent_id, user_id, is_active, title                           |
| `agent_messages`      | Mensagens          | id, conversation_id, role, content, metadata                      |
| `message_feedback`    | Feedback           | id, message_id, feedback (thumbs_up/down)                         |
| `presence`            | Presenca real-time | agent_id, user_id, last_seen_at                                   |

### Tabelas de Workflows

| Tabela                | Descricao          | Campos Principais                                            |
| --------------------- | ------------------ | ------------------------------------------------------------ |
| `workflows`           | Definicoes         | id, team_id, name, emoji, trigger, steps, status             |
| `agent_workflows`     | Automacoes         | id, agent_id, trigger_config, conditions, actions, run_count |
| `workflow_runs`       | Execucoes (visual) | id, workflow_id, status, duration_ms, steps_used             |
| `agent_workflow_runs` | Execucoes (agent)  | id, workflow_id, status, trigger_data, actions_executed      |
| `workflow_run_steps`  | Steps executados   | id, run_id, step_id, status, result                          |
| `human_approvals`     | Aprovacoes         | id, run_id, approved_by                                      |
| `step_test_results`   | Testes             | workflow_id, step_id, results, status                        |

### Tabelas de Integracoes

| Tabela                        | Descricao            | Campos Principais                                 |
| ----------------------------- | -------------------- | ------------------------------------------------- |
| `app_connections`             | Conexoes OAuth       | id, user_id, app_id, composio_connection_id       |
| `trigger_subscriptions`       | Event subscriptions  | id, trigger_slug, app_id, is_enabled, event_count |
| `messaging_links`             | Links Telegram       | id, user_id, external_chat_id, conversation_id    |
| `agent_notification_settings` | Prefs de notificacao | user_id, agent_id, telegram_enabled               |

### Tabelas de Retail/E-commerce

| Tabela                               | Descricao                | Campos Principais                                                                                                  |
| ------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `stores`                             | Config da loja           | id, team_id, platform, platform_store_id, settings                                                                 |
| `store_products`                     | Produtos                 | id, store_id, external_id, name, price, stock_quantity, cost_price                                                 |
| `store_orders`                       | Pedidos                  | id, store_id, external_id, order_number, total, status, items                                                      |
| `store_stock_alerts`                 | Alertas de estoque       | id, store_id, product_id, threshold, last_triggered_at                                                             |
| `store_price_monitors`               | Monitores de preco       | id, store_id, product_name, url, last_price                                                                        |
| `store_price_history`                | Historico de precos      | id, monitor_id, price, checked_at                                                                                  |
| `store_abandoned_cart_notifications` | Carrinhos abandonados    | id, store_id, checkout_id, recovered_at                                                                            |
| `nuvemshop_webhooks`                 | Webhooks registrados     | id, store_id, event, external_webhook_id                                                                           |
| `store_suppliers`                    | Fornecedores             | id, store_id, name, contact_email, contact_phone, lead_time_days, min_order_value, payment_terms, notes, is_active |
| `store_product_suppliers`            | Links produto-fornecedor | id, store_id, product_id, supplier_id, cost_price, is_preferred, last_order_at, last_order_qty                     |

### Tabelas de Billing

| Tabela          | Descricao          | Campos Principais                           |
| --------------- | ------------------ | ------------------------------------------- |
| `plans`         | Planos             | id, name, features, max_team_members        |
| `subscriptions` | Assinaturas Stripe | id, team_id, stripe_subscription_id, status |
| `usage`         | Uso mensal         | id, team_id, steps_used, ai_credits_used    |

---

## 39. Rotas de API

### Workflows (12 rotas)

| Metodo     | Rota                                       | Descricao                |
| ---------- | ------------------------------------------ | ------------------------ |
| GET/PUT    | `/api/workflows/[id]`                      | Obter/atualizar workflow |
| DELETE     | `/api/workflows/[id]`                      | Deletar workflow         |
| POST       | `/api/workflows/[id]/duplicate`            | Duplicar workflow        |
| POST       | `/api/workflows/[id]/runs`                 | Criar execucao           |
| GET        | `/api/workflows/[id]/runs`                 | Listar execucoes         |
| GET/DELETE | `/api/workflows/[id]/runs/[runId]`         | Obter/cancelar execucao  |
| POST       | `/api/workflows/[id]/runs/[runId]/execute` | Executar steps           |
| POST       | `/api/workflows/[id]/runs/[runId]/approve` | Aprovar execucao         |
| POST       | `/api/workflows/test-step/[id]/execute`    | Testar step              |
| POST       | `/api/workflows/[id]/execute-scheduled`    | Trigger agendado         |
| ALL        | `/api/workflows/webhook/[token]`           | Trigger webhook          |
| POST       | `/api/workflows/[id]/assistant`            | Assistente IA            |

### Agent Workflows (3 rotas)

| Metodo | Rota                                   | Descricao          |
| ------ | -------------------------------------- | ------------------ |
| POST   | `/api/agent-workflows/[id]/execute`    | Executar automacao |
| GET    | `/api/agent-workflows/webhook/[token]` | Webhook trigger    |
| POST   | `/api/agent-workflows/cron`            | Cron handler       |

### Chat de Agentes (6 rotas)

| Metodo   | Rota                                            | Descricao                |
| -------- | ----------------------------------------------- | ------------------------ |
| POST     | `/api/agents/[id]/chat`                         | Endpoint de chat         |
| GET/POST | `/api/agents/[id]/conversations`                | Listar/criar conversas   |
| GET/PUT  | `/api/agents/[id]/conversations/[cid]`          | Obter/atualizar conversa |
| POST     | `/api/agents/[id]/conversations/[cid]/activate` | Ativar conversa          |
| POST     | `/api/agents/[id]/messages/[mid]/feedback`      | Feedback                 |

### Loja e E-commerce (7 rotas)

| Metodo                | Rota                            | Descricao                      |
| --------------------- | ------------------------------- | ------------------------------ |
| GET                   | `/api/nuvemshop/connect`        | Iniciar OAuth                  |
| GET                   | `/api/nuvemshop/callback`       | Callback OAuth                 |
| POST                  | `/api/nuvemshop/webhook`        | Webhook Nuvemshop              |
| POST                  | `/api/nuvemshop/sync`           | Sync manual                    |
| GET                   | `/api/nuvemshop/cron`           | Sync periodico                 |
| POST                  | `/api/store/daily-summary`      | Resumo diario                  |
| PATCH                 | `/api/store/products/[id]`      | Atualizar produto              |
| PATCH                 | `/api/store/products/bulk-cost` | Bulk update custos             |
| GET/PATCH             | `/api/store/settings`           | Configuracoes da loja          |
| GET/POST              | `/api/store/suppliers`          | Listar/criar fornecedores      |
| PATCH/DELETE          | `/api/store/suppliers/[id]`     | Atualizar/desativar fornecedor |
| GET/POST/PATCH/DELETE | `/api/store/suppliers/products` | Links produto-fornecedor       |
| GET                   | `/api/store/suppliers/reorder`  | Timeline de reposicao          |

### Messaging (4 rotas)

| Metodo | Rota                              | Descricao          |
| ------ | --------------------------------- | ------------------ |
| GET    | `/api/messaging/telegram/setup`   | Setup webhook      |
| POST   | `/api/messaging/telegram/webhook` | Receber mensagens  |
| POST   | `/api/messaging/telegram/process` | Processar mensagem |
| POST   | `/api/messaging/link`             | Linkar conta       |

### Billing (3 rotas)

| Metodo | Rota                   | Descricao         |
| ------ | ---------------------- | ----------------- |
| POST   | `/api/stripe/checkout` | Criar checkout    |
| POST   | `/api/stripe/portal`   | Portal do cliente |
| POST   | `/api/stripe/webhook`  | Webhook Stripe    |

### Outros (4 rotas)

| Metodo | Rota                       | Descricao            |
| ------ | -------------------------- | -------------------- |
| POST   | `/api/onboarding`          | Setup inicial        |
| POST   | `/api/apps/callback`       | OAuth generico       |
| POST   | `/api/composio/webhook`    | Webhook Composio     |
| GET    | `/api/agents/cron/reports` | Relatorios agendados |

---

## 40. Infraestrutura e Stack Tecnico

### Hosting e Servicos

| Servico           | Uso                                       |
| ----------------- | ----------------------------------------- |
| **Vercel**        | Frontend Next.js 16                       |
| **Supabase**      | PostgreSQL + Auth + Realtime + Storage    |
| **Kiro Chat API** | LLM backend principal (OpenAI-compatible) |
| **OpenAI**        | LLM fallback                              |
| **Composio**      | Plataforma de integracao (200+ apps)      |
| **Stripe**        | Pagamentos e assinaturas                  |
| **Telegram**      | Messaging e notificacoes                  |
| **Nuvemshop**     | Integracao e-commerce                     |
| **Firecrawl**     | Web scraping para monitores de preco      |
| **Fly.io**        | Deploy do SnewClaw/OpenClaw (sidecar)     |

### Stack Frontend

| Tecnologia      | Versao     | Uso                            |
| --------------- | ---------- | ------------------------------ |
| Next.js         | 16.1.6     | Framework React (App Router)   |
| React           | 19.2.3     | UI library                     |
| TypeScript      | 5 (strict) | Tipagem estatica               |
| Tailwind CSS    | v4         | Estilizacao (CSS-first, OKLCH) |
| shadcn/ui       | new-york   | Componentes base               |
| Radix UI        | latest     | Primitivos acessiveis          |
| Zustand         | latest     | State management (editor)      |
| React Query     | @tanstack  | Data fetching client-side      |
| React Hook Form | latest     | Formularios                    |
| Zod             | latest     | Validacao de schemas           |
| Vercel AI SDK   | latest     | Chat streaming + useChat       |
| Recharts        | latest     | Graficos e sparklines          |
| Framer Motion   | latest     | Animacoes                      |
| Geist           | latest     | Tipografia                     |
| Lucide          | latest     | Icones                         |
| next-themes     | latest     | Tema light/dark/system         |
| nuqs            | latest     | URL params management          |
| boring-avatars  | latest     | Avatares padrao                |

### Stack Backend

| Tecnologia    | Uso                               |
| ------------- | --------------------------------- |
| Supabase SSR  | Server-side client + service role |
| Vercel AI SDK | Tool calling + streaming          |
| Composio SDK  | Integracao de apps                |
| Firecrawl SDK | Web scraping                      |
| Stripe SDK    | Billing                           |

### Qualidade de Codigo

| Ferramenta  | Uso              |
| ----------- | ---------------- |
| Vitest      | Testes unitarios |
| Playwright  | Testes E2E       |
| ESLint      | Linting          |
| Prettier    | Formatacao       |
| Husky       | Git hooks        |
| lint-staged | Pre-commit       |

### Variaveis de Ambiente

| Variavel                                    | Servico           |
| ------------------------------------------- | ----------------- |
| NEXT_PUBLIC_SUPABASE_URL                    | Supabase          |
| NEXT_PUBLIC_SUPABASE_ANON_KEY               | Supabase          |
| SUPABASE_SERVICE_ROLE_KEY                   | Supabase (server) |
| OPENAI_API_KEY                              | OpenAI            |
| KIRO_CHAT_URL, KIRO_AUTH_TOKEN              | Kiro Chat         |
| FIRECRAWL_API_KEY                           | Firecrawl         |
| COMPOSIO_API_KEY                            | Composio          |
| STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET    | Stripe            |
| TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET | Telegram          |
| NUVEMSHOP_APP_ID, NUVEMSHOP_CLIENT_SECRET   | Nuvemshop         |
| CRON_SECRET                                 | Cron endpoints    |

---

## 41. Gerenciamento de Estado

### Zustand Store (Workflow Editor)

**Arquivo**: `src/stores/workflow-editor-store.ts`

| Estado         | Tipo    | Descricao                  |
| -------------- | ------- | -------------------------- |
| workflowId     | string  | ID do workflow             |
| name           | string  | Nome do workflow           |
| emoji          | string  | Emoji do workflow          |
| trigger        | object  | Configuracao do trigger    |
| steps          | array   | Array de steps             |
| selectedStepId | string  | Step selecionado           |
| isDirty        | boolean | Alteracoes nao salvas      |
| isSaving       | boolean | Salvamento em progresso    |
| status         | string  | draft/published            |
| undoStack      | array   | Historico de undo (max 50) |
| redoStack      | array   | Historico de redo          |

### React Query (Client-side)

- Agents, workflows, runs, conversations, products
- Invalidacao em mutations
- Subscricoes real-time via Supabase Realtime

### Server Components (Default)

- Dashboard, workspace, runs fetcham dados server-side
- Suspense boundaries para streaming
- Queries paralelas onde possivel

### Context Providers

| Provider      | Funcao                          |
| ------------- | ------------------------------- |
| QueryProvider | React Query (TanStack)          |
| ThemeProvider | next-themes (light/dark/system) |
| NuqsAdapter   | URL params management           |

---

## 42. Componentes UI Customizados

### Componentes de Layout

| Componente     | Descricao                             |
| -------------- | ------------------------------------- |
| DashboardShell | Layout principal (sidebar + conteudo) |
| EditorShell    | Layout 3 paineis do editor            |
| CommandMenu    | Navegacao rapida Cmd+K                |

### Componentes de Dashboard

| Componente          | Descricao                                    |
| ------------------- | -------------------------------------------- |
| DashboardClient     | Stats + agentes + workflows                  |
| Agent Cards         | Cards 208x308 com paleta, mandala decorativa |
| Activity Sparklines | Mini graficos de execucoes                   |
| Status Badges       | Draft/published/running                      |
| Workflow List Items | Lista com ultima execucao                    |

### Componentes de Chat

| Componente        | Descricao                              |
| ----------------- | -------------------------------------- |
| ChatPanel         | Interface de chat com streaming        |
| AgentSidebar      | Workflows, skills, apps, runs recentes |
| SetupChecklist    | Checklist de onboarding do agente      |
| PresenceIndicator | Presenca real-time                     |

### Componentes de Workspace

| Componente      | Descricao                                 |
| --------------- | ----------------------------------------- |
| WorkspaceClient | Tabela/grafo + acoes em massa             |
| GraphView       | Visualizacao Dagre de agentes + workflows |

### Componentes de Formulario

| Componente        | Descricao             |
| ----------------- | --------------------- |
| LoginForm         | Email + senha + OAuth |
| SignupForm        | Registro              |
| AgentForm         | Criar/editar agente   |
| OnboardingContent | Wizard multi-step     |

### Custom Hooks (26 total)

Incluem: `useAgentChat`, `useWorkflowRuns`, `useNotifications`, `usePresence`, `useKeyboardShortcuts`, entre outros.

---

## 43. Gestao de Fornecedores

**Arquivos**: `src/app/(dashboard)/suppliers/page.tsx`, `src/components/suppliers/` (8 componentes, ~1500 linhas)

Sistema completo de gestao de fornecedores para otimizar compras e reposicao de estoque.

### Interface com 2 Abas

| Aba              | Descricao                                                                  |
| ---------------- | -------------------------------------------------------------------------- |
| **Fornecedores** | Lista de fornecedores com busca, filtros (ativo/inativo/todos) e ordenacao |
| **Reposicao**    | Timeline inteligente de reposicao com cards por produto                    |

### CRUD de Fornecedores

- **Criar**: Nome, email, telefone, lead time (dias), pedido minimo, condicoes de pagamento, notas
- **Editar**: Dialog com formulario pre-preenchido
- **Desativar**: Soft delete (is_active=false)
- **Buscar**: Por nome com filtro de status
- **Ordenar**: Por nome, lead time ou data de criacao

### Vinculacao Produto-Fornecedor (N:N)

- Vincular multiplos fornecedores a um produto com preco de custo especifico
- Marcar um fornecedor como "preferido" por produto (auto-desmarca os demais)
- Semantica de upsert: vincular mesmo par produto+fornecedor atualiza o link existente
- Rastreia `last_order_at` e `last_order_qty` para historico de compras

### Timeline de Reposicao Inteligente

Calcula quando repor baseado em: estoque atual, velocidade de vendas (previsao de demanda) e lead time do fornecedor.

| Urgencia     | Criterio                                       | Cor      |
| ------------ | ---------------------------------------------- | -------- |
| **Critico**  | Estoque acaba antes do lead time do fornecedor | Vermelho |
| **Atencao**  | Estoque acaba em ate 2x o lead time            | Amarelo  |
| **Saudavel** | Estoque suficiente para mais de 2x lead time   | Verde    |

Cada card mostra: produto, fornecedor preferido, estoque/dias restantes, quantidade sugerida (30 dias de consumo), valor estimado e data limite para pedido.

### Cards de Resumo

4 indicadores no topo: produtos criticos, atencao, saudaveis e sem fornecedor.

### Comparacao de Fornecedores

Dialog lado a lado para comparar 2+ fornecedores do mesmo produto:

- Preco de custo, lead time, pedido minimo, ultimo pedido
- Destaque automatico para melhor preco e menor lead time

### Historico de Compras

- Registrar compras realizadas (data, quantidade, valor)
- Atualiza `last_order_at` e `last_order_qty` no link

### Ferramentas de Chat (4 tools)

| Ferramenta                  | Descricao                           |
| --------------------------- | ----------------------------------- |
| STORE_MANAGE_SUPPLIERS      | CRUD de fornecedores via chat       |
| STORE_LINK_PRODUCT_SUPPLIER | Vincular produtos a fornecedores    |
| STORE_SUGGEST_REORDER       | Lista priorizada de reposicao       |
| STORE_COMPARE_SUPPLIERS     | Comparar fornecedores de um produto |

### Banco de Dados

| Tabela                    | Campos Principais                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `store_suppliers`         | id, store_id, name, contact_email, contact_phone, lead_time_days, min_order_value, payment_terms, notes, is_active |
| `store_product_suppliers` | id, store_id, product_id, supplier_id, cost_price, is_preferred, last_order_at, last_order_qty                     |

### API Routes

| Metodo                | Rota                            | Descricao                 |
| --------------------- | ------------------------------- | ------------------------- |
| GET/POST              | `/api/store/suppliers`          | Listar/criar fornecedores |
| PATCH/DELETE          | `/api/store/suppliers/[id]`     | Atualizar/desativar       |
| GET/POST/PATCH/DELETE | `/api/store/suppliers/products` | Links produto-fornecedor  |
| GET                   | `/api/store/suppliers/reorder`  | Timeline de reposicao     |

---

## 44. Traducao PT-BR

**Status**: Completa — toda a UI esta em Portugues (Brasil)

### Escopo

A plataforma inteira foi traduzida para PT-BR, incluindo:

- **Paginas**: Dashboard, workspace, agentes, workflows, produtos, fornecedores, runs, configuracoes, onboarding, auth
- **Componentes**: Botoes, labels, placeholders, dialogs, tabelas, tooltips, badges de status
- **Mensagens**: Erros, validacoes, toasts de sucesso/falha, estados vazios
- **Metadata**: Titulo da pagina, descricao, atributo `lang="pt-BR"` no `<html>`
- **Relatorios Telegram**: Alertas de estoque, notificacoes de pedido, resumo diario de vendas
- **Labels de agentes**: Nomes de segmento, prioridades, plataformas, roles de agentes
- **Testes**: Todas as 955 assertions atualizadas para PT-BR

### Implementacao

- Strings traduzidas diretamente nos componentes (sem biblioteca i18n)
- Glossario de consistencia em `.claude/translation-glossary.md` (~200 termos)
- Formatacao de datas e moeda em `pt-BR` (ex: `R$ 159,90`, `03/03/2026`)
- Nomes de exemplo localizados (ex: "Maria Silva" em vez de "Jane Doe")

### O que permanece em ingles

- Nomes de componentes, variaveis e funcoes
- System prompts de IA (instrucoes para o modelo)
- Nomes tecnicos (API, webhook, HMAC, OAuth, etc.)
- Classes CSS, aria-labels e textos sr-only

---

## Resumo Numerico

| Categoria               | Quantidade |
| ----------------------- | ---------- |
| Paginas UI              | 14         |
| Rotas de API            | 43+        |
| Ferramentas STORE\_\*   | 42         |
| Ferramentas SNEW\_\*    | 13         |
| Metodos NuvemshopClient | 38+        |
| Schemas Zod             | 17         |
| Tabelas no banco        | 37+        |
| Tipos de trigger        | 9          |
| Tipos de step           | 8          |
| Custom hooks            | 26         |
| Componentes React       | 210+       |
| Apps Composio           | 200+       |
| Funcoes helper retail   | 7          |
| Ferramentas analytics   | 9          |
| Skills por segmento     | 32         |
| Cron jobs               | 4          |
| Idioma da UI            | PT-BR      |
