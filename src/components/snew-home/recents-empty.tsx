import { Clock } from 'lucide-react'

/**
 * "Recentes" empty-state. Shown at the bottom of Home until the creative
 * history table is wired up (separate spec).
 *
 * 1:1 port from snew-ai-core SnewStudioHomePage.tsx lines 886-902.
 */
export function RecentsEmpty() {
  return (
    <section>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <h2
          style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', margin: 0 }}
          className="dark:text-foreground"
        >
          Recentes
        </h2>
      </div>
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#AAA' }}>
        <Clock size={32} strokeWidth={1.2} style={{ marginBottom: 12, opacity: 0.5 }} />
        <div style={{ fontSize: 13 }}>Seus criativos aparecerão aqui depois de gerados</div>
      </div>
    </section>
  )
}
