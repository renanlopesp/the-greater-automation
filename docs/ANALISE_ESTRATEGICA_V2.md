# Analise Estrategica: Snew Automation — V2 (Corrigida)

_Data: 4 de marco de 2026_
_Baseada em: revisao completa do codigo-fonte, produto rodando, pesquisa de mercado_

---

## 1. O QUE E O SNEW

O Snew e uma plataforma de automacao inteligente para e-commerce, focada no ecossistema Nuvemshop. Nao e "mais um dashboard" nem "mais um chatbot" — e um sistema completo onde agentes de IA operam a loja junto com o lojista.

### O que o Snew faz hoje (em producao, funcionando):

**Agentes de IA que OPERAM (nao so respondem)**

- 6 agentes especializados: Stock Manager, Competitor Analysis, Customer Service, Price Monitor, Marketing Ops, Sales Analyst
- O agente central (Snew) roteia para o especialista certo
- 44+ ferramentas de varejo: criam/editam/deletam produtos, gerenciam pedidos, cupons, categorias, fornecedores, fulfillment
- 12+ ferramentas de plataforma: criam workflows, gerenciam skills, delegam para outros agentes
- Acesso a 100+ apps externos via Composio (GitHub, Slack, Discord, Google Sheets, etc.)
- O lojista fala "cria um cupom de 10% para pascoa" e o agente cria. Fala "quais produtos estao com estoque baixo?" e ele consulta dados reais e responde com tabela formatada

**Motor de workflows que EXECUTA de verdade**

- 4 entry points: scheduled (cron), webhook, manual, app events (Composio)
- 8 tipos de step: AI, HTTP, web scraping (Firecrawl), Telegram, Composio apps, flow control, utility, sequence
- Evidencia: "New Order Notification" com 143 execucoes reais, rodando a cada hora
- Monitoramento de preco de concorrentes ativo (scrape + AI + Telegram)
- Tracking completo: workflow_runs + workflow_run_steps com status, duracao, creditos IA
- Retry com exponential backoff, rate limiting, timeout configuravel

**Inteligencia de varejo profunda**

- Analise ABC (classificacao de produtos por contribuicao de receita)
- Segmentacao RFM de clientes (Recency, Frequency, Monetary)
- Calculo de LTV (Lifetime Value)
- Previsao de demanda
- Sugestao de preco baseada em custo/margem/historico
- Simulacao de elasticidade de preco
- Sugestao de bundles
- Predicao de churn
- Analise de cohort
- Otimizacao de markdown
- Tudo com dados REAIS da loja Nuvemshop

**Gestao de fornecedores completa**

- CRUD de fornecedores com lead time, pedido minimo, status
- Linking produto-fornecedor com custo por fornecedor
- Timeline de reposicao baseada em urgencia
- Comparacao entre fornecedores
- Sugestao inteligente de reposicao via IA

**Integracoes reais e em producao**

- **Nuvemshop**: OAuth completo, sync bidirecional a cada 15min via cron, webhook com HMAC-SHA256, CRUD completo de produtos/pedidos/clientes/cupons/carrinhos/categorias/paginas
- **Stripe**: Billing funcional com 3 planos (Free/Pro/Enterprise), checkout, customer portal, webhook para 4 eventos, usage metering
- **Telegram**: Bot API com linking via codigo, envio/recebimento de mensagens, daily summary automatico, alertas de estoque, processamento async via pg_net
- **Composio**: SDK integrado para triggers e acoes em 100+ apps, verificacao de assinatura, idempotencia
- **Firecrawl**: Web scraping para monitoramento de precos

---

## 2. O PRODUTO VISUAL (O que o usuario ve)

**Dashboard** — Painel central com metricas (6 agentes, 7 automacoes, 26 execucoes hoje), cards de Workers com icones personalizados, tabela de automacoes com sparklines de atividade

**Chat** — Interface de conversa com o Snew mostrando dados reais (cupons com codigos, valores, datas). Starters rapidos: "Como esta meu estoque?", "Vendas de hoje", "Previsao de demanda", "Pedidos recentes"

**Produtos** — Tabela com 178 produtos reais da loja Milkes, colunas de Preco/Custo/Margem%/MargemR$, edicao inline de custo, importacao CSV, filtros por margem/status. Banner de "Previsao de demanda" linkando ao chat

**Fornecedores** — Tabela com CRUD, tabs de Fornecedores/Reposicao, acoes de vincular produtos/editar/desativar

**Execucoes** — Historico completo com ID, automacao, status (Concluido/Falhou), duracao, etapas, creditos IA, data/hora. Dados reais mostrando execucoes a cada 1-2 horas

**Editor de Workflow** — Canvas visual com steps conectados (Scheduled -> Fetch Recent Orders -> Check New Orders -> Send Telegram Notification). Tabs de Editor/Execucoes/Testes. Botoes Salvar/Publicado/Executar

**Workspace** — File browser com agentes e automacoes, filtros por criador/status/tipo, acoes em batch

**UI/UX**: dark mode polido, tema OKLCH com laranja/verde como accent, sidebar compacta, tudo em PT-BR, design limpo e profissional

---

## 3. PONTOS FORTES

### 3.1 Produto funcional em producao

Nao e mockup. E um produto rodando com dados reais de uma loja (Milkes), 178 produtos sincronizados, workflows executando a cada hora, agentes respondendo com dados reais. Isso e raro — a maioria dos projetos nesse estagio e so UI.

### 3.2 Proposta de valor UNICA

Nenhum concorrente no ecossistema Nuvemshop oferece:

- Agentes de IA que **operam** a loja (criar produtos, gerenciar pedidos, criar cupons)
- Analise ABC automatizada (zero concorrentes)
- Sugestao de preco baseada em custo real (zero concorrentes)
- Workflow visual que conecta evento -> analise IA -> acao automatica
- Gestao de fornecedores com inteligencia de reposicao
- Tudo num unico produto integrado

### 3.3 Profundidade tecnica

- 44+ tools de varejo com operacoes de leitura E escrita
- Motor de execucao com 8 tipos de step, retry, rate limiting, billing
- Sync bidirecional Nuvemshop com webhook + cron
- RLS em todas as tabelas (seguranca multi-tenant desde o dia 1)
- TypeScript strict, React 19, Next.js 16, spec-driven development

### 3.4 Moat tecnico

- Integracao Nuvemshop profunda leva meses para replicar
- 44 ferramentas de varejo especificas para o contexto brasileiro
- Pipeline de dados: Nuvemshop -> Supabase -> IA -> acoes automaticas
- Nenhum concorrente tem essa stack completa

### 3.5 Billing ja implementado

Stripe funcional com checkout, portal, webhooks, usage metering. Falta definir precos em R$, mas a infraestrutura esta pronta para cobrar.

---

## 4. PONTOS FRACOS (Honestos)

### 4.1 CRITICO: Sem WhatsApp

95%+ dos lojistas brasileiros usam WhatsApp como ferramenta primaria. O Snew usa Telegram — que funciona perfeitamente mas atinge uma fracao minuscula do mercado. A Sak fatura milhoes so com carrinho abandonado via WhatsApp. Adicionar WhatsApp (via Evolution API ou API oficial do Meta) e o maior multiplicador de adocao possivel.

### 4.2 ALTO: Sem presenca de mercado

- Sem landing page ou site de venda
- Sem publicacao na Nuvemshop App Store (canal de distribuicao #1 para o ecossistema)
- Sem material de marketing
- O produto existe mas ninguem sabe

### 4.3 ALTO: Low Stock Alert falhando consistentemente

Nas execucoes, o workflow "Low Stock Alert" falha em TODAS as execucoes (status "Falhou", 1 etapa, 9-15s). Isso e um bug que precisa ser investigado — alerta de estoque baixo e um dos casos de uso mais valiosos.

### 4.4 ALTO: Daily Sales Summary falhando

O workflow "Daily Sales Summary" tambem falha consistentemente. Outro caso de uso de alto valor que nao esta funcionando.

### 4.5 MEDIO: Produtos sem custo definido

176 de 178 produtos estao sem custo. Sem custo, a inteligencia de margem/preco fica limitada. Precisa de um fluxo de importacao de custo mais agressivo (integracao com ERP ou importacao CSV guiada).

### 4.6 MEDIO: Dependencia de plataformas externas

- Composio (SDK proprietario para integracoes)
- Firecrawl (web scraping)
- Kiro Chat (LLM para AI steps)
- Se qualquer um mudar pricing/API, impacta

### 4.7 BAIXO: Pricing nao validado com o mercado

Os planos existem no Stripe (Free/Pro/Enterprise) mas sem valor em R$ definido publicamente. Precisa de pesquisa com lojistas reais.

---

## 5. ANALISE DE MERCADO

### Mercado brasileiro de e-commerce

- **USD 69.2 bilhoes** em 2026, CAGR 16.87% ate USD 150.9B em 2031 (Mordor Intelligence)
- Software de e-commerce no Brasil: **USD 9.8B** em 2025 -> **USD 22.4B** em 2031 (Mobility Foresights)

### Ecossistema Nuvemshop

- **~170.000 lojas ativas** (StoreLeads)
- **R$ 4.7 bilhoes** GMV em 2024, 42% crescimento YoY (NuvemCommerce 2025)
- Ticket medio R$ 247.60
- Planos: R$ 59 a R$ 389/mes

### Dores dos lojistas (NuvemCommerce 2025)

- 40% — Falta de capital para reinvestir
- **36% — Falta de tempo** (Snew resolve diretamente)
- **33% — Dificuldade com ferramentas** (Snew simplifica via chat natural)
- 52% dos brasileiros ja usaram IA para compras

---

## 6. CONCORRENTES REAIS

### Diretos no ecossistema Nuvemshop

| Concorrente                     | O que faz                                | Preco          | Vs Snew                                                    |
| ------------------------------- | ---------------------------------------- | -------------- | ---------------------------------------------------------- |
| **Prax Analytics**              | RFM, LTV, CAC, metas. Analytics puro     | N/D            | Nao tem automacao, nao tem agentes, nao opera              |
| **Dash Analytics** (Empreender) | Dashboards, GA4/Meta, chat IA basico     | Bundle         | Mais raso, sem workflow, sem operacao                      |
| **Empreender Plus**             | Bundle 20+ apps (Sak, Dash, Dropi...)    | R$297/mes      | 20 apps rasos vs 1 plataforma profunda. Sem IA operacional |
| **Sak**                         | WhatsApp automation, carrinho abandonado | R$35-1.159/mes | Domina WhatsApp. Mas e single-purpose                      |

### O que NINGUEM faz (Blue Ocean do Snew)

1. Agente de IA que **opera** a loja (cria produto, gerencia pedido, cria cupom via chat)
2. Analise ABC automatizada conectada a acoes
3. Sugestao de preco baseada em custo real + margem
4. Workflow visual: evento -> analise IA -> acao automatica -> notificacao
5. Gestao de fornecedores com inteligencia de reposicao
6. Monitoramento de preco de concorrentes automatizado (scrape + IA + alerta)

---

## 7. ROADMAP PARA GERAR RECEITA

### Tier 1: Desbloqueio de receita (0-2 meses)

1. **Corrigir workflows falhando** — Low Stock Alert e Daily Sales Summary estao quebrando. Sao dois dos casos de uso mais valiosos. Prioridade maxima.

2. **WhatsApp como canal** — Via Evolution API (open-source brasileiro) ou API oficial Meta. Nao precisa substituir Telegram — adicionar como canal. Recuperacao de carrinho via WhatsApp sozinha justifica o preco.

3. **Landing page** — Uma pagina mostrando: "Conecte sua Nuvemshop. Seus agentes de IA cuidam do resto." Com demo/video do chat operando. Template pronto resolve em 1-2 dias.

4. **Publicacao na Nuvemshop App Store** — Canal de distribuicao organico #1. 170k lojas potenciais.

5. **Definir pricing em R$** — Sugestao baseada no mercado:
   - Starter: R$97/mes (1 agente, 1.000 steps, analytics basico)
   - Growth: R$197/mes (5 agentes, 10k steps, WhatsApp, analytics completo)
   - Scale: R$497/mes (ilimitado, API, prioridade)

### Tier 2: Diferencial competitivo (2-4 meses)

6. **Importacao de custo em massa** — CSV guiado ou integracao Bling/Tiny ERP. 176/178 produtos sem custo = inteligencia de margem subutilizada.

7. **Templates de workflow prontos** — O lojista nao quer montar do zero. 5 templates pre-configurados:
   - Notificacao de pedido novo (ja existe e funciona!)
   - Alerta de estoque baixo (corrigir + template)
   - Resumo diario de vendas (corrigir + template)
   - Monitoramento de preco de concorrente (ja existe!)
   - Recuperacao de carrinho abandonado

8. **Onboarding guiado** — Wizard: conectar Nuvemshop -> ativar 1 template -> ver valor em <5 min.

9. **Insights proativos** — Dashboard que diz "Produto X caiu de curva A para C — acao sugerida". Notificacao push, nao so resposta a pergunta.

### Tier 3: Escala (4-12 meses)

10. **Multi-plataforma** — Shopify Brasil, Yampi, Cartpanda.
11. **Marketplace de templates** — Usuarios criam e compartilham automacoes.
12. **Integracao ERP** — Bling/Tiny para custo real, NF-e, estoque.
13. **Programa de parceiros** — Agencias de e-commerce como canal.

---

## 8. MODELO DE RECEITA

### Projecao conservadora (Ano 1)

| Periodo         | Free | Pagantes | MRR            |
| --------------- | ---- | -------- | -------------- |
| Mes 1-3         | 50   | 10       | R$1.500        |
| Mes 4-6         | 200  | 50       | R$8.000        |
| Mes 7-12        | 500  | 150      | R$25.000       |
| **Total Ano 1** |      |          | **~R$200.000** |

### Com App Store + WhatsApp (multiplicador 3-5x)

| **Ano 1 otimista** | | | **R$600.000 - R$1.000.000** |

---

## 9. DIAGNOSTICO FINAL

### O Snew nao e um projeto. E um produto.

Tem loja real conectada (Milkes, 178 produtos), workflows executando em producao (143 runs do New Order Notification), agentes de IA que operam dados reais, billing pronto, 44+ tools de varejo, motor de execucao completo com 8 tipos de step.

### O que ninguem mais tem:

- **IA operacional** — o agente nao so responde, ele cria cupom, edita produto, gerencia pedido
- **Analise ABC/RFM/LTV automatizada** — zero concorrentes no ecossistema Nuvemshop
- **Workflow que conecta** evento -> inteligencia -> acao -> notificacao
- **Monitoramento de preco** automatizado com scraping + IA

### O que falta pra virar negocio:

1. Corrigir os 2 workflows quebrando (Low Stock Alert, Daily Sales Summary)
2. WhatsApp
3. Landing page + App Store
4. Pricing definido
5. Importacao de custo em massa

### Posicionamento recomendado:

> **"Snew: seus agentes de IA que operam sua loja Nuvemshop"**

Nao e dashboard. Nao e chatbot. Nao e ERP. E uma equipe de agentes que opera junto com o lojista — monitora precos, alerta estoque, analisa clientes, cria cupons, notifica pedidos, sugere reposicao. Tudo via chat natural ou automacoes visuais.

O mercado de 170k lojas Nuvemshop gastando R$200-1.200+/mes em ferramentas esta pronto. O produto esta pronto. Falta distribuicao.

---

## Fontes

- Mordor Intelligence: Brazil E-Commerce Market (2026)
- NuvemCommerce 2025 Report (Nuvemshop)
- StoreLeads: Tiendanube/Nuvemshop store count (~170k)
- Mobility Foresights: Brazil E-Commerce Software Market
- Prax.ai, Empreender.com.br, Sak.com.br (sites oficiais)
- E-Commerce Brasil: artigos e relatorios de mercado
- Codigo-fonte do Snew (revisao completa de 100+ arquivos)
- Produto rodando em localhost com dados reais da loja Milkes
