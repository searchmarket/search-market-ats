'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { 
  Users, Search, Filter, ChevronDown, GripVertical, 
  Mail, Phone, Briefcase, MapPin, Clock, ExternalLink,
  Loader2, ArrowLeft
} from 'lucide-react'

interface Job {
  id: string
  title: string
  client: { company_name: string } | null
}

interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  current_title: string | null
  current_company: string | null
  city: string | null
  state: string | null
}

interface Application {
  id: string
  job_id: string
  candidate_id: string
  stage: string
  created_at: string
  updated_at: string
  candidate: Candidate
  job: Job
}

const STAGES = [
  { id: 'sourced', label: 'Sourced', color: 'bg-gray-500' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
  { id: 'screening', label: 'Screening', color: 'bg-yellow-500' },
  { id: 'submitted', label: 'Submitted', color: 'bg-purple-500' },
  { id: 'interviewing', label: 'Interviewing', color: 'bg-orange-500' },
  { id: 'offer', label: 'Offer', color: 'bg-green-500' },
  { id: 'hired', label: 'Hired', color: 'bg-emerald-600' },
]

export default function PipelinePage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJobId, setSelectedJobId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchJobs()
    fetchApplications()
  }, [])

  async function fetchJobs() {
    const { data } = await supabase
      .from('jobs')
      .select('id, title, client:clients(company_name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (data) {
      setJobs(data as unknown as Job[])
    }
  }

  async function fetchApplications() {
    const { data, error } = await supabase
      .from('job_applications')
      .select(`
        id, job_id, candidate_id, stage, created_at, updated_at,
        candidate:candidates(id, first_name, last_name, email, phone, current_title, current_company, city, state),
        job:jobs(id, title, client:clients(company_name))
      `)
      .not('stage', 'in', '("rejected","withdrawn")')
      .order('updated_at', { ascending: false })

    if (data) {
      setApplications(data as unknown as Application[])
    }
    setLoading(false)
  }

  async function updateStage(applicationId: string, newStage: string) {
    const { error } = await supabase
      .from('job_applications')
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', applicationId)

    if (!error) {
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId 
            ? { ...app, stage: newStage, updated_at: new Date().toISOString() } 
            : app
        )
      )
    }
  }

  function handleDragStart(e: React.DragEvent, applicationId: string) {
    setDraggingId(applicationId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', applicationId)
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDragOverStage(null)
  }

  function handleDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stageId)
  }

  function handleDragLeave() {
    setDragOverStage(null)
  }

  function handleDrop(e: React.DragEvent, stageId: string) {
    e.preventDefault()
    const applicationId = e.dataTransfer.getData('text/plain')
    if (applicationId) {
      updateStage(applicationId, stageId)
    }
    setDraggingId(null)
    setDragOverStage(null)
  }

  // Filter applications
  const filteredApplications = applications.filter(app => {
    // Filter by job
    if (selectedJobId !== 'all' && app.job_id !== selectedJobId) return false
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const name = `${app.candidate.first_name} ${app.candidate.last_name}`.toLowerCase()
      const title = app.candidate.current_title?.toLowerCase() || ''
      const company = app.candidate.current_company?.toLowerCase() || ''
      if (!name.includes(query) && !title.includes(query) && !company.includes(query)) {
        return false
      }
    }
    
    return true
  })

  // Group by stage
  const applicationsByStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = filteredApplications.filter(app => app.stage === stage.id)
    return acc
  }, {} as Record<string, Application[]>)

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/candidates" 
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Candidate Pipeline</h1>
              <p className="text-gray-500 text-sm">Drag candidates between stages to update their status</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {filteredApplications.length} candidate{filteredApplications.length !== 1 ? 's' : ''} in pipeline
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent appearance-none bg-white"
            >
              <option value="all">All Jobs</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>
                  {job.title} {job.client ? `@ ${job.client.company_name}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6 bg-gray-100">
        <div className="flex gap-4 h-full min-w-max">
          {STAGES.map((stage) => (
            <div
              key={stage.id}
              className={`w-72 flex-shrink-0 flex flex-col bg-gray-50 rounded-xl border-2 transition-colors ${
                dragOverStage === stage.id 
                  ? 'border-brand-accent bg-blue-50' 
                  : 'border-transparent'
              }`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    <h3 className="font-semibold text-gray-900">{stage.label}</h3>
                  </div>
                  <span className="text-sm text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                    {applicationsByStage[stage.id]?.length || 0}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {applicationsByStage[stage.id]?.map((app) => (
                  <div
                    key={app.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, app.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                      draggingId === app.id ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Candidate Info */}
                    <div className="flex items-start justify-between mb-2">
                      <Link 
                        href={`/dashboard/candidates?id=${app.candidate.id}`}
                        className="font-medium text-gray-900 hover:text-brand-accent"
                      >
                        {app.candidate.first_name} {app.candidate.last_name}
                      </Link>
                      <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </div>
                    
                    {app.candidate.current_title && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-1">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">{app.candidate.current_title}</span>
                      </div>
                    )}
                    
                    {app.candidate.current_company && (
                      <div className="text-xs text-gray-500 ml-5 mb-1 truncate">
                        {app.candidate.current_company}
                      </div>
                    )}
                    
                    {(app.candidate.city || app.candidate.state) && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {[app.candidate.city, app.candidate.state].filter(Boolean).join(', ')}
                      </div>
                    )}

                    {/* Job Tag */}
                    {selectedJobId === 'all' && app.job && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full truncate block">
                          {app.job.title}
                        </span>
                      </div>
                    )}

                    {/* Time in stage */}
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(app.updated_at)}
                    </div>
                  </div>
                ))}

                {applicationsByStage[stage.id]?.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No candidates
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString()
}
