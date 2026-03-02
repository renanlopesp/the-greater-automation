# Feature Gaps: O que a Nuvemshop NAO faz

> Documento de oportunidades para o Relay — funcionalidades que a Nuvemshop nao oferece e que agregam valor ao sistema.
>
> Legenda: ✅ Implementado | ⏳ Pendente

## O que ja existe no Relay

- Sync de catalogo de produtos (Nuvemshop + Shopify)
- Gestao de pedidos/estoque com alertas
- Forecast de demanda por produto (`STORE_FORECAST_DEMAND`)
- Monitoramento de preco por URL — scraping 4-6h (`STORE_ADD_PRICE_MONITOR`, `STORE_LIST_PRICE_MONITORS`)
- Analytics de vendas diarias (relatorios Telegram)
- Conhecimento por segmento (8 segmentos x 5 agentes)
- Gestao de cupons, draft orders, abandoned carts
- Analise de margens (`STORE_QUERY_MARGINS`, `STORE_UPDATE_COST`, `STORE_BULK_UPDATE_COST`)
- Segmentacao RFM de clientes (`STORE_ANALYZE_CUSTOMERS`)
- Analise ABC/Pareto de produtos (`STORE_ANALYZE_PRODUCTS`)
- Estimativa de LTV por segmento (`STORE_ESTIMATE_LTV`)
- Sugestao de bundles por co-ocorrencia (`STORE_SUGGEST_BUNDLES`)
- Sugestao de preco por custo, concorrencia e demanda (`STORE_SUGGEST_PRICE`)
- Previsao de churn com decay scoring (`STORE_PREDICT_CHURN`)
- Analise de cohort por mes/trimestre de primeira compra (`STORE_COHORT_ANALYSIS`)
- Markdown optimization para estoque parado (`STORE_MARKDOWN_OPTIMIZATION`)
- Simulacao de elasticidade de preco (`STORE_SIMULATE_ELASTICITY`)
- 800+ integracoes via Composio

---

## 1. Inteligencia de Cliente Avancada

A Nuvemshop so mostra dados brutos de clientes. O Relay pode cruzar dados para:

- ✅ **Segmentacao RFM** (Recencia, Frequencia, Valor) — classificar clientes em "VIP", "em risco", "perdido" → `STORE_ANALYZE_CUSTOMERS`
- ✅ **LTV estimado** — quanto cada cliente vai gastar ao longo do tempo → `STORE_ESTIMATE_LTV`
- ✅ **Recomendacao de recompra** — "cliente X comprou racao ha 25 dias, media dele e 30 dias → enviar cupom" → `STORE_ANALYZE_CUSTOMERS` (dados de recompra)
- ✅ **Previsao de churn** — clientes prestes a parar de comprar → `STORE_PREDICT_CHURN`
- ✅ **Cohort analysis** — "clientes de janeiro compram mais que os de marco?" → `STORE_COHORT_ANALYSIS`

> Secao 100% implementada.

## 2. Inteligencia Competitiva Automatizada

O monitor de preco atual scrapa URLs especificas. Pode ir alem:

- ⏳ **Monitoramento de catalogo de concorrentes** — detectar novos produtos, promocoes, mudancas de sortimento
- ⏳ **Gap analysis** — "concorrente X tem 15 produtos que voce nao tem no nicho Y"
- ⏳ **Alertas de novos competidores** — scraping de marketplaces para detectar novos vendedores
- ⏳ **Share of shelf em marketplaces** — posicao nos resultados de busca do ML/Shopee

## 3. Social Listening & Tendencias

A Nuvemshop tem zero integracao com redes sociais:

- ⏳ **Monitorar mencoes da marca** no Instagram/TikTok/Twitter (via API ou scraping)
- ⏳ **Detectar produtos em tendencia** — analisar hashtags e viral content no nicho
- ⏳ **Analise de sentimento** — o que as pessoas estao falando sobre seus produtos/marca
- ⏳ **Monitorar reviews em marketplaces** — ML, Google Shopping, Reclame Aqui
- ⏳ **Alertas de reputacao** — aviso se aparecer review negativa ou mencao negativa

## 4. Pricing Dinamico & Otimizacao de Margem

A Nuvemshop nao tem nada inteligente sobre preco:

- ✅ **Sugestao de preco** baseada em demanda + estoque + concorrencia → `STORE_SUGGEST_PRICE`
- ✅ **Analise ABC (Pareto)** — 20% dos produtos que geram 80% da receita → `STORE_ANALYZE_PRODUCTS`
- ✅ **Bundle recommendations** — "produtos frequentemente comprados juntos → criar kit" → `STORE_SUGGEST_BUNDLES`
- ✅ **Elasticidade simulada** — "se subir 10%, estimamos perder X% das vendas" → `STORE_SIMULATE_ELASTICITY`
- ✅ **Markdown optimization** — quando e quanto dar desconto para limpar estoque → `STORE_MARKDOWN_OPTIMIZATION`

## 5. Analytics Cross-Channel

Pra quem vende em mais de um canal (loja + ML + Shopee):

- ⏳ **Performance comparada** por canal — mesmo produto, precos e volumes diferentes
- ⏳ **Unit economics por canal** — margem liquida considerando comissoes de cada marketplace
- ⏳ **Arbitragem de preco** — oportunidades onde o preco em um canal permite lucro em outro
- ⏳ **Consolidacao de estoque** — visao unificada de estoque multi-canal

## 6. Supply Chain & Fornecedores

Nuvemshop nao toca nesse assunto:

- ⏳ **Gestao de fornecedores** — cadastro, lead times, historico de compras
- ⏳ **EOQ otimizado** — quantidade economica de pedido (quando comprar e quanto)
- ⏳ **Alerta de reabastecimento inteligente** — considerando lead time do fornecedor + forecast de demanda
- ⏳ **Custo de aquisicao comparado** — mesmo produto de fornecedores diferentes

## 7. Content & SEO de Produto

- ⏳ **Geracao de descricoes otimizadas** por AI
- ⏳ **Analise de SEO** dos titulos/descricoes de produtos
- ⏳ **Sugestao de tags e categorias** baseada em tendencias de busca
- ⏳ **A/B test de titulos** — testar variacoes e medir conversao

---

## Priorizacao (Impacto x Viabilidade)

| #   | Feature                                               | Status | Impacto    | Viabilidade | Dados necessarios                |
| --- | ----------------------------------------------------- | ------ | ---------- | ----------- | -------------------------------- |
| 1   | Segmentacao RFM + churn + cohort                      | ✅     | Alto       | Alta        | Pedidos (ja temos)               |
| 2   | Analise ABC (Pareto)                                  | ✅     | Alto       | Alta        | Pedidos + produtos (ja temos)    |
| 5   | Pricing completo (preco+bundle+markdown+elasticidade) | ✅     | Muito Alto | Media       | Pedidos + concorrencia + estoque |
| 3   | Inteligencia competitiva expandida                    | ⏳     | Alto       | Media       | Scraping (ja temos infra)        |
| 4   | Social listening basico                               | ⏳     | Alto       | Media       | APIs externas                    |
| 6   | Analytics cross-channel                               | ⏳     | Alto       | Baixa       | Integracao ML/Shopee             |
| 7   | Gestao de fornecedores                                | ⏳     | Medio      | Alta        | Input manual + pedidos           |
| 8   | SEO de produto                                        | ⏳     | Medio      | Alta        | Dados de produto (ja temos)      |

## Resumo de progresso

**Implementado (12/22 itens):**

- Secao 1 completa: Segmentacao RFM, LTV estimado, Recomendacao de recompra, Previsao de churn, Cohort analysis
- Secao 4 completa: Sugestao de preco, Analise ABC, Bundle recommendations, Elasticidade simulada, Markdown optimization

**Requer novas integracoes:**

- Inteligencia competitiva expandida (scraping de catalogos)
- Social listening (APIs de redes sociais)
- Analytics cross-channel (integracao ML/Shopee)
- Gestao de fornecedores (input manual + novo schema)
- SEO de produto (dados ja disponiveis, mas baixa prioridade)
