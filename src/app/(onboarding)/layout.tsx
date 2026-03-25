export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mx-auto w-full max-w-[480px]">{children}</div>
    </div>
  )
}
