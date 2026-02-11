import { Suspense } from 'react'
import AuthErrorMessage from '@/components/auth/auth-error-message'
import LoginForm from '@/components/auth/login-form'

export const metadata = { title: 'Log in - Snew' }

export default function LoginPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-center text-2xl font-semibold tracking-tight">Log in to Snew</h1>
      <Suspense>
        <AuthErrorMessage />
      </Suspense>
      <LoginForm />
    </div>
  )
}
