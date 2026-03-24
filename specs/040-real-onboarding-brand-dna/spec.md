# Feature Specification: Real Onboarding + Brand DNA

**Feature Branch**: `040-real-onboarding-brand-dna`
**Created**: 2026-03-24
**Status**: Draft
**Input**: Implementação completa do fluxo de Onboarding — desde a conexão real com a loja até a geração real do Brand DNA via LLM e ativação funcional de skills.

## User Scenarios & Testing

### User Story 1 - Lojista conecta loja e recebe Brand DNA real (Priority: P1)

Um novo lojista acessa o Snew pela primeira vez. Na tela Welcome, clica "Connect your store". Na tela Connect, escolhe Nuvemshop — o sistema inicia o OAuth real (que já existe em `/api/nuvemshop/connect`). Após autorizar, o callback salva o token e redireciona para a tela Analyzing. Nesta tela, o sistema **realmente** executa 3 etapas: (1) sincroniza os produtos da loja via API Nuvemshop, (2) analisa o catálogo + site via LLM para gerar o Brand DNA, (3) mapeia as datas sazonais relevantes para o nicho detectado. Quando termina, o lojista avança para a tela Brand DNA onde vê os resultados **reais** da análise — não dados mock.

**Why this priority**: É o "wow moment" do produto. Se o lojista conecta a loja e recebe uma análise real da marca em segundos, o produto se vende sozinho. Sem isso, é só um chatbot genérico.

**Independent Test**: Conectar uma loja Nuvemshop real → verificar que produtos são sincronizados, Brand DNA é gerado com dados reais (nome da loja, nicho detectado, tom de voz, oportunidades), e os dados são persistidos no banco.

**Acceptance Scenarios**:

1. **Given** o lojista está na tela Connect, **When** clica "Connect via Nuvemshop", **Then** o sistema inicia o OAuth flow próprio (redireciona para Nuvemshop para autorizar).
2. **Given** o lojista está na tela Connect, **When** clica "Connect via Shopify", **Then** o sistema inicia a conexão via Composio (OAuth gerenciado pelo Composio SDK).
3. **Given** o lojista autorizou na plataforma (Nuvemshop ou Shopify), **When** o callback é processado, **Then** o token de acesso é salvo na tabela `stores` e o lojista é redirecionado para `/onboarding/analyzing`.
4. **Given** o lojista está na tela Analyzing, **When** a análise está rodando, **Then** vê progresso real: "Sincronizando X produtos..." → "Gerando Brand DNA..." → "Mapeando Y datas sazonais..." com dados reais (não hardcoded).
5. **Given** a análise completou, **When** o lojista avança para Brand DNA, **Then** vê dados reais da SUA loja: nome correto, nicho detectado do catálogo, tom de voz extraído dos textos dos produtos, oportunidades sazonais relevantes ao nicho.
6. **Given** a tela Brand DNA carregou, **When** os dados são exibidos, **Then** a tabela `brand_dna` no Supabase contém os dados gerados (não está vazia).

---

### User Story 2 - Brand DNA é gerado por análise LLM do catálogo (Priority: P1)

O sistema analisa os produtos sincronizados da loja usando LLM para extrair: nicho de mercado, ticket médio, identidade visual (baseada em nomes e descrições dos produtos), tom de voz (formal/informal, emocional/técnico), público-alvo, posicionamento competitivo. Também identifica forças (o que a marca faz bem), alertas (gaps e riscos), e oportunidades (datas sazonais, segmentos inexplorados, conteúdo potencial). Tudo é persistido na tabela `brand_dna`.

**Why this priority**: O Brand DNA alimenta todas as outras skills. Sem ele, o Copywriter não sabe o tom da marca, o Seasonal Calendar não sabe o nicho, o Campaign Engine não sabe o posicionamento.

**Independent Test**: Chamar a API de análise com um `storeId` que tem produtos sincronizados → verificar que o Brand DNA é gerado com campos preenchidos coerentemente.

**Acceptance Scenarios**:

1. **Given** a loja tem 50+ produtos sincronizados, **When** a análise de Brand DNA é executada, **Then** o sistema detecta o nicho correto (ex: moda bebê, cosméticos, eletrônicos) baseado nos nomes e categorias dos produtos.
2. **Given** os produtos têm descrições, **When** a análise roda, **Then** o sistema extrai o tom de voz (ex: "afetuoso e emocional" para moda infantil, "técnico e objetivo" para eletrônicos).
3. **Given** a análise completou, **When** verifica o banco, **Then** a tabela `brand_dna` contém: `store_name`, `niche`, `average_ticket`, `tone`, `audience`, `words_to_use[]`, `words_to_avoid[]`, `positioning`, `strengths[]`, `alerts[]`, `opportunities[]`.
4. **Given** o nicho detectado é "moda bebê", **When** as oportunidades são geradas, **Then** incluem datas sazonais relevantes (Dia das Mães, Dia das Crianças, Natal) com estimativa de potencial.

---

### User Story 3 - Tela Analyzing mostra progresso real (Priority: P2)

A tela de análise mostra o progresso real das 3 etapas do pipeline (não timers mock). Cada etapa atualiza em tempo real: (1) "Sincronizando produtos..." → "X produtos sincronizados", (2) "Gerando Brand DNA..." → "Brand DNA gerado", (3) "Mapeando datas sazonais..." → "Y datas mapeadas". Se alguma etapa falhar, mostra erro com opção de retry.

**Why this priority**: O lojista precisa saber que algo real está acontecendo, não uma animação fake. A confiança no produto começa aqui.

**Independent Test**: Conectar uma loja com produtos → verificar que os números mostrados (X produtos, Y datas) correspondem aos dados reais.

**Acceptance Scenarios**:

1. **Given** a loja tem 200 produtos, **When** a sincronização completa, **Then** o step 1 mostra "200 produtos sincronizados" (número real).
2. **Given** a análise LLM roda, **When** o Brand DNA é gerado, **Then** o step 2 mostra "Brand DNA gerado" com check verde.
3. **Given** o mapeamento sazonal roda, **When** identifica 25 datas relevantes, **Then** o step 3 mostra "25 datas mapeadas".
4. **Given** a sincronização falha (token inválido, API fora), **When** o erro ocorre, **Then** mostra mensagem de erro e botão "Tentar novamente".

---

### User Story 4 - Tela Brand DNA exibe resultados reais (Priority: P2)

A tela Brand DNA (idêntica visualmente ao protótipo) exibe os dados reais gerados pela análise. As 8 seções são preenchidas com dados do banco: greeting personalizado com nome do lojista, identidade da marca real, tom de voz com palavras usar/evitar reais, diagnóstico com forças e alertas reais, oportunidades sazonais reais com estimativa de receita, projeção de receita baseada no ticket médio e nicho, e skills recomendadas baseadas no perfil da loja.

**Why this priority**: É onde o lojista decide se vai usar o produto. Se a análise for precisa e impressionante, ele ativa as skills e começa a usar.

**Independent Test**: Gerar Brand DNA para uma loja real → abrir a tela → verificar que todos os campos mostram dados coerentes com a loja (não Milkes mock).

**Acceptance Scenarios**:

1. **Given** o Brand DNA foi gerado para uma loja de cosméticos, **When** a tela carrega, **Then** o greeting diz "Oi, [nome]. Sou o Snew, seu novo CMO." com o nome real do lojista.
2. **Given** a análise detectou nicho "cosméticos naturais", **When** vê a seção "Identidade da marca", **Then** descreve o posicionamento real da loja (não texto genérico).
3. **Given** a análise detectou tom "informal e acolhedor", **When** vê "Tom de voz", **Then** as tags de "Usar" e "Evitar" são relevantes ao segmento real.
4. **Given** as oportunidades foram identificadas, **When** vê "O que eu identifiquei", **Then** os cards mostram datas sazonais relevantes ao nicho com estimativas de receita baseadas no ticket médio da loja.

---

### User Story 5 - Lojista ativa skills reais no final do onboarding (Priority: P2)

No final da tela Brand DNA, o lojista vê 3 skills recomendadas com toggles. As recomendações são baseadas no perfil da loja (nicho, plataforma, prioridades). Ao clicar "Começar com essas habilidades", as skills selecionadas são ativadas de verdade no banco (tabela `skills` atualizada para `status: 'active'`), o campo `onboarding_completed` é marcado como `true` na tabela `stores`, e o lojista é redirecionado para a home.

**Why this priority**: É o momento de conversão — o lojista vai de "conhecendo" para "usando". Skills ativadas mudam o comportamento do Snew no chat.

**Independent Test**: Clicar "Começar" → verificar no banco que as skills selecionadas estão com `status: 'active'` e `stores.onboarding_completed = true`.

**Acceptance Scenarios**:

1. **Given** o lojista está na seção "O que eu recomendo" com 3 skills com toggle ON, **When** clica "Começar com essas habilidades", **Then** as 3 skills são ativadas no banco.
2. **Given** o lojista desligou o toggle de uma skill, **When** clica "Começar", **Then** apenas 2 skills são ativadas (a desligada permanece 'available').
3. **Given** a ativação completou, **When** verifica o banco, **Then** `stores.onboarding_completed = true` para o team.
4. **Given** a ativação completou, **When** o lojista é redirecionado para a home, **Then** o chat do Snew já tem acesso às skills ativadas no system prompt.

---

### User Story 6 - Brand DNA alimenta o chat do Snew (Priority: P3)

Após o onboarding, quando o lojista usa o chat, o Snew tem acesso ao Brand DNA no seu system prompt. Isso significa que quando o Copywriter gera uma copy, usa o tom de voz da marca. Quando o Seasonal Calendar sugere datas, usa o nicho detectado. O Brand DNA é o contexto compartilhado que torna todas as skills on-brand.

**Why this priority**: Sem isso, as skills geram output genérico. Com Brand DNA no contexto, o output é personalizado para a marca.

**Independent Test**: Enviar mensagem no chat pedindo uma copy → verificar que o Snew usa o tom de voz do Brand DNA na resposta.

**Acceptance Scenarios**:

1. **Given** o Brand DNA existe para o team, **When** o Snew recebe uma mensagem, **Then** o system prompt inclui informações do Brand DNA (nicho, tom de voz, palavras a usar/evitar).
2. **Given** o lojista pede "escreve uma copy para Instagram", **When** o Snew responde, **Then** a copy reflete o tom de voz e vocabulário definidos no Brand DNA.
3. **Given** o Brand DNA não existe (lojista não completou onboarding), **When** o Snew recebe mensagem, **Then** funciona normalmente sem Brand DNA no contexto.

---

### Edge Cases

- O que acontece quando a loja tem 0 produtos? A análise gera Brand DNA parcial baseado apenas no nome/segmento da loja, com alerta de que precisa de produtos para análise completa.
- O que acontece quando o OAuth falha ou é cancelado? Redireciona de volta para /onboarding/connect com mensagem de erro.
- O que acontece quando a API da Nuvemshop está fora? A tela Analyzing mostra erro no step que falhou com opção de retry.
- O que acontece quando a análise LLM falha ou timeout? Gera Brand DNA parcial com o que conseguiu e marca campos faltantes.
- O que acontece quando o lojista já completou onboarding e acessa /onboarding? Redireciona para home.
- O que acontece quando o lojista quer refazer a análise? Pode acessar Brand DNA pela sidebar/settings e clicar "Reanalisar".
- O que acontece se o lojista tiver Shopify em vez de Nuvemshop? O flow de conexão deve funcionar para ambas plataformas (Shopify OAuth pode ser implementado depois, mas a arquitetura deve suportar).

## Requirements

### Functional Requirements

- **FR-001**: O sistema DEVE suportar conexão com Nuvemshop (OAuth próprio via `/api/nuvemshop/connect`) e Shopify (OAuth via Composio SDK) na tela Connect.
- **FR-002**: Após OAuth bem-sucedido, o sistema DEVE sincronizar os produtos da loja via API Nuvemshop e persistir na tabela `store_products`.
- **FR-003**: O sistema DEVE analisar os produtos sincronizados via LLM para gerar o Brand DNA: nicho, ticket médio, tom de voz, público-alvo, posicionamento, palavras usar/evitar.
- **FR-004**: O sistema DEVE identificar forças da marca (3-5 itens) baseadas na análise do catálogo e posicionamento.
- **FR-005**: O sistema DEVE identificar alertas/riscos (3-5 itens) baseados em gaps detectados (datas sem campanha, canais não utilizados, etc.).
- **FR-006**: O sistema DEVE identificar oportunidades sazonais (3-5 itens) relevantes ao nicho detectado, com estimativa de potencial de receita.
- **FR-007**: O sistema DEVE estimar projeção de receita (atual vs. com Snew) baseada no ticket médio e benchmarks do nicho.
- **FR-008**: Todos os dados do Brand DNA DEVEM ser persistidos na tabela `brand_dna` do Supabase.
- **FR-009**: A tela Analyzing DEVE mostrar progresso real das 3 etapas com números reais (produtos sincronizados, datas mapeadas).
- **FR-010**: A tela Brand DNA DEVE exibir dados reais do banco, não mock data.
- **FR-011**: O lojista DEVE poder ativar/desativar skills recomendadas via toggles na tela Brand DNA.
- **FR-012**: Ao clicar "Começar com essas habilidades", as skills selecionadas DEVEM ser ativadas no banco e `stores.onboarding_completed` DEVE ser marcado como `true`.
- **FR-013**: O Brand DNA DEVE ser incluído no system prompt do orquestrador (Snew) para personalizar todas as respostas.
- **FR-014**: A tela Brand DNA DEVE ter visual 1:1 com o protótipo (`snew-ai-core/src/pages/onboarding/OnboardingBrandDNA.tsx`): 8 seções + Assets drawer.
- **FR-015**: O callback do OAuth DEVE redirecionar para `/onboarding/analyzing` (não para o dashboard antigo).
- **FR-016**: O sistema DEVE recomendar skills baseadas no nicho e plataforma da loja (não as mesmas 3 skills para todo mundo).

### Key Entities

- **Brand DNA**: Perfil completo da marca gerado por análise LLM. Inclui: identidade (nicho, ticket, posicionamento), voz (tom, palavras usar/evitar, público), diagnóstico (forças, alertas), oportunidades (datas sazonais com potencial), projeção de receita. Persistido por team, editável.
- **Analysis Pipeline**: Pipeline de 3 etapas que roda durante o onboarding: (1) sync de produtos, (2) análise LLM do catálogo, (3) mapeamento sazonal. Cada etapa reporta progresso.
- **Skill Recommendation**: Sugestão de skills baseada no Brand DNA. Para moda bebê → Seasonal Calendar + Copywriter + Image Generator. Para eletrônicos → Ad Manager + Pricing Engine + Review Collector.
- **Store**: Loja conectada via OAuth. Contém platform_access_token, plataforma, segmento. Relaciona com brand_dna (1:1) e skills (1:N).

## Success Criteria

### Measurable Outcomes

- **SC-001**: O lojista completa o fluxo completo (Welcome → Connect → Analyzing → Brand DNA → Skills) em menos de 3 minutos.
- **SC-002**: O Brand DNA gerado contém pelo menos: nicho detectado, tom de voz, 3 forças, 3 alertas, 3 oportunidades, e projeção de receita.
- **SC-003**: O nicho detectado pela análise corresponde ao catálogo real da loja em 90%+ dos casos.
- **SC-004**: As skills recomendadas são relevantes ao nicho (não genéricas) — ex: moda infantil não recebe "Ad Waste Detector" como primeira recomendação.
- **SC-005**: Após completar o onboarding, as skills ativadas aparecem no chat do Snew e influenciam as respostas.
- **SC-006**: A tela Brand DNA exibe dados personalizados para a loja (nome correto, nicho real, oportunidades relevantes) — zero dados mock/Milkes.
- **SC-007**: O fluxo funciona end-to-end para lojas Nuvemshop (OAuth próprio) e Shopify (via Composio) com 10+ produtos.

## Assumptions

- O OAuth da Nuvemshop já funciona (`/api/nuvemshop/connect` + `/api/nuvemshop/callback`). Esta feature reutiliza esse fluxo.
- A tabela `brand_dna` já existe no Supabase (criada na branch 039).
- A tabela `skills` já existe com 16 skills seeded (criada na branch 038/039).
- O LLM usado para análise é o mesmo do chat (GPT-5.2 via Vercel AI SDK).
- A análise de Brand DNA usa apenas dados do catálogo (produtos, nomes, descrições, categorias, preços). Não faz scraping do site ou Instagram no MVP — isso é uma extensão futura.
- Shopify se conecta via Composio (OAuth gerenciado pelo Composio SDK). Nuvemshop usa OAuth próprio (`/api/nuvemshop/connect`). Ambas plataformas estão no escopo.
- O mapeamento de datas sazonais é gerado pelo LLM baseado no nicho, não de um banco de dados curado. Banco curado pode vir depois.

## Scope Boundaries

### Incluído nesta feature

- Pipeline de análise real: sync produtos → análise LLM → mapeamento sazonal
- API para gerar Brand DNA (`POST /api/onboarding/analyze`)
- API para completar onboarding (`POST /api/onboarding/complete`)
- Tela Analyzing com progresso real (conectada ao pipeline)
- Tela Brand DNA lendo dados reais do banco
- Skill recommendations baseadas no nicho
- Skill activation real no banco
- Brand DNA no system prompt do orquestrador
- Redirect do OAuth callback para `/onboarding/analyzing`

### Excluído desta feature

- Scraping do site da loja (extensão futura — usa apenas dados do catálogo)
- Análise de Instagram/redes sociais (extensão futura)
- Shopify API avançada além de produtos/pedidos (metafields, themes, etc.)
- Assets drawer com dados reais (visual do protótipo com mock data)
- Edição do Brand DNA pelo lojista (view-only nesta feature)
- Seasonal Calendar como skill funcional (é detectado no brand DNA mas a skill não roda ainda)
- Copywriter como skill funcional (skills são ativadas mas não geram output ainda)
- Revenue projection com modelo estatístico (usa estimativa LLM baseada em benchmarks)
