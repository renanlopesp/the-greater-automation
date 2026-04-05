# Feature Specification: Chat Dynamic Artifacts

**Feature Branch**: `055-chat-dynamic-artifacts`
**Created**: 2026-04-05
**Status**: Draft
**Input**: Implement Perplexity-style dynamic artifacts in the general chat. When the AI responds to data-oriented questions, the right-side artifact panel should display a dynamic visual representation of the data.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Sales Data Artifact (Priority: P1)

As a store owner asking "Quanto vendi hoje?" or similar sales questions, I want the artifact panel on the right to automatically display a visual sales summary card showing total revenue, order count, and top products — so I can immediately see my data in a structured, scannable format alongside the AI's text response.

**Why this priority**: Sales questions are the #1 most common data query in the chat. This is the core Perplexity-style experience — text answer on the left, visual data on the right. It replaces the empty "Nenhum resultado ainda" state.

**Independent Test**: Can be tested by asking "Quanto vendi hoje?" in the general chat and verifying the artifact panel displays a formatted sales card with revenue, orders, and product list.

**Acceptance Scenarios**:

1. **Given** the user is in general chat with an empty artifact panel, **When** they ask "Quanto vendi hoje?", **Then** the AI responds with text on the left AND the artifact panel displays a sales summary card with: total revenue, number of orders, and a ranked list of top products sold.
2. **Given** the AI has responded with sales data, **When** the user looks at the artifact panel, **Then** the data matches the numbers mentioned in the AI's text response (they are in sync).
3. **Given** the artifact panel is showing a sales summary, **When** the user asks a follow-up question about a different topic, **Then** the artifact panel updates to reflect the new response's data (or stays if the new response has no data).

---

### User Story 2 - Product/Stock Data Artifact (Priority: P2)

As a store owner asking about products or stock levels, I want the artifact panel to display a structured table or list of products with relevant data (name, stock, price, status) so I can quickly scan product information.

**Why this priority**: Product and stock queries are the second most common category. A visual table is much easier to scan than inline text bullets.

**Independent Test**: Can be tested by asking "Quais produtos estão com estoque baixo?" and verifying a product table appears in the artifact panel.

**Acceptance Scenarios**:

1. **Given** the user asks "Quais produtos estão com estoque baixo?", **When** the AI responds, **Then** the artifact panel shows a table with product name, current stock quantity, and price — sorted by stock (lowest first).
2. **Given** the user asks "Me mostra meus produtos mais vendidos", **When** the AI responds, **Then** the artifact panel shows a ranked list of products with sales count and revenue.

---

### User Story 3 - Order List Artifact (Priority: P2)

As a store owner asking about recent orders, I want the artifact panel to display an order list with order ID, customer name, total value, and status — so I can review orders at a glance.

**Why this priority**: Order queries are frequent and the structured list format is much more useful than plain text.

**Independent Test**: Can be tested by asking "Quais foram os pedidos de hoje?" and verifying an order list appears in the artifact panel.

**Acceptance Scenarios**:

1. **Given** the user asks "Quais foram os pedidos de hoje?", **When** the AI responds, **Then** the artifact panel shows a list of orders with: order number, customer name, total value, payment status, and timestamp.
2. **Given** an order list artifact is displayed, **When** the user looks at each order entry, **Then** they can see enough detail to identify the order without needing to open the store admin.

---

### User Story 4 - Generic Metric Card (Priority: P3)

As a store owner asking general business questions (revenue trends, comparisons, averages), I want the artifact panel to show a summary metric card with key numbers highlighted — providing at-a-glance business intelligence.

**Why this priority**: Catch-all for data-oriented questions that don't fit the specific patterns above. Ensures the artifact panel is useful for any data query.

**Independent Test**: Can be tested by asking "Qual meu ticket médio?" and verifying a metric card with the highlighted number appears.

**Acceptance Scenarios**:

1. **Given** the user asks "Qual meu ticket médio?", **When** the AI responds, **Then** the artifact panel shows a metric card with the average ticket value prominently displayed.
2. **Given** the user asks a question that returns no structured data (e.g., "O que é cross-sell?"), **When** the AI responds, **Then** the artifact panel remains unchanged (no artifact generated for non-data responses).

---

### Edge Cases

- What happens when the AI response contains no data (e.g., general knowledge question)? The artifact panel stays as-is — either shows the previous artifact or the empty state. No artifact is forced.
- What happens when the AI's tool call fails and returns an error? The artifact panel shows a friendly error state: "Não foi possível carregar os dados."
- What happens when the data set is empty (e.g., no sales today)? The artifact shows an empty-data state: "Nenhuma venda encontrada para hoje" with the appropriate card structure still visible.
- What happens when the user rapidly sends multiple data questions? Each response updates the artifact — the panel always reflects the most recent AI response that contained data.
- What happens when the same chat has skill results AND dynamic artifacts? Skill results (like seasonal calendar) take priority — they use the existing artifact system. Dynamic artifacts only appear when no skill artifact is active.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST automatically detect when an AI response contains structured data (sales, products, orders, metrics) and generate an artifact for the right-side panel.
- **FR-002**: The artifact MUST appear in the right-side panel simultaneously with the AI's text response — no manual trigger or second click required.
- **FR-003**: The artifact MUST visually represent the data mentioned in the AI's text response in a structured format (card, table, or list).
- **FR-004**: The system MUST support at least 4 artifact types: Sales Summary, Product Table, Order List, and Metric Card.
- **FR-005**: Each artifact type MUST have a distinct visual layout appropriate to its data type (e.g., tables for lists, highlighted numbers for single metrics).
- **FR-006**: The artifact panel MUST update when a new data-containing response arrives, replacing the previous artifact.
- **FR-007**: Non-data responses (general knowledge, conversation, greetings) MUST NOT generate artifacts — the panel retains its current state.
- **FR-008**: Artifacts MUST NOT conflict with existing skill artifacts (e.g., seasonal calendar). Skill artifacts take priority.
- **FR-009**: The artifact MUST display a title describing the data (e.g., "Vendas de Hoje", "Produtos com Estoque Baixo").
- **FR-010**: Empty data results MUST show an appropriate empty state within the artifact card structure (not a blank panel).
- **FR-011**: The artifact data MUST be consistent with the numbers and information in the AI's text response.

### Key Entities

- **Chat Artifact**: A structured data visualization generated alongside an AI response. Contains: artifact type (sales_summary, product_table, order_list, metric_card), title, and type-specific data payload.
- **Artifact Type**: Determines the visual layout and data schema. Each type has specific fields (e.g., sales_summary has total_revenue, order_count, top_products).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At least 80% of data-oriented AI responses (sales, product, order queries) generate a corresponding artifact in the right panel.
- **SC-002**: The artifact panel displays data within 1 second of the AI response completing — no additional loading delay.
- **SC-003**: Users can understand the key data point (e.g., total revenue) from the artifact alone, without reading the full AI text response.
- **SC-004**: The artifact panel transitions from empty state to data display smoothly — no layout jumps or flicker.
- **SC-005**: Zero data mismatches between the AI's text response and the artifact's displayed values.

## Assumptions

- The AI already has access to store data via existing tools (STORE_QUERY_SALES, STORE_QUERY_STOCK, STORE_LIST_ORDERS). The artifact system reads from the same tool results.
- The artifact data is extracted from the AI's tool call results, not parsed from the AI's text response. This ensures data accuracy.
- The artifact panel on the right side already exists in the UI (currently showing "Nenhum resultado ainda" for non-skill conversations). This feature repurposes that panel.
- Artifact types can be extended in the future (e.g., chart visualizations, customer details) without architectural changes.
- The AI does not need to explicitly "choose" to generate an artifact — the system detects data-containing tool results and generates the appropriate artifact automatically.
