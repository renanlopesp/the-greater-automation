# Feature Gaps — Status de Implementacao

> Cruzamento entre o documento de oportunidades (`docs/FEATURE_GAPS.md`) e o que ja foi implementado na plataforma.
> **Ultima atualizacao**: 2026-02-27

---

## 1. Inteligencia de Cliente Avancada

| Sub-feature              | Status           | Detalhes                                                                            |
| ------------------------ | ---------------- | ----------------------------------------------------------------------------------- |
| Segmentacao RFM          | **IMPLEMENTADO** | STORE_ANALYZE_CUSTOMERS com 6 segmentos (VIP, Loyal, Promising, At Risk, Lost, New) |
| Recomendacao de recompra | **IMPLEMENTADO** | STORE_ANALYZE_CUSTOMERS focus="repurchase" — detecta atrasados e proximas recompras |
| Previsao de churn        | **PARCIAL**      | Focus="at_risk" mostra At Risk + Lost, mas nao tem score de probabilidade de churn  |
| LTV estimado             | **NAO FEITO**    | Nao calcula lifetime value projetado                                                |
| Cohort analysis          | **NAO FEITO**    | Nao agrupa clientes por periodo de aquisicao                                        |

---

## 2. Inteligencia Competitiva Automatizada

| Sub-feature                   | Status         | Detalhes                                        |
| ----------------------------- | -------------- | ----------------------------------------------- |
| Monitor de preco por URL      | **JA EXISTIA** | STORE_ADD_PRICE_MONITOR com workflow automatico |
| Monitoramento de catalogo     | **NAO FEITO**  | Scraping de catalogo inteiro do concorrente     |
| Gap analysis                  | **NAO FEITO**  | Comparar sortimento com concorrente             |
| Alertas de novos competidores | **NAO FEITO**  | Detectar novos vendedores em marketplaces       |
| Share of shelf                | **NAO FEITO**  | Posicao nos resultados de busca                 |

---

## 3. Social Listening & Tendencias

| Sub-feature                    | Status        | Detalhes                                 |
| ------------------------------ | ------------- | ---------------------------------------- |
| Monitorar mencoes da marca     | **NAO FEITO** | Requer API de redes sociais              |
| Detectar produtos em tendencia | **NAO FEITO** | Requer analise de hashtags/viral content |
| Analise de sentimento          | **NAO FEITO** | Requer NLP em mencoes externas           |
| Monitorar reviews              | **NAO FEITO** | Requer scraping de ML/Google Shopping    |
| Alertas de reputacao           | **NAO FEITO** | Requer monitoramento continuo            |

**Inteiro por fazer** — depende de integracoes externas (APIs de redes sociais, scraping de marketplaces).

---

## 4. Pricing Dinamico & Otimizacao de Margem

| Sub-feature            | Status           | Detalhes                                                  |
| ---------------------- | ---------------- | --------------------------------------------------------- |
| Analise ABC (Pareto)   | **IMPLEMENTADO** | STORE_ANALYZE_PRODUCTS com classes A/B/C + margens + giro |
| Sugestao de preco      | **NAO FEITO**    | Algoritmo de pricing baseado em demanda + concorrencia    |
| Elasticidade simulada  | **NAO FEITO**    | Simulacao "se subir X%, perde Y% de vendas"               |
| Bundle recommendations | **NAO FEITO**    | Produtos frequentemente comprados juntos                  |
| Markdown optimization  | **NAO FEITO**    | Quando e quanto dar desconto para limpar estoque          |

---

## 5. Analytics Cross-Channel

| Sub-feature              | Status        | Detalhes                                  |
| ------------------------ | ------------- | ----------------------------------------- |
| Performance comparada    | **NAO FEITO** | Requer integracao ML/Shopee               |
| Unit economics por canal | **NAO FEITO** | Requer dados de comissoes por marketplace |
| Arbitragem de preco      | **NAO FEITO** | Requer dados multi-canal                  |
| Consolidacao de estoque  | **NAO FEITO** | Requer integracao multi-plataforma        |

**Inteiro por fazer** — depende de integracao com Mercado Livre e Shopee.

---

## 6. Supply Chain & Fornecedores

| Sub-feature                           | Status        | Detalhes                                                                          |
| ------------------------------------- | ------------- | --------------------------------------------------------------------------------- |
| Gestao de fornecedores                | **NAO FEITO** | Tabela nova necessaria                                                            |
| EOQ otimizado                         | **NAO FEITO** | Calculo de quantidade economica de pedido                                         |
| Alerta de reabastecimento inteligente | **PARCIAL**   | STORE_FORECAST_DEMAND ja mostra "restock urgente" mas sem lead time de fornecedor |
| Custo de aquisicao comparado          | **NAO FEITO** | Requer dados de fornecedores                                                      |

---

## 7. Content & SEO de Produto

| Sub-feature                  | Status        | Detalhes                                           |
| ---------------------------- | ------------- | -------------------------------------------------- |
| Geracao de descricoes por AI | **NAO FEITO** | Ja tem infra (AI steps), mas nao tem tool dedicada |
| Analise de SEO               | **NAO FEITO** | Avaliar titulos/descricoes                         |
| Sugestao de tags/categorias  | **NAO FEITO** | Baseado em tendencias                              |
| A/B test de titulos          | **NAO FEITO** | Testar variacoes + medir conversao                 |

---

## Resumo Geral

| #         | Feature                  |   Implementado    | Parcial | Nao Feito |
| --------- | ------------------------ | :---------------: | :-----: | :-------: |
| 1         | Inteligencia de Cliente  |         2         |    1    |     2     |
| 2         | Inteligencia Competitiva | 1 (pre-existente) |    0    |     4     |
| 3         | Social Listening         |         0         |    0    |     5     |
| 4         | Pricing Dinamico         |         1         |    0    |     4     |
| 5         | Analytics Cross-Channel  |         0         |    0    |     4     |
| 6         | Supply Chain             |         0         |    1    |     3     |
| 7         | Content & SEO            |         0         |    0    |     4     |
| **Total** | **4**                    |       **2**       | **26**  |

---

## Proximas Implementacoes Mais Viaveis (sem novas integracoes)

1. **LTV estimado** — Pode ser calculado com dados de pedidos existentes (media de gasto x frequencia projetada)
2. **Cohort analysis** — Agrupar clientes por mes de primeira compra, comparar retencao
3. **Bundle recommendations** — Analisar pedidos para encontrar produtos comprados juntos
4. **Markdown optimization** — Cruzar estoque parado (ja temos do ABC) com historico de precos
5. **Sugestao de preco** — Combinar dados de demanda + margem + concorrencia que ja temos
6. **Geracao de descricoes por AI** — Ja tem toda a infra (AI steps, dados de produto)
