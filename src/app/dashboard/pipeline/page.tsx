'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { 
  Users, Search, Filter, ChevronDown, GripVertical, 
  Mail, Phone, Briefcase, MapPin, Clock, ExternalLink,
  Loader2, ArrowLeft, X, DollarSign, Calendar
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string>('')
  
  // Hired modal state
  const [showHiredModal, setShowHiredModal] = useState(false)
  const [hiredApplication, setHiredApplication] = useState<Application | null>(null)
  const [showPlacementDetails, setShowPlacementDetails] = useState(false)
  const [placementData, setPlacementData] = useState({
    starting_salary: '',
    start_date: ''
  })
  const [processingPlacement, setProcessingPlacement] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      fetchJobs()
      fetchApplications()
    }
  }, [currentUserId])

  async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
      
      // Fetch user's name
      const { data: recruiter } = await supabase
        .from('recruiters')
        .select('full_name')
        .eq('id', user.id)
        .single()
      
      if (recruiter?.full_name) {
        setCurrentUserName(recruiter.full_name)
      }
    } else {
      // No user, stop loading
      setLoading(false)
    }
  }

  async function fetchJobs() {
    if (!currentUserId) return
    
    const { data } = await supabase
      .from('jobs')
      .select('id, title, client:clients(company_name)')
      .eq('recruiter_id', currentUserId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (data) {
      setJobs(data as unknown as Job[])
    }
  }

  async function fetchApplications() {
    if (!currentUserId) return
    
    const { data, error } = await supabase
      .from('applications')
      .select(`
        id, job_id, candidate_id, stage, created_at, updated_at,
        candidate:candidates(id, first_name, last_name, email, phone, current_title, current_company, city, state),
        job:jobs(id, title, client:clients(company_name))
      `)
      .eq('recruiter_id', currentUserId)
      .not('stage', 'in', '("rejected","withdrawn")')
      .order('updated_at', { ascending: false })

    if (data) {
      setApplications(data as unknown as Application[])
    }
    setLoading(false)
  }

  async function updateStage(applicationId: string, newStage: string, skipHiredModal: boolean = false) {
    // If moving to hired stage, show the modal first
    if (newStage === 'hired' && !skipHiredModal) {
      const app = applications.find(a => a.id === applicationId)
      if (app) {
        setHiredApplication(app)
        setShowHiredModal(true)
        setPlacementData({ starting_salary: '', start_date: '' })
        return // Don't update yet, wait for modal response
      }
    }
    
    const { error } = await supabase
      .from('applications')
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

  async function handleHiredResponse(markAsFilled: boolean) {
    if (!hiredApplication) return
    
    if (markAsFilled) {
      // Show placement details form
      setShowPlacementDetails(true)
    } else {
      // Just move to hired without closing job
      await updateStage(hiredApplication.id, 'hired', true)
      setShowHiredModal(false)
      setHiredApplication(null)
    }
  }

  async function submitPlacement() {
    if (!hiredApplication || !placementData.starting_salary || !placementData.start_date || !currentUserId) {
      alert('Please enter starting salary and start date')
      return
    }
    
    setProcessingPlacement(true)
    
    try {
      // 1. Update application to hired stage
      await supabase
        .from('applications')
        .update({ 
          stage: 'hired', 
          updated_at: new Date().toISOString(),
          starting_salary: parseFloat(placementData.starting_salary),
          start_date: placementData.start_date
        })
        .eq('id', hiredApplication.id)
      
      // 2. Update job status to filled and unpublish
      await supabase
        .from('jobs')
        .update({ 
          status: 'filled',
          is_published: false 
        })
        .eq('id', hiredApplication.job_id)
      
      // 3. Update candidate status to placed and set placement timestamp
      await supabase
        .from('candidates')
        .update({ 
          status: 'placed',
          placed_at: new Date().toISOString()
        })
        .eq('id', hiredApplication.candidate_id)
      
      // 4. Log placement activity
      const jobTitle = hiredApplication.job?.title || 'Unknown Position'
      const clientName = hiredApplication.job?.client?.company_name || 'Unknown Company'
      const recruiterName = currentUserName || 'Unknown'
      
      await supabase.from('activity_logs').insert([{
        candidate_id: hiredApplication.candidate_id,
        recruiter_id: currentUserId,
        activity_type: 'placement',
        notes: `Placed by ${recruiterName} as a ${jobTitle} to ${clientName}`,
        metadata: {
          job_id: hiredApplication.job_id,
          job_title: jobTitle,
          client_name: clientName,
          starting_salary: parseFloat(placementData.starting_salary),
          start_date: placementData.start_date
        }
      }])
      
      // Update local state
      setApplications(prev => 
        prev.map(app => 
          app.id === hiredApplication.id 
            ? { ...app, stage: 'hired', updated_at: new Date().toISOString() } 
            : app
        )
      )
      
      // Close modal
      setShowHiredModal(false)
      setShowPlacementDetails(false)
      setHiredApplication(null)
      setPlacementData({ starting_salary: '', start_date: '' })
      
    } catch (error) {
      console.error('Error processing placement:', error)
      alert('Error processing placement')
    }
    
    setProcessingPlacement(false)
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
              <h1 className="text-2xl font-bold text-gray-900">Smart Pipeline</h1>
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
      <div className="flex-1 p-4 bg-gray-100 overflow-hidden">
        <div className="flex gap-2 h-full">
          {STAGES.map((stage) => (
            <div
              key={stage.id}
              className={`flex-1 min-w-0 flex flex-col bg-gray-50 rounded-xl border-2 transition-colors ${
                dragOverStage === stage.id 
                  ? 'border-brand-accent bg-blue-50' 
                  : 'border-transparent'
              }`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className="p-2 border-b border-gray-200">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stage.color}`} />
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{stage.label}</h3>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {applicationsByStage[stage.id]?.length || 0}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
                {applicationsByStage[stage.id]?.map((app) => (
                  <div
                    key={app.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, app.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-lg border border-gray-200 p-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                      draggingId === app.id ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Candidate Info */}
                    <div className="flex items-start justify-between mb-1">
                      <Link 
                        href={`/dashboard/candidates?id=${app.candidate.id}`}
                        className="font-medium text-sm text-gray-900 hover:text-brand-accent truncate"
                      >
                        {app.candidate.first_name} {app.candidate.last_name}
                      </Link>
                      <GripVertical className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    </div>
                    
                    {app.candidate.current_title && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 mb-0.5">
                        <Briefcase className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{app.candidate.current_title}</span>
                      </div>
                    )}
                    
                    {app.candidate.current_company && (
                      <div className="text-xs text-gray-500 ml-4 mb-0.5 truncate">
                        {app.candidate.current_company}
                      </div>
                    )}
                    
                    {(app.candidate.city || app.candidate.state) && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{[app.candidate.city, app.candidate.state].filter(Boolean).join(', ')}</span>
                      </div>
                    )}

                    {/* Job Tag */}
                    {selectedJobId === 'all' && app.job && (
                      <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                        <span className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded truncate block">
                          {app.job.title}
                        </span>
                      </div>
                    )}

                    {/* Time in stage */}
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTimeAgo(app.updated_at)}
                    </div>
                  </div>
                ))}

                {applicationsByStage[stage.id]?.length === 0 && (
                  <div className="text-center py-6 text-gray-400 text-xs">
                    No candidates
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hired Modal */}
      {showHiredModal && hiredApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {showPlacementDetails ? 'Placement Details' : 'Candidate Hired!'}
              </h2>
              <button 
                onClick={() => {
                  setShowHiredModal(false)
                  setShowPlacementDetails(false)
                  setHiredApplication(null)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {!showPlacementDetails ? (
              // Initial question
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 text-lg mb-2">
                    {hiredApplication.candidate.first_name} {hiredApplication.candidate.last_name}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    has been moved to Hired for <span className="font-medium">{hiredApplication.job.title}</span>
                  </p>
                </div>
                
                <p className="text-center text-gray-700 mb-6">
                  Do you want to mark the job as filled and close it?
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => handleHiredResponse(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
                  >
                    Not at this time
                  </button>
                  <button
                    onClick={() => handleHiredResponse(true)}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
                  >
                    Yes
                  </button>
                </div>
              </div>
            ) : (
              // Placement details form
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Starting Salary *
                    </div>
                  </label>
                  <input
                    type="number"
                    required
                    value={placementData.starting_salary}
                    onChange={(e) => setPlacementData({ ...placementData, starting_salary: e.target.value })}
                    placeholder="85000"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Start Date *
                    </div>
                  </label>
                  <input
                    type="date"
                    required
                    value={placementData.start_date}
                    onChange={(e) => setPlacementData({ ...placementData, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setShowPlacementDetails(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={submitPlacement}
                    disabled={processingPlacement || !placementData.starting_salary || !placementData.start_date}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {processingPlacement ? 'Processing...' : 'Complete Placement'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
