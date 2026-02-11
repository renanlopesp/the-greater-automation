import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'

interface CurrentUser {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

export function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email.charAt(0).toUpperCase()
}

export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: ['current-user'],
    queryFn: async () => {
      const supabase = createBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile) {
        return {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
        }
      }

      return {
        id: user.id,
        email: user.email ?? '',
        fullName: null,
        avatarUrl: null,
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}
