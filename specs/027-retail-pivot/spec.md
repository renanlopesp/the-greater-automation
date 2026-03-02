# Feature Specification: Retail Pivot — AI Assistant for Store Owners

**Feature Branch**: `027-retail-pivot`
**Created**: 2026-02-21
**Status**: Draft
**Input**: Pivot Snew from generic automation to retail-focused AI assistant. Onboarding + fixed agents + Nuvemshop integration + pre-built workflows + Telegram alerts. Target: Brazilian SMB store owners.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Store Onboarding (Priority: P1)

A new store owner signs up for Snew. After creating their account, they are guided through a 4-step onboarding flow: they enter their store name, choose a segment (roupas, eletronicos, alimentos, cosmeticos, casa-decoracao, esportes, pet, outros), provide their store platform link (Nuvemshop, Shopify, Mercado Livre, or "Ainda nao tenho loja online"), and select what matters most to them (controle de estoque, monitorar concorrencia, resumo de vendas, atendimento ao cliente). At the end of onboarding, the system creates a `store` record and auto-provisions specialized agents for that store's domain. The user is then redirected to the Telegram linking step.

**Why this priority**: Without onboarding, no store data exists and no agents can be created. This is the foundation for everything else.

**Independent Test**: Can be tested by signing up a new account, completing onboarding, and verifying the store record + agents are created in the database.

**Acceptance Scenarios**:

1. **Given** a newly signed-up user with no store, **When** they complete all 4 onboarding steps, **Then** a store record is created with their name/segment/platform, 4 specialized agents are created for their team, and they are redirected to the Telegram linking step.
2. **Given** a user on the onboarding flow, **When** they select "Ainda nao tenho loja online", **Then** the platform_url field is skipped and the store is created with platform "manual".
3. **Given** a user who has already completed onboarding, **When** they log in again, **Then** they skip onboarding and land on the retail home page.
4. **Given** a user on any onboarding step, **When** they click back, **Then** they return to the previous step with their data preserved.

---

### User Story 2 — Telegram Linking During Onboarding (Priority: P1)

After the store setup steps, the final onboarding step is linking Telegram. The user sees a verification code and instructions to message @snew_ai_bot on Telegram with `/link CODE`. Once linked, the user receives a welcome message in Portuguese tailored to their store: "Ola, [nome]! Sou o Snew, seu assistente de automacao para [nome da loja]. Posso te ajudar com estoque, vendas, precos e atendimento. Pergunta qualquer coisa!" The user can also skip this step and link later from settings.

**Why this priority**: Telegram is the primary interface — the entire product value proposition depends on it being set up during onboarding.

**Independent Test**: Can be tested by completing onboarding, generating a Telegram link code, sending `/link CODE` in Telegram, and verifying the welcome message arrives.

**Acceptance Scenarios**:

1. **Given** a user on the Telegram linking step, **When** they generate a code and send `/link CODE` in Telegram, **Then** the account is linked, a personalized welcome message is sent, and the onboarding is marked complete.
2. **Given** a user on the Telegram linking step, **When** they click "Pular por agora", **Then** onboarding is marked complete and they land on the retail home page with a banner prompting them to link Telegram.
3. **Given** a linked user, **When** they send any message in Telegram, **Then** Snew responds in Portuguese with awareness of their store context (name, segment, connected platform).

---

### User Story 3 — Fixed Specialized Agents (Priority: P1)

When a store is created, the system auto-provisions 4 specialized agents. These agents are invisible to the user — they never see "agents" in the UI. Instead, Snew (the Telegram bot) routes queries internally to the right agent based on intent:

| Agent          | Internal Name    | Palette | Domain                                             |
| -------------- | ---------------- | ------- | -------------------------------------------------- |
| Estoquista     | stock-monitor    | green   | Stock levels, reorder alerts, inventory queries    |
| Vigia de Preco | price-watcher    | orange  | Competitor monitoring, price alerts, market trends |
| Caixa          | sales-reporter   | blue    | Sales summaries, revenue metrics, daily reports    |
| Atendente      | customer-support | purple  | Customer FAQ, order status, return policies        |

Each agent gets pre-loaded knowledge skills relevant to the store's segment. For example, a clothing store's Estoquista knows about sizes/colors as stock dimensions; an electronics store's Vigia de Preco knows about tech product lifecycle pricing patterns.

**Why this priority**: Agents are the intelligence layer. Without them, Telegram responses are generic and not useful.

**Independent Test**: Can be tested by creating a store via onboarding and verifying 4 agents exist with correct palettes, names, and segment-specific skills.

**Acceptance Scenarios**:

1. **Given** a completed onboarding for a "roupas" segment store, **When** agents are provisioned, **Then** 4 agents exist with segment-specific knowledge skills (e.g., Estoquista knows about tamanhos/cores, Caixa knows about sazonalidade de moda).
2. **Given** a user who sends "como ta meu estoque?" via Telegram, **When** Snew processes the message, **Then** the query is routed to the Estoquista agent internally.
3. **Given** a user who sends "quanto vendi hoje?" via Telegram, **When** Snew processes the message, **Then** the query is routed to the Caixa agent internally.

---

### User Story 4 — Nuvemshop Integration (Priority: P2)

During onboarding (or later from settings), a user who selected Nuvemshop as their platform can connect their store via OAuth. Once connected, the system syncs their product catalog (name, SKU, price, stock quantity, images) into a local `store_products` table. An initial full sync runs immediately after connection, and incremental syncs run on a schedule (every 15 minutes). The user can also trigger a manual sync from Telegram: "sincroniza meu estoque".

**Why this priority**: Without real store data, the AI can only give generic answers. Platform integration makes responses actionable and accurate.

**Independent Test**: Can be tested by connecting a Nuvemshop test store, waiting for sync, and querying stock via Telegram to verify real data is returned.

**Acceptance Scenarios**:

1. **Given** a user who selected Nuvemshop during onboarding, **When** they click "Conectar Nuvemshop" and complete OAuth, **Then** their store is connected and an initial product sync begins.
2. **Given** a connected Nuvemshop store with 50 products, **When** initial sync completes, **Then** all 50 products are stored locally with name, SKU, price, stock quantity, and variant info.
3. **Given** a synced store, **When** the user asks "como ta meu estoque?" via Telegram, **Then** Snew queries real product data and responds with actual stock numbers.
4. **Given** a connected store, **When** a product's stock changes on Nuvemshop, **Then** the change is reflected locally within 15 minutes (next scheduled sync).
5. **Given** a user who sends "sincroniza meu estoque" via Telegram, **When** the message is processed, **Then** an immediate sync is triggered and the user is notified when complete.

---

### User Story 5 — Stock Alert Workflows (Priority: P2)

Users who selected "controle de estoque" during onboarding get an auto-created workflow: "Alerta de Estoque Baixo". When any product's stock falls below a configurable threshold (default: 5 units), the user receives a Telegram alert: "Estoque baixo: [Produto] tem apenas [N] unidades. Deseja criar um pedido de reposicao?"

Users can configure thresholds via Telegram: "muda o alerta de estoque pra 10 unidades" or "alerta de estoque do [produto] pra 3 unidades" (per-product override).

**Why this priority**: Stock alerts are the #1 requested feature by store owners. This is the core value loop that drives daily engagement.

**Independent Test**: Can be tested by setting a product's stock below threshold and verifying a Telegram alert arrives.

**Acceptance Scenarios**:

1. **Given** a store with the stock alert workflow enabled, **When** a product's synced stock drops below the default threshold (5), **Then** the user receives a Telegram message with product name, current stock, and a reorder prompt.
2. **Given** a user who sends "muda o alerta de estoque pra 10 unidades" via Telegram, **When** the message is processed, **Then** the default threshold is updated to 10 for all products.
3. **Given** a user who sends "alerta de estoque da Camiseta Preta pra 3" via Telegram, **When** the message is processed, **Then** a per-product override is created for "Camiseta Preta" with threshold 3.
4. **Given** a product with a per-product threshold of 3 and a default threshold of 10, **When** stock is at 4, **Then** no alert is sent (per-product override takes precedence).

---

### User Story 6 — Daily Sales Summary (Priority: P2)

Users who selected "resumo de vendas" during onboarding get an auto-created scheduled workflow: "Resumo Diario de Vendas". Every day at 21:00 (user's timezone, default BRT), the system sends a Telegram summary with: total orders today, total revenue, top 3 products sold, comparison with yesterday. The user can change the time via Telegram: "manda o resumo as 18h".

**Why this priority**: Daily sales visibility is a key engagement driver. Store owners check sales obsessively — having it pushed to them builds habit.

**Independent Test**: Can be tested by triggering the scheduled workflow and verifying the Telegram summary message content and format.

**Acceptance Scenarios**:

1. **Given** a store with the daily summary workflow enabled, **When** 21:00 BRT arrives, **Then** the user receives a Telegram message with today's order count, revenue, top 3 products, and yesterday's comparison.
2. **Given** a store with no sales today, **When** the summary is sent, **Then** the message says "Nenhuma venda hoje" with yesterday's numbers for comparison.
3. **Given** a user who sends "manda o resumo as 18h" via Telegram, **When** the message is processed, **Then** the scheduled time is updated to 18:00.

---

### User Story 7 — New Order Notifications (Priority: P3)

Users who selected "resumo de vendas" or "atendimento ao cliente" during onboarding also get instant order notifications. When a new order arrives on Nuvemshop, the user receives a Telegram notification: "Novo pedido #[number]! [Cliente] comprou [N] items por R$[total]. Ver detalhes?"

**Why this priority**: Instant order notifications create excitement and engagement. Lower priority because the daily summary already covers sales data.

**Independent Test**: Can be tested by creating a test order on Nuvemshop and verifying a Telegram notification arrives.

**Acceptance Scenarios**:

1. **Given** a connected Nuvemshop store with order notifications enabled, **When** a new order is placed, **Then** the user receives an instant Telegram notification with order number, customer name, item count, and total.
2. **Given** a user who sends "para de notificar pedidos" via Telegram, **When** the message is processed, **Then** order notifications are disabled.

---

### User Story 8 — Competitor Price Monitoring (Priority: P3)

Users who selected "monitorar concorrencia" during onboarding can set up price monitoring. Via Telegram, they can say "monitora o preco da Camiseta Basica no Mercado Livre" and the system will periodically check the competitor's page and alert when the price changes: "O preco de [Produto] no [Concorrente] mudou de R$[old] para R$[new]."

**Why this priority**: Valuable but complex. Requires web scraping infrastructure. Can launch with basic support and iterate.

**Independent Test**: Can be tested by setting up a price monitor on a known product URL and simulating a price change.

**Acceptance Scenarios**:

1. **Given** a user who sends "monitora o preco da Camiseta Basica no Mercado Livre" via Telegram, **When** the system processes it, **Then** a price monitoring entry is created with the product name and marketplace.
2. **Given** an active price monitor, **When** the competitor price changes, **Then** the user receives a Telegram alert with old price, new price, and percentage change.
3. **Given** a user who sends "para de monitorar [produto]" via Telegram, **When** the message is processed, **Then** the price monitor is deactivated.

---

### Edge Cases

- What happens when a user has no products synced yet and asks "como ta meu estoque?"? → Snew responds: "Sua loja ainda nao tem produtos sincronizados. Conecte sua Nuvemshop pra eu poder acompanhar seu estoque."
- What happens when Nuvemshop OAuth fails or token expires? → System retries once, then sends Telegram alert: "Perdi a conexao com sua Nuvemshop. Reconecte em Configuracoes ou me diga 'reconectar nuvemshop'."
- What happens when the store has 5000+ products? → Sync is paginated. Stock alerts only fire for products below threshold (not all 5000).
- What happens when two users from the same team complete onboarding? → Only the first user triggers store/agent creation. Second user joins the existing store.
- What happens when user sends messages in English? → Snew responds in the language the user writes in, but defaults to Portuguese.
- What happens when a product has variants (size S, M, L)? → Stock is tracked per variant. Alert includes variant info: "Estoque baixo: Camiseta Preta (M) — 2 unidades."

## Requirements _(mandatory)_

### Functional Requirements

**Onboarding**

- **FR-001**: System MUST present a multi-step onboarding flow after first login for users without a store.
- **FR-002**: Onboarding MUST collect: store name, segment, platform choice, and priority features.
- **FR-003**: System MUST support segments: roupas, eletronicos, alimentos, cosmeticos, casa-decoracao, esportes, pet, outros.
- **FR-004**: System MUST support platforms: nuvemshop, shopify, mercadolivre, manual (no online store).
- **FR-005**: System MUST support priorities: controle_de_estoque, monitorar_concorrencia, resumo_de_vendas, atendimento.
- **FR-006**: System MUST persist onboarding completion status so returning users skip it.
- **FR-007**: System MUST allow users to skip the Telegram linking step and complete it later.

**Fixed Agents**

- **FR-008**: System MUST auto-create 4 specialized agents (Estoquista, Vigia de Preco, Caixa, Atendente) when a store is created.
- **FR-009**: Each agent MUST have segment-specific knowledge skills pre-loaded.
- **FR-010**: Agents MUST be invisible in the user-facing UI — the user only interacts with "Snew".
- **FR-011**: Snew MUST route user queries to the appropriate agent based on intent (stock → Estoquista, sales → Caixa, prices → Vigia, support → Atendente).

**Nuvemshop Integration**

- **FR-012**: System MUST support Nuvemshop OAuth connection from onboarding or settings.
- **FR-013**: System MUST sync products (name, SKU, price, stock, variants, images) from Nuvemshop.
- **FR-014**: System MUST run an initial full sync upon connection and incremental syncs every 15 minutes.
- **FR-015**: Users MUST be able to trigger a manual sync via Telegram ("sincroniza meu estoque").
- **FR-016**: System MUST handle Nuvemshop API rate limits and token refresh gracefully.

**Workflows & Alerts**

- **FR-017**: System MUST auto-create workflows based on onboarding priority selections.
- **FR-018**: Stock alert workflow MUST trigger when any product's stock falls below threshold.
- **FR-019**: Default stock threshold MUST be 5 units, configurable globally and per-product.
- **FR-020**: Daily sales summary MUST be sent as a scheduled Telegram message at a configurable time (default: 21:00 BRT).
- **FR-021**: New order notifications MUST be sent instantly via Telegram when enabled.
- **FR-022**: All alerts and summaries MUST be sent in Portuguese by default.
- **FR-023**: Users MUST be able to configure workflow settings via Telegram natural language (thresholds, schedule times, enable/disable).

**Retail Home**

- **FR-024**: After onboarding, users MUST see a retail-focused home page (not the generic dashboard).
- **FR-025**: Retail home MUST show: store status, recent alerts, quick stats (products synced, alerts active, last sync time).

### Key Entities

- **Store**: Represents the user's retail business. Attributes: name, segment, platform, platform_url, platform_credentials, team_id, onboarding_completed.
- **Store Product**: A synced product from the connected platform. Attributes: store_id, external_id, name, sku, price, stock_quantity, variants, images, last_synced_at.
- **Stock Alert Config**: Per-product or global stock threshold settings. Attributes: store_id, product_id (nullable for global), threshold, is_enabled.
- **Price Monitor**: A competitor product being watched. Attributes: store_id, product_name, marketplace, url, last_price, last_checked_at, is_active.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: New users complete the full onboarding flow (signup → store setup → Telegram linked) in under 5 minutes.
- **SC-002**: 80% of users who start onboarding complete all steps including Telegram linking.
- **SC-003**: Stock alerts are delivered to Telegram within 2 minutes of a threshold breach being detected.
- **SC-004**: Daily sales summary is delivered within 5 minutes of scheduled time.
- **SC-005**: Product catalog sync from Nuvemshop completes within 30 seconds for stores with up to 500 products.
- **SC-006**: Users can configure alert thresholds and schedules via Telegram in a single message exchange.
- **SC-007**: The retail AI assistant answers stock/sales queries with real data (not generic responses) for 90% of common questions.
- **SC-008**: 70% of active users engage with the Telegram bot at least 3 times per week.

## Assumptions

- Users have an active Telegram account (this is the primary interface).
- Nuvemshop is the first platform; Shopify and Mercado Livre integrations will follow in subsequent iterations.
- The existing `agents`, `agent_workflows`, `agent_skills`, and `messaging_links` tables will be reused and extended, not replaced.
- Portuguese (Brazilian) is the default language. The bot responds in the user's language when they write in another language.
- Competitor price monitoring (P3) will start with manual URL-based monitoring; automatic marketplace search comes later.
- The "Retail Home" page replaces the existing dashboard for retail users but does not remove the generic dashboard (it may still be used by non-retail users or admin).
