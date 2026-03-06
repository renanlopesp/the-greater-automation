# Análise Estratégica do Snew pelo Framework Bowtie

## Contexto

Este documento aplica o framework **Bowtie** — arquitetura de receita recorrente para SaaS — ao produto **Snew**, uma plataforma de automação com agentes de IA para e-commerce. O objetivo é diagnosticar onde o produto está forte, onde está fraco, e propor melhorias estruturais seguindo cada conceito do Bowtie.

**O que é o Snew:** SaaS B2B que oferece agentes de IA especializados (Customer Service, Marketing, Analytics, etc.), workflows automatizados, integrações via Composio, e chat com orquestrador. O modelo de receita é assinatura com créditos de IA (planos Free/Pro/Enterprise). Público-alvo: lojistas de e-commerce (Nuvemshop, Shopify).

---

## 1) Por que o funil clássico falha para o Snew

O documento Bowtie identifica 4 problemas do funil clássico. Vamos aplicar cada um ao Snew:

### 1.1 Não cobre receita recorrente

O Snew cobra assinatura mensal com créditos. Se o usuário não vê valor contínuo, cancela. O funil clássico mediria "quantos se cadastraram" e "quantos pagaram" — mas **não mede se o usuário está usando os agentes, se os workflows rodam, se os insights geram ações**. Hoje, o Snew não tem visibilidade nenhuma sobre o que acontece depois do pagamento.

**Gap no produto:** Não existe tracking de uso pós-signup. Não sabemos se um workspace ativo está realmente usando o produto ou se está prestes a cancelar.

### 1.2 É seller-centric

O onboarding atual é centrado na plataforma: "conecte sua loja, conecte canais, configure preferências, comece." São os passos que o _Snew_ precisa — não os que o _cliente_ precisa. O cliente quer saber: "como isso vai me ajudar a vender mais?" O fluxo não endereça isso em nenhum momento.

**Gap no produto:** O onboarding é sobre setup técnico, não sobre resultado do cliente. Não há um momento onde o Snew diz "vou te mostrar um resultado concreto agora".

### 1.3 Assume linearidade

Se o Snew precisar crescer receita 3x, a resposta instintiva seria "3x mais leads". Mas o modelo Bowtie mostra que os multiplicadores estão em todo o funil — se a taxa de ativação é 30%, melhorar para 50% tem mais impacto que dobrar leads. **O Snew não tem as métricas para sequer saber onde está o gargalo.**

**Gap no produto:** Zero visibilidade de funil. Não sabemos: qual % dos signups completa onboarding? Qual % cria o primeiro workflow? Qual % renova?

### 1.4 Não mostra loops fechados

O Snew não tem nenhum mecanismo onde o sucesso de um cliente alimenta o crescimento. Não há referral, não há advocacy, não há NPS, não há um loop onde "cliente renova → indica → novo cliente". O crescimento depende 100% de aquisição externa.

**Gap no produto:** Crescimento frágil. Se parar de investir em aquisição, o crescimento para.

**Conclusão:** O Snew está operando com mentalidade de funil clássico num modelo de receita recorrente. Isso significa que está escalando churn junto com crescimento.

---

## 2) O Snew mapeado nos estágios do Bowtie

### Lado esquerdo: Aquisição

#### Awareness (o cliente percebe o problema)

**Estado atual:** O Snew não tem presença educacional dentro do produto. O marketing externo (site, redes) traz o tráfego, mas dentro da plataforma não há conteúdo que reforce "por que automação com IA importa para sua loja".

**Melhoria:**

- **Content hub in-app**: Seção "Learn" com cases, benchmarks e guias curtos ("Lojas que automatizam atendimento economizam 15h/semana")
- **Insight-driven awareness**: Os próprios insights da Home podem funcionar como awareness contínuo — "Você está perdendo 40% dos carrinhos no mobile" é awareness de um problema que o Snew resolve

#### Education (o cliente aprende caminhos de solução)

**Estado atual:** O chat com orquestrador pode educar, mas de forma reativa. Não há um fluxo proativo de educação sobre o que cada agente faz, quando usar, que resultado esperar.

**Melhoria:**

- **Agent discovery page** (já implementada): Precisa ir além de listar agentes — cada card deve mostrar "resultado típico" (ex: "Customer Service agent reduces response time by 60%")
- **Onboarding educacional**: Depois de conectar a loja, mostrar um video/walkthrough curto de 90s: "Here's how stores like yours use Snew"
- **Suggestion engine**: Baseado nos dados da loja, sugerir qual agente ativar primeiro ("You have 234 unanswered questions → activate Customer Service agent")

#### Selection (decisão e comparação)

**Estado atual:** A página de planos existe (settings), mas não há:

- Comparação clara de "o que ganho no Pro vs Free"
- Calculadora de ROI ("seus dados mostram que você perde R$X/mês em carrinhos abandonados → com automação, recuperaria Y%")
- Social proof in-app (quantos lojistas usam, resultados médios)

**Melhoria:**

- **ROI calculator** contextual: Usa os dados reais da loja do usuário para projetar ganho com upgrade
- **Testimonials/metrics**: "2,400 stores automated this month. Average: 12h saved/week"
- **Free trial de features premium**: Dar 7 dias de Pro para novos signups experimentarem o impacto real

### Centro: Mutual Commit

**Estado atual:** O "commit" do Snew é o momento em que o cliente paga. Mas o Bowtie define Mutual Commit como um compromisso de ambos os lados: o cliente se compromete a usar, o produto se compromete a entregar resultado.

**O que falta:** O Snew não estabelece nenhuma expectativa de resultado no momento do commit. O usuário paga e... chega no dashboard. Não há "Nos próximos 7 dias, nossos agentes vão: analisar suas vendas, identificar oportunidades, e configurar 2 automações para você."

**Melhoria:**

- **Commit screen pós-pagamento**: "Welcome to Pro. Here's what happens in the next 7 days:" com 3-4 milestones concretos
- **Proactive first-week experience**: Agentes do Snew automaticamente rodam análises e geram o primeiro relatório sem o usuário pedir
- **Expectation setting**: Email/notificação dia 1, dia 3, dia 7 com progresso vs. expectativa

### Lado direito: Retenção e Expansão

#### Onboarding (chegar ao primeiro impacto rápido)

**Estado atual:** 4 steps lineares (Connect Store → Connect Channels → Preferences → Get Started). Depois, o usuário cai no dashboard com insights estáticos. O "primeiro impacto" não existe — não há um momento "aha".

**O Bowtie chama isso de "Activation"** — o ponto onde o cliente percebe valor real pela primeira vez.

**Melhoria:**

- **Time to First Impact < 5 minutos**: Assim que a loja conecta, rodar um agente de análise express que retorna 3 insights reais em tempo real ("Seu produto mais vendido esta semana: X. Estoque crítico: Y. Pedidos pendentes: Z")
- **Guided activation**: "Choose your first mission" — não um wizard genérico, mas uma ação com resultado imediato
- **Celebration moment**: Primeiro insight gerado → confetti + "Your first AI-powered insight! Snew analyzed 1,234 orders to find this."

#### Adoption (produto entra na rotina diária)

**Estado atual:** Não há nenhum mecanismo de retenção diária. Sem notificações push, sem email digest, sem razão para o usuário voltar todo dia. Os "Insights of the Day" são estáticos, então não há novidade.

**Melhoria:**

- **Daily briefing**: Todo dia de manhã, o orquestrador gera um resumo: "Ontem: 23 pedidos, R$3.2k revenue, 2 issues detectadas". Entregue via email E como primeira coisa na Home
- **Notification-driven return**: Insights reais geram notificações ("Alerta: produto X abaixo do threshold de estoque") que trazem o usuário de volta
- **Habit loop**: Login → ver briefing → agir em 1 insight → ver resultado → voltar amanhã
- **Feature adoption tracking**: Saber se o usuário já usou chat, criou workflow, conectou app — e fazer nudge para features não descobertas

#### Expansion (crescimento dentro da base)

**Estado atual:** Sidebar mostra créditos restantes + botão "Upgrade" genérico. Sem contexto, sem urgência, sem demonstração de valor.

**Melhoria:**

- **Contextual upgrade**: "You've used 80% of credits. Your 3 active workflows need ~200 credits/month to keep running. → Upgrade to Pro for unlimited"
- **Agent-driven expansion**: "Based on your store data, the Marketing agent could help you recover R$4.2k in abandoned carts. → Add Marketing agent (Pro plan)"
- **Seat expansion**: Quando o admin convida membros, calcular e mostrar "Adding 2 team members saves an average of 8h/week in coordination"
- **Module upsell**: Quando o usuário usa uma feature no limite, mostrar o que o próximo plano desbloqueia — em contexto, não em página genérica de pricing

---

## 3) Value vs Impact — aplicado ao Snew

O Bowtie define:

- **Value** = valor percebido e prometido durante o processo de compra
- **Impact** = entrega real e mensurável durante o uso

### Onde o Snew está:

| Aspecto   | Value (promessa)                          | Impact (entrega)                                              |
| --------- | ----------------------------------------- | ------------------------------------------------------------- |
| Insights  | "Insights of the Day" com dados estáticos | ❌ Não existe — são placeholders                              |
| Agentes   | "24 agentes especializados"               | ❌ Sem medição de resultado por agente                        |
| Automação | "Automatize sua loja"                     | ❌ Sem métricas de "quanto tempo/dinheiro a automação salvou" |
| Chat      | "Pergunte qualquer coisa"                 | ✅ Parcial — funciona, mas sem tracking de satisfação         |

### O que precisa mudar:

**Para cada feature do Snew, deve existir uma métrica de Impact visível para o cliente:**

- **Insights**: "Este insight levou a uma ação que gerou R$X em recuperação de vendas"
- **Agentes**: "O agente Customer Service respondeu 156 perguntas esta semana. Tempo médio de resposta: 2min (vs 4h manual)"
- **Workflows**: "Workflow 'Abandoned Cart' recuperou 12 vendas (R$1,890) nos últimos 7 dias"
- **Chat**: "Você fez 23 consultas esta semana. Os insights salvaram ~3h de análise manual"

**Implementação concreta:**

- Tabela `impact_metrics` com: workspace_id, feature (agent/workflow/insight), metric_type (time_saved/revenue_generated/actions_taken), value, period
- Widget na Home: "This week's impact: X hours saved, Y revenue protected, Z issues detected"
- Email semanal: "Your Snew Impact Report"

**Por que isso é P0:** Em SaaS de assinatura, se o cliente não vê Impact contínuo e mensurável, ele cancela. É a diferença entre "eu acho que isso serve" e "eu sei que isso me deu R$X esse mês".

---

## 4) Closed Loops — mapeamento completo para o Snew

O Bowtie define 6 tipos de loops fechados. Vou mapear cada um ao Snew:

### Loop 1: Renewals como crescimento composto

**Conceito:** Cada renovação é receita composta. Se a base retém 95% e adiciona expansão, o crescimento é exponencial sem precisar de novos clientes.

**Estado no Snew:** Não há tracking de renovação nem ações preventivas. Se o cliente cancela, descobrimos quando o Stripe notifica.

**Melhoria:**

- **Renewal health score**: 30 dias antes da renovação, calcular score baseado em uso
- **Pre-renewal campaign**: Se health score < 70%, trigger automático: CS outreach + "aqui está o que você conquistou com Snew este mês"
- **Annual incentive**: Oferecer desconto para annual billing quando o cliente mostra high engagement

### Loop 2: Risk sharing durante onboarding

**Conceito:** Compartilhar risco reduz barreira de entrada e puxa novos times.

**Estado no Snew:** Plano free existe, mas não há trial de Pro. O cliente precisa pagar para descobrir se funciona.

**Melhoria:**

- **7-day Pro trial** com todos os agentes ativos → ao final, mostrar Impact Report: "In 7 days, Snew did X for your store. Keep it? → Upgrade"
- **Money-back guarantee** nos primeiros 30 dias, comunicada proativamente
- **Pilot program** para enterprise: "Ativamos em 1 loja, mostramos resultado, depois expandimos"

### Loop 3: Advocacy (clientes viram mídia)

**Conceito:** Clientes satisfeitos falam sobre o produto sem serem incentivados.

**Estado no Snew:** Zero. Não há nenhum mecanismo que aproveite satisfação para gerar awareness.

**Melhoria:**

- **Share results**: Botão "Share this insight" quando um insight é especialmente bom → gera um card visual para redes sociais
- **Public dashboard** (opt-in): "Minha loja automatizada pelo Snew" — como Shopify mostra badges "Powered by Shopify"
- **Community**: Espaço onde lojistas compartilham workflows e resultados (pode ser Slack/Discord ou in-app)

### Loop 4: Referrals antes do impacto total

**Conceito:** Referrals acontecem quando o cliente está entusiasmado — muitas vezes antes mesmo de atingir o resultado completo.

**Estado no Snew:** Zero. Sem programa de referral.

**Melhoria:**

- **Referral trigger no momento de entusiasmo**: Quando o usuário completa primeiro workflow com sucesso, ou quando vê o primeiro insight real → "Know someone who could use this? Invite them and both get 100 credits"
- **Programa simples**: Link de referral no settings, créditos como reward (não desconto — créditos são mais tangíveis no modelo do Snew)

### Loop 5: ICP loop (atualiza aquisição com base nos melhores clientes)

**Conceito:** Usar dados dos melhores clientes (mais engajados, maior LTV) para refinar quem você adquire.

**Estado no Snew:** Não existe análise de ICP retroativa.

**Melhoria:**

- **Internal analytics**: Identificar padrões dos workspaces com maior retenção (segmento, tamanho, features usadas, tempo para ativação)
- **Informar marketing**: Se os melhores clientes são lojas de moda com 500+ pedidos/mês, focar aquisição nesse perfil
- **In-product**: Mostrar "Stores like yours typically use these 3 agents" — personalização baseada em cohort

### Loop 6: Nurturing (interessados viram falantes da marca)

**Conceito:** Mesmo leads que não converteram podem ser nutridos até virarem advocates.

**Estado no Snew:** Sem nurturing pós-trial. Se o free user não converte, é esquecido.

**Melhoria:**

- **Free tier engagement**: Mesmo no plano free, enviar weekly digest com "Here's what happened in your store this week (with limited analysis). Unlock full insights with Pro"
- **Re-engagement**: Se um free user fica inativo 14 dias, enviar email com insight real da loja (não genérico) — "While you were away, we detected 3 things in your store"
- **Educational drip**: Sequência de emails mostrando como lojistas similares usam o Snew, com resultados reais

**Condição para todos os loops funcionarem (citado no Bowtie):** Todas as áreas voltadas ao cliente — produto, CS, marketing, vendas — precisam compartilhar uma meta unificadora: **Impact**. No Snew, isso significa que o KPI principal não é "MRR" isolado, mas "Impact entregue por workspace" (que gera MRR como consequência).

---

## 5) O que medir — Métricas VM, CR, Δt aplicadas ao Snew

O Bowtie propõe três dimensões de métricas por estágio: **Volume (VM)**, **Conversão (CR)** e **Tempo (Δt)**.

### Volume Metrics (VM) — quantidade em cada estágio

| Métrica | Estágio Bowtie | Definição no Snew                       | Fonte de dados                                           |
| ------- | -------------- | --------------------------------------- | -------------------------------------------------------- |
| VM1     | Awareness      | Visitantes únicos no site/landing       | Analytics externo                                        |
| VM2     | Education      | Signups (criação de conta)              | `auth.users` count                                       |
| VM3     | Selection      | Onboarding iniciado (store connected)   | `stores` com `platform_store_id` not null                |
| VM4     | Mutual Commit  | Planos pagos ativos                     | `subscriptions` status=active                            |
| VM5     | Onboarding     | First Impact alcançado                  | Nova tabela `user_milestones` (milestone='first_impact') |
| VM6     | Adoption       | WAU (Weekly Active Users) por workspace | Event tracking (login + action)                          |
| VM7     | Expansion      | Upgrades + seat additions no período    | `subscriptions` plan changes                             |
| VM8     | Renewal        | Renovações no período                   | Stripe webhook renewal events                            |
| VM9     | LTV            | ACV × tempo médio de vida               | Cálculo: `subscription.amount × avg_lifetime_months`     |

**Ponto de transição:** Do lado esquerdo (contagem de pessoas) para o lado direito (receita). No Snew, isso acontece em VM4 (Mutual Commit) — quando signups viram MRR, multiplicando commits por ACV.

### Conversion Metrics (CR) — eficiência entre estágios

| Métrica | Transição                    | Meta razoável | Medição no Snew                  |
| ------- | ---------------------------- | ------------- | -------------------------------- |
| CR1     | Visitor → Signup             | 3-5%          | Analytics → auth.users           |
| CR2     | Signup → Store Connected     | 60%+          | auth.users → stores com platform |
| CR3     | Store Connected → Paying     | 10-20%        | stores → subscriptions active    |
| CR4     | Paying → First Impact        | 80%+          | subscriptions → user_milestones  |
| CR5     | First Impact → Weekly Active | 60%+          | user_milestones → WAU tracking   |
| CR6     | Active → Renewed             | 90%+ (target) | WAU → renewal events             |
| CR7     | Renewed → Expanded           | 20-30%        | renewals → plan upgrades         |
| CR8     | Active → Referrer            | 5-10%         | WAU → referral invites sent      |

**Onde priorizar:** O Bowtie diz que o gargalo com maior alavancagem é onde CR é mais baixo. **Se CR4 (paying → first impact) é 40%, melhorar para 70% tem mais impacto que qualquer melhoria em CR1.** Hoje o Snew não tem nenhum desses números.

### Time Metrics (Δt) — velocidade em cada transição

| Métrica | Transição                       | Target   | Por que importa                                       |
| ------- | ------------------------------- | -------- | ----------------------------------------------------- |
| Δt1     | Signup → Store Connected        | < 10 min | Dropout em onboarding é exponencial com tempo         |
| Δt2     | Store Connected → First Insight | < 5 min  | "Aha moment" precisa ser imediato                     |
| Δt3     | First Insight → First Workflow  | < 24h    | Se esperar demais, o entusiasmo morre                 |
| Δt4     | Paying → First Impact           | < 48h    | O Bowtie diz: "o tempo mais perigoso é o tempo morto" |
| Δt5     | Issue Detected → Notification   | < 1h     | Valor do Snew está em ser proativo                    |
| Δt6     | Support Request → Resolution    | < 4h     | Correlação direta com NPS                             |
| Δt7     | Churn Signal → Intervention     | < 24h    | Se o health score cai, agir antes que cancelem        |

**Insight do Bowtie aplicado:** "Em SaaS, tempo é alavanca de margem e churn. O tempo mais perigoso é o tempo morto — quando nada acontece." No Snew, o "tempo morto" é o período entre conectar a loja e ver o primeiro resultado. Se esse tempo for > 24h, o risco de abandono sobe exponencialmente.

---

## 6) GTM Motion do Snew — posicionamento no Bowtie

O Bowtie define 3 motions que podem rodar no mesmo framework:

### High Touch

- Ciclos longos, ABM, POC, expansão forte no pós-venda
- **Snew Enterprise**: Para redes de lojas ou operações grandes. Onboarding dedicado, CS proativo, custom agents. Expansion via novas lojas/unidades.

### Medium Touch

- Volume com SDR e automação, sensível a churn, depende de renewal
- **Snew Pro**: É onde a maioria dos clientes está. Onboarding self-serve com suporte. Renewal mensal. Churn é o principal risco. **Este é o motion principal do Snew hoje.**

### No Touch / PLG (Product-Led Growth)

- Produto como motor, foco em signups, uso e loops virais
- **Snew Free**: Sign up, conecta loja, usa com limites. Conversion para Pro via valor percebido. **Este é o motion de aquisição.**

### Implicação para o Snew:

O Snew opera com **PLG na entrada** (free tier) e **Medium Touch na retenção** (Pro). Mas não executa bem nenhum dos dois:

- **PLG**: O free tier não tem loop viral, não tem razão para compartilhar, não tem "aha moment" que force upgrade
- **Medium Touch**: Não há CS proativo, não há health scoring, não há intervenção antes do churn

**O que o Bowtie recomenda:** Padronizar as métricas (VM/CR/Δt) para TODOS os motions e rodar em paralelo. No Snew:

- **PLG**: Otimizar Δt2 (time to first insight) e CR3 (free → paid)
- **Medium Touch**: Otimizar CR6 (renewal rate) e CR7 (expansion rate)
- **High Touch**: Otimizar VM9 (LTV) através de expansion em enterprise

---

## 7) Priorização Final — Roadmap Bowtie para o Snew

### P0 — Fazer agora (fundação para tudo)

| Item                           | O que                                              | Estágio Bowtie    | Métrica impactada             |
| ------------------------------ | -------------------------------------------------- | ----------------- | ----------------------------- |
| Instrumentação de métricas     | Implementar tracking de VM1-VM9, CR1-CR8, Δt1-Δt7  | Measurement       | Todas — sem isso, tudo é cego |
| Time to First Impact           | Primeiro insight real em < 5min após conectar loja | Onboarding        | CR4, Δt2                      |
| Insights reais (não estáticos) | Pipeline de insights com dados da loja             | Adoption + Impact | CR5, CR6                      |

### P1 — Próximo trimestre (loops e expansão)

| Item               | O que                                                | Estágio Bowtie | Métrica impactada |
| ------------------ | ---------------------------------------------------- | -------------- | ----------------- |
| Daily briefing     | Resumo diário automático por email + Home            | Adoption       | CR5 (active rate) |
| Impact dashboard   | Widget: "This week Snew saved you Xh, protected R$Y" | Value → Impact | CR6 (renewal)     |
| Contextual upgrade | Upsell baseado em uso real, não genérico             | Expansion      | CR7, VM7          |
| Health scoring     | Score por workspace, alertas de churn risk           | Adoption       | CR6               |
| Renewal campaign   | 30 dias antes, enviar Impact Report + incentivo      | Renewal        | CR6, VM8          |

### P2 — Próximos 6 meses (loops fechados)

| Item                | O que                                         | Estágio Bowtie     | Métrica impactada |
| ------------------- | --------------------------------------------- | ------------------ | ----------------- |
| Referral program    | Créditos por indicação                        | Loop: Referral     | CR8, VM1          |
| Share results       | "Share this insight" para redes sociais       | Loop: Advocacy     | VM1               |
| Pro trial (7 days)  | Trial completo para novos signups             | Loop: Risk sharing | CR3               |
| ICP analysis        | Analytics internos dos melhores clientes      | Loop: ICP          | CR1, CR3          |
| Free tier nurturing | Weekly digest com insights limitados          | Loop: Nurturing    | CR3               |
| Community           | Espaço para lojistas compartilharem workflows | Loop: Advocacy     | VM1               |

---

## Resumo Executivo

O Snew opera como SaaS de receita recorrente mas pensa como funil de aquisição. Usando o Bowtie:

**Diagnóstico:**

- **Lado esquerdo (aquisição):** Funciona no básico, mas sem educação in-app nem prova social
- **Centro (mutual commit):** Inexistente — o pagamento não estabelece expectativa de resultado
- **Lado direito (retenção/expansão):** Vazio — sem tracking de adoção, sem Impact mensurável, sem loops fechados
- **Métricas:** Zero visibilidade de VM/CR/Δt — decisões são cegas

**A virada crítica é uma:**

> Parar de entregar **Value** (promessa) e começar a entregar **Impact** (resultado mensurável e contínuo).

Concretamente: o Snew precisa que todo usuário veja, dentro de 5 minutos, um resultado real gerado pelos agentes usando os dados da loja dele. E precisa que esse resultado se renove todo dia. Sem isso, todo investimento em aquisição escala churn.

**Os 3 primeiros passos:**

1. **Instrumentar métricas** (VM/CR/Δt) — sem isso é impossível saber onde atuar
2. **Time to First Impact < 5min** — análise express da loja no momento que conecta
3. **Insights pipeline real** — substituir dados estáticos por análises diárias com CTA acionável
