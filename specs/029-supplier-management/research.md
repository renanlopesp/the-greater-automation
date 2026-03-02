# Research: Gestao de Fornecedores

**Date**: 2026-03-02
**Feature**: 029-supplier-management

## Decision 1: Calculo de Reposicao

**Decision**: Usar formula simplificada de Reorder Point + EOQ basico.

**Rationale**: Lojistas de e-commerce pequeno/medio nao precisam de modelos estatisticos complexos. A formula `ponto_reposicao = media_diaria × lead_time × 1.2` com `quantidade_sugerida = media_diaria × 30` e suficiente e compreensivel.

**Alternatives considered**:

- EOQ completo (Wilson): Requer custo de pedido e custo de armazenagem que o lojista nao tem.
- Safety stock estatistico (z-score): Complexo demais para o publico-alvo, requer desvio padrao de demanda.
- Min/Max simples: Muito basico, nao considera lead time.

## Decision 2: Fonte de dados de velocidade de vendas

**Decision**: Reutilizar logica do STORE_FORECAST_DEMAND — buscar pedidos dos ultimos 30-60 dias via API Nuvemshop, calcular media_diaria por produto.

**Rationale**: O padrao ja existe e funciona. Nao faz sentido criar um cache/tabela separada para vendas quando o forecast ja faz esse calculo. A timeline pode chamar a mesma logica (paginacao de pedidos + agregacao).

**Alternatives considered**:

- Tabela materializada de vendas diarias: Adiciona complexidade de sync sem beneficio claro para <200 fornecedores.
- Usar store_orders do Supabase: Possivel, mas os dados podem estar desatualizados vs API direta.

**Decision revisada**: Para a timeline de reposicao na UI, usar store_orders do Supabase (ja sincronizados a cada 15 min) para evitar chamadas API lentas no carregamento da pagina. Os retail tools (STORE_SUGGEST_REORDER) podem usar API direta para dados mais frescos.

## Decision 3: Estrutura da pagina /suppliers

**Decision**: Pagina com 2 tabs — "Fornecedores" (lista CRUD) e "Reposicao" (timeline). A tab de reposicao e o landing padrao quando ha alertas urgentes.

**Rationale**: Separar lista de fornecedores da timeline de reposicao evita sobrecarga visual. O lojista pode focar em gestao OU em compras. Tabs seguem padrao existente do Relay (agent detail tem tabs para workflows, skills, apps, runs).

**Alternatives considered**:

- Pagina unica com tudo: Sobrecarrega o lojista com informacao.
- Duas paginas separadas (/suppliers e /reorder): Over-engineering para o escopo atual.

## Decision 4: Comparacao de fornecedores

**Decision**: Modal/dialog que abre ao clicar em "Comparar" na timeline ou na lista de vinculos de um produto. Nao e uma pagina separada.

**Rationale**: A comparacao e contextual — o lojista quer comparar quando esta decidindo de quem comprar. Um dialog e mais rapido que navegar para outra pagina.

## Decision 5: Historico de compras

**Decision**: Campo simples na tabela store_product_suppliers (last_order_at, last_order_qty, last_order_value) + tabela separada store_purchase_orders para historico completo (P3, implementada depois se necessario).

**Rationale**: Para P1/P2, basta saber "ultima compra" para mostrar na comparacao. Historico completo e P3 e pode ser adicionado incrementalmente.

**Decision revisada**: Manter apenas os campos last_order_at, last_order_qty no vinculo. A tabela de purchase_orders fica como P3 futuro — nao sera criada agora.
