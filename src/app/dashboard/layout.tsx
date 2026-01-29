'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import Sidebar from '@/components/Sidebar'
import { Home, Settings, LogOut } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }
    
    setUser(user)
    
    // Fetch recruiter name
    const { data: recruiter } = await supabase
      .from('recruiters')
      .select('full_name')
      .eq('id', user.id)
      .single()
    
    if (recruiter?.full_name) {
      setUserName(recruiter.full_name)
    }
    
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Top Banner */}
        <header className="bg-brand-navy text-white px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              {userName && (
                <span className="font-medium">{userName}</span>
              )}
              {user?.email && (
                <span className="text-white/70 text-sm ml-3">{user.email}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://hub.search.market"
                className="flex items-center gap-2 px-4 py-2 bg-brand-green rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
              >
                <Home className="w-4 h-4" />
                Open Hub
              </a>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm font-medium"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 bg-gray-50 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
