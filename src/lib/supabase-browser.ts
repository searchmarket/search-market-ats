import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (typeof document === 'undefined') return undefined
          const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
          return match ? match[2] : undefined
        },
        set(name: string, value: string, options: { maxAge?: number; secure?: boolean }) {
          if (typeof document === 'undefined') return
          let cookie = `${name}=${value}; path=/; domain=.search.market; SameSite=Lax`
          if (options?.maxAge) cookie += `; max-age=${options.maxAge}`
          if (options?.secure) cookie += '; Secure'
          document.cookie = cookie
        },
        remove(name: string) {
          if (typeof document === 'undefined') return
          document.cookie = `${name}=; path=/; domain=.search.market; max-age=0`
        }
      }
    }
  )
}