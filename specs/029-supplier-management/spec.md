# Feature Specification: Gestao de Fornecedores

**Feature Branch**: `029-supplier-management`
**Created**: 2026-03-02
**Status**: Draft
**Input**: Sistema completo de gestao de fornecedores para e-commerce com pagina dedicada, vinculo produto-fornecedor, calendario de reposicao, alertas de urgencia, comparacao de fornecedores, e tools de chat como complemento a UI.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Cadastro e Gestao de Fornecedores (Priority: P1)

O lojista precisa cadastrar seus fornecedores com informacoes de contato, prazo de entrega, pedido minimo e condicoes de pagamento. Ele acessa a pagina /suppliers e ve a lista de todos os fornecedores, podendo adicionar novos, editar existentes e desativar fornecedores que nao usa mais.

**Why this priority**: Sem fornecedores cadastrados, nenhuma outra funcionalidade (vinculo, reposicao, comparacao) funciona. E a base de tudo.

**Independent Test**: Pode ser testado criando um fornecedor pela UI, verificando que aparece na lista, editando seus dados, e desativando-o.

**Acceptance Scenarios**:

1. **Given** o usuario esta na pagina /suppliers, **When** clica em "Novo Fornecedor" e preenche nome, contato, lead time e pedido minimo, **Then** o fornecedor aparece na lista com todos os dados preenchidos.
2. **Given** existe um fornecedor cadastrado, **When** o usuario clica para editar e altera o lead time, **Then** o novo lead time e salvo e exibido corretamente.
3. **Given** existe um fornecedor ativo, **When** o usuario desativa o fornecedor, **Then** ele e marcado como inativo e nao aparece nas sugestoes de reposicao.
4. **Given** o usuario esta no chat, **When** pede "cadastra o fornecedor Distribuidora ABC, lead time 5 dias, pedido minimo R$ 500", **Then** o agente cria o fornecedor via STORE_MANAGE_SUPPLIERS e confirma a criacao.

---

### User Story 2 - Vinculo Produto-Fornecedor (Priority: P1)

O lojista precisa informar quais fornecedores fornecem quais produtos, com o preco de custo especifico de cada fornecedor. Um produto pode ter multiplos fornecedores e um fornecedor pode fornecer multiplos produtos. O lojista pode marcar um fornecedor como "preferencial" para cada produto.

**Why this priority**: O vinculo e essencial para calcular reposicao e comparar fornecedores. Sem ele, o sistema nao sabe de quem comprar.

**Independent Test**: Pode ser testado vinculando um produto a dois fornecedores com precos diferentes e verificando que ambos aparecem na visualizacao do produto.

**Acceptance Scenarios**:

1. **Given** existem fornecedores e produtos cadastrados, **When** o usuario vincula o produto "Racao Premium" ao fornecedor "Distribuidora ABC" com custo R$ 45, **Then** o vinculo aparece na pagina do fornecedor e na secao de fornecedores do produto.
2. **Given** um produto tem dois fornecedores vinculados, **When** o usuario marca um como preferencial, **Then** o preferencial e destacado visualmente e usado como padrao nas sugestoes de reposicao.
3. **Given** o usuario esta no chat, **When** pede "o fornecedor ABC fornece a Racao Premium por R$ 45", **Then** o agente cria o vinculo via STORE_LINK_PRODUCT_SUPPLIER.
4. **Given** um produto tem vinculo com fornecedor, **When** o cost_price do vinculo e diferente do cost_price em store_products, **Then** o sistema exibe ambos os valores para transparencia (custo do fornecedor vs custo registrado no produto).

---

### User Story 3 - Calendario de Reposicao (Priority: P1)

O lojista abre a pagina /suppliers e ve uma visao de timeline/calendario mostrando quais produtos precisam ser repostos e quando, baseado no cruzamento de: estoque atual, velocidade de vendas (forecast de demanda), e lead time do fornecedor. A timeline mostra itens ordenados por urgencia.

**Why this priority**: E o killer feature que transforma dados existentes (forecast + estoque) em acao concreta de compra. Sem isso, o lojista precisa calcular manualmente.

**Independent Test**: Pode ser testado verificando que produtos com baixo estoque e alto lead time aparecem no topo como urgentes, com data de pedido sugerida.

**Acceptance Scenarios**:

1. **Given** um produto tem estoque para 8 dias e o fornecedor tem lead time de 5 dias, **When** o usuario abre a timeline de reposicao, **Then** o produto aparece como "urgente" com sugestao de pedido imediato.
2. **Given** um produto tem estoque para 30 dias e lead time de 3 dias, **When** o usuario abre a timeline, **Then** o produto aparece como "saudavel" sem urgencia.
3. **Given** um produto sem fornecedor vinculado tem estoque baixo, **When** o usuario abre a timeline, **Then** o produto aparece com alerta de "sem fornecedor" para que o usuario vincule um.
4. **Given** o usuario esta no chat, **When** pede "o que preciso comprar essa semana?", **Then** o agente usa STORE_SUGGEST_REORDER e retorna lista priorizada com fornecedor, quantidade e urgencia.

---

### User Story 4 - Alertas Visuais de Urgencia (Priority: P2)

O lojista precisa ver rapidamente quais produtos estao em situacao critica — estoque que vai acabar antes do lead time do fornecedor. Alertas visuais na pagina /suppliers indicam quantos itens precisam de atencao.

**Why this priority**: Alertas visuais garantem que o lojista nao perca reposicoes criticas mesmo sem abrir a timeline ativamente.

**Independent Test**: Pode ser testado criando um cenario onde estoque < lead_time x media_diaria e verificando que o alerta aparece.

**Acceptance Scenarios**:

1. **Given** existem 3 produtos com estoque critico (dias_estoque < lead_time), **When** o usuario acessa /suppliers, **Then** um badge/contador mostra "3 urgentes" em destaque.
2. **Given** um produto passa de "saudavel" para "critico", **When** o usuario esta na pagina, **Then** a cor/badge do item muda automaticamente refletindo a nova urgencia.
3. **Given** nenhum produto esta em situacao critica, **When** o usuario acessa /suppliers, **Then** a pagina mostra estado positivo sem alertas de urgencia.

---

### User Story 5 - Comparacao de Fornecedores (Priority: P2)

O lojista quer comparar fornecedores que fornecem o mesmo produto para tomar decisoes de compra informadas. A comparacao mostra preco, lead time, pedido minimo e ultima compra lado a lado.

**Why this priority**: Ajuda na decisao de compra mas depende de ter fornecedores e vinculos cadastrados primeiro.

**Independent Test**: Pode ser testado vinculando um produto a 2+ fornecedores e verificando que a tabela comparativa exibe todos os dados corretamente.

**Acceptance Scenarios**:

1. **Given** o produto "Racao Premium" tem 3 fornecedores vinculados, **When** o usuario abre a comparacao, **Then** ve uma tabela com nome, preco, lead time, pedido minimo e ultima compra de cada fornecedor.
2. **Given** o usuario esta no chat, **When** pede "compara os fornecedores da Racao Premium", **Then** o agente usa STORE_COMPARE_SUPPLIERS e retorna tabela comparativa.
3. **Given** um produto tem apenas 1 fornecedor, **When** o usuario tenta comparar, **Then** o sistema informa que so existe um fornecedor e sugere cadastrar mais.

---

### User Story 6 - Registro de Historico de Compras (Priority: P3)

O lojista quer registrar quando fez pedidos ao fornecedor (data, quantidade, valor) para ter historico e melhorar as previsoes futuras. O registro pode ser feito pela UI ou via chat.

**Why this priority**: Historico melhora a qualidade das sugestoes ao longo do tempo, mas o sistema funciona sem ele (usando estimativas).

**Independent Test**: Pode ser testado registrando uma compra e verificando que aparece no historico do fornecedor/produto.

**Acceptance Scenarios**:

1. **Given** existe um vinculo produto-fornecedor, **When** o usuario registra uma compra (data, quantidade, valor total), **Then** o registro aparece no historico e atualiza last_order_at e last_order_qty.
2. **Given** existem 5 compras registradas para um produto, **When** o usuario visualiza o historico, **Then** ve a lista cronologica com data, quantidade, valor unitario e valor total.

---

### Edge Cases

- O que acontece quando um produto nao tem nenhum fornecedor vinculado? O sistema mostra o produto na timeline com alerta "sem fornecedor" e sugere que o usuario vincule um.
- O que acontece quando um fornecedor e desativado mas tem produtos vinculados? Os vinculos permanecem para historico mas nao aparecem em sugestoes de reposicao. O sistema sugere vincular outro fornecedor.
- O que acontece quando o estoque de um produto e zero e nao ha forecast de vendas? O produto nao aparece na timeline de reposicao (sem dados para calcular necessidade).
- O que acontece quando o usuario tenta vincular o mesmo produto ao mesmo fornecedor duas vezes? O sistema atualiza o vinculo existente em vez de criar duplicata.
- O que acontece quando o lead time do fornecedor muda? As sugestoes de reposicao sao recalculadas automaticamente com o novo lead time.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Sistema DEVE permitir cadastrar fornecedores com: nome (obrigatorio), email de contato, telefone, lead time em dias (obrigatorio), pedido minimo em valor, condicoes de pagamento (texto livre), e notas.
- **FR-002**: Sistema DEVE exibir lista de fornecedores em pagina dedicada (/suppliers) com busca, filtro por status (ativo/inativo), e ordenacao por nome ou lead time.
- **FR-003**: Sistema DEVE permitir editar todos os campos de um fornecedor existente.
- **FR-004**: Sistema DEVE permitir desativar (soft delete) um fornecedor, mantendo historico.
- **FR-005**: Sistema DEVE permitir vincular produtos a fornecedores em relacao N:N, com preco de custo especifico por vinculo.
- **FR-006**: Sistema DEVE permitir marcar um fornecedor como "preferencial" para cada produto (apenas um por produto).
- **FR-007**: Sistema DEVE exibir timeline/calendario de reposicao ordenado por urgencia, cruzando: estoque atual, velocidade de vendas (do forecast de demanda existente), e lead time do fornecedor.
- **FR-008**: Sistema DEVE calcular ponto de reposicao como: media_diaria x lead_time x fator_seguranca (1.2 por padrao).
- **FR-009**: Sistema DEVE sugerir quantidade de compra baseada em consumo medio (padrao: 30 dias de estoque).
- **FR-010**: Sistema DEVE exibir alertas visuais (badges, cores) para produtos em situacao critica (estoque acaba antes do lead time).
- **FR-011**: Sistema DEVE permitir comparacao lado a lado de fornecedores para um mesmo produto (preco, lead time, pedido minimo, ultima compra).
- **FR-012**: Sistema DEVE permitir registrar compras feitas (data, quantidade, valor) no historico do vinculo produto-fornecedor.
- **FR-013**: Sistema DEVE oferecer tools de chat (STORE_MANAGE_SUPPLIERS, STORE_LINK_PRODUCT_SUPPLIER, STORE_SUGGEST_REORDER, STORE_COMPARE_SUPPLIERS) como forma alternativa de interacao.
- **FR-014**: Sistema DEVE respeitar isolamento por time (RLS) — cada time so ve seus proprios fornecedores.
- **FR-015**: Sistema DEVE seguir o padrao visual existente do Relay (shadcn/ui, dark mode, Tailwind v4).

### Key Entities

- **Fornecedor (Supplier)**: Representa uma empresa que fornece produtos ao lojista. Atributos: nome, contato (email, telefone), lead time, pedido minimo, condicoes de pagamento, status (ativo/inativo).
- **Vinculo Produto-Fornecedor**: Relacao N:N entre produtos e fornecedores. Atributos: preco de custo do fornecedor, flag preferencial, historico de ultima compra.
- **Registro de Compra (Purchase Record)**: Historico de compras feitas a um fornecedor para um produto. Atributos: data, quantidade, valor.
- **Sugestao de Reposicao**: Entidade calculada (nao persistida) que cruza estoque, vendas e lead time para recomendar quando e quanto comprar.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Lojistas conseguem cadastrar um fornecedor completo em menos de 1 minuto pela UI.
- **SC-002**: A timeline de reposicao exibe sugestoes de compra em menos de 3 segundos apos abrir a pagina.
- **SC-003**: Produtos com estoque critico (dias_estoque < lead_time) sao corretamente identificados em 100% dos casos.
- **SC-004**: O lojista consegue comparar fornecedores para um produto em 2 cliques (selecionar produto -> ver comparacao).
- **SC-005**: Todas as operacoes de fornecedor (CRUD, vinculo, compra) estao disponiveis tanto via UI quanto via chat com o agente.
- **SC-006**: O sistema sugere corretamente a quantidade e data de reposicao com base nos dados de forecast existentes.

## Assumptions

- O forecast de demanda (STORE_FORECAST_DEMAND) ja existe e retorna media_diaria confiavel.
- O store_products.stock_quantity esta atualizado via sync com Nuvemshop.
- O fator de seguranca padrao de 1.2 (20% acima do minimo) e adequado para a maioria dos lojistas.
- A sugestao padrao de 30 dias de estoque como quantidade de compra atende a maioria dos casos.
- O lead time informado pelo lojista e confiavel (o sistema nao valida contra dados reais).
- O historico de compras e opcional — o sistema funciona sem ele, usando estimativas.
