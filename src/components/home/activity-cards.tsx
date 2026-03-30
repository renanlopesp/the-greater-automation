'use client'

import { useRouter } from 'next/navigation'

const AUTONOMOUS_CARDS = [
  {
    id: 'a1',
    title: 'Campanha de Páscoa publicada em 3 canais',
    route: '/skills/seasonal-calendar',
  },
  {
    id: 'a2',
    title: '3 carrinhos recuperados esta madrugada',
    route: '/skills/retention-engine',
  },
  {
    id: 'a3',
    title: 'Calendário sazonal 2026 atualizado com 10 datas',
    route: '/skills/seasonal-calendar',
  },
] as const

export default function ActivityCards() {
  const router = useRouter()

  return (
    <div>
      <p
        style={{
          fontSize: 18,
          fontWeight: 600,
          textAlign: 'center',
          marginBottom: 20,
          lineHeight: '27px',
          color: 'var(--foreground)',
        }}
      >
        O que o Snew fez pela sua loja
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        {AUTONOMOUS_CARDS.map((card) => (
          <div
            key={card.id}
            onClick={() => router.push(card.route)}
            style={{
              background: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 20,
              minHeight: 100,
              cursor: 'pointer',
            }}
          >
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--foreground)',
                lineHeight: '19.6px',
                margin: 0,
              }}
            >
              {card.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
