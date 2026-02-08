import { TooltipProvider } from '@/components/ui/tooltip'

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className="bg-background text-foreground h-screen">{children}</div>
    </TooltipProvider>
  )
}
