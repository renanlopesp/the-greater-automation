'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface HomeApp {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  connected: boolean
}

const homeApps: HomeApp[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
        <path
          d="M15.337 23.979l7.33-1.587S19.72 5.49 19.7 5.333c-.02-.156-.156-.254-.293-.254-.136 0-2.542-.176-2.542-.176s-1.7-1.662-1.876-1.838v20.914zM12.01 3.344s-1.05-.313-2.777-.313c-2.875 0-4.265 1.994-4.265 3.969 0 2.19 1.604 3.228 3.091 4.11 1.252.742 1.7 1.25 1.7 1.993 0 .98-.782 1.545-1.993 1.545-1.408 0-2.777-.742-2.777-.742l-.508 2.366s1.057.664 2.933.664c1.799 0 3.442-.742 4.363-2.152.449-.684.684-1.448.684-2.25 0-1.8-1.252-2.993-2.758-3.99-1.154-.762-1.78-1.212-1.78-2.054 0-.664.508-1.271 1.564-1.271.918 0 1.74.293 1.74.293l.782-2.162zM19.7 5.333l-.293-1.447c0 0-.665-.43-1.35-.547-.41-.068-.82-.088-1.232-.078L15.337 4.04v-.078s1.095-1.037 1.27-1.213c.254-.254.098-.566-.195-.566L15.337 2.183V.838S14.9.526 14.138.526c-.41 0-.782.117-1.095.293l-.46.264v2.26l-2.484.664s-.938-2.523-.957-2.6c-.02-.077-.098-.136-.195-.136-.078 0-3.774.97-3.774.97s-.41.117-.664.352-.254.49-.254.49L.878 22.392l11.132 2.152 7.69-1.662V5.333zM15.337 23.979"
          fill="hsl(var(--foreground)/0.7)"
        />
      </svg>
    ),
    description: 'Sincronize pedidos, produtos, clientes e dados de conversão em tempo real.',
    connected: true,
  },
  {
    id: 'meta-ads',
    name: 'Meta Ads',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="hsl(var(--foreground)/0.7)">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
      </svg>
    ),
    description: 'Monitore campanhas, ROAS e audiências do Facebook e Instagram Ads.',
    connected: true,
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
        <rect x="2" y="13" width="4" height="9" rx="1" fill="hsl(var(--foreground)/0.35)" />
        <rect x="10" y="8" width="4" height="14" rx="1" fill="hsl(var(--foreground)/0.55)" />
        <rect x="18" y="2" width="4" height="20" rx="1" fill="hsl(var(--foreground)/0.75)" />
      </svg>
    ),
    description: 'Acesse dados de tráfego, funis de conversão e comportamento de usuários.',
    connected: false,
  },
  {
    id: 'gmail',
    name: 'Gmail',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
        <path
          d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"
          stroke="hsl(var(--foreground)/0.5)"
          strokeWidth="1.5"
        />
        <path
          d="M2 7l10 6 10-6"
          stroke="hsl(var(--foreground)/0.5)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    description: 'Envie e monitore campanhas de e-mail diretamente pela sua caixa de saída.',
    connected: false,
  },
]

export default function ConnectAppsSection() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-foreground text-lg font-medium">Conecte seus apps</h2>
        <Link
          href="/apps"
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          ver todos
        </Link>
      </div>
      <div className="border-border divide-border divide-y overflow-hidden rounded-2xl border">
        {homeApps.map((app) => (
          <div
            key={app.id}
            className="hover:bg-muted/30 flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors"
          >
            <div className="bg-muted/60 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              {app.icon}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <p className="text-foreground text-sm font-medium">{app.name}</p>
                {app.connected ? (
                  <span className="text-[11px] text-green-600 dark:text-green-400">Conectado</span>
                ) : (
                  <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[10px]">
                    Desconectado
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-[12px] leading-snug">{app.description}</p>
            </div>
            <ChevronRight className="text-muted-foreground/40 h-4 w-4 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
