import { Suspense } from 'react'
import AuthErrorMessage from '@/components/auth/auth-error-message'
import SignupForm from '@/components/auth/signup-form'

export const metadata = { title: 'Criar conta - Snew' }

export default function SignupPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-center text-2xl font-semibold tracking-tight">Crie sua conta Snew</h1>
      <Suspense>
        <AuthErrorMessage />
      </Suspense>
      <SignupForm />
    </div>
  )
}
