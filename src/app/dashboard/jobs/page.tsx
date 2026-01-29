'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { countries, provinces } from '@/lib/location-data'
import RichTextEditor from '@/components/RichTextEditor'
import Link from 'next/link'
import { 
  Plus, Search, Briefcase, MoreVertical, Pencil, Trash2, X, Building2, 
  MapPin, DollarSign, ArrowLeft, Users, Sparkles, Globe, EyeOff, Loader2,
  Lock, Unlock, Clock, RefreshCw, User, XCircle, Copy
} from 'lucide-react'

interface Client {
  id: string
  company_name: string
}

interface Candidate {
  id: string
  first_name: string
  last_name: string
  current_title: string | null
  owned_by: string | null
  owned_at: string | null
  exclusive_until: string | null
  owner?: { full_name: string | null } | null
}

interface Application {
  id: string
  job_id: string
  stage: string
  candidate_id: string
  candidates: Candidate
}

interface ClientContact {
  id: string
  client_id: string
  name: string
  title: string | null
  email: string | null
  phone: string | null
}

interface Job {
  id: string
  title: string
  client_id: string | null
  clients: Client | null
  hiring_manager_id: string | null
  hiring_manager?: ClientContact | null
  city: string | null
  state: string | null
  country: string | null
  location_type: string
  employment_type: string
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  fee_percent: number | null
  status: string
  description: string | null
  requirements: string | null
  is_published: boolean
  created_at: string
  recruiter_id: string
  agency_id: string | null
  visibility: 'platform' | 'agency_only'
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'agency' | 'platform' | 'mine' | 'closed'>('platform')
  const [showModal, setShowModal] = useState(false)
  const [showDetailView, setShowDetailView] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [generatingJD, setGeneratingJD] = useState(false)
  const [rewritingJD, setRewritingJD] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string>('')
  const [currentUserAgencyId, setCurrentUserAgencyId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showCloseJobModal, setShowCloseJobModal] = useState(false)
  const [closeJobStatus, setCloseJobStatus] = useState('filled')
  const [closingJob, setClosingJob] = useState(false)
  const [placementData, setPlacementData] = useState({
    candidate_id: '',
    start_date: '',
    starting_salary: ''
  })
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    hiring_manager_id: '',
    description: '',
    requirements: '',
    city: '',
    state: '',
    country: 'CA',
    location_type: 'onsite',
    employment_type: 'permanent',
    salary_min: '',
    salary_max: '',
    salary_currency: 'CAD',
    fee_percent: '',
    status: 'open',
    visibility: 'platform' as 'platform' | 'agency_only'
  })

  const availableProvinces = provinces[formData.country] || []

  // Handle deep linking from query params
  useEffect(() => {
    const jobId = searchParams.get('id')
    if (jobId && jobs.length > 0) {
      const job = jobs.find(j => j.id === jobId)
      if (job) {
        setSelectedJob(job)
        setShowDetailView(true)
      }
    }
  }, [searchParams, jobs])

  useEffect(() => {
    fetchJobs()
    fetchClients()
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (formData.state && !availableProvinces.find(p => p.code === formData.state)) {
      setFormData(prev => ({ ...prev, state: '' }))
    }
    if (formData.country === 'CA') {
      setFormData(prev => ({ ...prev, salary_currency: 'CAD' }))
    } else if (formData.country === 'US') {
      setFormData(prev => ({ ...prev, salary_currency: 'USD' }))
    }
  }, [formData.country])

  // Fetch client contacts when client changes
  useEffect(() => {
    if (formData.client_id) {
      fetchClientContacts(formData.client_id)
    } else {
      setClientContacts([])
      setFormData(prev => ({ ...prev, hiring_manager_id: '' }))
    }
  }, [formData.client_id])

  useEffect(() => {
    if (selectedJob) {
      fetchApplicationsForJob(selectedJob.id)
    }
  }, [selectedJob])

  async function fetchJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, clients(id, company_name), hiring_manager:client_contacts(id, name, title, email, phone), recruiter_id')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching jobs:', error)
    } else {
      setJobs((data as unknown as Job[]) || [])
    }
    setLoading(false)
  }

  async function fetchClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('id, company_name')
      .eq('status', 'active')
      .order('company_name')

    if (error) {
      console.error('Error fetching clients:', error)
    } else {
      setClients((data as unknown as Client[]) || [])
    }
  }

  async function fetchClientContacts(clientId: string) {
    const { data, error } = await supabase
      .from('client_contacts')
      .select('id, client_id, name, title, email, phone')
      .eq('client_id', clientId)
      .order('name')

    if (error) {
      console.error('Error fetching client contacts:', error)
      setClientContacts([])
    } else {
      setClientContacts((data as unknown as ClientContact[]) || [])
    }
  }

  async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
      
      // Check if user is admin, get name, and get agency_id
      const { data: recruiter } = await supabase
        .from('recruiters')
        .select('is_admin, full_name, agency_id')
        .eq('id', user.id)
        .single()
      
      if (recruiter?.is_admin) {
        setIsAdmin(true)
      }
      if (recruiter?.full_name) {
        setCurrentUserName(recruiter.full_name)
      }
      if (recruiter?.agency_id) {
        setCurrentUserAgencyId(recruiter.agency_id)
        // Set default tab to agency if user is part of an agency
        setActiveTab('agency')
      }
    }
  }

  function getOwnershipStatus(candidate: Candidate): 'owned' | 'exclusive' | 'open' {
    if (candidate.owned_by) return 'owned'
    if (candidate.exclusive_until && new Date(candidate.exclusive_until) > new Date()) return 'exclusive'
    return 'open'
  }

  function getOwnershipBadge(candidate: Candidate) {
    const status = getOwnershipStatus(candidate)
    const isOwner = candidate.owned_by === currentUserId

    const styles = {
      owned: { bg: 'bg-red-100', text: 'text-red-700', Icon: Lock },
      exclusive: { bg: 'bg-yellow-100', text: 'text-yellow-700', Icon: Clock },
      open: { bg: 'bg-green-100', text: 'text-green-700', Icon: Unlock }
    }

    const { bg, text, Icon } = styles[status]
    const label = status === 'owned' 
      ? (isOwner ? 'Mine' : candidate.owner?.full_name || 'Owned')
      : status === 'exclusive' ? 'Exclusive' : 'Open'

    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded ${bg} ${text}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    )
  }

  async function fetchApplicationsForJob(jobId: string) {
    const { data, error } = await supabase
      .from('applications')
      .select('id, job_id, stage, candidate_id, candidates(id, first_name, last_name, current_title, owned_by, owned_at, exclusive_until, owner:recruiters!owned_by(full_name))')
      .eq('job_id', jobId)

    if (error) {
      console.error('Error fetching applications:', error)
    } else {
      setApplications((data as unknown as Application[]) || [])
    }
  }

  async function generateJobDescription() {
    if (!formData.title) {
      alert('Please enter a job title first')
      return
    }

    setGeneratingJD(true)

    try {
      const response = await fetch('/api/generate-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          company: clients.find(c => c.id === formData.client_id)?.company_name || '',
          location: formData.city,
          locationType: formData.location_type,
          employmentType: formData.employment_type,
          salaryMin: formData.salary_min,
          salaryMax: formData.salary_max,
          currency: formData.salary_currency
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate description')
      }

      const data = await response.json()
      setFormData(prev => ({
        ...prev,
        description: data.description,
        requirements: data.requirements
      }))
    } catch (error) {
      console.error('Error generating JD:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate job description. Make sure API key is configured.')
    }

    setGeneratingJD(false)
  }

  async function anonymizeJobDescription() {
    if (!formData.description && !formData.requirements) {
      alert('Please add description or requirements first')
      return
    }

    setRewritingJD(true)

    try {
      const response = await fetch('/api/anonymize-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description || '',
          requirements: formData.requirements || ''
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to anonymize content')
      }

      const data = await response.json()
      setFormData(prev => ({
        ...prev,
        description: data.description && data.description !== 'N/A' ? data.description : prev.description,
        requirements: data.requirements && data.requirements !== 'N/A' ? data.requirements : prev.requirements
      }))
    } catch (error) {
      console.error('Error anonymizing JD:', error)
      alert(error instanceof Error ? error.message : 'Failed to anonymize job description.')
    }

    setRewritingJD(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Validate client and hiring manager
    if (!formData.client_id) {
      alert('Please select a client')
      return
    }
    
    if (!formData.hiring_manager_id) {
      alert('Please select a hiring manager. If no contacts exist for this client, add one first in the Clients page.')
      return
    }

    // Validate salary range is provided
    if (!formData.salary_min || !formData.salary_max) {
      alert('Salary range (min and max) is required for all jobs')
      return
    }

    const jobData = {
      title: formData.title,
      client_id: formData.client_id || null,
      hiring_manager_id: formData.hiring_manager_id || null,
      description: formData.description || null,
      requirements: formData.requirements || null,
      city: formData.city || null,
      state: formData.state || null,
      country: formData.country,
      location_type: formData.location_type,
      employment_type: formData.employment_type,
      salary_min: parseFloat(formData.salary_min),
      salary_max: parseFloat(formData.salary_max),
      salary_currency: formData.salary_currency,
      fee_percent: formData.fee_percent ? parseFloat(formData.fee_percent) : null,
      status: formData.status,
      visibility: formData.visibility
    }

    if (editingJob) {
      const { error } = await supabase
        .from('jobs')
        .update(jobData)
        .eq('id', editingJob.id)

      if (error) {
        console.error('Error updating job:', error)
        alert('Error updating job')
      } else {
        setShowModal(false)
        setEditingJob(null)
        resetForm()
        fetchJobs()
        if (selectedJob?.id === editingJob.id) {
          const updatedHiringManager = clientContacts.find(c => c.id === formData.hiring_manager_id)
          setSelectedJob({ ...selectedJob, ...jobData, clients: selectedJob.clients, hiring_manager: updatedHiringManager || null })
        }
      }
    } else {
      const { error } = await supabase
        .from('jobs')
        .insert([{ 
          ...jobData, 
          recruiter_id: user.id, 
          is_published: false,
          agency_id: currentUserAgencyId || null
        }])

      if (error) {
        console.error('Error creating job:', error)
        alert('Error creating job')
      } else {
        setShowModal(false)
        resetForm()
        fetchJobs()
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this job?')) return

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting job:', error)
      alert('Error deleting job')
    } else {
      fetchJobs()
      if (selectedJob?.id === id) {
        setShowDetailView(false)
        setSelectedJob(null)
      }
    }
    setMenuOpen(null)
  }

  async function togglePublish(job: Job) {
    const newPublishState = !job.is_published

    // Don't allow publishing without salary range
    if (newPublishState && (!job.salary_min || !job.salary_max)) {
      alert('Cannot publish job without salary range. Please add salary min and max first.')
      return
    }

    const { error } = await supabase
      .from('jobs')
      .update({ is_published: newPublishState })
      .eq('id', job.id)

    if (error) {
      console.error('Error updating publish status:', error)
      alert('Error updating publish status')
    } else {
      fetchJobs()
      if (selectedJob?.id === job.id) {
        setSelectedJob({ ...selectedJob, is_published: newPublishState })
      }
    }
  }

  function getCandidatesInPipeline(jobId: string): Application[] {
    return applications.filter(app => app.job_id === jobId)
  }

  function openCloseJobModal() {
    if (!selectedJob) return
    
    // Reset placement data and show modal
    setPlacementData({
      candidate_id: '',
      start_date: '',
      starting_salary: ''
    })
    setCloseJobStatus('filled')
    setShowCloseJobModal(true)
  }

  async function closeJob() {
    if (!selectedJob || !currentUserId) return
    
    // If status is filled, validate placement data
    if (closeJobStatus === 'filled') {
      if (!placementData.candidate_id) {
        alert('Please select a candidate')
        return
      }
      if (!placementData.start_date) {
        alert('Please enter a start date')
        return
      }
      if (!placementData.starting_salary) {
        alert('Please enter a starting salary')
        return
      }
    }
    
    setClosingJob(true)
    
    try {
      // 1. Update job status
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: closeJobStatus,
          is_published: false 
        })
        .eq('id', selectedJob.id)

      if (error) {
        console.error('Error closing job:', error)
        alert('Error closing job')
        setClosingJob(false)
        return
      }
      
      // 2. If status is filled, process the placement
      if (closeJobStatus === 'filled' && placementData.candidate_id) {
        // Update application to hired stage with salary/date
        await supabase
          .from('applications')
          .update({ 
            stage: 'hired',
            updated_at: new Date().toISOString(),
            starting_salary: parseFloat(placementData.starting_salary),
            start_date: placementData.start_date
          })
          .eq('job_id', selectedJob.id)
          .eq('candidate_id', placementData.candidate_id)
        
        // Update candidate status to placed
        await supabase
          .from('candidates')
          .update({ 
            status: 'placed',
            placed_at: new Date().toISOString()
          })
          .eq('id', placementData.candidate_id)
        
        // Log placement activity
        const jobTitle = selectedJob.title || 'Unknown Position'
        const clientName = selectedJob.clients?.company_name || 'Unknown Company'
        const recruiterName = currentUserName || 'Unknown'
        
        await supabase.from('activity_logs').insert([{
          candidate_id: placementData.candidate_id,
          recruiter_id: currentUserId,
          activity_type: 'placement',
          notes: `Placed by ${recruiterName} as a ${jobTitle} to ${clientName}`,
          metadata: {
            job_id: selectedJob.id,
            job_title: jobTitle,
            client_name: clientName,
            starting_salary: parseFloat(placementData.starting_salary),
            start_date: placementData.start_date
          }
        }])
      }
      
      fetchJobs()
      fetchApplicationsForJob(selectedJob.id)
      setSelectedJob({ ...selectedJob, status: closeJobStatus, is_published: false })
      setShowCloseJobModal(false)
      setPlacementData({ candidate_id: '', start_date: '', starting_salary: '' })
      
    } catch (err) {
      console.error('Error closing job:', err)
      alert('Error closing job')
    }
    
    setClosingJob(false)
  }

  async function duplicateJob(job: Job) {
    if (!currentUserId) return
    
    const { data, error } = await supabase
      .from('jobs')
      .insert([{
        title: job.title,
        client_id: job.client_id,
        hiring_manager_id: job.hiring_manager_id,
        description: job.description,
        requirements: job.requirements,
        city: job.city,
        state: job.state,
        country: job.country,
        location_type: job.location_type,
        employment_type: job.employment_type,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_currency: job.salary_currency,
        fee_percent: job.fee_percent,
        status: 'open',
        is_published: false,
        recruiter_id: currentUserId,
        agency_id: currentUserAgencyId || null,
        visibility: currentUserAgencyId ? 'agency_only' : 'platform'
      }])
      .select()
      .single()

    if (error) {
      console.error('Error duplicating job:', error)
      alert('Error creating duplicate job')
    } else if (data) {
      fetchJobs()
      // Open the new job
      setSelectedJob(data)
      router.push(`/dashboard/jobs?id=${data.id}`, { scroll: false })
      alert('New job created successfully!')
    }
  }

  function openDetailView(job: Job) {
    setSelectedJob(job)
    setShowDetailView(true)
    setMenuOpen(null)
    router.push(`/dashboard/jobs?id=${job.id}`, { scroll: false })
  }

  function openEditModal(job: Job) {
    setEditingJob(job)
    // Fetch contacts for this job's client
    if (job.client_id) {
      fetchClientContacts(job.client_id)
    }
    setFormData({
      title: job.title,
      client_id: job.client_id || '',
      hiring_manager_id: job.hiring_manager_id || '',
      description: job.description || '',
      requirements: job.requirements || '',
      city: job.city || '',
      state: job.state || '',
      country: job.country || 'CA',
      location_type: job.location_type,
      employment_type: job.employment_type,
      salary_min: job.salary_min?.toString() || '',
      salary_max: job.salary_max?.toString() || '',
      salary_currency: job.salary_currency,
      fee_percent: job.fee_percent?.toString() || '',
      status: job.status,
      visibility: job.visibility || 'platform'
    })
    setShowModal(true)
    setMenuOpen(null)
  }

  function resetForm() {
    setFormData({
      title: '',
      client_id: '',
      hiring_manager_id: '',
      description: '',
      requirements: '',
      city: '',
      state: '',
      country: 'CA',
      location_type: 'onsite',
      employment_type: 'permanent',
      salary_min: '',
      salary_max: '',
      salary_currency: 'CAD',
      fee_percent: '',
      status: 'open',
      visibility: currentUserAgencyId ? 'agency_only' : 'platform'
    })
    setClientContacts([])
    setEditingJob(null)
  }

  // Filter jobs based on tab and search
  const filteredJobs = jobs.filter(job => {
    // Search filter
    const matchesSearch = !searchQuery ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.clients?.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false
    
    // Tab filter - wait for currentUserId to be loaded
    if (!currentUserId) return true // Show all while loading
    
    if (activeTab === 'agency') {
      // Agency Jobs: all open jobs within user's agency
      return currentUserAgencyId && job.agency_id === currentUserAgencyId && job.status === 'open'
    } else if (activeTab === 'platform') {
      // Platform Jobs: all open jobs visible to platform from OTHER recruiters
      // Only show jobs with visibility='platform' (excludes agency-only jobs)
      return job.recruiter_id !== currentUserId && 
             job.status === 'open' && 
             job.visibility === 'platform'
    } else if (activeTab === 'mine') {
      // My Jobs: only open jobs I created
      return job.recruiter_id === currentUserId && job.status === 'open'
    } else if (activeTab === 'closed') {
      // My Closed Jobs: filled or cancelled jobs I created
      return job.recruiter_id === currentUserId && (job.status === 'filled' || job.status === 'cancelled')
    }
    return true
  })

  // Counts for tabs
  const agencyJobsCount = currentUserAgencyId ? jobs.filter(j => 
    j.status === 'open' && j.agency_id === currentUserAgencyId
  ).length : 0

  const platformJobsCount = jobs.filter(j => 
    j.status === 'open' && 
    j.recruiter_id !== currentUserId && 
    j.visibility === 'platform'
  ).length
  
  const myJobsCount = jobs.filter(j => 
    j.status === 'open' && j.recruiter_id === currentUserId
  ).length
  
  const myClosedJobsCount = jobs.filter(j => 
    (j.status === 'filled' || j.status === 'cancelled') && j.recruiter_id === currentUserId
  ).length

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    open: 'bg-green-100 text-green-700',
    on_hold: 'bg-yellow-100 text-yellow-700',
    filled: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700'
  }

  const stageColors: Record<string, string> = {
    applied: 'bg-blue-100 text-blue-700',
    sourced: 'bg-gray-100 text-gray-700',
    contacted: 'bg-blue-100 text-blue-700',
    screening: 'bg-yellow-100 text-yellow-700',
    submitted: 'bg-purple-100 text-purple-700',
    interviewing: 'bg-orange-100 text-orange-700',
    offer: 'bg-green-100 text-green-700',
    hired: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    withdrawn: 'bg-gray-100 text-gray-700'
  }

  const formatLocation = (city: string | null, state: string | null, country: string | null, locationType: string) => {
    const stateName = country && state ? provinces[country]?.find(p => p.code === state)?.name || state : state
    const location = [city, stateName].filter(Boolean).join(', ')
    if (!location) return locationType
    return `${location} (${locationType})`
  }

  const formatSalary = (min: number | null, max: number | null, currency: string) => {
    if (!min && !max) return '-'
    const fmt = (n: number) => `$${n.toLocaleString()}`
    if (min && max) return `${fmt(min)} - ${fmt(max)} ${currency}`
    if (min) return `${fmt(min)}+ ${currency}`
    if (max) return `Up to ${fmt(max)} ${currency}`
    return '-'
  }

  // Detail View
  if (showDetailView && selectedJob) {
    const fromClientId = searchParams.get('fromClient')
    
    return (
      <div className="p-8">
        <button
          onClick={() => { 
            setShowDetailView(false)
            setSelectedJob(null)
            if (fromClientId) {
              router.push(`/dashboard/clients?id=${fromClientId}`)
            } else {
              router.push('/dashboard/jobs', { scroll: false })
            }
          }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {fromClientId ? 'Back to Client' : 'Back to Jobs'}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">{selectedJob.title}</h1>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[selectedJob.status]}`}>
                      {selectedJob.status.replace('_', ' ')}
                    </span>
                    {(selectedJob.status === 'filled' || selectedJob.status === 'cancelled') && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-full bg-red-600 text-white animate-pulse">
                        <XCircle className="w-4 h-4" />
                        CLOSED
                      </span>
                    )}
                    {selectedJob.is_published && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-brand-green/10 text-brand-green">
                        <Globe className="w-3 h-3" />
                        Published
                      </span>
                    )}
                    {selectedJob.visibility === 'agency_only' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                        <Lock className="w-3 h-3" />
                        Agency Only
                      </span>
                    )}
                  </div>
                  {selectedJob.clients && (
                    <p className="text-lg text-gray-600">{selectedJob.clients.company_name}</p>
                  )}
                  {selectedJob.hiring_manager && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <User className="w-4 h-4" />
                      <span>Hiring Manager: <span className="font-medium text-gray-700">{selectedJob.hiring_manager.name}</span></span>
                      {selectedJob.hiring_manager.title && (
                        <span className="text-gray-400">({selectedJob.hiring_manager.title})</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => openEditModal(selectedJob)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateJob(selectedJob)}
                    className="flex items-center gap-2 px-3 py-2 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50"
                  >
                    <Copy className="w-4 h-4" />
                    Create Identical New Job
                  </button>
                  {(selectedJob.status === 'open' || selectedJob.status === 'on_hold' || selectedJob.status === 'draft') && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setPlacementData({ candidate_id: '', start_date: '', starting_salary: '' })
                          setCloseJobStatus('filled')
                          setShowCloseJobModal(true)
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        <XCircle className="w-4 h-4" />
                        Close Job
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePublish(selectedJob)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                          selectedJob.is_published
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-brand-green text-white hover:bg-green-700'
                        }`}
                      >
                        {selectedJob.is_published ? <EyeOff className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                        {selectedJob.is_published ? 'Unpublish' : 'Publish to Board'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {formatLocation(selectedJob.city, selectedJob.state, selectedJob.country, selectedJob.location_type)}
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {formatSalary(selectedJob.salary_min, selectedJob.salary_max, selectedJob.salary_currency)}
                </div>
                <div className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {selectedJob.employment_type.replace('_', ' ')}
                </div>
                {selectedJob.fee_percent && (
                  <div className="text-brand-green font-medium">
                    {selectedJob.fee_percent}% fee
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {selectedJob.description && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Description</h2>
                <div 
                  className="text-gray-600 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedJob.description }}
                />
              </div>
            )}

            {/* Requirements */}
            {selectedJob.requirements && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h2>
                <div 
                  className="text-gray-600 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedJob.requirements }}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Candidates */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Candidates ({applications.length})</h2>
              {applications.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No candidates yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div key={app.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <Link 
                          href={`/dashboard/candidates?id=${app.candidates.id}`}
                          className="font-medium text-gray-900 hover:text-brand-accent"
                        >
                          {app.candidates.first_name} {app.candidates.last_name}
                        </Link>
                        {getOwnershipBadge(app.candidates)}
                      </div>
                      {app.candidates.current_title && (
                        <div className="text-sm text-gray-500 mt-1">{app.candidates.current_title}</div>
                      )}
                      <span className={`inline-flex mt-2 px-2 py-0.5 text-xs font-medium rounded-full ${stageColors[app.stage]}`}>
                        {app.stage}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Info</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-900">{new Date(selectedJob.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="text-gray-900 capitalize">{selectedJob.status.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={() => handleDelete(selectedJob.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Job
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal - in Detail View */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingJob ? 'Edit Job' : 'Create Job'}
                </h2>
                <button onClick={() => { setShowModal(false); resetForm() }} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                  <select
                    required
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value, hiring_manager_id: '' })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  >
                    <option value="">Select a client...</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.company_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hiring Manager *</label>
                  <select
                    required
                    value={formData.hiring_manager_id}
                    onChange={(e) => setFormData({ ...formData, hiring_manager_id: e.target.value })}
                    disabled={!formData.client_id}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">{formData.client_id ? (clientContacts.length === 0 ? 'No contacts - add in Clients page' : 'Select hiring manager...') : 'Select a client first...'}</option>
                    {clientContacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name}{contact.title ? ` - ${contact.title}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={anonymizeJobDescription}
                        disabled={rewritingJD || (!formData.description && !formData.requirements)}
                        className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {rewritingJD ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        {rewritingJD ? 'Anonymizing...' : 'Anonymize'}
                      </button>
                      <button
                        type="button"
                        onClick={generateJobDescription}
                        disabled={generatingJD || !formData.title}
                        className="flex items-center gap-1 text-sm text-brand-accent hover:text-brand-blue disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingJD ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        {generatingJD ? 'Generating...' : 'Generate with AI'}
                      </button>
                    </div>
                  </div>
                  <RichTextEditor
                    key={`desc-${editingJob?.id || 'new'}`}
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    placeholder="Job description, responsibilities..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
                  <RichTextEditor
                    key={`req-${editingJob?.id || 'new'}`}
                    value={formData.requirements}
                    onChange={(value) => setFormData({ ...formData, requirements: value })}
                    placeholder="Required qualifications, skills..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  >
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>{country.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      placeholder="e.g. Toronto"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.country === 'CA' ? 'Province' : 'State'}
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                      <option value="">Select {formData.country === 'CA' ? 'province' : 'state'}...</option>
                      {availableProvinces.map((prov) => (
                        <option key={prov.code} value={prov.code}>{prov.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location Type</label>
                    <select
                      value={formData.location_type}
                      onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                      <option value="onsite">On-site</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                    <select
                      value={formData.employment_type}
                      onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                      <option value="permanent">Permanent</option>
                      <option value="contract">Contract</option>
                      <option value="contract_to_hire">Contract to Hire</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salary Min <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      required
                      value={formData.salary_min}
                      onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      placeholder="80000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salary Max <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      required
                      value={formData.salary_max}
                      onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      placeholder="120000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={formData.salary_currency}
                      onChange={(e) => setFormData({ ...formData, salary_currency: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                      <option value="CAD">CAD</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fee Percentage</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.fee_percent}
                      onChange={(e) => setFormData({ ...formData, fee_percent: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      placeholder="20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                      <option value="draft">Draft</option>
                      <option value="open">Open</option>
                      <option value="on_hold">On Hold</option>
                      <option value="filled">Filled</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Visibility - only shown if user is part of an agency */}
                {currentUserAgencyId && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <label className="block text-sm font-medium text-blue-900 mb-2">Job Visibility</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="visibility"
                          value="agency_only"
                          checked={formData.visibility === 'agency_only'}
                          onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'platform' | 'agency_only' })}
                          className="w-4 h-4 text-brand-accent"
                        />
                        <span className="text-sm text-gray-700">Agency Only</span>
                        <span className="text-xs text-gray-500">(Visible only to agency members)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="visibility"
                          value="platform"
                          checked={formData.visibility === 'platform'}
                          onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'platform' | 'agency_only' })}
                          className="w-4 h-4 text-brand-accent"
                        />
                        <span className="text-sm text-gray-700">Platform</span>
                        <span className="text-xs text-gray-500">(Visible to all recruiters)</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm() }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-brand-navy text-white font-medium rounded-lg hover:bg-brand-blue transition-colors"
                  >
                    {editingJob ? 'Save Changes' : 'Post Job'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Close Job Modal - Detail View */}
        {showCloseJobModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Close Job</h2>
                <button 
                  type="button"
                  onClick={() => setShowCloseJobModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    value={closeJobStatus}
                    onChange={(e) => {
                      setCloseJobStatus(e.target.value)
                      if (e.target.value !== 'filled') {
                        setPlacementData({ candidate_id: '', start_date: '', starting_salary: '' })
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  >
                    <option value="filled">Filled</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>

                {closeJobStatus === 'filled' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Candidate *</label>
                      <select
                        value={placementData.candidate_id}
                        onChange={(e) => setPlacementData({ ...placementData, candidate_id: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      >
                        <option value="">
                          {applications.length === 0 
                            ? 'No candidates in pipeline' 
                            : 'Select candidate...'}
                        </option>
                        {applications.map((app) => (
                          <option key={app.id} value={app.candidate_id}>
                            {app.candidates.first_name} {app.candidates.last_name}
                            {app.candidates.current_title ? ` - ${app.candidates.current_title}` : ''}
                            {` (${app.stage})`}
                          </option>
                        ))}
                      </select>
                      {applications.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          Add candidates to the pipeline before closing as filled
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                      <input
                        type="date"
                        value={placementData.start_date}
                        onChange={(e) => setPlacementData({ ...placementData, start_date: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Starting Salary *</label>
                      <input
                        type="number"
                        value={placementData.starting_salary}
                        onChange={(e) => setPlacementData({ ...placementData, starting_salary: e.target.value })}
                        placeholder="85000"
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCloseJobModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={closeJob}
                    disabled={closingJob || (closeJobStatus === 'filled' && (!placementData.candidate_id || !placementData.start_date || !placementData.starting_salary))}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {closingJob ? 'Closing...' : 'Close Job'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // List View
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 mt-1">Manage your job postings</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-navy text-white font-medium rounded-lg hover:bg-brand-blue transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Job
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
        {/* Agency Jobs tab - only shown if user is part of an agency */}
        {currentUserAgencyId && (
          <button
            onClick={() => setActiveTab('agency')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'agency'
                ? 'border-brand-accent text-brand-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Agency Jobs
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'agency' ? 'bg-brand-accent/10 text-brand-accent' : 'bg-gray-100 text-gray-600'
            }`}>
              {agencyJobsCount}
            </span>
          </button>
        )}
        <button
          onClick={() => setActiveTab('platform')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'platform'
              ? 'border-brand-accent text-brand-accent'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Platform Jobs
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'platform' ? 'bg-brand-accent/10 text-brand-accent' : 'bg-gray-100 text-gray-600'
          }`}>
            {platformJobsCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('mine')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'mine'
              ? 'border-brand-accent text-brand-accent'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          My Jobs
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'mine' ? 'bg-brand-accent/10 text-brand-accent' : 'bg-gray-100 text-gray-600'
          }`}>
            {myJobsCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'closed'
              ? 'border-brand-accent text-brand-accent'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          My Closed Jobs
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'closed' ? 'bg-brand-accent/10 text-brand-accent' : 'bg-gray-100 text-gray-600'
          }`}>
            {myClosedJobsCount}
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No jobs found' : 
              activeTab === 'agency' ? 'No agency jobs' :
              activeTab === 'platform' ? 'No platform jobs' :
              activeTab === 'mine' ? 'No open jobs' : 'No closed jobs'}
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {searchQuery 
              ? 'Try a different search term' 
              : activeTab === 'agency'
                ? 'No open jobs from your agency at this time.'
                : activeTab === 'platform'
                  ? 'No open jobs from other recruiters at this time.'
                  : activeTab === 'mine' 
                    ? 'Post a new job to start tracking candidates and placements.'
                    : 'You have no closed or filled jobs yet.'}
          </p>
          {!searchQuery && activeTab === 'mine' && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-navy text-white font-medium rounded-lg hover:bg-brand-blue transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Job
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((job) => (
            <div 
              key={job.id} 
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:border-brand-accent transition-colors"
              onClick={() => openDetailView(job)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[job.status]}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                    {(job.status === 'filled' || job.status === 'cancelled') && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-red-600 text-white">
                        <XCircle className="w-3.5 h-3.5" />
                        CLOSED
                      </span>
                    )}
                    {job.is_published && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-brand-green/10 text-brand-green">
                        <Globe className="w-3 h-3" />
                        Published
                      </span>
                    )}
                    {job.visibility === 'agency_only' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                        <Lock className="w-3 h-3" />
                        Agency Only
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    {job.clients && (
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {job.clients.company_name}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {formatLocation(job.city, job.state, job.country, job.location_type)}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                    </div>
                    {job.fee_percent && (
                      <div className="text-brand-green font-medium">
                        {job.fee_percent}% fee
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    {job.employment_type.replace('_', ' ')} · Created {new Date(job.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setMenuOpen(menuOpen === job.id ? null : job.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </button>
                  {menuOpen === job.id && (
                    <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                      <button
                        onClick={() => openEditModal(job)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => togglePublish(job)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {job.is_published ? <EyeOff className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                        {job.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingJob ? 'Edit Job' : 'Create Job'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <select
                  required
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value, hiring_manager_id: '' })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                >
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.company_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hiring Manager *</label>
                <select
                  required
                  value={formData.hiring_manager_id}
                  onChange={(e) => setFormData({ ...formData, hiring_manager_id: e.target.value })}
                  disabled={!formData.client_id}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">{formData.client_id ? (clientContacts.length === 0 ? 'No contacts - add in Clients page' : 'Select hiring manager...') : 'Select a client first...'}</option>
                  {clientContacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}{contact.title ? ` - ${contact.title}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={anonymizeJobDescription}
                      disabled={rewritingJD || (!formData.description && !formData.requirements)}
                      className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {rewritingJD ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      {rewritingJD ? 'Anonymizing...' : 'Anonymize'}
                    </button>
                    <button
                      type="button"
                      onClick={generateJobDescription}
                      disabled={generatingJD || !formData.title}
                      className="flex items-center gap-1 text-sm text-brand-accent hover:text-brand-blue disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingJD ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {generatingJD ? 'Generating...' : 'Generate with AI'}
                    </button>
                  </div>
                </div>
                <RichTextEditor
                  key={`desc2-${editingJob?.id || 'new'}`}
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Job description, responsibilities..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
                <RichTextEditor
                  key={`req2-${editingJob?.id || 'new'}`}
                  value={formData.requirements}
                  onChange={(value) => setFormData({ ...formData, requirements: value })}
                  placeholder="Required qualifications, skills..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    placeholder="e.g. Toronto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.country === 'CA' ? 'Province' : 'State'}
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  >
                    <option value="">Select {formData.country === 'CA' ? 'province' : 'state'}...</option>
                    {availableProvinces.map((prov) => (
                      <option key={prov.code} value={prov.code}>{prov.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Type</label>
                  <select
                    value={formData.location_type}
                    onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  >
                    <option value="onsite">On-site</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  >
                    <option value="permanent">Permanent</option>
                    <option value="contract">Contract</option>
                    <option value="contract_to_hire">Contract to Hire</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Min <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={formData.salary_min}
                    onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    placeholder="80000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Max <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={formData.salary_max}
                    onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    placeholder="120000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={formData.salary_currency}
                    onChange={(e) => setFormData({ ...formData, salary_currency: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  >
                    <option value="CAD">CAD</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fee Percentage</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.fee_percent}
                    onChange={(e) => setFormData({ ...formData, fee_percent: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    placeholder="20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  >
                    <option value="draft">Draft</option>
                    <option value="open">Open</option>
                    <option value="on_hold">On Hold</option>
                    <option value="filled">Filled</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Visibility - only shown if user is part of an agency */}
              {currentUserAgencyId && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-sm font-medium text-blue-900 mb-2">Job Visibility</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility_modal"
                        value="agency_only"
                        checked={formData.visibility === 'agency_only'}
                        onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'platform' | 'agency_only' })}
                        className="w-4 h-4 text-brand-accent"
                      />
                      <span className="text-sm text-gray-700">Agency Only</span>
                      <span className="text-xs text-gray-500">(Visible only to agency members)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility_modal"
                        value="platform"
                        checked={formData.visibility === 'platform'}
                        onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'platform' | 'agency_only' })}
                        className="w-4 h-4 text-brand-accent"
                      />
                      <span className="text-sm text-gray-700">Platform</span>
                      <span className="text-xs text-gray-500">(Visible to all recruiters)</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-brand-navy text-white font-medium rounded-lg hover:bg-brand-blue transition-colors"
                >
                  {editingJob ? 'Save Changes' : 'Post Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Job Modal */}
      {showCloseJobModal && selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Close Job</h2>
              <button 
                onClick={() => setShowCloseJobModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select
                  value={closeJobStatus}
                  onChange={(e) => {
                    setCloseJobStatus(e.target.value)
                    if (e.target.value !== 'filled') {
                      setPlacementData({ candidate_id: '', start_date: '', starting_salary: '' })
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                >
                  <option value="filled">Filled</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>

              {closeJobStatus === 'filled' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Candidate *</label>
                    <select
                      value={placementData.candidate_id}
                      onChange={(e) => setPlacementData({ ...placementData, candidate_id: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                      <option value="">
                        {getCandidatesInPipeline(selectedJob.id).length === 0 
                          ? 'No candidates in pipeline' 
                          : 'Select candidate...'}
                      </option>
                      {getCandidatesInPipeline(selectedJob.id).map((app) => (
                        <option key={app.id} value={app.candidate_id}>
                          {app.candidates.first_name} {app.candidates.last_name}
                          {app.candidates.current_title ? ` - ${app.candidates.current_title}` : ''}
                          {` (${app.stage})`}
                        </option>
                      ))}
                    </select>
                    {getCandidatesInPipeline(selectedJob.id).length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Add candidates to the pipeline before closing as filled
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={placementData.start_date}
                      onChange={(e) => setPlacementData({ ...placementData, start_date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Starting Salary *</label>
                    <input
                      type="number"
                      value={placementData.starting_salary}
                      onChange={(e) => setPlacementData({ ...placementData, starting_salary: e.target.value })}
                      placeholder="85000"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCloseJobModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={closeJob}
                  disabled={closingJob || (closeJobStatus === 'filled' && (!placementData.candidate_id || !placementData.start_date || !placementData.starting_salary))}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {closingJob ? 'Closing...' : 'Close Job'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
