'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard,
  Briefcase, 
  Users, 
  Building2,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Kanban,
  ExternalLink
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

const navItems: { label: string; href: string; icon: any }[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Jobs', href: '/dashboard/jobs', icon: Briefcase },
  { label: 'Candidates', href: '/dashboard/candidates', icon: Users },
  { label: 'Clients', href: '/dashboard/clients', icon: Building2 },
  { label: 'Smart Pipeline', href: '/dashboard/pipeline', icon: Kanban },
  { label: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [recruiterSlug, setRecruiterSlug] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchRecruiterSlug()
  }, [])

  async function fetchRecruiterSlug() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: recruiter } = await supabase
        .from('recruiters')
        .select('slug')
        .eq('id', user.id)
        .single()
      
      if (recruiter?.slug) {
        setRecruiterSlug(recruiter.slug)
      }
    }
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  const myPageUrl = recruiterSlug 
    ? `https://jobs.search.market/r/${recruiterSlug}` 
    : null

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-brand-navy min-h-screen flex flex-col transition-all duration-300`}>
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center text-white font-bold text-sm">
            SM
          </div>
          {!collapsed && (
            <span className="text-white font-semibold text-lg">Search Market</span>
          )}
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive(item.href)
                ? 'bg-white/15 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </Link>
        ))}
        
        {/* My Page - External Link */}
        <a
          href={myPageUrl || '/dashboard/settings'}
          target={myPageUrl ? '_blank' : '_self'}
          rel={myPageUrl ? 'noopener noreferrer' : undefined}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-white/70 hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">My Page</span>}
        </a>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  )
}
