'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useCoworkerAvatars } from '@/hooks/use-coworker-avatars'
import CoworkerAvatar from '@/components/coworker-avatar'
import { FEATURE_FLAGS } from '@/lib/feature-flags'

interface WizardData {
  category: string
  hook: string
  stats: { value: string; label: string }[]
  capabilities: { icon: string; label: string }[]
  ctaNote: string
}

const wizardData: Record<string, WizardData> = {
  'customer-service': {
    category: 'Customer Service',
    hook: '{156 tickets por dia} e ninguém para responder em menos de 5 minutos.',
    stats: [
      { value: '< 2min', label: 'tempo de resposta' },
      { value: '94%', label: 'satisfação do cliente' },
      { value: 'R$0', label: 'custo por ticket' },
    ],
    capabilities: [
      { icon: '💬', label: 'Responde por WhatsApp e E-mail' },
      { icon: '🧠', label: 'Aprende com histórico da loja' },
      { icon: '📊', label: 'Relatório de satisfação' },
    ],
    ctaNote: 'Primeiro ticket respondido em menos de 5 minutos',
  },
  'upsell-retention': {
    category: 'Customer Service',
    hook: 'O cliente que {acabou de comprar} tem 60% mais chance de comprar novamente — e você está deixando passar.',
    stats: [
      { value: '23–35%', label: 'carrinhos recuperados' },
      { value: '15min', label: 'janela ideal de envio' },
      { value: 'R$0', label: 'custo de aquisição' },
    ],
    capabilities: [
      { icon: '🛒', label: 'Detecta abandono em tempo real' },
      { icon: '🎯', label: 'Canal certo para cada cliente' },
      { icon: '💰', label: 'Receita recuperada rastreada' },
    ],
    ctaNote: 'Primeiro carrinho recuperado possível ainda hoje',
  },
  'abandoned-cart': {
    category: 'Customer Service',
    hook: '70% dos carrinhos são abandonados — a maioria sem nenhuma ação da sua loja.',
    stats: [
      { value: '23–35%', label: 'carrinhos recuperados' },
      { value: '15min', label: 'janela ideal de envio' },
      { value: 'R$0', label: 'custo de aquisição' },
    ],
    capabilities: [
      { icon: '🛒', label: 'Detecta abandono em tempo real' },
      { icon: '🎯', label: 'Canal certo para cada cliente' },
      { icon: '💰', label: 'Receita recuperada rastreada' },
    ],
    ctaNote: 'Primeiro carrinho recuperado possível ainda hoje',
  },
  'churn-prediction': {
    category: 'Customer Service',
    hook: '{1 em cada 4 clientes} vai embora antes de você perceber que estava em risco.',
    stats: [
      { value: '38%', label: 'churn evitado' },
      { value: '24h', label: 'antecedência do alerta' },
      { value: 'R$0', label: 'custo por cliente salvo' },
    ],
    capabilities: [
      { icon: '🔮', label: 'Prevê churn com 7 dias de antecedência' },
      { icon: '💌', label: 'Reengaja com mensagem personalizada' },
      { icon: '📊', label: 'Score de risco por cliente' },
    ],
    ctaNote: 'Primeiros clientes em risco identificados em menos de 24h',
  },
  'review-reputation': {
    category: 'Customer Service',
    hook: '{Reviews negativos} custam até 22% das vendas — e 95% ficam sem resposta.',
    stats: [
      { value: '+52%', label: 'volume de reviews' },
      { value: '< 5min', label: 'resposta a negativos' },
      { value: '4.7★', label: 'nota média atingida' },
    ],
    capabilities: [
      { icon: '⭐', label: 'Solicita reviews no momento certo' },
      { icon: '🔔', label: 'Alerta sobre negativos em tempo real' },
      { icon: '💬', label: 'Responde automaticamente com contexto' },
    ],
    ctaNote: 'Primeiro monitoramento de reputação ativo em menos de 1h',
  },
  'vip-relationship': {
    category: 'Customer Service',
    hook: 'Seus {20% de clientes VIP} geram 60% da receita — e merecem mais do que e-mails genéricos.',
    stats: [
      { value: '+35%', label: 'retenção VIP' },
      { value: '3x', label: 'frequência de compra' },
      { value: '100%', label: 'toque personalizado' },
    ],
    capabilities: [
      { icon: '👑', label: 'Identifica e segmenta VIPs' },
      { icon: '🎁', label: 'Ofertas e acesso antecipado exclusivos' },
      { icon: '🤝', label: 'Relacionamento contínuo e personalizado' },
    ],
    ctaNote: 'Primeiros clientes VIP segmentados em menos de 2h',
  },
  'sentiment-intelligence': {
    category: 'Customer Service',
    hook: 'O que os clientes dizem nos bastidores {molda sua receita} — você está ouvindo?',
    stats: [
      { value: '100%', label: 'cobertura de canais' },
      { value: '< 1h', label: 'detecção de crise' },
      { value: '−28%', label: 'reclamações em 60d' },
    ],
    capabilities: [
      { icon: '🧠', label: 'Analisa tom de tickets e reviews' },
      { icon: '📡', label: 'Monitora redes sociais e canais' },
      { icon: '🚨', label: 'Alerta sobre picos negativos' },
    ],
    ctaNote: 'Primeiros sinais de sentimento coletados em menos de 1h',
  },
  'conversion-optimizer': {
    category: 'Marketing',
    hook: '{98 de cada 100 visitantes} saem sem comprar — e você não sabe o que está travando.',
    stats: [
      { value: '+22%', label: 'conversão em 30 dias' },
      { value: '< 2h', label: 'primeiro diagnóstico' },
      { value: 'R$0', label: 'custo por insight' },
    ],
    capabilities: [
      { icon: '🔬', label: 'Diagnóstico de páginas de produto' },
      { icon: '🛒', label: 'Análise de checkout e fricção' },
      { icon: '📈', label: 'Testes A/B automatizados' },
    ],
    ctaNote: 'Primeiro diagnóstico disponível em menos de 2h',
  },
  'retention-booster': {
    category: 'Marketing',
    hook: 'A venda mais fácil é para quem {acabou de comprar} — e você está perdendo essa janela.',
    stats: [
      { value: '+28%', label: 'ticket médio' },
      { value: '35%', label: 'receptividade pós-entrega' },
      { value: '2–5d', label: 'janela ideal de oferta' },
    ],
    capabilities: [
      { icon: '⬆️', label: 'Oferta certa no timing exato' },
      { icon: '🛍️', label: 'Baseado no histórico real' },
      { icon: '📈', label: 'Ticket médio rastreado' },
    ],
    ctaNote: 'Primeiro upsell ativado nas próximas compras da loja',
  },
  'ad-waste-detector': {
    category: 'Marketing',
    hook: '{30–40% do seu budget de ads} está sendo desperdiçado — e você não sabe onde.',
    stats: [
      { value: '−35%', label: 'desperdício de budget' },
      { value: '+2.4x', label: 'ROAS médio' },
      { value: '48h', label: 'primeiro diagnóstico' },
    ],
    capabilities: [
      { icon: '🔍', label: 'Detecta campanhas com custo sem retorno' },
      { icon: '💸', label: 'Recomenda realocação de budget' },
      { icon: '📉', label: 'Alerta sobre fadiga criativa' },
    ],
    ctaNote: 'Primeiro diagnóstico de desperdício em menos de 48h',
  },
  'content-engine': {
    category: 'Marketing',
    hook: 'Sua concorrência publica todo dia — você está {perdendo visibilidade} por falta de conteúdo.',
    stats: [
      { value: '30 posts', label: 'gerados por semana' },
      { value: '+65%', label: 'engajamento orgânico' },
      { value: 'zero', label: 'bloqueio criativo' },
    ],
    capabilities: [
      { icon: '📅', label: 'Calendário editorial automático' },
      { icon: '✍️', label: 'Copies prontos para cada canal' },
      { icon: '📈', label: 'Baseado em tendências do nicho' },
    ],
    ctaNote: 'Primeiro calendário editorial disponível em menos de 2h',
  },
  'email-performance': {
    category: 'Marketing',
    hook: 'Suas campanhas de e-mail têm {2% de conversão} — a média de líderes do setor é 8%.',
    stats: [
      { value: '+4x', label: 'taxa de conversão' },
      { value: '−45%', label: 'descadastros' },
      { value: 'A/B', label: 'testes automáticos' },
    ],
    capabilities: [
      { icon: '📧', label: 'Testa assunto, horário e segmento' },
      { icon: '🎯', label: 'Segmentação por comportamento' },
      { icon: '📊', label: 'ROI por campanha rastreado' },
    ],
    ctaNote: 'Primeiro diagnóstico de e-mail disponível em menos de 2h',
  },
  'competitor-watch': {
    category: 'Competitors',
    hook: 'Seu concorrente {mudou o preço agora} — você só vai saber quando perder a venda.',
    stats: [
      { value: '< 1h', label: 'tempo de resposta' },
      { value: '100%', label: 'cobertura de concorrentes' },
      { value: 'semanal', label: 'relatório competitivo' },
    ],
    capabilities: [
      { icon: '🕵️', label: 'Monitora preços e promoções' },
      { icon: '⚡', label: 'Alerta imediato de mudanças críticas' },
      { icon: '📊', label: 'Relatório de brechas de mercado' },
    ],
    ctaNote: 'Primeiros concorrentes mapeados em menos de 1h',
  },
  'pricing-intelligence': {
    category: 'Competitors',
    hook: 'Você está {perdendo para o preço do concorrente} — sem saber quando nem em quais produtos.',
    stats: [
      { value: '+12%', label: 'margem otimizada' },
      { value: 'SKU a SKU', label: 'monitoramento de preço' },
      { value: 'auto', label: 'ajuste dentro da margem' },
    ],
    capabilities: [
      { icon: '💲', label: 'Preço dinâmico por SKU' },
      { icon: '📉', label: 'Rastreia promoções e sazonalidade' },
      { icon: '🛡️', label: 'Margem mínima protegida' },
    ],
    ctaNote: 'Primeira análise de preços em menos de 1h após ativar',
  },
  'market-gap-finder': {
    category: 'Competitors',
    hook: 'Existe uma {oportunidade de produto no seu nicho} que nenhum concorrente está aproveitando.',
    stats: [
      { value: '3–5', label: 'oportunidades por análise' },
      { value: '12 meses', label: 'dados de demanda analisados' },
      { value: 'mensal', label: 'atualização de gaps' },
    ],
    capabilities: [
      { icon: '🔭', label: 'Varre catálogos dos concorrentes' },
      { icon: '📈', label: 'Cruza com dados de demanda' },
      { icon: '💡', label: 'Sugere novos produtos e categorias' },
    ],
    ctaNote: 'Primeiro relatório de gaps disponível em menos de 24h',
  },
  'share-of-voice': {
    category: 'Competitors',
    hook: 'Você aparece em {1 de cada 10 buscas} do seu nicho — seus concorrentes aparecem em 7.',
    stats: [
      { value: '+3x', label: 'visibilidade orgânica' },
      { value: 'diário', label: 'ranking monitorado' },
      { value: 'vs 5', label: 'concorrentes rastreados' },
    ],
    capabilities: [
      { icon: '📡', label: 'Rastreia menções e visibilidade' },
      { icon: '🔎', label: 'Benchmark vs concorrentes' },
      { icon: '🎯', label: 'Ações para crescer share' },
    ],
    ctaNote: 'Primeiro benchmark de visibilidade disponível em menos de 24h',
  },
  'revenue-intelligence': {
    category: 'Analytics',
    hook: 'Você olha vendas totais — mas o lucro está {escondido em 3 segmentos} que ninguém analisa.',
    stats: [
      { value: '+18%', label: 'receita incremental' },
      { value: '3 segmentos', label: 'oportunidades ocultas' },
      { value: '< 24h', label: 'primeiro insight' },
    ],
    capabilities: [
      { icon: '📊', label: 'Revenue por segmento e canal' },
      { icon: '🎯', label: 'Identifica crescimento oculto' },
      { icon: '⚡', label: 'Alertas de anomalias' },
    ],
    ctaNote: 'Primeiro insight de receita disponível em menos de 24h',
  },
  'cohort-analyzer': {
    category: 'Analytics',
    hook: 'Você não sabe quais coortes de clientes estão {morrendo silenciosamente} enquanto você acha que a retenção está boa.',
    stats: [
      { value: '12 meses', label: 'de coortes analisados' },
      { value: 'LTV real', label: 'por grupo de aquisição' },
      { value: '−22%', label: 'coortes em queda antecipados' },
    ],
    capabilities: [
      { icon: '👥', label: 'LTV por coorte de aquisição' },
      { icon: '📉', label: 'Detecta coortes em degradação' },
      { icon: '🎯', label: 'Prioriza canal por qualidade de cliente' },
    ],
    ctaNote: 'Primeiro relatório de coorte disponível em menos de 24h',
  },
  'funnel-diagnostics': {
    category: 'Analytics',
    hook: 'Você sabe que {está perdendo clientes no funil} — mas não sabe exatamente onde nem por quê.',
    stats: [
      { value: '+22%', label: 'conversão pós-diagnóstico' },
      { value: 'etapa a etapa', label: 'drop-off mapeado' },
      { value: '< 2h', label: 'primeiro diagnóstico' },
    ],
    capabilities: [
      { icon: '🗺️', label: 'Mapa completo do funil' },
      { icon: '📱', label: 'Segmenta mobile vs desktop' },
      { icon: '💰', label: 'Prioriza por receita estimada' },
    ],
    ctaNote: 'Primeiro diagnóstico de funil disponível em menos de 2h',
  },
  'attribution-mapper': {
    category: 'Analytics',
    hook: 'Você está {cortando o canal que mais converte} — porque o último clique está enganando você.',
    stats: [
      { value: '7 modelos', label: 'de atribuição comparados' },
      { value: '+18%', label: 'ROI de marketing' },
      { value: 'canal real', label: 'de conversão revelado' },
    ],
    capabilities: [
      { icon: '🗺️', label: 'Jornada completa mapeada' },
      { icon: '⚖️', label: '7 modelos de atribuição' },
      { icon: '💡', label: 'Canal assistido vs conversor' },
    ],
    ctaNote: 'Primeiro mapa de atribuição disponível em menos de 24h',
  },
  'store-audit-scanner': {
    category: 'Audit',
    hook: 'Sua loja tem {problemas invisíveis} que estão custando vendas — e você não sabe onde estão.',
    stats: [
      { value: '47', label: 'pontos auditados' },
      { value: '< 24h', label: 'relatório completo' },
      { value: '+15%', label: 'performance pós-correção' },
    ],
    capabilities: [
      { icon: '🔍', label: 'Auditoria de UX, SEO e velocidade' },
      { icon: '🚨', label: 'Alerta sobre problemas críticos' },
      { icon: '📊', label: 'Score de saúde da loja' },
    ],
    ctaNote: 'Primeiro relatório de auditoria em menos de 24h',
  },
  'checkout-auditor': {
    category: 'Audit',
    hook: '{68% dos carrinhos} chegam ao checkout e não compram — cada ponto percentual vale muito.',
    stats: [
      { value: '−15%', label: 'abandono de checkout' },
      { value: '< 2h', label: 'primeiro diagnóstico' },
      { value: '30+', label: 'pontos de fricção mapeados' },
    ],
    capabilities: [
      { icon: '🛒', label: 'Mapeia fricção por etapa' },
      { icon: '🔐', label: 'Avalia sinais de confiança' },
      { icon: '💳', label: 'Analisa métodos de pagamento' },
    ],
    ctaNote: 'Primeiro diagnóstico do checkout em menos de 2h',
  },
  'data-quality-guard': {
    category: 'Audit',
    hook: 'Você está {tomando decisões com dados errados} — e não sabe porque o pixel está disparando duas vezes.',
    stats: [
      { value: '100%', label: 'precisão de rastreamento' },
      { value: 'zero', label: 'conversões duplicadas' },
      { value: '< 48h', label: 'auditoria completa' },
    ],
    capabilities: [
      { icon: '🔬', label: 'Audita pixels e tags' },
      { icon: '⚠️', label: 'Detecta disparos duplicados' },
      { icon: '📋', label: 'Checklist de implementação' },
    ],
    ctaNote: 'Primeiro diagnóstico de rastreamento em menos de 48h',
  },
  'compliance-scanner': {
    category: 'Audit',
    hook: 'Uma multa de LGPD pode custar até {R$50 milhões} — e a maioria das lojas tem pelo menos 3 violações.',
    stats: [
      { value: 'LGPD', label: 'compliance verificado' },
      { value: 'WCAG', label: 'acessibilidade auditada' },
      { value: '< 24h', label: 'relatório completo' },
    ],
    capabilities: [
      { icon: '⚖️', label: 'Verifica LGPD e RGPD' },
      { icon: '♿', label: 'Auditoria de acessibilidade' },
      { icon: '📄', label: 'Revisa políticas e termos' },
    ],
    ctaNote: 'Primeiro relatório de compliance disponível em menos de 24h',
  },
  'task-prioritizer': {
    category: 'Productivity',
    hook: 'Você tem {30 tarefas no backlog} — mas só 3 delas vão mover o ponteiro de receita esta semana.',
    stats: [
      { value: '3x', label: 'foco nas tarefas certas' },
      { value: '+40%', label: 'velocidade de execução' },
      { value: 'ICE score', label: 'para cada item' },
    ],
    capabilities: [
      { icon: '🎯', label: 'Ranqueia por impacto em receita' },
      { icon: '⚡', label: 'Quick wins identificados' },
      { icon: '📋', label: 'Backlog priorizado semanalmente' },
    ],
    ctaNote: 'Primeiro backlog priorizado disponível em menos de 1h',
  },
  'weekly-briefing': {
    category: 'Productivity',
    hook: 'Você gasta {3 horas por semana} em reuniões de dados — poderia gastar 5 minutos lendo um resumo.',
    stats: [
      { value: '5min', label: 'leitura semanal' },
      { value: '100%', label: 'dos dados cobertos' },
      { value: 'zero', label: 'surpresas na segunda-feira' },
    ],
    capabilities: [
      { icon: '📰', label: 'Resumo completo em 5 minutos' },
      { icon: '⚠️', label: 'Alertas de riscos emergentes' },
      { icon: '🏆', label: 'Wins e progresso da semana' },
    ],
    ctaNote: 'Primeiro briefing entregue na próxima segunda às 8h',
  },
  'workflow-automator': {
    category: 'Productivity',
    hook: 'Você faz as mesmas {tarefas manuais toda semana} — isso representa horas de trabalho que um agente pode eliminar.',
    stats: [
      { value: '8h', label: 'economizadas por semana' },
      { value: '−90%', label: 'tarefas manuais repetitivas' },
      { value: 'zero', label: 'erros humanos' },
    ],
    capabilities: [
      { icon: '🔄', label: 'Conecta ferramentas automaticamente' },
      { icon: '⚙️', label: 'Cria fluxos personalizados' },
      { icon: '📡', label: 'Alertas e notificações automáticas' },
    ],
    ctaNote: 'Primeiras automações ativas em menos de 2h',
  },
  'inventory-alerts': {
    category: 'Productivity',
    hook: 'Você vai {perder vendas esta semana} por falta de estoque — e só vai perceber depois do cliente reclamar.',
    stats: [
      { value: 'D-7', label: 'alerta antecipado' },
      { value: '−95%', label: 'ruptura de estoque' },
      { value: 'SKU a SKU', label: 'monitoramento' },
    ],
    capabilities: [
      { icon: '📦', label: 'Monitora giro por SKU' },
      { icon: '🔔', label: 'Alerta antecipado D-7' },
      { icon: '📊', label: 'Previsão de demanda' },
    ],
    ctaNote: 'Primeiros alertas de estoque configurados em menos de 1h',
  },
}

function parseHook(hook: string): React.ReactNode[] {
  const parts = hook.split(/\{([^}]+)\}/)
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <strong key={i} className="text-foreground">
          {part}
        </strong>
      )
    }
    return part
  })
}

export interface InstallWizardModalProps {
  agentId: string
  agentName: string
  onClose: () => void
}

export default function InstallWizardModal({
  agentId,
  agentName,
  onClose,
}: InstallWizardModalProps) {
  const { avatars } = useCoworkerAvatars()
  const data = wizardData[agentId]
  const avatarSrc = avatars?.[agentId]

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!FEATURE_FLAGS.MOCK_INSTALL_WIZARD) return null
  if (!data) return null

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-background border-border relative w-full max-w-lg rounded-2xl border shadow-2xl"
        style={{
          animation: 'wizardSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-4 right-4 rounded-lg p-1.5 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center px-10 pt-10 pb-8">
          {/* Avatar with subtle static rings */}
          <div className="relative mb-6 flex items-center justify-center">
            <span
              className="border-border/30 absolute h-40 w-40 rounded-full border"
              style={{
                animation: 'wizardPulseRing 3s ease-out infinite',
              }}
            />
            <span
              className="border-border/40 absolute h-36 w-36 rounded-full border"
              style={{
                animation: 'wizardPulseRing 3s ease-out infinite',
                animationDelay: '0.5s',
              }}
            />
            <span
              className="border-border/50 absolute h-[120px] w-[120px] rounded-full border"
              style={{
                animation: 'wizardPulseRing 3s ease-out infinite',
                animationDelay: '1s',
              }}
            />
            <CoworkerAvatar src={avatarSrc} name={agentName} size="xl" />
          </div>

          {/* Agent name + category */}
          <h2 className="text-foreground text-lg font-semibold">{agentName}</h2>
          <p className="text-muted-foreground mt-0.5 text-[13px]">{data.category}</p>

          {/* Hook text */}
          <p className="text-foreground/70 mt-7 text-center text-[15px] leading-relaxed">
            {parseHook(data.hook)}
          </p>

          {/* Stats + Capabilities — single bordered container */}
          <div className="border-border mt-8 w-full overflow-hidden rounded-xl border">
            {/* Stats row */}
            <div className="divide-border grid grid-cols-3 divide-x">
              {data.stats.map((stat, i) => (
                <div key={i} className="flex flex-col items-center px-3 py-5">
                  <span className="text-foreground text-[22px] leading-tight font-bold">
                    {stat.value}
                  </span>
                  <span className="text-muted-foreground mt-1.5 text-center text-[11px] leading-tight">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
            {/* Divider */}
            <div className="border-border border-t" />
            {/* Capabilities row */}
            <div className="divide-border grid grid-cols-3 divide-x">
              {data.capabilities.map((cap, i) => (
                <div key={i} className="flex flex-col items-center gap-2 px-3 py-5">
                  <span className="text-2xl leading-none">{cap.icon}</span>
                  <span className="text-muted-foreground text-center text-[11px] leading-snug">
                    {cap.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA button */}
          <button
            className="bg-foreground text-background mt-10 w-full rounded-2xl py-3.5 text-sm font-semibold transition-opacity hover:opacity-90"
            onClick={onClose}
          >
            Ativar {agentName}
          </button>

          {/* CTA note */}
          <p className="text-muted-foreground mt-3 text-center text-xs">{data.ctaNote}</p>
        </div>
      </div>

      <style>{`
        @keyframes wizardSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes wizardPulseRing {
          0% {
            transform: scale(0.85);
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
          100% {
            transform: scale(1.15);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )

  return createPortal(modal, document.body)
}
