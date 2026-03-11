'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

export type Language = 'en' | 'pt-BR'

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
    'topbar.documents': 'Documentos',
    'topbar.ask': 'Perguntar',
    'topbar.notifications': 'Notifications',
    'topbar.newWorkspace': 'New workspace',
    'topbar.accountSettings': 'Account Settings',
    'topbar.theme': 'Theme',
    'topbar.language': 'Language',
    'topbar.logout': 'Logout',
    // ── Credits ───────────────────────────────────────────────
    'credits.remaining': '847 credits remaining',
    'credits.upgrade': 'Upgrade',
    // ── Home ──────────────────────────────────────────────────
    'home.greeting.morning': 'Good morning',
    'home.greeting.afternoon': 'Good afternoon',
    'home.greeting.evening': 'Good evening',
    'home.metrics.activeAgents': 'Active agents now',
    'home.metrics.recoveredToday': 'Recovered today',
    'home.metrics.savedCarts': 'Saved carts',
    'home.metrics.questionsResolved': 'Questions resolved',
    'home.metrics.hoursSaved': 'Hours saved',
    'home.askBar.placeholder': 'Ask anything about your store...',
    'home.coworkerRecommendation.title': 'Recommended co-worker',
    'home.coworkersInAction.title': 'Co-workers in action',
    'home.opportunities.title': 'Opportunities detected',
    'home.addCoworker': 'Add co-worker',
    'home.activateAgent': 'Activate agent \u2192',
    'home.lastUpdate': 'Last update: 2 min ago',
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
      'Ask anything about your store \u2014 Snew routes your question to the right co-workers.',
    'chat.inputPlaceholder': 'Ask Snew anything...',
    'chat.coworkerAll': 'All',
    'chat.newChat': '\u2190 New chat',
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
      'Credentials are encrypted and tokens are automatically refreshed \u2014 we never store your passwords.',
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
    'agent.approveAction': 'Approve Action',
    'agent.dismiss': 'Dismiss',
    'agent.active': 'Active',
    'agent.edit': 'Edit agent',
    'agent.actionLog': 'Action log',
    'agent.results': 'Results',
    // ── Common ────────────────────────────────────────────────
    'common.back': 'Back',
    'common.share': 'Share',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.upgrade': 'Upgrade',
    'common.credits': 'Credits',
  },
  'pt-BR': {
    // ── Sidebar ───────────────────────────────────────────────
    'nav.home': 'In\u00EDcio',
    'nav.newChat': 'Novo Chat',
    'nav.coworkers': 'Co-workers',
    'nav.apps': 'Apps',
    'nav.history': 'Hist\u00F3rico',
    'nav.notifications': 'Notifica\u00E7\u00F5es',
    // ── TopBar ────────────────────────────────────────────────
    'topbar.feedback': 'Feedback',
    'topbar.documents': 'Documentos',
    'topbar.ask': 'Perguntar',
    'topbar.notifications': 'Notifica\u00E7\u00F5es',
    'topbar.newWorkspace': 'Novo workspace',
    'topbar.accountSettings': 'Configura\u00E7\u00F5es da Conta',
    'topbar.theme': 'Tema',
    'topbar.language': 'Idioma',
    'topbar.logout': 'Sair',
    // ── Credits ───────────────────────────────────────────────
    'credits.remaining': '847 cr\u00E9ditos restantes',
    'credits.upgrade': 'Fazer upgrade',
    // ── Home ──────────────────────────────────────────────────
    'home.greeting.morning': 'Bom dia',
    'home.greeting.afternoon': 'Boa tarde',
    'home.greeting.evening': 'Boa noite',
    'home.metrics.activeAgents': 'Agentes ativos agora',
    'home.metrics.recoveredToday': 'Recuperado hoje',
    'home.metrics.savedCarts': 'Carrinhos salvos',
    'home.metrics.questionsResolved': 'Perguntas resolvidas',
    'home.metrics.hoursSaved': 'Horas economizadas',
    'home.askBar.placeholder': 'Pergunte algo sobre sua loja...',
    'home.coworkerRecommendation.title': 'Co-worker recomendado',
    'home.coworkersInAction.title': 'Co-workers em a\u00E7\u00E3o',
    'home.opportunities.title': 'Oportunidades detectadas',
    'home.addCoworker': 'Adicionar co-worker',
    'home.activateAgent': 'Ativar agente \u2192',
    'home.lastUpdate': '\u00DAltima atualiza\u00E7\u00E3o: 2 min atr\u00E1s',
    // ── Discover ──────────────────────────────────────────────
    'discover.title': 'Co-Workers',
    'discover.subtitle': 'co-workers ativos monitorando sua loja',
    'discover.searchPlaceholder': 'Buscar co-workers...',
    'discover.tabs.all': 'Todos',
    'discover.tabs.active': 'Ativos',
    'discover.tabs.recommended': 'Recomendados',
    'discover.typicalOutcome': 'Resultado t\u00EDpico',
    // ── Chat ──────────────────────────────────────────────────
    'chat.emptyState.title': 'Como posso te ajudar?',
    'chat.emptyState.subtitle':
      'Pergunte qualquer coisa sobre sua loja \u2014 o Snew direciona sua pergunta para os co-workers certos.',
    'chat.inputPlaceholder': 'Pergunte qualquer coisa ao Snew...',
    'chat.coworkerAll': 'Todos',
    'chat.newChat': '\u2190 Novo chat',
    'chat.share': 'Compartilhar',
    // ── Chat prompts ──────────────────────────────────────────
    'chat.prompt1': 'O que gerou mais receita esta semana?',
    'chat.prompt2': 'Quais produtos t\u00EAm a maior taxa de devolu\u00E7\u00E3o?',
    'chat.prompt3': 'H\u00E1 clientes em risco de abandono?',
    'chat.prompt4': 'O que os concorrentes est\u00E3o fazendo que devo reagir?',
    // ── Apps ───────────────────────────────────────────────────
    'apps.title': 'Apps',
    'apps.subtitle': 'Conecte suas ferramentas para que os co-workers possam agir nos seus dados.',
    'apps.securityNote':
      'As credenciais s\u00E3o criptografadas e os tokens s\u00E3o renovados automaticamente \u2014 nunca armazenamos suas senhas.',
    'apps.searchPlaceholder': 'Buscar apps...',
    'apps.connected': 'Conectado',
    'apps.connect': 'Conectar',
    'apps.disconnect': 'Desconectar',
    // ── History ────────────────────────────────────────────────
    'history.title': 'Hist\u00F3rico',
    'history.searchPlaceholder': 'Buscar conversas...',
    'history.today': 'Hoje',
    'history.yesterday': 'Ontem',
    'history.conversations': 'conversas',
    'history.share': 'Compartilhar',
    'history.delete': 'Excluir',
    'history.private': 'Privado',
    'history.public': 'P\u00FAblico',
    // ── Notifications ─────────────────────────────────────────
    'notifications.title': 'Notifica\u00E7\u00F5es',
    'notifications.subtitle': 'A\u00E7\u00F5es recomendadas pelos seus co-workers',
    'notifications.markAllRead': 'Marcar tudo como lido',
    'notifications.new': 'Novas',
    'notifications.earlier': 'Anteriores',
    // ── Agent ─────────────────────────────────────────────────
    'agent.activityLog': 'Registro de Atividades',
    'agent.runAgent': 'Executar Agente',
    'agent.channels': 'Canais',
    'agent.approveAction': 'Aprovar A\u00E7\u00E3o',
    'agent.dismiss': 'Dispensar',
    'agent.active': 'Ativo',
    'agent.edit': 'Editar agente',
    'agent.actionLog': 'Registro de a\u00E7\u00F5es',
    'agent.results': 'Resultados',
    // ── Common ────────────────────────────────────────────────
    'common.back': 'Voltar',
    'common.share': 'Compartilhar',
    'common.edit': 'Editar',
    'common.delete': 'Excluir',
    'common.cancel': 'Cancelar',
    'common.save': 'Salvar',
    'common.upgrade': 'Fazer upgrade',
    'common.credits': 'Cr\u00E9ditos',
  },
} as const

type TranslationKey = keyof (typeof translations)['en']

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey | (string & {})) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'pt-BR',
  setLanguage: () => {},
  t: (key: string) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Force pt-BR — no language switching yet
  const [language] = useState<Language>('pt-BR')

  const setLanguage = (_lang: Language) => {
    // No-op — language switching not implemented yet
  }

  const t = (key: TranslationKey | (string & {})): string => {
    const current = translations[language] as Record<string, string>
    if (current[key]) return current[key]
    // Fallback to English
    const en = translations['en'] as Record<string, string>
    if (en[key]) return en[key]
    // Fallback to key itself
    return key
  }

  return <LanguageContext value={{ language, setLanguage, t }}>{children}</LanguageContext>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
