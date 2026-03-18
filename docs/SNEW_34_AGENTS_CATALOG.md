# SNEW — Catalogo de 34 Agentes (Pos-Consolidacao)

### Especificacao por agente para implementacao

_Versao 1.0 - Marco 2026 - Uso Interno -- Produto & Engenharia_

---

## Carrinho & Conversao — 4 agentes

---

### 1. Abandoned Cart

| Campo         | Valor                                                          |
| ------------- | -------------------------------------------------------------- |
| **ID**        | `abandoned-cart`                                               |
| **Categoria** | Carrinho & Conversao                                           |
| **Canais**    | WhatsApp, E-mail, SMS (configuravel)                           |
| **Headline**  | "Recupera carrinhos nos primeiros 15 minutos pelo canal certo" |

**O que faz:**
Identifica abandono de carrinho em tempo real e dispara mensagem personalizada com foto do produto em ate 15 minutos — pelo canal com maior historico de abertura do cliente. Segundo toque em 24h com angulo diferente para quem nao abriu.

**Absorve:**

- WA Cart Recovery (canal WhatsApp agora e configuracao)
- Parte do Checkout Auditor (analise de friccao no checkout)

**Triggers:**

- Evento `cart_abandoned` da plataforma (Shopify/Nuvemshop)
- Timeout de 15 minutos sem checkout completado

**Outputs:**

- Mensagem personalizada com foto do produto e CTA
- Segundo toque em 24h com angulo diferente
- Relatorio diario: receita recuperada por canal, produto e horario
- Dashboard com taxa de recuperacao em tempo real

**KPIs:**

- Taxa de recuperacao (meta: 23-35%)
- Receita recuperada por dia
- Tempo medio ate recuperacao
- Canal com melhor performance

**Integrações necessarias:**

- Shopify/Nuvemshop (eventos de carrinho)
- WhatsApp Business API
- Gmail/SMTP (e-mail)

---

### 2. Conversion Optimizer

| Campo         | Valor                                              |
| ------------- | -------------------------------------------------- |
| **ID**        | `conversion-optimizer`                             |
| **Categoria** | Carrinho & Conversao                               |
| **Canais**    | Dashboard (relatorio)                              |
| **Headline**  | "Identifica onde os 98% que nao compram abandonam" |

**O que faz:**
Mapeia cada ponto de abandono da loja com a receita perdida estimada por semana. Analisa checkout, PDPs, navegacao e busca interna. Entrega lista de correcoes priorizadas por impacto financeiro — nao por esforco tecnico. Inclui segmentacao mobile vs desktop.

**Absorve:**

- Checkout Auditor (analise de friccao por etapa e device)

**Triggers:**

- Analise semanal automatica
- On-demand via chat

**Outputs:**

- Mapa visual de abandono por etapa do funil
- Receita perdida estimada por etapa/semana
- Lista de correcoes priorizadas por impacto em receita
- Comparativo mobile vs desktop
- Benchmark contra mercado

**KPIs:**

- Taxa de conversao geral (antes vs depois)
- Receita incremental pos-correcao
- Numero de friccoes identificadas e corrigidas

**Integrações necessarias:**

- Google Analytics (funil e comportamento)
- Shopify/Nuvemshop (checkout data)

---

### 3. Urgency Manager

| Campo         | Valor                                           |
| ------------- | ----------------------------------------------- |
| **ID**        | `urgency-manager`                               |
| **Categoria** | Carrinho & Conversao                            |
| **Canais**    | PDP (badge na pagina de produto)                |
| **Headline**  | "Urgencia real baseada em estoque — nunca fake" |

**O que faz:**
Ativa contagem regressiva e badge de escassez apenas quando o estoque realmente esta acabando. Desativa automaticamente quando reposto. Urgencia honesta que converte sem prejudicar a reputacao da marca.

**Triggers:**

- Estoque abaixo do threshold configurado por SKU
- Desativa automaticamente quando reposto

**Outputs:**

- Badge na PDP com unidades restantes
- Contagem regressiva em tempo real
- Relatorio de impacto em conversao por produto com/sem badge

**KPIs:**

- Lift de conversao em produtos com badge ativo
- Taxa de veracidade (100% — nunca fake)
- Receita incremental atribuida

**Integrações necessarias:**

- Shopify/Nuvemshop (estoque em tempo real)

---

### 4. Upsell Engine

| Campo         | Valor                                                              |
| ------------- | ------------------------------------------------------------------ |
| **ID**        | `upsell-engine`                                                    |
| **Categoria** | Carrinho & Conversao                                               |
| **Canais**    | PDP, Checkout, WhatsApp pos-entrega                                |
| **Headline**  | "Ticket medio aumentado com produto complementar no momento certo" |

**O que faz:**
Analisa historico de compras para identificar afinidades de compra conjunta. Recomenda bundles na PDP e checkout. Apos entrega confirmada (2-5 dias), dispara oferta de produto complementar pelo canal mais eficaz.

**Absorve:**

- Bundle Recommender (recomendacao na PDP/checkout)
- WA Post-Purchase Upsell (oferta pos-entrega)

**Triggers:**

- Visualizacao de produto (bundle na PDP)
- Inicio de checkout (bundle no checkout)
- Entrega confirmada + 2-5 dias (upsell pos-compra)

**Outputs:**

- Sugestao de bundle na PDP e checkout
- Mensagem de upsell pos-entrega com produto complementar
- Relatorio de taxa de adicao ao carrinho e conversao de upsell
- Ticket medio antes vs depois

**KPIs:**

- Aumento de ticket medio (meta: +15-28%)
- Taxa de adicao de bundle ao carrinho
- Conversao de upsell pos-entrega
- Receita incremental sem custo de aquisicao

**Integrações necessarias:**

- Shopify/Nuvemshop (historico de compras, entrega)
- WhatsApp Business API

---

## Retencao & Churn — 3 agentes

---

### 5. Churn & Retention

| Campo         | Valor                                                          |
| ------------- | -------------------------------------------------------------- |
| **ID**        | `churn-retention`                                              |
| **Categoria** | Retencao & Churn                                               |
| **Canais**    | WhatsApp, E-mail (configuravel)                                |
| **Headline**  | "Clientes em risco identificados e reativados automaticamente" |

**O que faz:**
Detecta sinais de abandono com D-30 de antecedencia. Calcula score de risco por cliente baseado em frequencia, recencia e valor. Aciona sequencia de reativacao automatica de 3 toques em 7 dias, personalizada por perfil, ultimo produto e canal preferido.

**Absorve:**

- Churn Prediction (deteccao de risco)
- Retention Booster (sequencia de reativacao por e-mail)
- WA Winback (sequencia de reativacao por WhatsApp)

**Triggers:**

- Score de risco atualizado diariamente
- Cliente ultrapassa threshold de inatividade (configuravel, default 45 dias)

**Outputs:**

- Lista de clientes em risco com score
- Sequencia automatica de 3 toques em 7 dias (multicanal)
- Relatorio semanal de taxa de reativacao por segmento e canal
- Receita protegida (clientes reativados x ticket medio)

**KPIs:**

- Churn evitado (meta: 38%)
- Taxa de reativacao por canal
- Receita protegida por mes
- Custo por cliente reativado (meta: R$0 — automatico)

**Integrações necessarias:**

- Shopify/Nuvemshop (historico de compras)
- WhatsApp Business API
- Gmail/SMTP

---

### 6. VIP Relationship

| Campo         | Valor                                                |
| ------------- | ---------------------------------------------------- |
| **ID**        | `vip-relationship`                                   |
| **Categoria** | Retencao & Churn                                     |
| **Canais**    | WhatsApp, E-mail                                     |
| **Headline**  | "Regua exclusiva para os top 5% de clientes por LTV" |

**O que faz:**
Segmenta automaticamente os melhores clientes por LTV e os coloca em regua de comunicacao exclusiva. Ofertas antecipadas, acesso exclusivo e reconhecimento personalizado. Alerta prioritario quando um VIP apresenta sinal de churn.

**Triggers:**

- Segmentacao atualizada semanalmente
- Alerta imediato quando VIP entra em risco

**Outputs:**

- Segmento VIP atualizado automaticamente
- Regua de comunicacao exclusiva (aniversario, lancamento antecipado, oferta VIP)
- Alerta prioritario de churn VIP
- Relatorio de LTV e retencao do segmento

**KPIs:**

- Retencao VIP (meta: +35%)
- Frequencia de compra VIP (meta: 3x)
- LTV medio do segmento

**Integrações necessarias:**

- Shopify/Nuvemshop (historico, LTV)
- WhatsApp Business API
- Gmail/SMTP

---

### 7. WA Loyalty Program

| Campo         | Valor                                                   |
| ------------- | ------------------------------------------------------- |
| **ID**        | `wa-loyalty`                                            |
| **Categoria** | Retencao & Churn                                        |
| **Canais**    | WhatsApp                                                |
| **Headline**  | "Programa de pontos comunicado ativamente via WhatsApp" |

**O que faz:**
Notifica o cliente sobre pontos acumulados apos cada compra, alerta sobre pontos prestes a expirar (D-7) e aciona oferta de resgate no timing de maior receptividade.

**Triggers:**

- Compra confirmada (notifica pontos ganhos)
- D-7 antes de expiracao de pontos
- Acumulo suficiente para resgate

**Outputs:**

- Notificacoes automaticas de pontos (ganho, saldo, expiracao)
- Oferta de resgate no timing ideal
- Relatorio de impacto em frequencia e LTV

**KPIs:**

- Taxa de engajamento com o programa
- Frequencia de compra (com programa vs sem)
- LTV incremental

**Integrações necessarias:**

- Shopify/Nuvemshop (compras)
- WhatsApp Business API
- Sistema de pontos (se existir)

---

## Marketing & Campanhas — 5 agentes

---

### 8. Campaign Engine

| Campo         | Valor                                                                      |
| ------------- | -------------------------------------------------------------------------- |
| **ID**        | `campaign-engine`                                                          |
| **Categoria** | Marketing & Campanhas                                                      |
| **Canais**    | E-mail, WhatsApp, Meta Ads, Google Ads, TikTok, SMS, Push, Instagram, Blog |
| **Headline**  | "Campanha completa para 9 canais gerada e distribuida em minutos"          |

**O que faz:**
Pipeline completo de campanha: a partir de produto, oferta e data, gera 3 conceitos criativos com brief e direcao visual, escreve copies on-brand para 9 canais, e coordena a distribuicao com cronograma automatico.

**Absorve:**

- Campaign Generator (conceito criativo)
- Campaign Copywriter (copies por canal)
- Campaign Orchestrator (distribuicao coordenada)

**Triggers:**

- Solicitacao via chat ("crie uma campanha para...")
- Briefing automatico do Seasonal Calendar (D-60)
- Lancamento de produto

**Outputs:**

- 3 conceitos criativos com headline, mood e big idea
- Copies para 9 canais alinhadas ao Brand DNA
- Variacoes A/B por canal
- Cronograma de distribuicao automatico
- Relatorio de ROAS por canal pos-campanha

**KPIs:**

- Tempo de criacao (meta: < 10 minutos)
- ROAS por campanha
- Taxa de abertura/clique por canal
- Receita por campanha

**Integrações necessarias:**

- WhatsApp Business API
- Gmail/SMTP
- Meta Ads API
- Google Ads API
- Brand DNA Agent (tom e voz)

---

### 9. Seasonal Calendar

| Campo         | Valor                                                                     |
| ------------- | ------------------------------------------------------------------------- |
| **ID**        | `seasonal-calendar`                                                       |
| **Categoria** | Marketing & Campanhas                                                     |
| **Canais**    | Dashboard, WhatsApp (execucao de campanhas sazonais)                      |
| **Headline**  | "30+ datas priorizadas com campanhas sazonais executadas automaticamente" |

**O que faz:**
Gera calendario anual com 30+ datas priorizadas por potencial de receita historico do nicho. Dispara briefing automatico D-60 para o Campaign Engine. Executa campanhas sazonais segmentadas via WhatsApp com segundo toque para quem nao abriu.

**Absorve:**

- WA Seasonal Campaign (execucao sazonal via WhatsApp)

**Triggers:**

- D-60 antes de cada data sazonal (briefing automatico)
- Data sazonal (execucao da campanha)

**Outputs:**

- Calendario visual com 30+ datas
- Briefing automatico D-60 para Campaign Engine
- Campanha sazonal segmentada (execucao)
- Segundo disparo para quem nao abriu
- Relatorio de ROAS sazonal vs outros canais

**KPIs:**

- Cobertura de datas sazonais (meta: 100%)
- ROAS por campanha sazonal
- Taxa de abertura WhatsApp (meta: 40%)

**Integrações necessarias:**

- WhatsApp Business API
- Campaign Engine (pipeline de campanha)

---

### 10. Coupon Manager

| Campo         | Valor                                                       |
| ------------- | ----------------------------------------------------------- |
| **ID**        | `coupon-manager`                                            |
| **Categoria** | Marketing & Campanhas                                       |
| **Canais**    | WhatsApp, E-mail                                            |
| **Headline**  | "Cupons unicos entregues so para quem precisa do incentivo" |

**O que faz:**
Gera cupons unicos por cliente para rastreamento individual e anti-vazamento. Encerra emissao automaticamente quando meta e atingida. Calcula se o cliente compraria sem desconto antes de emitir.

**Triggers:**

- Regra configuravel (ex: carrinho > R$200 sem compra em 48h)
- Meta de conversao atingida → encerra emissao

**Outputs:**

- Cupons unicos por cliente
- Relatorio de conversao incremental (com cupom vs sem cupom)
- Alerta de meta atingida

**KPIs:**

- Conversao incremental (meta: +15-25%)
- Taxa de vazamento (meta: 0%)
- Margem protegida

**Integrações necessarias:**

- Shopify/Nuvemshop (cupons, pedidos)
- WhatsApp Business API

---

### 11. Post-Campaign Recovery

| Campo         | Valor                                                    |
| ------------- | -------------------------------------------------------- |
| **ID**        | `post-campaign-recovery`                                 |
| **Categoria** | Marketing & Campanhas                                    |
| **Canais**    | WhatsApp, E-mail                                         |
| **Headline**  | "Quem engajou mas nao converteu recebe follow-up em 72h" |

**O que faz:**
Identifica quem abriu ou clicou na campanha mas nao comprou e dispara mensagem de recuperacao com angulo diferente e oferta personalizada pelo produto visualizado.

**Triggers:**

- 24-72h apos campanha para quem engajou sem converter

**Outputs:**

- Mensagem de recuperacao com angulo diferente
- Relatorio de conversao incremental pos-recovery

**KPIs:**

- Taxa de conversao do follow-up
- Receita incremental
- Custo por conversao recuperada

**Integrações necessarias:**

- Dados de engajamento da campanha (abertura, clique)
- WhatsApp Business API
- Gmail/SMTP

---

### 12. Content Engine

| Campo         | Valor                                                       |
| ------------- | ----------------------------------------------------------- |
| **ID**        | `content-engine`                                            |
| **Categoria** | Marketing & Campanhas                                       |
| **Canais**    | Dashboard (calendario editorial)                            |
| **Headline**  | "Calendario de 30 dias de conteudo com tendencias do nicho" |

**O que faz:**
Gera calendario editorial do mes com tema, formato, horario e briefing de copy para cada publicacao — alinhado ao Brand DNA e tendencias do nicho.

**Triggers:**

- Inicio de cada mes (calendario automatico)
- On-demand via chat

**Outputs:**

- Calendario editorial de 30 dias exportavel
- Briefing por data com copy sugerida
- Relatorio de performance do mes anterior

**KPIs:**

- Engajamento organico (meta: +65%)
- Volume de publicacoes (meta: 30/mes)
- Tempo de planejamento (meta: < 15 minutos)

**Integrações necessarias:**

- Brand DNA Agent (tom e voz)
- Redes sociais (metricas de performance)

---

## Ads & Performance — 4 agentes

---

### 13. Ad Waste Detector

| Campo         | Valor                                                               |
| ------------- | ------------------------------------------------------------------- |
| **ID**        | `ad-waste-detector`                                                 |
| **Categoria** | Ads & Performance                                                   |
| **Canais**    | Meta Ads, Google Ads, TikTok Ads (cross-platform)                   |
| **Headline**  | "Pausa campanhas ineficientes e redistribui budget automaticamente" |

**O que faz:**
Monitora CPR e ROAS de cada campanha em tempo real, cross-platform. Pausa automaticamente campanhas que ultrapassam o threshold e redistribui budget para as de maior performance.

**Absorve:**

- ROAS Optimizer (redistribuicao por ROAS — mesma funcao)

**Triggers:**

- Monitoramento continuo (a cada 6h)
- ROAS abaixo do threshold por 48h → pausa automatica

**Outputs:**

- Pausa automatica de campanhas ineficientes
- Redistribuicao de budget para campanhas de maior ROAS
- Relatorio semanal de budget desperdicado e economizado

**KPIs:**

- Reducao de desperdicio (meta: -35%)
- ROAS medio pos-otimizacao (meta: +2.4x)
- Budget redistribuido por semana

**Integrações necessarias:**

- Meta Ads API
- Google Ads API
- TikTok Ads API

---

### 14. Ads Manager

| Campo         | Valor                                                                   |
| ------------- | ----------------------------------------------------------------------- |
| **ID**        | `ads-manager`                                                           |
| **Categoria** | Ads & Performance                                                       |
| **Canais**    | Meta Ads, Google Ads, TikTok Ads (unificado)                            |
| **Headline**  | "Lances, criativos e fadiga gerenciados por plataforma automaticamente" |

**O que faz:**
Gerencia lances, criativos e budget por plataforma. Detecta fadiga de criativo 48h antes da queda de CTR. Ajusta lances por device, horario e localizacao. Gera roteiro de novo criativo quando necessario.

**Absorve:**

- Meta Ads Manager (gestao Meta)
- Google Ads Manager (gestao Google)
- TikTok Ads Manager (gestao TikTok)

**Triggers:**

- Monitoramento continuo de performance por plataforma
- Fadiga detectada → alerta D-48h + roteiro de substituto

**Outputs:**

- Redistribuicao diaria de budget entre ad sets
- Pausa de criativos em fadiga
- Ajuste de lances por device/horario/localizacao
- Roteiro de novo criativo com hook de 3 segundos
- Relatorio unificado de ROAS por plataforma

**KPIs:**

- ROAS por plataforma
- Tempo de deteccao de fadiga (meta: D-48h)
- CPA por plataforma

**Integrações necessarias:**

- Meta Ads API
- Google Ads API
- TikTok Ads API

---

### 15. Smart Remarketing

| Campo         | Valor                                                       |
| ------------- | ----------------------------------------------------------- |
| **ID**        | `smart-remarketing`                                         |
| **Categoria** | Ads & Performance                                           |
| **Canais**    | Meta Ads, Google Ads                                        |
| **Headline**  | "Remarketing segmentado por etapa do funil e comportamento" |

**O que faz:**
Cria 5 segmentos de remarketing por etapa do funil — visualizou, adicionou, checkout, comprou, inativo — com mensagem especifica e angulo certo para cada um. Exclui automaticamente compradores recentes.

**Triggers:**

- Segmentos atualizados diariamente
- Criativos rotacionados por performance

**Outputs:**

- 5 segmentos automaticos por etapa do funil
- Criativos por segmento
- Exclusao automatica de compradores recentes
- Relatorio de conversao por segmento

**KPIs:**

- Taxa de conversao por segmento
- ROAS de remarketing vs prospeccao
- Custo por conversao por etapa

**Integrações necessarias:**

- Meta Ads API (Custom Audiences)
- Google Ads API (Audiences)
- Google Analytics

---

### 16. Data Quality Guard

| Campo         | Valor                                                      |
| ------------- | ---------------------------------------------------------- |
| **ID**        | `data-quality-guard`                                       |
| **Categoria** | Ads & Performance                                          |
| **Canais**    | Dashboard (relatorio)                                      |
| **Headline**  | "Erros de tracking detectados antes de distorcer decisoes" |

**O que faz:**
Compara conversoes reais com reportadas pelos pixels. Identifica paginas com pixel ausente, mal configurado ou eventos duplicados. Valida consistencia entre GA4, Meta e Shopify.

**Absorve:**

- Pixel Tracking Auditor (auditoria de pixels)

**Triggers:**

- Auditoria diaria automatica
- Alerta imediato quando discrepancia > 10%

**Outputs:**

- Relatorio de gap entre plataformas
- Paginas com pixel ausente ou duplicado
- Score de confiabilidade dos dados
- Checklist de correcoes prioritarias

**KPIs:**

- Precisao de rastreamento (meta: 100%)
- Conversoes duplicadas (meta: zero)
- Gap entre plataformas (meta: < 5%)

**Integrações necessarias:**

- Google Analytics
- Meta Ads (pixel)
- Shopify/Nuvemshop

---

## Analytics & Inteligencia — 6 agentes

---

### 17. Revenue Intelligence

| Campo         | Valor                                                           |
| ------------- | --------------------------------------------------------------- |
| **ID**        | `revenue-intelligence`                                          |
| **Categoria** | Analytics & Inteligencia                                        |
| **Canais**    | Dashboard, Chat                                                 |
| **Headline**  | "Padroes de receita identificados para replicar o que funciona" |

**O que faz:**
Analisa historico de receita, correlaciona com acoes de marketing e identifica padroes que explicam picos. Recomenda o que replicar e alerta sobre desvios de tendencia.

**Triggers:**

- Analise semanal automatica
- On-demand via chat

**Outputs:**

- Relatorio de padroes de performance
- Recomendacao de replicacao
- Alerta de desvio de tendencia

**KPIs:**

- Receita incremental por insight aplicado
- Acuracia de previsao de tendencia

**Integrações necessarias:**

- Shopify/Nuvemshop (vendas)
- Google Analytics (trafego)

---

### 18. Funnel Diagnostics

| Campo         | Valor                                                   |
| ------------- | ------------------------------------------------------- |
| **ID**        | `funnel-diagnostics`                                    |
| **Categoria** | Analytics & Inteligencia                                |
| **Canais**    | Dashboard                                               |
| **Headline**  | "Etapa de maior abandono com receita perdida calculada" |

**O que faz:**
Mapeia todo o funil com taxa de conversao por etapa. Calcula receita perdida por semana em cada ponto. Compara por device, audiencia e canal.

**Triggers:**

- Analise semanal automatica
- On-demand via chat

**Outputs:**

- Mapa visual do funil com drop-off por etapa
- Receita perdida por etapa/semana
- Acoes corretivas com impacto estimado

**KPIs:**

- Conversao pos-diagnostico (meta: +22%)
- Receita recuperada por correcao

**Integrações necessarias:**

- Google Analytics (funil)
- Shopify/Nuvemshop

---

### 19. Cohort Analyzer

| Campo         | Valor                                                            |
| ------------- | ---------------------------------------------------------------- |
| **ID**        | `cohort-analyzer`                                                |
| **Categoria** | Analytics & Inteligencia                                         |
| **Canais**    | Dashboard                                                        |
| **Headline**  | "Canal com maior LTV calculado em janelas de 90, 180 e 365 dias" |

**O que faz:**
Analisa LTV real por canal de aquisicao em tres janelas temporais. Identifica produto de entrada com maior correlacao de LTV alto. Detecta coortes em degradacao.

**Triggers:**

- Analise mensal automatica
- On-demand via chat

**Outputs:**

- Ranking de canais por LTV
- Produto de entrada com maior LTV
- Coortes em queda identificadas
- Recomendacao de realocacao de budget

**KPIs:**

- LTV por canal (janelas de 90, 180, 365 dias)
- Coortes em queda antecipados (meta: -22%)

**Integrações necessarias:**

- Shopify/Nuvemshop (historico de compras)
- Google Analytics (aquisicao)

---

### 20. Attribution Mapper

| Campo         | Valor                                         |
| ------------- | --------------------------------------------- |
| **ID**        | `attribution-mapper`                          |
| **Categoria** | Analytics & Inteligencia                      |
| **Canais**    | Dashboard                                     |
| **Headline**  | "Receita atribuida corretamente entre canais" |

**O que faz:**
Implementa atribuicao multi-touch e compara com modelo atual. Revela quais canais estao sendo super ou subestimados. Mostra ROAS real por canal.

**Triggers:**

- Analise semanal automatica
- On-demand via chat

**Outputs:**

- Mapa multi-touch
- Comparativo de 7 modelos de atribuicao
- ROAS real por canal
- Alerta de canal distorcido

**KPIs:**

- ROI de marketing pos-correcao (meta: +18%)
- Canais subestimados identificados

**Integrações necessarias:**

- Google Analytics
- Meta Ads API
- Shopify/Nuvemshop

---

### 21. Task Prioritizer

| Campo         | Valor                                               |
| ------------- | --------------------------------------------------- |
| **ID**        | `task-prioritizer`                                  |
| **Categoria** | Analytics & Inteligencia                            |
| **Canais**    | Dashboard, E-mail (diario as 7h)                    |
| **Headline**  | "Top 5 acoes de maior impacto entregues toda manha" |

**O que faz:**
Agrega dados de todos os agentes ativos e entrega todo dia as 7h as 5 acoes com maior potencial de impacto em receita naquele dia.

**Triggers:**

- Diario as 7h (automatico)

**Outputs:**

- Lista diaria de top 5 acoes
- Estimativa de impacto em receita por acao
- Link direto para o agente responsavel

**KPIs:**

- Acoes executadas vs sugeridas
- Receita incremental por acao executada

**Integrações necessarias:**

- Todos os agentes ativos (agregacao de dados)
- Gmail/SMTP (envio diario)

---

### 22. Weekly Briefing

| Campo         | Valor                                                            |
| ------------- | ---------------------------------------------------------------- |
| **ID**        | `weekly-briefing`                                                |
| **Categoria** | Analytics & Inteligencia                                         |
| **Canais**    | Dashboard, E-mail (segunda as 8h)                                |
| **Headline**  | "Todos os agentes consolidados em resumo executivo toda segunda" |

**O que faz:**
Consolida resultados de todos os agentes da semana. Compara com semana anterior. Entrega top 3 oportunidades com acao sugerida e projecao da semana.

**Triggers:**

- Segunda-feira as 8h (automatico)

**Outputs:**

- Resumo executivo semanal
- Comparativo semana a semana
- Top 3 oportunidades com acao sugerida
- Projecao da semana

**KPIs:**

- Tempo de leitura (meta: 5 minutos)
- Cobertura de dados (meta: 100%)

**Integrações necessarias:**

- Todos os agentes ativos
- Gmail/SMTP

---

## Atendimento & Experiencia — 3 agentes

---

### 23. Customer Service

| Campo         | Valor                                                          |
| ------------- | -------------------------------------------------------------- |
| **ID**        | `customer-service`                                             |
| **Categoria** | Atendimento & Experiencia                                      |
| **Canais**    | WhatsApp, E-mail, Chat (multicanal)                            |
| **Headline**  | "Atendimento automatico 24/7 com tracking proativo de pedidos" |

**O que faz:**
Resolve automaticamente tickets de rastreio, troca, pagamento e duvidas frequentes em menos de 1 minuto. Escala para humano com resumo e contexto completo. Envia notificacoes proativas de tracking por checkpoint. Alerta sobre atrasos antes do cliente perguntar.

**Absorve:**

- WA Support Triage (atendimento via WhatsApp)
- WA Order Tracking (tracking proativo de pedidos)

**Triggers:**

- Mensagem recebida em qualquer canal
- Checkpoint de rastreamento (notificacao proativa)
- Atraso detectado (alerta proativo)

**Outputs:**

- Resolucao automatica em < 1 minuto
- Escalada com contexto completo
- Notificacoes de tracking por checkpoint
- Alerta proativo de atraso
- NPS pos-entrega
- Resumo diario por tema

**KPIs:**

- Resolucao automatica (meta: 70%)
- Tempo de resposta (meta: < 2 min)
- Satisfacao (meta: 94%)
- Reducao de "onde esta meu pedido?" (meta: -80%)

**Integrações necessarias:**

- WhatsApp Business API
- Gmail/SMTP
- Shopify/Nuvemshop (pedidos, rastreamento)
- Transportadoras (API de tracking)

---

### 24. Sentiment Intelligence

| Campo         | Valor                                                            |
| ------------- | ---------------------------------------------------------------- |
| **ID**        | `sentiment-intelligence`                                         |
| **Categoria** | Atendimento & Experiencia                                        |
| **Canais**    | Dashboard (monitoramento)                                        |
| **Headline**  | "Insatisfacao detectada em todos os canais antes de virar crise" |

**O que faz:**
Monitora e-mail, chat, WhatsApp, redes sociais e reviews em tempo real. Classifica por sentimento e urgencia. Alerta em menos de 1h quando padrao de insatisfacao surge.

**Triggers:**

- Monitoramento continuo de todos os canais
- Alerta quando sentimento negativo escala

**Outputs:**

- Feed de mensagens por sentimento
- Alerta critico em < 1h
- Analise de causa raiz por tema
- Mapa semanal de sentimento por produto, canal e segmento

**KPIs:**

- Cobertura de canais (meta: 100%)
- Tempo de deteccao de crise (meta: < 1h)
- Reducao de reclamacoes (meta: -28% em 60 dias)

**Integrações necessarias:**

- WhatsApp Business API
- Gmail/SMTP
- Redes sociais (APIs)
- Shopify/Nuvemshop (reviews)

---

### 25. Review & NPS

| Campo         | Valor                                                             |
| ------------- | ----------------------------------------------------------------- |
| **ID**        | `review-nps`                                                      |
| **Categoria** | Atendimento & Experiencia                                         |
| **Canais**    | WhatsApp, Dashboard                                               |
| **Headline**  | "NPS e reviews coletados, analisados e acionados automaticamente" |

**O que faz:**
Dispara NPS no timing ideal pos-entrega via WhatsApp. Agrega reviews de todos os canais (loja, Reclame Aqui, Google, marketplaces). Classifica sentimento por atributo de produto. Follow-up personalizado por nota. Acao proativa para detratores em < 24h.

**Absorve:**

- WA NPS & Reviews (coleta de NPS via WhatsApp)
- Review Aggregator (agregacao e analise de reviews)

**Triggers:**

- Pos-entrega (NPS automatico)
- Review novo detectado em qualquer canal
- Detrator identificado → acao em < 24h

**Outputs:**

- NPS automatico pos-entrega
- Follow-up por nota
- Alerta de detrator para CS
- Sentimento por atributo de produto
- Linguagem do cliente para copy
- Relatorio de reputacao semanal

**KPIs:**

- Taxa de resposta NPS (meta: 5x maior que e-mail)
- Volume de reviews (meta: +52%)
- Nota media (meta: 4.7+)
- Tempo de acao para detratores (meta: < 24h)

**Integrações necessarias:**

- WhatsApp Business API
- Shopify/Nuvemshop (entregas, reviews)
- Google Business (reviews)
- Reclame Aqui (API se disponivel)

---

## Produto & Catalogo — 3 agentes

---

### 26. Catalog Enricher

| Campo         | Valor                                                       |
| ------------- | ----------------------------------------------------------- |
| **ID**        | `catalog-enricher`                                          |
| **Categoria** | Produto & Catalogo                                          |
| **Canais**    | Dashboard                                                   |
| **Headline**  | "Descricoes unicas e otimizadas para SEO geradas em escala" |

**O que faz:**
Gera descricoes unicas, meta descriptions e bullet points de beneficio para cada produto do catalogo — alinhados ao Brand DNA e keywords do nicho.

**Triggers:**

- Produto novo adicionado ao catalogo
- On-demand (enriquecimento em massa)

**Outputs:**

- Descricao unica por produto
- Meta description otimizada para SEO
- Bullet points por persona
- Relatorio de cobertura do catalogo

**KPIs:**

- Cobertura de descricoes unicas (meta: 100%)
- Trafego organico incremental
- Taxa de conversao por PDP enriquecida

**Integrações necessarias:**

- Shopify/Nuvemshop (catalogo)
- Brand DNA Agent (tom e voz)

---

### 27. SKU Intelligence

| Campo         | Valor                                                                   |
| ------------- | ----------------------------------------------------------------------- |
| **ID**        | `sku-intelligence`                                                      |
| **Categoria** | Produto & Catalogo                                                      |
| **Canais**    | Dashboard                                                               |
| **Headline**  | "Mix analisado por margem real, giro e performance com acoes sugeridas" |

**O que faz:**
Ranqueia todos os produtos por lucratividade real — incluindo custo de devolucao e frete por destino. Identifica produtos com margem negativa, candidatos a descontinuacao e oportunidades de expansao de linha.

**Absorve:**

- SKU Performance Analyst (giro e performance)
- SKU Margin Analyst (margem real com frete e devolucao)

**Triggers:**

- Analise semanal automatica
- On-demand via chat

**Outputs:**

- Ranking de SKUs por lucratividade real
- Produtos com margem negativa identificados
- Candidatos a descontinuacao
- Oportunidades de expansao de linha

**KPIs:**

- Margem media do catalogo (antes vs depois)
- SKUs com margem negativa eliminados
- Receita por SKU ativo

**Integrações necessarias:**

- Shopify/Nuvemshop (vendas, estoque, custos)
- Dados de frete por destino
- Dados de devolucao

---

### 28. Pricing Engine

| Campo         | Valor                                                              |
| ------------- | ------------------------------------------------------------------ |
| **ID**        | `pricing-engine`                                                   |
| **Categoria** | Produto & Catalogo                                                 |
| **Canais**    | Dashboard, Shopify (ajuste automatico)                             |
| **Headline**  | "Precos e promocoes otimizados por margem e demanda em tempo real" |

**O que faz:**
Monitora precos de concorrentes em tempo real e ajusta automaticamente dentro do piso de margem configurado. Calcula desconto minimo eficaz por segmento — baseado na propensao de compra — para nao dar desconto para quem compraria sem ele.

**Absorve:**

- Pricing Optimizer (pricing dinamico por concorrencia)
- Promo Creator (promocoes otimizadas por margem)

**Triggers:**

- Variacao de preco de concorrente detectada
- Regra de promocao configurada
- Meta de conversao atingida → encerra promocao

**Outputs:**

- Ajuste automatico de preco dentro do piso
- Oportunidade de precificacao premium
- Proposta de promocao com desconto calculado
- Alerta de canibalizacao entre promocoes
- Comparativo versus concorrentes

**KPIs:**

- Margem otimizada (meta: +12%)
- Conversao por ajuste de preco
- Desconto medio emitido (meta: minimo eficaz)

**Integrações necessarias:**

- Shopify/Nuvemshop (precos, pedidos)
- Monitor de precos de concorrentes

---

## Visibilidade & IA — 6 agentes

---

### 29. LLM Citation Monitor

| Campo         | Valor                                                          |
| ------------- | -------------------------------------------------------------- |
| **ID**        | `llm-citation-monitor`                                         |
| **Categoria** | Visibilidade & IA                                              |
| **Canais**    | Dashboard                                                      |
| **Headline**  | "Citacoes monitoradas em ChatGPT, Perplexity, Gemini e Claude" |

**O que faz:**
Monitora semanalmente se a marca esta sendo citada pelos principais LLMs nas queries de compra do nicho. Compara com concorrentes. Identifica queries com gap de citacao.

**Triggers:**

- Monitoramento semanal automatico

**Outputs:**

- Citacoes em 4 LLMs
- Share versus concorrentes
- Queries com gap de citacao
- Recomendacoes de otimizacao AEO

**KPIs:**

- Share of voice em LLMs
- Evolucao semanal de citacoes
- Queries cobertas vs total do nicho

**Integrações necessarias:**

- APIs dos LLMs (ChatGPT, Perplexity, Gemini, Claude)

---

### 30. Schema Markup Agent

| Campo         | Valor                                                            |
| ------------- | ---------------------------------------------------------------- |
| **ID**        | `schema-markup-agent`                                            |
| **Categoria** | Visibilidade & IA                                                |
| **Canais**    | Loja (implementacao tecnica)                                     |
| **Headline**  | "Schema.org valido em 100% das paginas para rich results e LLMs" |

**O que faz:**
Implementa Schema.org em todas as paginas de produto e configura llms.txt para que bots de IA indexem a loja corretamente. Monitora rich results.

**Triggers:**

- Produto novo adicionado
- Auditoria semanal de cobertura

**Outputs:**

- Schema em 100% das paginas
- llms.txt configurado
- Rich results monitorados
- Relatorio de cobertura

**KPIs:**

- Cobertura de schema (meta: 100%)
- Rich results ativos
- Indexacao por LLMs

**Integrações necessarias:**

- Shopify/Nuvemshop (paginas de produto)
- Google Search Console

---

### 31. AI Shopping Compatibility Agent

| Campo         | Valor                                                    |
| ------------- | -------------------------------------------------------- |
| **ID**        | `ai-shopping-compatibility`                              |
| **Categoria** | Visibilidade & IA                                        |
| **Canais**    | Google AI Shopping, ChatGPT Shopping                     |
| **Headline**  | "Feed aprovado no Google AI Shopping e ChatGPT Shopping" |

**O que faz:**
Garante que o catalogo esteja corretamente formatado e aprovado para aparecer nos resultados de compra dos principais LLMs e do Google AI. Sincronizacao em tempo real.

**Triggers:**

- Produto novo ou atualizado
- Rejeicao de produto → alerta com causa e correcao

**Outputs:**

- Feed aprovado e sincronizado
- Alerta de produto rejeitado com causa e correcao
- Relatorio de cobertura nos canais de IA

**KPIs:**

- Taxa de aprovacao do feed (meta: 100%)
- Produtos visiveis em AI Shopping
- Cliques vindos de canais de IA

**Integrações necessarias:**

- Shopify/Nuvemshop (catalogo)
- Google Merchant Center
- ChatGPT Shopping API

---

### 32. Brand DNA Agent

| Campo         | Valor                                                                     |
| ------------- | ------------------------------------------------------------------------- |
| **ID**        | `brand-dna-agent`                                                         |
| **Categoria** | Visibilidade & IA                                                         |
| **Canais**    | Dashboard (guideline), todos os agentes (sincronizacao)                   |
| **Headline**  | "Brand Guideline gerado em 5 minutos e sincronizado com todos os agentes" |

**O que faz:**
Analisa URL da loja e redes sociais para extrair Brand DNA — paleta, tipografia, tom e vocabulario. Sincroniza automaticamente com todos os agentes de copy. Alerta sobre desvio de tom.

**Triggers:**

- Ativacao inicial (crawl do site)
- Atualizacao manual de Brand DNA

**Outputs:**

- Brand Guideline exportavel (paleta, tipografia, tom, vocabulario)
- DNA sincronizado com todos os agentes
- Alerta de desvio de tom

**KPIs:**

- Consistencia de tom entre agentes (meta: 100%)
- Tempo de geracao (meta: < 5 minutos)

**Integrações necessarias:**

- URL da loja (crawl)
- Redes sociais (analise de tom)

---

### 33. Video Script Creator

| Campo         | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| **ID**        | `video-script-creator`                                    |
| **Categoria** | Visibilidade & IA                                         |
| **Canais**    | Dashboard                                                 |
| **Headline**  | "Scripts com hook validado gerados em menos de 5 minutos" |

**O que faz:**
Gera 3 variacoes de hook e script completo com marcacoes de tempo, trilha e transicoes para Reels, TikTok e YouTube Shorts.

**Triggers:**

- On-demand via chat
- Sugestao do Content Engine (calendario editorial)

**Outputs:**

- 3 variacoes de hook (primeiros 3 segundos)
- Script completo com marcacoes de tempo
- CTA por objetivo de campanha

**KPIs:**

- Tempo de geracao (meta: < 5 minutos)
- View-rate dos videos produzidos
- Engajamento por variacao de hook

**Integrações necessarias:**

- Brand DNA Agent (tom e voz)
- Content Engine (calendario)

---

### 34. Trend Hunter

| Campo         | Valor                                                         |
| ------------- | ------------------------------------------------------------- |
| **ID**        | `trend-hunter`                                                |
| **Categoria** | Visibilidade & IA                                             |
| **Canais**    | Dashboard, WhatsApp (alerta)                                  |
| **Headline**  | "Tendencias capturadas 48h antes do pico com produto mapeado" |

**O que faz:**
Monitora velocity de hashtags, sons e formatos emergentes. Alerta sobre trends com 48h de antecedencia — ja com o produto do catalogo de maior fit mapeado e brief de conteudo pronto.

**Triggers:**

- Monitoramento continuo de tendencias
- Alerta quando velocity ultrapassa threshold

**Outputs:**

- Alerta com 48h de antecedencia
- Produto do catalogo mapeado para a trend
- Brief de conteudo pronto
- Relatorio semanal de trends do nicho

**KPIs:**

- Antecedencia de deteccao (meta: 48h)
- Trends surfadas vs detectadas
- Trafego organico gerado por trend

**Integrações necessarias:**

- TikTok API (trends)
- Instagram API (trends)
- Shopify/Nuvemshop (catalogo para matching)

---

## Resumo do Catalogo Final

| Categoria                 | Qtd    | Agentes                                                                                                                   |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| Carrinho & Conversao      | 4      | Abandoned Cart, Conversion Optimizer, Urgency Manager, Upsell Engine                                                      |
| Retencao & Churn          | 3      | Churn & Retention, VIP Relationship, WA Loyalty Program                                                                   |
| Marketing & Campanhas     | 5      | Campaign Engine, Seasonal Calendar, Coupon Manager, Post-Campaign Recovery, Content Engine                                |
| Ads & Performance         | 4      | Ad Waste Detector, Ads Manager, Smart Remarketing, Data Quality Guard                                                     |
| Analytics & Inteligencia  | 6      | Revenue Intelligence, Funnel Diagnostics, Cohort Analyzer, Attribution Mapper, Task Prioritizer, Weekly Briefing          |
| Atendimento & Experiencia | 3      | Customer Service, Sentiment Intelligence, Review & NPS                                                                    |
| Produto & Catalogo        | 3      | Catalog Enricher, SKU Intelligence, Pricing Engine                                                                        |
| Visibilidade & IA         | 6      | LLM Citation Monitor, Schema Markup Agent, AI Shopping Compatibility, Brand DNA Agent, Video Script Creator, Trend Hunter |
| **Total**                 | **34** |                                                                                                                           |

---

_Snew - Catalogo de Agentes Consolidado - Produto & Engenharia - Marco 2026_
