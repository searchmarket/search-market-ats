'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { countries, provinces } from '@/lib/location-data'
import { 
  Plus, Search, Users, MoreVertical, Pencil, Trash2, X, Mail, Phone, 
  MapPin, Briefcase, Linkedin, Github, Facebook, Instagram, ArrowLeft,
  FileText, UserPlus, Upload, Loader2, Clock, Lock, Unlock, MessageSquare,
  PhoneCall, Calendar, User, AlertCircle, Download, File, Image, CreditCard, FolderOpen
} from 'lucide-react'

interface Job {
  id: string
  title: string
  clients: { company_name: string } | null
}

interface Application {
  id: string
  stage: string
  job_id: string
  jobs: Job
}

interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  github_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  city: string | null
  state: string | null
  country: string | null
  current_title: string | null
  current_company: string | null
  years_experience: number | null
  skills: string[] | null
  notes: string | null
  source: string | null
  status: string
  created_at: string
  owned_by: string | null
  owned_at: string | null
  exclusive_until: string | null
  last_two_way_contact: string | null
  recruiter_id: string
  owner?: { full_name: string | null; email: string } | null
}

interface ActivityLog {
  id: string
  candidate_id: string
  recruiter_id: string
  activity_type: string
  direction: string | null
  channel: string | null
  notes: string | null
  metadata: any
  duration_seconds: number | null
  created_at: string
  recruiter?: { full_name: string | null } | null
}

interface CandidateFile {
  id: string
  candidate_id: string
  recruiter_id: string
  file_name: string
  file_type: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}

export default function CandidatesPage() {
  const searchParams = useSearchParams()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [candidateFiles, setCandidateFiles] = useState<CandidateFile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetailView, setShowDetailView] = useState(false)
  const [showAddToJobModal, setShowAddToJobModal] = useState(false)
  const [showLogActivityModal, setShowLogActivityModal] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [parsingResume, setParsingResume] = useState(false)
  const [generatingResume, setGeneratingResume] = useState(false)
  const [claimingCandidate, setClaimingCandidate] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [filterOwnership, setFilterOwnership] = useState<'all' | 'mine' | 'open'>('all')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadingResume, setUploadingResume] = useState(false)
  const supabase = createClient()

  const [activityFormData, setActivityFormData] = useState({
    activity_type: 'note',
    channel: '',
    direction: '',
    notes: '',
    duration_seconds: ''
  })

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    github_url: '',
    facebook_url: '',
    instagram_url: '',
    city: '',
    state: '',
    country: 'CA',
    current_title: '',
    current_company: '',
    years_experience: '',
    skills: '',
    notes: '',
    source: '',
    status: 'active'
  })

  const availableProvinces = provinces[formData.country] || []

  useEffect(() => {
    getCurrentUser()
    fetchCandidates()
    fetchJobs()
  }, [])

  // Handle deep link to specific candidate
  useEffect(() => {
    const candidateId = searchParams.get('id')
    if (candidateId && candidates.length > 0) {
      const candidate = candidates.find(c => c.id === candidateId)
      if (candidate) {
        setSelectedCandidate(candidate)
        setShowDetailView(true)
      }
    }
  }, [searchParams, candidates])

  useEffect(() => {
    if (formData.state && !availableProvinces.find(p => p.code === formData.state)) {
      setFormData(prev => ({ ...prev, state: '' }))
    }
  }, [formData.country])

  useEffect(() => {
    if (selectedCandidate) {
      fetchApplicationsForCandidate(selectedCandidate.id)
      fetchActivityLogs(selectedCandidate.id)
      fetchCandidateFiles(selectedCandidate.id)
    }
  }, [selectedCandidate])

  async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
    }
  }

  async function fetchCandidates() {
    const { data, error } = await supabase
      .from('candidates')
      .select('*, owner:recruiters!owned_by(full_name, email)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching candidates:', error)
    } else {
      setCandidates((data as unknown as Candidate[]) || [])
    }
    setLoading(false)
  }

  async function fetchActivityLogs(candidateId: string) {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*, recruiter:recruiters(full_name)')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching activity logs:', error)
    } else {
      setActivityLogs((data as unknown as ActivityLog[]) || [])
    }
  }

  async function fetchCandidateFiles(candidateId: string) {
    const { data, error } = await supabase
      .from('candidate_files')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching candidate files:', error)
    } else {
      setCandidateFiles((data as unknown as CandidateFile[]) || [])
    }
  }

  async function handleUploadResumeToStorage(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedCandidate || !currentUserId) return
    
    const file = e.target.files?.[0]
    if (!file) return

    // Only PDF supported for AI resume conversion
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are supported for resume conversion to Word')
      return
    }

    setUploadingResume(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('candidateId', selectedCandidate.id)
      formData.append('recruiterId', currentUserId)

      const response = await fetch('/api/upload-resume', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload resume')
      }

      alert('Resume uploaded and converted to Word format!')
      fetchCandidateFiles(selectedCandidate.id)
    } catch (error) {
      console.error('Error uploading resume:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload resume')
    }

    setUploadingResume(false)
    e.target.value = ''
  }

  async function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>, fileType: string) {
    if (!selectedCandidate || !currentUserId) return
    
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('candidateId', selectedCandidate.id)
      formData.append('recruiterId', currentUserId)
      formData.append('fileType', fileType)

      const response = await fetch('/api/candidate-files', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload file')
      }

      alert('File uploaded successfully!')
      fetchCandidateFiles(selectedCandidate.id)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload file')
    }

    setUploadingFile(false)
    e.target.value = ''
  }

  async function handleDownloadFile(file: CandidateFile) {
    try {
      const response = await fetch('/api/candidate-files/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: file.file_path })
      })

      if (!response.ok) {
        throw new Error('Failed to get download URL')
      }

      const { url } = await response.json()
      
      // Open in new tab or download
      const link = document.createElement('a')
      link.href = url
      link.download = file.file_name
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading file:', error)
      alert('Failed to download file')
    }
  }

  async function handleDeleteFile(file: CandidateFile) {
    if (!confirm(`Delete "${file.file_name}"? This cannot be undone.`)) return

    try {
      const response = await fetch('/api/candidate-files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id, filePath: file.file_path })
      })

      if (!response.ok) {
        throw new Error('Failed to delete file')
      }

      if (selectedCandidate) {
        fetchCandidateFiles(selectedCandidate.id)
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Failed to delete file')
    }
  }

  function formatFileSize(bytes: number | null): string {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function getFileIcon(fileType: string, mimeType: string | null) {
    if (fileType === 'resume') return FileText
    if (fileType === 'id') return CreditCard
    if (mimeType?.startsWith('image/')) return Image
    return File
  }

  async function fetchJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, clients(company_name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching jobs:', error)
    } else {
      setJobs((data as unknown as Job[]) || [])
    }
  }

  async function fetchApplicationsForCandidate(candidateId: string) {
    const { data, error } = await supabase
      .from('applications')
      .select('id, stage, job_id, jobs(id, title, clients(company_name))')
      .eq('candidate_id', candidateId)

    if (error) {
      console.error('Error fetching applications:', error)
    } else {
      setApplications((data as unknown as Application[]) || [])
    }
  }

  // Ownership status helper
  function getOwnershipStatus(candidate: Candidate): 'owned' | 'exclusive' | 'open' {
    const now = new Date()
    
    // Check if in exclusive window
    if (candidate.exclusive_until && new Date(candidate.exclusive_until) > now) {
      return 'exclusive'
    }
    
    // Check if owned
    if (candidate.owned_by) {
      return 'owned'
    }
    
    return 'open'
  }

  // Check if current user can claim
  function canClaim(candidate: Candidate): boolean {
    const status = getOwnershipStatus(candidate)
    
    if (status === 'open') return true
    if (status === 'exclusive' && candidate.recruiter_id === currentUserId) return true
    
    return false
  }

  // Check if current user owns this candidate
  function isOwner(candidate: Candidate): boolean {
    return candidate.owned_by === currentUserId
  }

  async function handleClaimCandidate() {
    if (!selectedCandidate || !currentUserId) return
    
    setClaimingCandidate(true)

    const { error } = await supabase
      .from('candidates')
      .update({
        owned_by: currentUserId,
        owned_at: new Date().toISOString()
      })
      .eq('id', selectedCandidate.id)

    if (error) {
      console.error('Error claiming candidate:', error)
      alert('Error claiming candidate')
    } else {
      // Log the claim activity
      await supabase.from('activity_logs').insert([{
        candidate_id: selectedCandidate.id,
        recruiter_id: currentUserId,
        activity_type: 'claimed',
        channel: 'system',
        notes: 'Candidate claimed'
      }])

      // Refresh data
      fetchCandidates()
      setSelectedCandidate({
        ...selectedCandidate,
        owned_by: currentUserId,
        owned_at: new Date().toISOString()
      })
      fetchActivityLogs(selectedCandidate.id)
    }

    setClaimingCandidate(false)
  }

  async function handleReleaseCandidate() {
    if (!selectedCandidate || !currentUserId) return
    
    if (!confirm('Are you sure you want to release this candidate? Another recruiter can claim them.')) return

    const { error } = await supabase
      .from('candidates')
      .update({
        owned_by: null,
        owned_at: null
      })
      .eq('id', selectedCandidate.id)

    if (error) {
      console.error('Error releasing candidate:', error)
      alert('Error releasing candidate')
    } else {
      // Log the release activity
      await supabase.from('activity_logs').insert([{
        candidate_id: selectedCandidate.id,
        recruiter_id: currentUserId,
        activity_type: 'released',
        channel: 'system',
        notes: 'Candidate released'
      }])

      // Refresh data
      fetchCandidates()
      setSelectedCandidate({
        ...selectedCandidate,
        owned_by: null,
        owned_at: null
      })
      fetchActivityLogs(selectedCandidate.id)
    }
  }

  async function handleLogActivity(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCandidate || !currentUserId) return

    const { error } = await supabase.from('activity_logs').insert([{
      candidate_id: selectedCandidate.id,
      recruiter_id: currentUserId,
      activity_type: activityFormData.activity_type,
      channel: activityFormData.channel || null,
      direction: activityFormData.direction || null,
      notes: activityFormData.notes || null,
      duration_seconds: activityFormData.duration_seconds ? parseInt(activityFormData.duration_seconds) : null
    }])

    if (error) {
      console.error('Error logging activity:', error)
      alert('Error logging activity')
    } else {
      // If this is a two-way communication, update last_two_way_contact
      if (activityFormData.direction === 'inbound' || 
          (activityFormData.direction === 'outbound' && activityFormData.activity_type === 'message')) {
        await supabase
          .from('candidates')
          .update({ last_two_way_contact: new Date().toISOString() })
          .eq('id', selectedCandidate.id)
      }

      setShowLogActivityModal(false)
      setActivityFormData({
        activity_type: 'note',
        channel: '',
        direction: '',
        notes: '',
        duration_seconds: ''
      })
      fetchActivityLogs(selectedCandidate.id)
    }
  }

  // Helper to normalize URLs - adds https:// if missing
  function normalizeUrl(url: string | null): string | null {
    if (!url || url.trim() === '') return null
    const trimmed = url.trim()
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed
    }
    return `https://${trimmed}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const candidateData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email || null,
      phone: formData.phone || null,
      linkedin_url: normalizeUrl(formData.linkedin_url),
      github_url: normalizeUrl(formData.github_url),
      facebook_url: normalizeUrl(formData.facebook_url),
      instagram_url: normalizeUrl(formData.instagram_url),
      city: formData.city || null,
      state: formData.state || null,
      country: formData.country,
      current_title: formData.current_title || null,
      current_company: formData.current_company || null,
      years_experience: formData.years_experience ? parseFloat(formData.years_experience) : null,
      skills: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(Boolean) : null,
      notes: formData.notes || null,
      source: formData.source || null,
      status: formData.status
    }

    if (editingCandidate) {
      const { error } = await supabase
        .from('candidates')
        .update(candidateData)
        .eq('id', editingCandidate.id)

      if (error) {
        console.error('Error updating candidate:', error)
        alert('Error updating candidate')
      } else {
        setShowModal(false)
        setEditingCandidate(null)
        resetForm()
        fetchCandidates()
        if (selectedCandidate?.id === editingCandidate.id) {
          setSelectedCandidate({ ...selectedCandidate, ...candidateData })
        }
      }
    } else {
      const { error } = await supabase
        .from('candidates')
        .insert([{ ...candidateData, recruiter_id: user.id }])

      if (error) {
        console.error('Error creating candidate:', error)
        alert('Error creating candidate')
      } else {
        setShowModal(false)
        resetForm()
        fetchCandidates()
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this candidate?')) return

    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting candidate:', error)
      alert('Error deleting candidate')
    } else {
      fetchCandidates()
      if (selectedCandidate?.id === id) {
        setShowDetailView(false)
        setSelectedCandidate(null)
      }
    }
    setMenuOpen(null)
  }

  async function handleAddToJob(jobId: string) {
    if (!selectedCandidate) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('applications')
      .insert([{
        job_id: jobId,
        candidate_id: selectedCandidate.id,
        recruiter_id: user.id,
        stage: 'sourced'
      }])

    if (error) {
      if (error.code === '23505') {
        alert('Candidate is already added to this job')
      } else {
        console.error('Error adding to job:', error)
        alert('Error adding candidate to job')
      }
    } else {
      setShowAddToJobModal(false)
      fetchApplicationsForCandidate(selectedCandidate.id)
    }
  }

  function openDetailView(candidate: Candidate) {
    setSelectedCandidate(candidate)
    setShowDetailView(true)
    setMenuOpen(null)
  }

  function openEditModal(candidate: Candidate) {
    setEditingCandidate(candidate)
    setFormData({
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email || '',
      phone: candidate.phone || '',
      linkedin_url: candidate.linkedin_url || '',
      github_url: candidate.github_url || '',
      facebook_url: candidate.facebook_url || '',
      instagram_url: candidate.instagram_url || '',
      city: candidate.city || '',
      state: candidate.state || '',
      country: candidate.country || 'CA',
      current_title: candidate.current_title || '',
      current_company: candidate.current_company || '',
      years_experience: candidate.years_experience?.toString() || '',
      skills: candidate.skills?.join(', ') || '',
      notes: candidate.notes || '',
      source: candidate.source || '',
      status: candidate.status
    })
    setShowModal(true)
    setMenuOpen(null)
  }

  function resetForm() {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      linkedin_url: '',
      github_url: '',
      facebook_url: '',
      instagram_url: '',
      city: '',
      state: '',
      country: 'CA',
      current_title: '',
      current_company: '',
      years_experience: '',
      skills: '',
      notes: '',
      source: '',
      status: 'active'
    })
    setEditingCandidate(null)
  }

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF or Word document')
      return
    }

    setParsingResume(true)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formDataUpload
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to parse resume')
      }

      const data = await response.json()

      // Update form with parsed data
      setFormData(prev => ({
        ...prev,
        first_name: data.first_name || prev.first_name,
        last_name: data.last_name || prev.last_name,
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        linkedin_url: data.linkedin_url || prev.linkedin_url,
        github_url: data.github_url || prev.github_url,
        city: data.city || prev.city,
        state: data.state || prev.state,
        country: data.country || prev.country,
        current_title: data.current_title || prev.current_title,
        current_company: data.current_company || prev.current_company,
        years_experience: data.years_experience?.toString() || prev.years_experience,
        skills: data.skills?.join(', ') || prev.skills,
        notes: data.summary || prev.notes,
        source: 'Resume Upload'
      }))

      setShowModal(true)
    } catch (error) {
      console.error('Error parsing resume:', error)
      alert(error instanceof Error ? error.message : 'Failed to parse resume. Please try again.')
    }

    setParsingResume(false)
    // Reset file input
    e.target.value = ''
  }

  async function handleResumeUploadForCandidate(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedCandidate) return
    
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF or Word document')
      return
    }

    if (!confirm('This will overwrite the current candidate data with information from the resume. Continue?')) {
      e.target.value = ''
      return
    }

    setParsingResume(true)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formDataUpload
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to parse resume')
      }

      const data = await response.json()

      // Update candidate directly in database
      const updateData = {
        first_name: data.first_name || selectedCandidate.first_name,
        last_name: data.last_name || selectedCandidate.last_name,
        email: data.email || selectedCandidate.email,
        phone: data.phone || selectedCandidate.phone,
        linkedin_url: data.linkedin_url || selectedCandidate.linkedin_url,
        github_url: data.github_url || selectedCandidate.github_url,
        city: data.city || selectedCandidate.city,
        state: data.state || selectedCandidate.state,
        country: data.country || selectedCandidate.country,
        current_title: data.current_title || selectedCandidate.current_title,
        current_company: data.current_company || selectedCandidate.current_company,
        years_experience: data.years_experience || selectedCandidate.years_experience,
        skills: data.skills || selectedCandidate.skills,
        notes: data.summary || selectedCandidate.notes
      }

      const { error } = await supabase
        .from('candidates')
        .update(updateData)
        .eq('id', selectedCandidate.id)

      if (error) {
        throw new Error('Failed to update candidate')
      }

      // Update local state
      setSelectedCandidate({ ...selectedCandidate, ...updateData })
      fetchCandidates()
      alert('Candidate profile updated from resume!')

    } catch (error) {
      console.error('Error parsing resume:', error)
      alert(error instanceof Error ? error.message : 'Failed to parse resume. Please try again.')
    }

    setParsingResume(false)
    e.target.value = ''
  }

  async function handleGenerateResume() {
    if (!selectedCandidate) return

    setGeneratingResume(true)

    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedCandidate)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate resume')
      }

      const { html } = await response.json()

      // Open in new window for printing/saving
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
      } else {
        alert('Please allow popups to view the resume')
      }
    } catch (error) {
      console.error('Error generating resume:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate resume. Please try again.')
    }

    setGeneratingResume(false)
  }

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = 
      `${candidate.first_name} ${candidate.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.current_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    
    if (!matchesSearch) return false

    // Ownership filter
    if (filterOwnership === 'mine') {
      return candidate.owned_by === currentUserId
    }
    if (filterOwnership === 'open') {
      return !candidate.owned_by && (!candidate.exclusive_until || new Date(candidate.exclusive_until) <= new Date())
    }
    
    return true
  })

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    placed: 'bg-blue-100 text-blue-700',
    do_not_contact: 'bg-red-100 text-red-700'
  }

  const ownershipColors: Record<string, { bg: string; text: string; icon: any }> = {
    owned: { bg: 'bg-red-100', text: 'text-red-700', icon: Lock },
    exclusive: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
    open: { bg: 'bg-green-100', text: 'text-green-700', icon: Unlock }
  }

  const activityTypeLabels: Record<string, string> = {
    message: 'Message',
    call: 'Phone Call',
    meeting: 'Meeting',
    interview: 'Interview',
    note: 'Note',
    status_change: 'Status Change',
    claimed: 'Claimed',
    released: 'Released'
  }

  const channelLabels: Record<string, string> = {
    email: 'Email',
    phone: 'Phone',
    sms: 'SMS',
    linkedin: 'LinkedIn',
    in_person: 'In Person',
    system: 'System'
  }

  const stageColors: Record<string, string> = {
    applied: 'bg-indigo-100 text-indigo-700',
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

  const formatLocation = (city: string | null, state: string | null, country: string | null) => {
    const stateName = country && state ? provinces[country]?.find(p => p.code === state)?.name || state : state
    return [city, stateName].filter(Boolean).join(', ') || null
  }

  // Detail View
  if (showDetailView && selectedCandidate) {
    return (
      <div className="p-8">
        {/* Back Button */}
        <button
          onClick={() => { setShowDetailView(false); setSelectedCandidate(null) }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Candidates
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center text-brand-green font-semibold text-2xl">
                    {selectedCandidate.first_name[0]}{selectedCandidate.last_name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-2xl font-bold text-gray-900">
                        {selectedCandidate.first_name} {selectedCandidate.last_name}
                      </h1>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[selectedCandidate.status]}`}>
                        {selectedCandidate.status.replace('_', ' ')}
                      </span>
                      {/* Ownership Badge */}
                      {(() => {
                        const status = getOwnershipStatus(selectedCandidate)
                        const colors = ownershipColors[status]
                        const Icon = colors.icon
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                            <Icon className="w-3 h-3" />
                            {status === 'owned' ? (isOwner(selectedCandidate) ? 'You Own' : `Owned by ${selectedCandidate.owner?.full_name || 'Another'}`) : 
                             status === 'exclusive' ? 'Exclusive' : 'Open'}
                          </span>
                        )
                      })()}
                    </div>
                    {(selectedCandidate.current_title || selectedCandidate.current_company) && (
                      <p className="text-gray-600">
                        {[selectedCandidate.current_title, selectedCandidate.current_company].filter(Boolean).join(' at ')}
                      </p>
                    )}
                    {selectedCandidate.years_experience && (
                      <p className="text-sm text-gray-500 mt-1">
                        {selectedCandidate.years_experience} years experience
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Claim/Release Button */}
                  {!isOwner(selectedCandidate) && (
                    <button
                      onClick={handleClaimCandidate}
                      disabled={claimingCandidate || !canClaim(selectedCandidate)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                        canClaim(selectedCandidate) 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {claimingCandidate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      Claim
                    </button>
                  )}
                  {isOwner(selectedCandidate) && (
                    <button
                      onClick={handleReleaseCandidate}
                      className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Unlock className="w-4 h-4" />
                      Release
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(selectedCandidate)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowAddToJobModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-brand-green text-white rounded-lg hover:bg-green-700"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add to Job
                  </button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100">
                {selectedCandidate.email && (
                  <a href={`mailto:${selectedCandidate.email}`} className="flex items-center gap-2 text-gray-600 hover:text-brand-blue">
                    <Mail className="w-4 h-4" />
                    {selectedCandidate.email}
                  </a>
                )}
                {selectedCandidate.phone && (
                  <a href={`tel:${selectedCandidate.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-brand-blue">
                    <Phone className="w-4 h-4" />
                    {selectedCandidate.phone}
                  </a>
                )}
                {formatLocation(selectedCandidate.city, selectedCandidate.state, selectedCandidate.country) && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {formatLocation(selectedCandidate.city, selectedCandidate.state, selectedCandidate.country)}
                  </div>
                )}
              </div>

              {/* Social Links */}
              <div className="flex flex-wrap gap-3 pt-4">
                {selectedCandidate.linkedin_url && (
                  <a href={selectedCandidate.linkedin_url} target="_blank" rel="noopener noreferrer" 
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </a>
                )}
                {selectedCandidate.github_url && (
                  <a href={selectedCandidate.github_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <Github className="w-4 h-4" />
                    GitHub
                  </a>
                )}
                {selectedCandidate.facebook_url && (
                  <a href={selectedCandidate.facebook_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
                    <Facebook className="w-4 h-4" />
                    Facebook
                  </a>
                )}
                {selectedCandidate.instagram_url && (
                  <a href={selectedCandidate.instagram_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100">
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </a>
                )}
              </div>
            </div>

            {/* Skills */}
            {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.skills.map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedCandidate.notes && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                <p className="text-gray-600 whitespace-pre-wrap">{selectedCandidate.notes}</p>
              </div>
            )}

            {/* Activity Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Activity Timeline</h2>
                <button
                  onClick={() => setShowLogActivityModal(true)}
                  className="flex items-center gap-1 text-sm text-brand-accent hover:underline"
                >
                  <Plus className="w-4 h-4" />
                  Log Activity
                </button>
              </div>
              {activityLogs.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activity logged yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        log.activity_type === 'claimed' ? 'bg-green-100 text-green-600' :
                        log.activity_type === 'released' ? 'bg-red-100 text-red-600' :
                        log.channel === 'email' ? 'bg-blue-100 text-blue-600' :
                        log.channel === 'phone' ? 'bg-purple-100 text-purple-600' :
                        log.channel === 'sms' ? 'bg-green-100 text-green-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {log.activity_type === 'claimed' ? <Lock className="w-4 h-4" /> :
                         log.activity_type === 'released' ? <Unlock className="w-4 h-4" /> :
                         log.channel === 'email' ? <Mail className="w-4 h-4" /> :
                         log.channel === 'phone' ? <PhoneCall className="w-4 h-4" /> :
                         log.channel === 'sms' ? <MessageSquare className="w-4 h-4" /> :
                         log.activity_type === 'meeting' || log.activity_type === 'interview' ? <Calendar className="w-4 h-4" /> :
                         <FileText className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {activityTypeLabels[log.activity_type] || log.activity_type}
                          </span>
                          {log.channel && log.channel !== 'system' && (
                            <span className="text-xs text-gray-500">
                              via {channelLabels[log.channel] || log.channel}
                            </span>
                          )}
                          {log.direction && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              log.direction === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {log.direction}
                            </span>
                          )}
                        </div>
                        {log.notes && (
                          <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                        )}
                        {log.duration_seconds && (
                          <p className="text-xs text-gray-500 mt-1">
                            Duration: {Math.floor(log.duration_seconds / 60)}m {log.duration_seconds % 60}s
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span>{log.recruiter?.full_name || 'Unknown'}</span>
                          <span>•</span>
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Jobs Applied */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Jobs</h2>
              {applications.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Not linked to any jobs</p>
                  <button
                    onClick={() => setShowAddToJobModal(true)}
                    className="mt-3 text-sm text-brand-green hover:underline"
                  >
                    Add to a job
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div key={app.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900">{app.jobs.title}</div>
                      {app.jobs.clients && (
                        <div className="text-sm text-gray-500">{app.jobs.clients.company_name}</div>
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
                  <span className="text-gray-500">Source</span>
                  <span className="text-gray-900">{selectedCandidate.source || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Added</span>
                  <span className="text-gray-900">{new Date(selectedCandidate.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Files */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Files</h2>
                <div className="flex gap-1">
                  <label className="p-1.5 hover:bg-gray-100 rounded cursor-pointer" title="Upload Resume (converts to Word)">
                    {uploadingResume ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                    ) : (
                      <FileText className="w-4 h-4 text-gray-500" />
                    )}
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleUploadResumeToStorage}
                      disabled={uploadingResume}
                      className="hidden"
                    />
                  </label>
                  <label className="p-1.5 hover:bg-gray-100 rounded cursor-pointer" title="Upload ID/Document">
                    {uploadingFile ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                    ) : (
                      <Plus className="w-4 h-4 text-gray-500" />
                    )}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                      onChange={(e) => handleUploadFile(e, 'document')}
                      disabled={uploadingFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              {candidateFiles.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No files yet</p>
                  <p className="text-xs mt-1">Upload a resume or document</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {candidateFiles.map((file) => {
                    const FileIcon = getFileIcon(file.file_type, file.mime_type)
                    return (
                      <div key={file.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group">
                        <FileIcon className="w-4 h-4 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{file.file_name}</div>
                          <div className="text-xs text-gray-500">
                            {file.file_type} • {formatFileSize(file.file_size)}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDownloadFile(file)}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Download"
                          >
                            <Download className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file)}
                            className="p-1 hover:bg-red-100 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-2">
                <label className={`w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer ${parsingResume ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {parsingResume ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {parsingResume ? 'Parsing...' : 'Upload Resume'}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeUploadForCandidate}
                    disabled={parsingResume}
                    className="hidden"
                  />
                </label>
                <button 
                  onClick={handleGenerateResume}
                  disabled={generatingResume}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg ${generatingResume ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {generatingResume ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  {generatingResume ? 'Generating...' : 'Generate Resume'}
                </button>
                <button
                  onClick={() => handleDelete(selectedCandidate.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Candidate
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Add to Job Modal */}
        {showAddToJobModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Add to Job</h2>
                <button onClick={() => setShowAddToJobModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                {jobs.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No open jobs available</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {jobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => handleAddToJob(job.id)}
                        className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg"
                      >
                        <div className="font-medium text-gray-900">{job.title}</div>
                        {job.clients && (
                          <div className="text-sm text-gray-500">{job.clients.company_name}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Log Activity Modal */}
        {showLogActivityModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Log Activity</h2>
                <button onClick={() => setShowLogActivityModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleLogActivity} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type *</label>
                  <select
                    required
                    value={activityFormData.activity_type}
                    onChange={(e) => setActivityFormData({ ...activityFormData, activity_type: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  >
                    <option value="note">Note</option>
                    <option value="message">Message</option>
                    <option value="call">Phone Call</option>
                    <option value="meeting">Meeting</option>
                    <option value="interview">Interview</option>
                  </select>
                </div>

                {(activityFormData.activity_type === 'message' || activityFormData.activity_type === 'call') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                      <select
                        value={activityFormData.channel}
                        onChange={(e) => setActivityFormData({ ...activityFormData, channel: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      >
                        <option value="">Select channel...</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="sms">SMS</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="in_person">In Person</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                      <select
                        value={activityFormData.direction}
                        onChange={(e) => setActivityFormData({ ...activityFormData, direction: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      >
                        <option value="">Select direction...</option>
                        <option value="outbound">Outbound (You → Candidate)</option>
                        <option value="inbound">Inbound (Candidate → You)</option>
                      </select>
                    </div>
                  </>
                )}

                {activityFormData.activity_type === 'call' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={activityFormData.duration_seconds ? Math.floor(parseInt(activityFormData.duration_seconds) / 60) : ''}
                      onChange={(e) => setActivityFormData({ ...activityFormData, duration_seconds: e.target.value ? String(parseInt(e.target.value) * 60) : '' })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      placeholder="e.g. 15"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    rows={3}
                    value={activityFormData.notes}
                    onChange={(e) => setActivityFormData({ ...activityFormData, notes: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    placeholder="Add details about this activity..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowLogActivityModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-brand-green text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Log Activity
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add/Edit Modal - in Detail View */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}
                </h2>
                <button onClick={() => { setShowModal(false); resetForm() }} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>
                </div>

                <h3 className="font-medium text-gray-900 pt-2">Social Profiles</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                    <input
                      type="text"
                      value={formData.linkedin_url}
                      onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GitHub</label>
                    <input
                      type="text"
                      value={formData.github_url}
                      onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      placeholder="https://github.com/..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                    <input
                      type="text"
                      value={formData.facebook_url}
                      onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                    <input
                      type="text"
                      value={formData.instagram_url}
                      onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                </div>

                <h3 className="font-medium text-gray-900 pt-2">Location</h3>
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

                <h3 className="font-medium text-gray-900 pt-2">Experience</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Title</label>
                    <input
                      type="text"
                      value={formData.current_title}
                      onChange={(e) => setFormData({ ...formData, current_title: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Company</label>
                    <input
                      type="text"
                      value={formData.current_company}
                      onChange={(e) => setFormData({ ...formData, current_company: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Years Experience</label>
                    <input
                      type="number"
                      value={formData.years_experience}
                      onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                      <option value="">Select source...</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Indeed">Indeed</option>
                      <option value="Referral">Referral</option>
                      <option value="Job Board">Job Board</option>
                      <option value="Website">Website</option>
                      <option value="Resume Upload">Resume Upload</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                  <input
                    type="text"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    placeholder="JavaScript, React, Node.js (comma separated)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="placed">Placed</option>
                    <option value="do_not_contact">Do Not Contact</option>
                  </select>
                </div>

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
                    className="flex-1 px-4 py-2.5 bg-brand-green text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {editingCandidate ? 'Save Changes' : 'Add Candidate'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // List View
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-500 mt-1">Manage your candidate pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/pipeline"
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Pipeline View
          </Link>
          <label className={`flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${parsingResume ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {parsingResume ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            {parsingResume ? 'Parsing...' : 'Upload Resume'}
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleResumeUpload}
              disabled={parsingResume}
              className="hidden"
            />
          </label>
          <button
            onClick={() => { resetForm(); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-green text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Candidate
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search candidates by name, email, title, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
          />
        </div>
        <select
          value={filterOwnership}
          onChange={(e) => setFilterOwnership(e.target.value as 'all' | 'mine' | 'open')}
          className="px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
        >
          <option value="all">All Candidates</option>
          <option value="mine">My Candidates</option>
          <option value="open">Open Candidates</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filteredCandidates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No candidates found' : 'No candidates yet'}
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {searchQuery ? 'Try a different search term' : 'Add candidates to start building your talent pipeline.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-green text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Your First Candidate
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCandidates.map((candidate) => (
            <div 
              key={candidate.id} 
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:border-brand-accent transition-colors"
              onClick={() => openDetailView(candidate)}
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-brand-green/10 rounded-full flex items-center justify-center text-brand-green font-semibold text-lg">
                    {candidate.first_name[0]}{candidate.last_name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {candidate.first_name} {candidate.last_name}
                      </h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[candidate.status]}`}>
                        {candidate.status.replace('_', ' ')}
                      </span>
                      {/* Ownership Badge */}
                      {(() => {
                        const status = getOwnershipStatus(candidate)
                        const colors = ownershipColors[status]
                        const Icon = colors.icon
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                            <Icon className="w-3 h-3" />
                            {status === 'owned' ? (candidate.owned_by === currentUserId ? 'Mine' : 'Owned') : 
                             status === 'exclusive' ? 'Exclusive' : 'Open'}
                          </span>
                        )
                      })()}
                    </div>
                    {(candidate.current_title || candidate.current_company) && (
                      <div className="flex items-center gap-1 text-gray-600 mb-2">
                        <Briefcase className="w-4 h-4" />
                        {[candidate.current_title, candidate.current_company].filter(Boolean).join(' at ')}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      {candidate.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {candidate.email}
                        </div>
                      )}
                      {formatLocation(candidate.city, candidate.state, candidate.country) && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {formatLocation(candidate.city, candidate.state, candidate.country)}
                        </div>
                      )}
                    </div>
                    {candidate.skills && candidate.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {candidate.skills.slice(0, 5).map((skill, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {skill}
                          </span>
                        ))}
                        {candidate.skills.length > 5 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                            +{candidate.skills.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setMenuOpen(menuOpen === candidate.id ? null : candidate.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </button>
                  {menuOpen === candidate.id && (
                    <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                      <button
                        onClick={() => openEditModal(candidate)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(candidate.id)}
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
              </div>

              <h3 className="font-medium text-gray-900 pt-2">Social Profiles</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                  <input
                    type="text"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GitHub</label>
                  <input
                    type="text"
                    value={formData.github_url}
                    onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                  <input
                    type="text"
                    value={formData.facebook_url}
                    onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                  <input
                    type="text"
                    value={formData.instagram_url}
                    onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </div>

              <h3 className="font-medium text-gray-900 pt-2">Location</h3>
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

              <h3 className="font-medium text-gray-900 pt-2">Experience</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Title</label>
                  <input
                    type="text"
                    value={formData.current_title}
                    onChange={(e) => setFormData({ ...formData, current_title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Company</label>
                  <input
                    type="text"
                    value={formData.current_company}
                    onChange={(e) => setFormData({ ...formData, current_company: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Years Experience</label>
                  <input
                    type="number"
                    value={formData.years_experience}
                    onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  >
                    <option value="">Select source...</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Indeed">Indeed</option>
                    <option value="Referral">Referral</option>
                    <option value="Job Board">Job Board</option>
                    <option value="Website">Website</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  placeholder="JavaScript, React, Node.js (comma separated)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="placed">Placed</option>
                  <option value="do_not_contact">Do Not Contact</option>
                </select>
              </div>

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
                  className="flex-1 px-4 py-2.5 bg-brand-green text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingCandidate ? 'Save Changes' : 'Add Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
