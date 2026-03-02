# Feature Gaps: O que a Nuvemshop NAO faz

> Documento de oportunidades para o Relay — funcionalidades que a Nuvemshop nao oferece e que agregam valor ao sistema.

## O que ja existe no Relay

- Sync de catalogo de produtos (Nuvemshop + Shopify)
- Gestao de pedidos/estoque com alertas
- Forecast de demanda (media simples de consumo diario)
- Monitoramento de preco por URL (scraping 4-6h)
- Analytics de vendas diarias (relatorios Telegram)
- Conhecimento por segmento (8 segmentos x 5 agentes)
- Gestao de cupons, draft orders, abandoned carts
- 800+ integracoes via Composio

---

## 1. Inteligencia de Cliente Avancada

A Nuvemshop so mostra dados brutos de clientes. O Relay pode cruzar dados para:

- **Segmentacao RFM** (Recencia, Frequencia, Valor) — classificar clientes em "VIP", "em risco", "perdido"
- **Previsao de churn** — clientes prestes a parar de comprar
- **LTV estimado** — quanto cada cliente vai gastar ao longo do tempo
- **Cohort analysis** — "clientes de janeiro compram mais que os de marco?"
- **Recomendacao de recompra** — "cliente X comprou racao ha 25 dias, media dele e 30 dias → enviar cupom"

> Possivel apenas com dados de pedidos que ja temos.

## 2. Inteligencia Competitiva Automatizada

O monitor de preco atual scrapa URLs especificas. Pode ir alem:

- **Monitoramento de catalogo de concorrentes** — detectar novos produtos, promocoes, mudancas de sortimento
- **Gap analysis** — "concorrente X tem 15 produtos que voce nao tem no nicho Y"
- **Alertas de novos competidores** — scraping de marketplaces para detectar novos vendedores
- **Share of shelf em marketplaces** — posicao nos resultados de busca do ML/Shopee

## 3. Social Listening & Tendencias

A Nuvemshop tem zero integracao com redes sociais:

- **Monitorar mencoes da marca** no Instagram/TikTok/Twitter (via API ou scraping)
- **Detectar produtos em tendencia** — analisar hashtags e viral content no nicho
- **Analise de sentimento** — o que as pessoas estao falando sobre seus produtos/marca
- **Monitorar reviews em marketplaces** — ML, Google Shopping, Reclame Aqui
- **Alertas de reputacao** — aviso se aparecer review negativa ou mencao negativa

## 4. Pricing Dinamico & Otimizacao de Margem

A Nuvemshop nao tem nada inteligente sobre preco:

- **Sugestao de preco** baseada em demanda + estoque + concorrencia + sazonalidade
- **Analise ABC (Pareto)** — 20% dos produtos que geram 80% da receita
- **Elasticidade simulada** — "se subir 10%, estimamos perder X% das vendas"
- **Bundle recommendations** — "produtos frequentemente comprados juntos → criar kit"
- **Markdown optimization** — quando e quanto dar desconto para limpar estoque

## 5. Analytics Cross-Channel

Pra quem vende em mais de um canal (loja + ML + Shopee):

- **Performance comparada** por canal — mesmo produto, precos e volumes diferentes
- **Unit economics por canal** — margem liquida considerando comissoes de cada marketplace
- **Arbitragem de preco** — oportunidades onde o preco em um canal permite lucro em outro
- **Consolidacao de estoque** — visao unificada de estoque multi-canal

## 6. Supply Chain & Fornecedores

Nuvemshop nao toca nesse assunto:

- **Gestao de fornecedores** — cadastro, lead times, historico de compras
- **EOQ otimizado** — quantidade economica de pedido (quando comprar e quanto)
- **Alerta de reabastecimento inteligente** — considerando lead time do fornecedor + forecast de demanda
- **Custo de aquisicao comparado** — mesmo produto de fornecedores diferentes

## 7. Content & SEO de Produto

- **Geracao de descricoes otimizadas** por AI
- **Analise de SEO** dos titulos/descricoes de produtos
- **Sugestao de tags e categorias** baseada em tendencias de busca
- **A/B test de titulos** — testar variacoes e medir conversao

---

## Priorizacao (Impacto x Viabilidade)

| #   | Feature                            | Impacto    | Viabilidade | Dados necessarios                |
| --- | ---------------------------------- | ---------- | ----------- | -------------------------------- |
| 1   | Segmentacao RFM + recompra         | Alto       | Alta        | Pedidos (ja temos)               |
| 2   | Analise ABC (Pareto)               | Alto       | Alta        | Pedidos + produtos (ja temos)    |
| 3   | Inteligencia competitiva expandida | Alto       | Media       | Scraping (ja temos infra)        |
| 4   | Social listening basico            | Alto       | Media       | APIs externas                    |
| 5   | Pricing dinamico                   | Muito Alto | Media       | Pedidos + concorrencia + estoque |
| 6   | Analytics cross-channel            | Alto       | Baixa       | Integracao ML/Shopee             |
| 7   | Gestao de fornecedores             | Medio      | Alta        | Input manual + pedidos           |
| 8   | SEO de produto                     | Medio      | Alta        | Dados de produto (ja temos)      |

## O que da pra fazer AGORA (sem novas integracoes)

Os itens **1, 2, e parcialmente 5** podem ser construidos apenas com dados que o sistema ja coleta (pedidos, produtos, estoque, preco de custo). E a juncao de dados que a Nuvemshop nao faz — ela mostra dados crus, mas nao cruza nem analisa.
