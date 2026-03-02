'use client'

import { useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  oauth_error: 'Falha na autenticação. Tente novamente.',
  expired_code: 'Sessão expirada. Tente novamente.',
}

export default function AuthErrorMessage() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error')

  if (!errorCode) return null

  const message = ERROR_MESSAGES[errorCode] ?? 'Ocorreu um erro. Tente novamente.'

  return (
    <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md px-3 py-2 text-sm">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  )
}
