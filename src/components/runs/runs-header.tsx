import { Equal } from 'lucide-react'

export default function RunsHeader() {
  return (
    <div className="flex items-center gap-2">
      <Equal className="text-muted-foreground h-5 w-5" />
      <h1 className="text-2xl font-semibold">Execuções</h1>
    </div>
  )
}
