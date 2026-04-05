# Quickstart: Chat Dynamic Artifacts

## Prerequisites

- `bun dev` running
- Store connected (Nuvemshop) with sales data

## Testing the Feature

### 1. Sales Summary Artifact

1. Open a new task in the chat
2. Type: "Quanto vendi hoje?"
3. The AI responds with text on the left
4. Verify: the right panel shows a sales summary card with revenue, order count, and top products

### 2. Product Table Artifact

1. Type: "Quais produtos estão com estoque baixo?"
2. Verify: the right panel shows a product table with name, stock, and price columns

### 3. Order List Artifact

1. Type: "Quais foram os pedidos de hoje?"
2. Verify: the right panel shows an order list with number, customer, total, and status

### 4. Metric Card Artifact

1. Type: "Qual meu ticket médio?"
2. Verify: the right panel shows a metric card with the value prominently displayed

### 5. Non-Data Question (No Artifact)

1. Type: "O que é cross-sell?"
2. Verify: the right panel does NOT change — stays as-is

### 6. Skill Priority

1. First generate a seasonal calendar
2. While the calendar artifact is showing, ask "Quanto vendi hoje?"
3. Verify: the calendar artifact remains — it is NOT replaced by sales data

## Key Files

| File                                                   | Role                                             |
| ------------------------------------------------------ | ------------------------------------------------ |
| `src/components/chat/artifacts/chat-data-artifact.tsx` | Renders sales/product/order/metric cards         |
| `src/components/chat/artifact-renderer.tsx`            | Routes 'chat-data' type to ChatDataArtifact      |
| `src/lib/ai/platform-tools.ts`                         | SNEW_MODIFY_ARTIFACT writes artifact data        |
| `src/app/api/chat/route.ts`                            | System prompt instructs AI to generate artifacts |
