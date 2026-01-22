import { createClient } from '@/lib/supabase-server'
import { 
  Briefcase, 
  Users, 
  Building2,
  TrendingUp,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

export default async function DashboardHome() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Recruiter'

  const stats = [
    { 
      label: 'Active Jobs', 
      value: '0', 
      change: null,
      icon: Briefcase, 
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    { 
      label: 'Total Candidates', 
      value: '0', 
      change: null,
      icon: Users, 
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    },
    { 
      label: 'Active Clients', 
      value: '0', 
      change: null,
      icon: Building2, 
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    { 
      label: 'Placements (MTD)', 
      value: '0', 
      change: null,
      icon: TrendingUp, 
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
  ]

  const revenueStats = [
    { label: 'Revenue (MTD)', value: '$0', icon: DollarSign },
    { label: 'Pipeline Value', value: '$0', icon: TrendingUp },
    { label: 'Avg. Time to Fill', value: '-- days', icon: Clock },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {fullName}
        </h1>
        <p className="text-gray-500 mt-1">
          Here&apos;s your recruiting overview for today.
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                {stat.change && (
                  <div className={`flex items-center gap-1 mt-2 text-sm ${stat.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span>{Math.abs(stat.change)}% from last month</span>
                  </div>
                )}
              </div>
              <div className={`${stat.lightColor} p-3 rounded-xl`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {revenueStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="bg-brand-navy/10 p-3 rounded-xl">
                <stat.icon className="w-6 h-6 text-brand-navy" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-gray-400">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No recent activity</p>
            <p className="text-sm mt-1">Your activity will appear here</p>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Tasks</h2>
          <div className="text-center py-8 text-gray-400">
            <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No upcoming tasks</p>
            <p className="text-sm mt-1">Tasks and reminders will appear here</p>
          </div>
        </div>
      </div>
    </div>
  )
}
