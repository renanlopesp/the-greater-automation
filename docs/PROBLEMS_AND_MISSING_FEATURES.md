# Snew — Problemas e Features Faltantes

**Data:** 2026-04-07
**Branch:** 055-chat-dynamic-artifacts

---

## PARTE 1: PROBLEMAS (coisas quebradas ou que não funcionam)

### Chat

| #   | Problema                                                                  | Impacto                                 |
| --- | ------------------------------------------------------------------------- | --------------------------------------- |
| P1  | Botão "Regenerar" não faz nada (sem onClick)                              | Usuário vê botão que não funciona       |
| P2  | Botões "Compartilhar" e "Download" não fazem nada                         | Decorativos sem funcionalidade          |
| P3  | Botões "Útil" / "Não útil" (feedback) não fazem nada                      | Feedback do usuário é ignorado          |
| P4  | Botão "Copiar" não dá feedback visual (sem toast/checkmark)               | Usuário não sabe se copiou              |
| P5  | Erro no chat mostra banner vermelho estático sem botão "Tentar novamente" | Usuário fica preso                      |
| P6  | Chat não valida tamanho da mensagem — pode enviar 1MB+                    | Risco de custo e crash                  |
| P7  | Histórico de conversa limitado a 50 mensagens sem aviso                   | Contexto antigo perdido silenciosamente |
| P8  | Mensagem do usuário salva com fire-and-forget (pode perder)               | Mensagem some se DB falhar              |
| P9  | Menu dropdown de modelo sem keyboard nav / click-outside-to-close         | UX quebrada em teclado                  |
| P10 | Layout do chat quebra em mobile (<700px)                                  | Artifact panel não responsivo           |

### Dashboard

| #   | Problema                                                                      | Impacto                        |
| --- | ----------------------------------------------------------------------------- | ------------------------------ |
| P11 | Cards de atividade são hardcoded ("Campanha de Páscoa publicada em 3 canais") | Dashboard mente para o usuário |
| P12 | "847 credits remaining" no sidebar é hardcoded                                | Usuário vê créditos falsos     |

### Settings

| #   | Problema                                              | Impacto                      |
| --- | ----------------------------------------------------- | ---------------------------- |
| P13 | Botão de Settings no sidebar não tem onClick          | Inacessível em rotas de chat |
| P14 | Conexões de apps não mostram saúde/expiração do token | Conexão expira sem aviso     |

### Backend

| #   | Problema                                                                       | Impacto                                                           |
| --- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| P15 | Chat não verifica limite de créditos ANTES de chamar a IA                      | Custo ilimitado                                                   |
| P16 | Sem rate limiting no /api/chat                                                 | Um usuário pode drenar todos os créditos                          |
| P17 | Custo de créditos é flat (1 crédito = 1000 tokens) independente do modelo      | Claude Opus custa 15x mais que GPT-4o mas consome mesmos créditos |
| P18 | Se GPT-5.2 cair, não tem fallback para Claude (e vice-versa)                   | Chat para de funcionar                                            |
| P19 | Step count limit hardcoded em 10                                               | Tasks complexas param sem explicação                              |
| P20 | Tabelas `conversations` / `conversation_messages` sem migration                | Schema sem controle de versão, sem RLS                            |
| P21 | 29 type casts (`as never`, `as any`) no chat route                             | Bugs silenciosos em runtime                                       |
| P22 | OAuth callback usa cookie para state (falha se browser bloquear cookies)       | Conexão pode falhar                                               |
| P23 | Skill registry hardcoded com 3 skills (general, seasonal-calendar, copywriter) | DB tem mais skills que não funcionam no runtime                   |
| P24 | Skill executor é "Fase 0" — só carrega contexto, não executa                   | Skills além de seasonal-calendar são placeholders                 |
| P25 | Sync de produtos Nuvemshop pode ter até 15min de atraso                        | Dados de estoque/preço stale                                      |
| P26 | Sync busca no máximo 200 produtos                                              | Lojas grandes ficam com dados incompletos                         |
| P27 | Token da Nuvemshop armazenado em plaintext no DB                               | Exposição de credenciais em backups                               |
| P28 | innerHTML XSS no seasonal-calendar-artifact (main document, não iframe)        | Risco de segurança real                                           |
| P29 | Cron secrets comparados com `!==` (timing attack vulnerable)                   | Risco de segurança                                                |
| P30 | `framer-motion` e `motion` duplicados no package.json                          | +50-80KB bundle desnecessário                                     |

### Infra

| #   | Problema                                                                | Impacto                              |
| --- | ----------------------------------------------------------------------- | ------------------------------------ |
| P31 | Zero error.tsx em todas as rotas                                        | Erro de runtime crasha o app inteiro |
| P32 | Sem Sentry/monitoramento de erros                                       | Erros em produção são invisíveis     |
| P33 | Sem CI/CD (GitHub Actions)                                              | Código quebrado chega em produção    |
| P34 | CLAUDE.md tem IDs de projeto Supabase errados                           | Agente pode migrar no projeto errado |
| P35 | "Active Technologies" no CLAUDE.md tem 18 blocos de branches históricas | Confuso e desatualizado              |

---

## PARTE 2: FEATURES FALTANTES (o produto deveria ter)

### Chat — UX essencial

| #   | Feature                                     | Referência                                                                  |
| --- | ------------------------------------------- | --------------------------------------------------------------------------- |
| M1  | Edição de mensagem enviada                  | ChatGPT, Claude, Perplexity permitem editar e re-rodar                      |
| M2  | Regenerar resposta da IA                    | ChatGPT: botão "Regenerate" funcional                                       |
| M3  | Retry automático em falha                   | ChatGPT: "Try again" inline na mensagem com erro                            |
| M4  | Timestamps nas mensagens                    | Toda plataforma de chat mostra horário                                      |
| M5  | Indicador de progresso durante tool calls   | ChatGPT: "Searching...", "Running code...". Snew só mostra dots             |
| M6  | Lista de conversas recentes no sidebar      | ChatGPT: sidebar com histórico. Snew precisa ir a /history                  |
| M7  | Busca em conversas                          | Buscar por conteúdo de mensagens antigas                                    |
| M8  | Auto-resize do textarea                     | Textarea cresce conforme o texto (padrão em todo chat moderno)              |
| M9  | Drag & drop de arquivos                     | Arrastar imagem direto no chat                                              |
| M10 | Preview de link/URL                         | Ao colar um link, mostrar preview (OG tags)                                 |
| M11 | Markdown rendering nas mensagens do USUÁRIO | Usuário escreve markdown mas aparece como texto puro                        |
| M12 | Streaming de tool results visíveis          | Mostrar quais tools a IA está chamando em tempo real (accordion expandível) |

### Chat — Features avançadas

| #   | Feature                             | Referência                                    |
| --- | ----------------------------------- | --------------------------------------------- |
| M13 | Branching de conversa               | Claude: fork a partir de qualquer mensagem    |
| M14 | Compartilhar conversa por link      | ChatGPT: "Share" gera link público            |
| M15 | Download de conversa (PDF/Markdown) | Exportar histórico                            |
| M16 | Mencionar artifacts em mensagens    | "@artifact" para referenciar o artifact atual |
| M17 | Voice input (speech-to-text)        | Whisper API / Web Speech API                  |
| M18 | Keyboard shortcuts                  | Cmd+K para busca, Cmd+Enter para enviar, etc. |

### Artifacts

| #   | Feature                                                      | Referência                                               |
| --- | ------------------------------------------------------------ | -------------------------------------------------------- |
| M19 | Mais tipos de artifact (charts, código, tabelas interativas) | Perplexity: gera páginas completas. Snew só tem 2 tipos  |
| M20 | Export de artifact (PDF, PNG, HTML)                          | Botão "Download" no artifact panel                       |
| M21 | Toggle para fechar/abrir artifact panel                      | Usuário não pode esconder quando não precisa             |
| M22 | Artifact panel responsivo em mobile                          | Em telas pequenas, mostrar como bottom sheet ou tab      |
| M23 | Artifact loading indicator                                   | Durante streaming, mostrar skeleton/progress no artifact |
| M24 | Versionamento visual de artifacts                            | Slider de versões (já tem backend, falta UX melhor)      |

### Dashboard

| #   | Feature                                                   | Referência                                                                         |
| --- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| M25 | Métricas reais no dashboard (receita, pedidos, conversão) | Shopify dashboard mostra dados reais                                               |
| M26 | Atividade real (últimas ações do Snew)                    | Histórico real de tool calls, posts, emails enviados                               |
| M27 | Onboarding guiado para novos usuários                     | Checklist: "Conecte sua loja", "Configure Brand DNA", "Faça sua primeira pergunta" |
| M28 | Quick actions no dashboard                                | "Postar no Instagram", "Ver estoque", "Criar campanha" — cards acionáveis          |
| M29 | Dashboard customizável                                    | Drag & drop de widgets, escolher quais métricas ver                                |

### Integrations / Apps

| #   | Feature                                                 | Referência                                             |
| --- | ------------------------------------------------------- | ------------------------------------------------------ |
| M30 | Status de saúde da conexão (ativa, expirando, expirada) | Mostrar badge de saúde em cada app conectado           |
| M31 | Re-autenticar conexão expirada inline                   | Botão "Reconectar" quando token expira                 |
| M32 | Webhook para status de conexão Composio                 | Atualizar DB quando conexão é revogada externamente    |
| M33 | Logs de ações executadas por app                        | "Instagram: 3 posts esta semana, 1 falhou"             |
| M34 | Marketplace de integrações com categorias               | Filtrar por: Social, Email, Ads, E-commerce, Analytics |

### Skills / Automação

| #   | Feature                                     | Referência                                      |
| --- | ------------------------------------------- | ----------------------------------------------- |
| M35 | Skill registry dinâmico (carregar do DB)    | Não depender de 3 skills hardcoded              |
| M36 | Execução real de skills (Fase 1+)           | Skills além de seasonal-calendar devem executar |
| M37 | Timeout e cancelamento de skill execution   | Skill travada não fica "running" para sempre    |
| M38 | Criação de skills customizadas pelo usuário | "Crie uma skill que monitore meu concorrente"   |
| M39 | Agendamento de skills (cron)                | "Rode o relatório de vendas todo dia às 8h"     |

### AI / Modelo

| #   | Feature                                        | Referência                                                       |
| --- | ---------------------------------------------- | ---------------------------------------------------------------- |
| M40 | Fallback automático entre modelos              | GPT falha → tenta Claude automaticamente                         |
| M41 | Custo diferenciado por modelo nos créditos     | Claude Opus deve custar mais créditos que GPT-4o                 |
| M42 | Configuração de step limit por conversa        | Permitir mais de 10 tool calls para tasks complexas              |
| M43 | Seletor de modelo com info de custo/velocidade | "GPT-5.2 (rápido, barato)" vs "Claude Opus (premium, mais caro)" |
| M44 | System prompt customizável pelo usuário        | "Me responda sempre em inglês", "Foque em dados de e-commerce"   |

### E-commerce / Retail

| #   | Feature                                                | Referência                                                                |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| M45 | Sync de produtos em tempo real (webhook)               | Não depender de cron de 15min                                             |
| M46 | Sync de mais de 200 produtos                           | Paginação para catálogos grandes                                          |
| M47 | Alertas de estoque proativos                           | "Produto X está com estoque 0 e está publicado" — notificar sem perguntar |
| M48 | Comparação de vendas entre períodos                    | "Esta semana vs semana passada" com gráfico                               |
| M49 | Relatório semanal/mensal automático                    | Email/Telegram com resumo de performance                                  |
| M50 | Integração com mais plataformas (Shopify, WooCommerce) | Além de Nuvemshop                                                         |

### Conta / Billing

| #   | Feature                             | Referência                                      |
| --- | ----------------------------------- | ----------------------------------------------- |
| M51 | Troca de senha                      | Settings → Conta não tem opção                  |
| M52 | 2FA / Autenticação em dois fatores  | Segurança básica de conta                       |
| M53 | Exportação/exclusão de dados (LGPD) | Compliance obrigatória                          |
| M54 | Histórico de uso de créditos        | "Hoje: 45 créditos em 3 conversas"              |
| M55 | Planos com limites por modelo       | "Free: GPT-4o only. Pro: GPT-5.2 + Claude Opus" |

### Notificações

| #   | Feature                          | Referência                                           |
| --- | -------------------------------- | ---------------------------------------------------- |
| M56 | Notificações push (browser)      | "Sua campanha foi publicada", "Estoque crítico"      |
| M57 | Notificações por email           | Resumo semanal, alertas de estoque                   |
| M58 | Centro de notificações funcional | A tela de notificações existe mas parece placeholder |

### Mobile / PWA

| #   | Feature                     | Referência                                       |
| --- | --------------------------- | ------------------------------------------------ |
| M59 | Layout responsivo completo  | Chat, dashboard, artifacts adaptados para mobile |
| M60 | PWA (Progressive Web App)   | Instalar como app no celular                     |
| M61 | Bottom navigation em mobile | Sidebar se transforma em bottom nav              |

---

## Resumo

| Categoria     | Problemas | Features Faltantes |
| ------------- | --------- | ------------------ |
| Chat          | 10        | 18                 |
| Dashboard     | 2         | 5                  |
| Settings/Apps | 2         | 5                  |
| Skills        | 2         | 5                  |
| Backend/AI    | 16        | 5                  |
| E-commerce    | -         | 6                  |
| Billing/Conta | -         | 5                  |
| Notificações  | -         | 3                  |
| Infra         | 5         | -                  |
| Mobile        | -         | 3                  |
| Artifacts     | -         | 6                  |
| **Total**     | **35**    | **61**             |
