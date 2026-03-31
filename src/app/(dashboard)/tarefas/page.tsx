import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { createServiceRoleClient } from '@/lib/supabase/server'

export default async function TarefasPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) redirect('/onboarding')

  const serviceClient = createServiceRoleClient()

  const { data: tasks } = (await (
    serviceClient as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (
            k: string,
            v: string
          ) => {
            order: (
              k: string,
              o: { ascending: boolean }
            ) => {
              limit: (n: number) => Promise<{
                data: Array<{
                  id: string
                  title: string
                  status: string
                  active_skill: string | null
                  skill_status: string | null
                  created_at: string
                }> | null
              }>
            }
          }
        }
      }
    }
  )
    .from('tasks')
    .select('id, title, status, active_skill, skill_status, created_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(50)) ?? { data: null }

  const taskList = tasks ?? []

  return (
    <div className="bg-background min-h-full">
      <div className="mx-auto" style={{ maxWidth: 720, padding: '48px 24px' }}>
        <h1 className="mb-6 font-semibold" style={{ fontSize: 20, color: 'var(--foreground)' }}>
          Tarefas
        </h1>

        {taskList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
              Nenhuma tarefa ainda. Use o ask bar no dashboard para criar uma.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 rounded-full border px-4 py-2 text-sm transition-colors hover:bg-[var(--muted)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              Ir para o Dashboard
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {taskList.map((task) => (
              <Link
                key={task.id}
                href={`/chat/task/${task.id}`}
                className="flex items-center gap-3 border-b py-4 transition-colors hover:bg-[var(--muted)]"
                style={{ borderColor: 'var(--border)', padding: '16px 12px' }}
              >
                {/* Status dot */}
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background:
                      task.status === 'active'
                        ? 'var(--green, #22c55e)'
                        : task.status === 'completed'
                          ? 'var(--muted-foreground)'
                          : 'var(--border)',
                  }}
                />

                {/* Title + skill */}
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate font-medium"
                    style={{ fontSize: 14, color: 'var(--foreground)' }}
                  >
                    {task.title}
                  </p>
                  {task.active_skill && (
                    <p
                      className="mt-0.5 truncate"
                      style={{ fontSize: 12, color: 'var(--muted-foreground)' }}
                    >
                      {task.active_skill}
                    </p>
                  )}
                </div>

                {/* Time */}
                <span
                  className="shrink-0"
                  style={{ fontSize: 12, color: 'var(--muted-foreground)' }}
                >
                  {new Date(task.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
