'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export type Language = 'pt-BR' | 'en'

const translations = {
  en: {
    // ── Sidebar ───────────────────────────────────────────────
    'nav.home': 'Home',
    'nav.newChat': 'New Chat',
    'nav.coworkers': 'Co-workers',
    'nav.apps': 'Apps',
    'nav.history': 'History',
    'nav.notifications': 'Notifications',
    // ── TopBar ────────────────────────────────────────────────
    'topbar.feedback': 'Feedback',
    'topbar.support': 'Support',
    'topbar.documents': 'Documents',
    'topbar.ask': 'Ask',
    'topbar.notifications': 'Notifications',
    'topbar.newWorkspace': 'New workspace',
    'topbar.accountSettings': 'Account settings',
    'topbar.theme.light': 'Light mode',
    'topbar.theme.dark': 'Dark mode',
    'topbar.language': 'Language',
    'topbar.language.ptBR': 'Português',
    'topbar.language.en': 'English',
    'topbar.logout': 'Sign out',
    'topbar.expandSidebar': 'Expand sidebar',
    'topbar.collapseSidebar': 'Collapse sidebar',
    'topbar.openMenu': 'Open menu',
    // ── Credits ───────────────────────────────────────────────
    'credits.remaining': '{count} credits remaining',
    'credits.upgrade': 'Upgrade',
    // ── Home ──────────────────────────────────────────────────
    'home.greeting.morning': 'Good morning',
    'home.greeting.afternoon': 'Good afternoon',
    'home.greeting.evening': 'Good evening',
    'home.greeting.headline.evening': 'While you wrap up your day, your agents keep going.',
    'home.greeting.headline.morning': 'Your agents worked while you slept.',
    'home.greeting.headline.afternoon': 'Your team is at full speed.',
    'home.greeting.headline.default': 'Your agents are working for you.',
    'home.metrics.activeAgents': 'Active agents now',
    'home.metrics.executionsToday': 'Runs today',
    'home.metrics.workflows': 'Workflows',
    'home.metrics.skills': 'Skills',
    'home.metrics.coworkers': 'Co-workers',
    'home.metrics.operating': 'operating',
    'home.metrics.noneActive': 'none active',
    'home.metrics.workflowRuns': 'workflow runs',
    'home.metrics.configured': 'configured',
    'home.metrics.available': 'available',
    'home.metrics.inTeam': 'in team',
    'home.askBar.placeholder':
      'Ask anything about your store... e.g. "which customers haven\'t bought in 60 days?"',
    'home.askBar.atRisk': 'At-risk customers',
    'home.askBar.topProducts': 'Top products',
    'home.askBar.monthForecast': 'Month forecast',
    'home.coworkerRecommendation.title': 'Recommended co-worker',
    'home.coworkersInAction.title': 'Co-workers in action',
    'home.opportunities.title': 'Opportunities detected',
    'home.addCoworker': 'Add co-worker',
    'home.activateAgent': 'Activate agent →',
    'home.openWorkspace': 'Open agent workspace',
    'home.lastUpdate': 'Last update: 2 min ago',
    'home.recentResult': 'Recent result',
    'home.current': 'Current',
    'home.results': 'Results',
    'home.actionLog': 'Action log',
    // ── Discover ──────────────────────────────────────────────
    'discover.title': 'Co-Workers',
    'discover.subtitle': 'active co-workers monitoring your store',
    'discover.searchPlaceholder': 'Search co-workers...',
    'discover.tabs.all': 'All',
    'discover.tabs.active': 'Active',
    'discover.tabs.recommended': 'Recommended',
    'discover.typicalOutcome': 'Typical outcome',
    // ── Chat ──────────────────────────────────────────────────
    'chat.emptyState.title': 'What can I help you with?',
    'chat.emptyState.subtitle':
      'Ask anything about your store — Snew routes your question to the right co-workers.',
    'chat.inputPlaceholder': 'Ask Snew anything...',
    'chat.coworkerAll': 'All',
    'chat.newChat': '← New chat',
    'chat.share': 'Share',
    // ── Chat prompts ──────────────────────────────────────────
    'chat.prompt1': 'What drove the most revenue this week?',
    'chat.prompt2': 'Which products have the highest return rate?',
    'chat.prompt3': 'Are there customers at risk of churning?',
    'chat.prompt4': 'What are competitors doing that I should react to?',
    // ── Apps ───────────────────────────────────────────────────
    'apps.title': 'Apps',
    'apps.subtitle': 'Connect your tools so co-workers can act on your data.',
    'apps.securityNote':
      'Credentials are encrypted and tokens are automatically refreshed — we never store your passwords.',
    'apps.searchPlaceholder': 'Search apps...',
    'apps.connected': 'Connected',
    'apps.connect': 'Connect',
    'apps.disconnect': 'Disconnect',
    // ── History ────────────────────────────────────────────────
    'history.title': 'History',
    'history.searchPlaceholder': 'Search chats...',
    'history.today': 'Today',
    'history.yesterday': 'Yesterday',
    'history.conversations': 'conversations',
    'history.share': 'Share',
    'history.delete': 'Delete',
    'history.private': 'Private',
    'history.public': 'Public',
    // ── Notifications ─────────────────────────────────────────
    'notifications.title': 'Notifications',
    'notifications.subtitle': 'Actions recommended by your co-workers',
    'notifications.markAllRead': 'Mark all as read',
    'notifications.new': 'New',
    'notifications.earlier': 'Earlier',
    // ── Agent ─────────────────────────────────────────────────
    'agent.activityLog': 'Activity Log',
    'agent.runAgent': 'Run Agent',
    'agent.channels': 'Channels',
    'agent.approveAction': 'Approve',
    'agent.dismiss': 'Dismiss',
    'agent.active': 'Active',
    'agent.inactive': 'Inactive',
    'agent.edit': 'Edit agent',
    'agent.actionLog': 'Action log',
    'agent.results': 'Results',
    'agent.settings': 'Settings',
    'agent.automations': 'Automations',
    'agent.skills': 'Skills',
    // ── Common ────────────────────────────────────────────────
    'common.back': 'Back',
    'common.share': 'Share',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.upgrade': 'Upgrade',
    'common.credits': 'Credits',
    'common.search': 'Search',
    'common.noResults': 'No results found',
    'common.loading': 'Loading...',
    'common.connectedBy': 'Connected by {name}',
    'common.unknown': 'Unknown',
  },
  'pt-BR': {
    // ── Sidebar ───────────────────────────────────────────────
    'nav.home': 'Início',
    'nav.newChat': 'Novo Chat',
    'nav.coworkers': 'Co-workers',
    'nav.apps': 'Apps',
    'nav.history': 'Histórico',
    'nav.notifications': 'Notificações',
    // ── TopBar ────────────────────────────────────────────────
    'topbar.feedback': 'Feedback',
    'topbar.support': 'Suporte',
    'topbar.documents': 'Documentos',
    'topbar.ask': 'Perguntar',
    'topbar.notifications': 'Notificações',
    'topbar.newWorkspace': 'Novo workspace',
    'topbar.accountSettings': 'Configurações da conta',
    'topbar.theme.light': 'Modo claro',
    'topbar.theme.dark': 'Modo escuro',
    'topbar.language': 'Idioma',
    'topbar.language.ptBR': 'Português',
    'topbar.language.en': 'English',
    'topbar.logout': 'Sair',
    'topbar.expandSidebar': 'Expandir sidebar',
    'topbar.collapseSidebar': 'Recolher sidebar',
    'topbar.openMenu': 'Abrir menu',
    // ── Credits ───────────────────────────────────────────────
    'credits.remaining': '{count} créditos restantes',
    'credits.upgrade': 'Fazer upgrade',
    // ── Home ──────────────────────────────────────────────────
    'home.greeting.morning': 'Bom dia',
    'home.greeting.afternoon': 'Boa tarde',
    'home.greeting.evening': 'Boa noite',
    'home.greeting.headline.evening': 'Enquanto você encerra o dia, seus agentes continuam.',
    'home.greeting.headline.morning': 'Seus agentes trabalharam enquanto você dormia.',
    'home.greeting.headline.afternoon': 'Seu time está a todo vapor.',
    'home.greeting.headline.default': 'Seus agentes estão trabalhando por você.',
    'home.metrics.activeAgents': 'Agentes ativos agora',
    'home.metrics.executionsToday': 'Execuções hoje',
    'home.metrics.workflows': 'Workflows',
    'home.metrics.skills': 'Skills',
    'home.metrics.coworkers': 'Co-workers',
    'home.metrics.operating': 'operando',
    'home.metrics.noneActive': 'nenhum ativo',
    'home.metrics.workflowRuns': 'workflow runs',
    'home.metrics.configured': 'configurados',
    'home.metrics.available': 'disponíveis',
    'home.metrics.inTeam': 'no time',
    'home.askBar.placeholder':
      'Pergunte algo sobre sua loja... ex: "quais clientes não compram há 60 dias?"',
    'home.askBar.atRisk': 'Clientes em risco',
    'home.askBar.topProducts': 'Top produtos',
    'home.askBar.monthForecast': 'Previsão do mês',
    'home.coworkerRecommendation.title': 'Co-worker recomendado',
    'home.coworkersInAction.title': 'Co-workers em ação',
    'home.opportunities.title': 'Oportunidades detectadas',
    'home.addCoworker': 'Adicionar co-worker',
    'home.activateAgent': 'Ativar agente →',
    'home.openWorkspace': 'Abrir workspace do agente',
    'home.lastUpdate': 'Última atualização: 2 min atrás',
    'home.recentResult': 'Resultado recente',
    'home.current': 'Atual',
    'home.results': 'Resultados',
    'home.actionLog': 'Registro de ações',
    // ── Discover ──────────────────────────────────────────────
    'discover.title': 'Co-Workers',
    'discover.subtitle': 'co-workers ativos monitorando sua loja',
    'discover.searchPlaceholder': 'Buscar co-workers...',
    'discover.tabs.all': 'Todos',
    'discover.tabs.active': 'Ativos',
    'discover.tabs.recommended': 'Recomendados',
    'discover.typicalOutcome': 'Resultado típico',
    // ── Chat ──────────────────────────────────────────────────
    'chat.emptyState.title': 'Como posso te ajudar?',
    'chat.emptyState.subtitle':
      'Pergunte qualquer coisa sobre sua loja — o Snew direciona sua pergunta para os co-workers certos.',
    'chat.inputPlaceholder': 'Pergunte qualquer coisa ao Snew...',
    'chat.coworkerAll': 'Todos',
    'chat.newChat': '← Novo chat',
    'chat.share': 'Compartilhar',
    // ── Chat prompts ──────────────────────────────────────────
    'chat.prompt1': 'O que gerou mais receita esta semana?',
    'chat.prompt2': 'Quais produtos têm a maior taxa de devolução?',
    'chat.prompt3': 'Há clientes em risco de abandono?',
    'chat.prompt4': 'O que os concorrentes estão fazendo que devo reagir?',
    // ── Apps ───────────────────────────────────────────────────
    'apps.title': 'Apps',
    'apps.subtitle': 'Conecte suas ferramentas para que os co-workers possam agir nos seus dados.',
    'apps.securityNote':
      'As credenciais são criptografadas e os tokens são renovados automaticamente — nunca armazenamos suas senhas.',
    'apps.searchPlaceholder': 'Buscar apps...',
    'apps.connected': 'Conectado',
    'apps.connect': 'Conectar',
    'apps.disconnect': 'Desconectar',
    // ── History ────────────────────────────────────────────────
    'history.title': 'Histórico',
    'history.searchPlaceholder': 'Buscar conversas...',
    'history.today': 'Hoje',
    'history.yesterday': 'Ontem',
    'history.conversations': 'conversas',
    'history.share': 'Compartilhar',
    'history.delete': 'Excluir',
    'history.private': 'Privado',
    'history.public': 'Público',
    // ── Notifications ─────────────────────────────────────────
    'notifications.title': 'Notificações',
    'notifications.subtitle': 'Ações recomendadas pelos seus co-workers',
    'notifications.markAllRead': 'Marcar tudo como lido',
    'notifications.new': 'Novas',
    'notifications.earlier': 'Anteriores',
    // ── Agent ─────────────────────────────────────────────────
    'agent.activityLog': 'Registro de Atividades',
    'agent.runAgent': 'Executar Agente',
    'agent.channels': 'Canais',
    'agent.approveAction': 'Aprovar',
    'agent.dismiss': 'Dispensar',
    'agent.active': 'Ativo',
    'agent.inactive': 'Inativo',
    'agent.edit': 'Editar agente',
    'agent.actionLog': 'Registro de ações',
    'agent.results': 'Resultados',
    'agent.settings': 'Configurações',
    'agent.automations': 'Automações',
    'agent.skills': 'Skills',
    // ── Common ────────────────────────────────────────────────
    'common.back': 'Voltar',
    'common.share': 'Compartilhar',
    'common.edit': 'Editar',
    'common.delete': 'Excluir',
    'common.cancel': 'Cancelar',
    'common.save': 'Salvar',
    'common.upgrade': 'Fazer upgrade',
    'common.credits': 'Créditos',
    'common.search': 'Buscar',
    'common.noResults': 'Nenhum resultado encontrado',
    'common.loading': 'Carregando...',
    'common.connectedBy': 'Conectado por {name}',
    'common.unknown': 'Desconhecido',
  },
} as const

export type TranslationKey = keyof (typeof translations)['en']

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey | (string & {}), params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'pt-BR',
  setLanguage: () => {},
  t: (key: string) => key,
})

function getCookieValue(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match?.[1]
}

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`
}

const SUPPORTED_LANGUAGES: Language[] = ['pt-BR', 'en']
const DEFAULT_LANGUAGE: Language = 'pt-BR'
const COOKIE_NAME = 'lang'

function resolveLanguage(value: string | undefined): Language {
  if (value && SUPPORTED_LANGUAGES.includes(value as Language)) {
    return value as Language
  }
  return DEFAULT_LANGUAGE
}

interface LanguageProviderProps {
  children: ReactNode
  initialLanguage?: string
}

export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
  const router = useRouter()

  const [language, setLanguageState] = useState<Language>(() => {
    // Prefer server-provided initial language (from cookie read in layout)
    if (initialLanguage) return resolveLanguage(initialLanguage)
    // Fallback: read cookie on client
    return resolveLanguage(getCookieValue(COOKIE_NAME))
  })

  const setLanguage = useCallback(
    (lang: Language) => {
      if (!SUPPORTED_LANGUAGES.includes(lang)) return
      setLanguageState(lang)
      setCookie(COOKIE_NAME, lang)
      // Refresh to re-render server components with new language
      router.refresh()
    },
    [router]
  )

  const t = useCallback(
    (key: TranslationKey | (string & {}), params?: Record<string, string | number>): string => {
      const current = translations[language] as Record<string, string>
      let value = current[key]
      if (!value) {
        // Fallback to pt-BR if current is en
        if (language !== 'pt-BR') {
          const fallback = translations['pt-BR'] as Record<string, string>
          value = fallback[key]
        }
      }
      if (!value) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[i18n] Missing translation key: "${key}" for language "${language}"`)
        }
        return key
      }
      // Simple param substitution: {count}, {name}, etc.
      if (params) {
        return value.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
      }
      return value
    },
    [language]
  )

  return <LanguageContext value={{ language, setLanguage, t }}>{children}</LanguageContext>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
