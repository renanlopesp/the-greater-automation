import DashboardShellNew from '@/components/dashboard-shell-new'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <DashboardShellNew>{children}</DashboardShellNew>
    </TooltipProvider>
  )
}
