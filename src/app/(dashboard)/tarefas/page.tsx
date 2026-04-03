import TaskList from './task-list'

export default function TarefasPage() {
  return (
    <div className="bg-background min-h-full">
      <div className="mx-auto" style={{ maxWidth: 720, padding: '48px 24px' }}>
        <h1 className="mb-6 font-semibold" style={{ fontSize: 20, color: 'var(--foreground)' }}>
          Tarefas
        </h1>
        <TaskList />
      </div>
    </div>
  )
}
