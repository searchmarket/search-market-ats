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
          return match ? decodeURIComponent(match[2]) : undefined
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number; domain?: string; secure?: boolean; sameSite?: string }) {
          if (typeof document === 'undefined') return
          let cookie = `${name}=${encodeURIComponent(value)}`
          cookie += `; path=${options.path || '/'}`
          cookie += `; domain=.search.market`
          cookie += `; secure`
          cookie += `; samesite=lax`
          if (options.maxAge) {
            cookie += `; max-age=${options.maxAge}`
          }
          document.cookie = cookie
        },
        remove(name: string, options: { path?: string; domain?: string }) {
          if (typeof document === 'undefined') return
          document.cookie = `${name}=; path=${options.path || '/'}; domain=.search.market; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        },
      },
    }
  )
}
