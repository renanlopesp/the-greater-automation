'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import OAuthButton from '@/components/auth/oauth-button'
import { loginAction } from '@/lib/actions/auth'
import { loginSchema, type LoginFormValues } from '@/lib/schemas/auth'

export default function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormValues) {
    setServerError(null)
    setPending(true)
    const formData = new FormData()
    formData.set('email', data.email)
    formData.set('password', data.password)

    const result = await loginAction(formData)
    if (result?.error) {
      setServerError(result.error)
      setPending(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {serverError && (
          <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
            {serverError}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
          {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" {...register('password')} />
          {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <div className="relative flex items-center">
        <Separator className="flex-1" />
        <span className="text-muted-foreground bg-muted/50 px-3 text-xs">ou</span>
        <Separator className="flex-1" />
      </div>

      <OAuthButton />

      <p className="text-muted-foreground text-center text-sm">
        Não tem uma conta?{' '}
        <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  )
}
