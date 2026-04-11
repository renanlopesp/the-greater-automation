# Análise: Onboarding Agent Dedicado

## Problema Atual

O onboarding hoje faz chamadas avulsas à API da Anthropic:

1. `analyzeStoreVisuals(url)` → `messages.create()` com vision
2. `analyzeBrandDna(catalog, storeInfo)` → `messages.create()` com structured output
3. Se falha → retry manual, sem contexto do que deu errado
4. Sem memória entre steps — cada chamada é isolada
5. Se o formato de resposta vier errado, tenta parsear e falha silenciosamente

**Resultado**: processo frágil, sem inteligência para corrigir problemas, cada step desconectado do anterior.

## Proposta: Onboarding Agent

Um **Managed Agent dedicado ao onboarding** — pré-configurado, compartilhado entre todos os clientes, especialista no processo de setup.

### Arquitetura

```
┌─────────────────────────────────────────────────┐
│  Onboarding Agent (compartilhado, 1 instância)  │
│                                                 │
│  System Prompt: especialista em análise de      │
│  e-commerce brasileiro, geração de brand DNA,   │
│  análise visual de lojas                        │
│                                                 │
│  MCP Tools:                                     │
│  - ONBOARD_SCRAPE_STORE (Firecrawl + screenshot)│
│  - ONBOARD_FETCH_PRODUCTS (Nuvemshop API)       │
│  - ONBOARD_ANALYZE_VISUALS (self — vision)      │
│  - ONBOARD_GENERATE_BRAND_DNA (self — analysis) │
│  - ONBOARD_SAVE_RESULTS (Supabase)              │
│  - ONBOARD_PROVISION_AGENT (cria agent da loja) │
└─────────────────────────────────────────────────┘
         │
         │ Uma sessão por onboarding
         │ Multi-step, com memória
         ▼
┌─────────────────────────────────────────────────┐
│  Sessão de Onboarding (por cliente)             │
│                                                 │
│  Turn 1: "Analise a loja milkes.com.br"         │
│  → Agent scrapes, analisa visual, extrai cores  │
│                                                 │
│  Turn 2: (automático) "Agora analise o catálogo"│
│  → Agent busca produtos, categorias, preços     │
│                                                 │
│  Turn 3: (automático) "Gere o Brand DNA"        │
│  → Agent usa TUDO que coletou (visual + catálogo│
│    + segmento) para gerar análise completa      │
│                                                 │
│  Turn 4: (automático) "Provisione o agent"      │
│  → Cria o agent personalizado da loja           │
│                                                 │
│  Resultado: Brand DNA + Agent provisionado      │
└─────────────────────────────────────────────────┘
```

### Vantagens vs Chamadas Diretas

| Aspecto                  | Hoje (API direta)                       | Com Onboarding Agent                                 |
| ------------------------ | --------------------------------------- | ---------------------------------------------------- |
| **Contexto entre steps** | Nenhum — cada call é isolada            | Agent mantém história da sessão                      |
| **Correção de erros**    | Falha silenciosa, retry cego            | Agent entende o erro e ajusta a abordagem            |
| **Formato de saída**     | JSON parse pode falhar                  | Agent sabe o schema esperado e gera correto          |
| **Qualidade da análise** | Cada step vê só seus dados              | Brand DNA vê screenshot + catálogo + segmento juntos |
| **Visual + Catálogo**    | Analisados separadamente, merged depois | Agent analisa tudo integrado                         |
| **Retry inteligente**    | Não tem                                 | Agent pode re-tentar com prompt diferente            |
| **Observabilidade**      | Logs esparsos                           | Sessão completa com todos os turns                   |
| **Custo**                | Múltiplas chamadas separadas            | 1 sessão com múltiplos turns (cache de contexto)     |

### System Prompt do Onboarding Agent

```
## Identity
Name: Snew Onboarding
Role: Especialista em setup de lojas de e-commerce brasileiro

## Missão
Analisar uma loja virtual e gerar um Brand DNA completo e preciso.
Você tem acesso a ferramentas para:
- Capturar screenshots da loja
- Buscar produtos do catálogo
- Salvar os resultados no banco

## Processo (seguir na ordem)
1. SCRAPE: Capture o screenshot da homepage e extraia HTML
2. VISUAL: Analise cores, fontes, estilo visual, textos de marca
3. CATALOG: Busque e analise os produtos (categorias, preços, volume)
4. BRAND DNA: Com TUDO acima, gere a análise completa
5. SAVE: Salve tudo no banco e provisione o agent da loja

## Qualidade
- NUNCA invente dados. Use apenas o que extraiu das ferramentas.
- Se o screenshot falhar, informe e continue só com catálogo.
- Se o catálogo estiver vazio, ajuste a análise para refletir isso.
- Brand DNA deve ser em PT-BR, específico, nunca genérico.
```

### MCP Tools Dedicados

O Onboarding Agent teria seu próprio MCP server (`onboarding-tools`) com tools específicas:

1. **ONBOARD_SCRAPE_STORE** — Firecrawl: captura screenshot + HTML
2. **ONBOARD_FETCH_PRODUCTS** — Nuvemshop API: lista produtos com preços
3. **ONBOARD_SAVE_VISUAL** — Salva análise visual no Supabase
4. **ONBOARD_SAVE_BRAND_DNA** — Salva brand DNA completo no Supabase
5. **ONBOARD_PROVISION_AGENT** — Cria o Managed Agent personalizado da loja
6. **ONBOARD_CHECK_STATUS** — Verifica estado atual do onboarding

### Fluxo de Execução

```typescript
// No pipeline de onboarding, em vez de N chamadas separadas:
const session = await anthropic.beta.sessions.create({
  agent: ONBOARDING_AGENT_ID, // agent compartilhado
  environment_id: ONBOARDING_ENV_ID,
})

// Um único prompt que dispara todo o processo
await anthropic.beta.sessions.events.send(session.id, {
  events: [
    {
      type: 'user.message',
      content: [
        {
          type: 'text',
          text: `Analise a loja "${storeName}" (${storeUrl}).
             Platform: ${platform}
             Store ID: ${platformStoreId}
             Team ID: ${teamId}
             User ID: ${userId}
             
             Execute o processo completo: scrape → visual → catálogo → brand DNA → salvar → provisionar agent.`,
        },
      ],
    },
  ],
})

// O agent faz tudo sozinho, step by step, com contexto acumulado
```

### Implementação

1. **Criar Edge Function `onboarding-tools`** — MCP server com as tools específicas
2. **Provisionar 1 Onboarding Agent** — compartilhado, registrado como env var
3. **Adaptar `analysis-pipeline.ts`** — trocar N chamadas por 1 sessão
4. **Progress no frontend** — cada tool call do agent → progress step no chat/UI

### Custos

- **Agent compartilhado**: 1 agent para todos os clientes (não precisa provisionar por team)
- **Sessão por onboarding**: ~4-5 turns, ~5k tokens input, ~3k output
- **MCP tools**: mesmos que já temos (Firecrawl, Nuvemshop, Supabase)
- **Benefício**: cache de contexto entre turns reduz custo vs N chamadas isoladas

### Riscos

- **Timeout**: onboarding completo pode levar 2-3 min. Sessão precisa aguentar.
- **Rate limit**: Firecrawl + Nuvemshop + Anthropic em sequência rápida
- **Fallback**: se o agent travar, precisar de fallback para chamadas diretas
- **Shared agent update**: se mudar o system prompt, afeta todos os onboardings futuros

### Decisão Recomendada

**Implementar o Onboarding Agent.** O ganho de qualidade e confiabilidade justifica. O fluxo atual é frágil — cada step isolado sem contexto do anterior gera análises genéricas. Com o agent, cada step acumula contexto e a análise final é muito mais precisa.

### Próximos Passos

1. Criar Edge Function `supabase/functions/onboarding-tools/index.ts`
2. Provisionar o Onboarding Agent (1x, guardar ID como env var)
3. Adaptar pipeline para usar sessão do agent
4. Integrar progress com o frontend (Queue component)
