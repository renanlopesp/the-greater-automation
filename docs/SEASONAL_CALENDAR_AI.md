# Seasonal Calendar AI — Como vai funcionar

> Documento de visão da feature 044-seasonal-calendar-ai.
> Descreve o comportamento do produto após implementação completa.

---

## Fluxo do usuário (passo a passo)

### 1. Ativa a skill pela primeira vez

O lojista abre o Seasonal Calendar. O sistema detecta que não existe calendário ainda e automaticamente analisa:

- **Nicho da loja** (brand DNA): moda feminina? pet shop? cosméticos? odontologia?
- **Produtos reais** da loja (categorias, preços, margem)
- **Data de hoje**: quais datas ainda são acionáveis neste ano?

Em ~5-10 segundos, gera um **calendário personalizado com 10-20 datas** relevantes para AQUELA loja.

**Exemplo — Pet Shop ativando em Março:**

```
📅 Seu Calendário 2026 (12 datas)

 Abr  01   🐾  Dia do Veterinário          R$ 12k   [nicho]    → Gerar Campanha
 Mai  04   🐕  Dia do Cachorro             R$ 18k   [nicho]    → Gerar Campanha
 Mai  11   💐  Dia das Mães                R$ 25k   [universal] → Gerar Campanha
 Jun  05   🌍  Dia do Meio Ambiente        R$ 8k    [nicho]    → Gerar Campanha
 Ago  10   👨  Dia dos Pais                R$ 22k   [universal] → Gerar Campanha
 Out  04   🐾  Dia dos Animais             R$ 35k   [nicho]    → Gerar Campanha
 Out  12   👶  Dia das Crianças (Pets!)    R$ 28k   [nicho]    → Gerar Campanha
 Nov  27   🏷️  Black Friday                R$ 65k   [universal] → Gerar Campanha
 Dez  01   💻  Cyber Monday                R$ 15k   [universal] → Gerar Campanha
 Dez  25   🎄  Natal                       R$ 45k   [universal] → Gerar Campanha
 Dez  31   📅  Ano Novo → Gere o calendário 2027 com mais antecedência!
```

**Exemplo — Moda Feminina ativando em Outubro:**

```
📅 Seu Calendário 2026 (4 datas restantes)

 Nov  20   🖤  Dia da Consciência Negra    R$ 18k   [nicho]    → Gerar Campanha
 Nov  27   🏷️  Black Friday                R$ 120k  [universal] → Gerar Campanha
 Dez  01   💻  Cyber Monday                R$ 35k   [universal] → Gerar Campanha
 Dez  25   🎄  Natal                       R$ 85k   [universal] → Gerar Campanha

 ⚠️ 70% das datas do ano já passaram. Quer gerar o calendário 2027 completo?
    [Gerar Calendário 2027]
```

---

### 2. Gera campanha para uma data

Clica "Gerar Campanha" no Dia dos Animais. Em ~15 segundos, recebe um **briefing completo e personalizado**:

```
🐾 Dia dos Animais — 4 de Outubro

CONCEITO
"Eles fazem parte da família. Neste Dia dos Animais, mostre que você cuida de quem mais importa."

PRODUTOS SUGERIDOS (da loja real)
├── Ração Premium Adulto Gold   R$ 189   [best-seller] 📦 45 un
├── Kit Banho & Tosa Natural    R$ 67    [alta-margem]  📦 120 un
└── Cama Ortopédica M           R$ 249   [cross-sell]   📦 18 un

COPIES PRONTOS
├── Instagram Stories (D-7): "Seu melhor amigo merece o melhor. Dia dos Animais com até 30% OFF 🐾"
├── Instagram Feed (D-Day): "Eles não pedem muito. Só carinho, comida boa e um cantinho..."
├── WhatsApp (D-3): "Oi! Preparamos uma seleção especial pro Dia dos Animais..."
├── Email Marketing (D-7): Subject: "🐾 Seu pet merece esse presente"
└── Google Ads: "Dia dos Animais | Até 30% OFF em Rações e Acessórios"

EMAIL MARKETING
├── Assunto: "🐾 Seu pet merece esse presente — Dia dos Animais"
└── Preview: "Até 30% off nas melhores marcas. Só até 04/10."

ASSETS
├── Stories 9:16 — Foto do produto + gradiente com cores da marca
├── Feed 1:1 — Grid 3 produtos + slogan
├── Banner 728x90 — CTA "Compre agora"
└── Meta Ad 1200x628 — Produto hero + urgência

VÍDEO SCRIPTS
├── 15s: "Abra com close no pet. Corte para produto. Voz off: Ele faz parte da família..."
└── 30s: "Começa com montagem de momentos pet+dono. Transição para produtos..."

TIMELINE
├── D-14: Definir desconto e selecionar produtos
├── D-7:  Publicar stories + disparar email
├── D-3:  WhatsApp broadcast + Google Ads ativo
├── D-1:  Stories countdown + reminder email
├── D-Day: Feed post + stories + push notification
└── D+1:  Post obrigado + analisar resultados
```

Tudo isso usa o **tom da marca** (brand DNA), **produtos reais** da loja (com preço e estoque), e **cores/fontes** da identidade visual.

---

### 3. Campanha fica salva

Fecha o navegador, volta outro dia → calendário carrega instantâneo (<1s), campanhas geradas continuam lá. Sem perder nada.

No calendário, os status ficam claros:

- `✅ Gerado` — já tem campanha
- `📅 Próximo` — data futura, sem campanha ainda
- `⏭ Passado` — data já foi (histórico)

---

### 4. Não gostou de algo? Regenera só aquela parte

Não curtiu o texto do WhatsApp? Clica "Regenerar" só nos Copies → 3-5 segundos → novos textos, todo o resto continua igual.

Quer uma direção criativa totalmente diferente? Regenera o Conceito → todos os 7 blocos são regenerados com a nova direção.

Pode regenerar individualmente: conceito, produtos, copies, email, assets, vídeo, timeline.

---

### 5. Conversa com a IA sobre as campanhas

No painel de chat ao lado:

> **Você**: "Qual data eu deveria priorizar?"
>
> **Snew**: "Considerando seu ticket médio de R$189 e nicho pet, o Dia dos Animais (4/Out) tem o maior potencial — R$35k estimado. Black Friday vem em seguida com R$65k, mas a concorrência é muito maior. Sugiro começar pelo Dia dos Animais onde você tem diferencial de nicho."

> **Você**: "Ajusta o tom do Dia dos Animais pra ser mais divertido"
>
> **Snew**: "Entendi! Vou ajustar os copies para um tom mais leve e divertido, mantendo a essência emocional..."

Quick actions prontas pra clicar:

- "Qual a próxima data importante?"
- "Gerar briefing completo para [data]"
- "Mostre meu calendário"

---

### 6. Virada de ano

Quando >70% das datas passaram, aparece um banner:

> "A maioria das suas datas de 2026 já passou. Quer gerar o calendário 2027 com cobertura completa?"

Clica → gera calendário 2027 com o ano inteiro pela frente, incluindo novas datas que a IA identificar como relevantes pro nicho.

---

## Resumo do valor

| Antes (estático)                | Depois (IA personalizada)                            |
| ------------------------------- | ---------------------------------------------------- |
| 15 datas iguais pra todo mundo  | 10-20 datas personalizadas por nicho                 |
| Pet shop vê "Dia dos Namorados" | Pet shop vê "Dia dos Animais"                        |
| Ativa em outubro, vê maio       | Só vê datas futuras + acionáveis                     |
| Dados fake hardcoded            | Produtos reais, preços reais, tom da marca           |
| Perde tudo ao fechar            | Tudo salvo no banco, carrega instantâneo             |
| Textos genéricos                | Copies no tom da marca, com palavras que a marca usa |
| Sem iteração                    | Regenera qualquer seção, conversa com IA             |

---

## Arquitetura resumida

```
Brand DNA + Produtos + Data atual
           ↓
   generateCalendar()     →  10-20 datas personalizadas (salvo no banco)
           ↓
   Usuário seleciona data
           ↓
   generateCampaign()     →  7 seções de campanha completa (salvo no banco)
           ↓
   Usuário quer iterar
           ↓
   regenerateSection()    →  Regenera só 1 seção (merge no banco)
```

**Persistência**: Tudo em `skill_executions` (tabela existente). Sem migration.

**Chat**: Usa o orchestrator existente (`/api/chat`) com contexto da skill.

**Pré-requisito**: Brand DNA precisa estar completo. Sem brand DNA → mensagem pedindo pra completar onboarding.

---

## Spec completo

Todos os detalhes técnicos em `specs/044-seasonal-calendar-ai/`:

- `spec.md` — 7 user stories, 18 requisitos funcionais
- `plan.md` — Contexto técnico, verificação de constituição
- `tasks.md` — 52 tasks em 10 fases
- `data-model.md` — Modelos de dados
- `contracts/` — Contratos de API
- `research.md` — Decisões de design
