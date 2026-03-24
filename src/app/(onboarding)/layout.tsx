export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-[640px]">{children}</div>
    </div>
  )
}
