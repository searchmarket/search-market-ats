'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { countries, provinces, industries } from '@/lib/location-data'
import { 
  Plus, Search, Building2, MoreVertical, Pencil, Trash2, X, 
  ArrowLeft, Mail, Phone, Globe, MapPin, Briefcase, Lock, Unlock, 
  Clock, FileText, UserPlus, Users, Loader2, Check, Calendar,
  MessageSquare, PhoneCall, Linkedin, StickyNote, Send, FileSignature,
  CheckCircle
} from 'lucide-react'

interface Job {
  id: string
  title: string
  status: string
}

interface Recruiter {
  id: string
  full_name: string | null
  email: string
}

interface ClientAccess {
  id: string
  recruiter_id: string
  recruiter: Recruiter
}

interface ClientActivityLog {
  id: string
  client_id: string
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

interface Client {
  id: string
  company_name: string
  industry: string | null
  website: string | null
  primary_contact_name: string | null
  primary_contact_email: string | null
  primary_contact_phone: string | null
  city: string | null
  state: string | null
  country: string | null
  notes: string | null
  status: string
  created_at: string
  owned_by: string | null
  owned_at: string | null
  first_outbound_at: string | null
  two_way_established_at: string | null
  contract_signed_at: string | null
  last_two_way_at: string | null
  owner?: { full_name: string | null } | null
}

interface ClientContact {
  id: string
  client_id: string
  name: string
  title: string | null
  email: string | null
  phone: string | null
  is_primary: boolean
  notes: string | null
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetailView, setShowDetailView] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<'mine' | 'unclaimed' | 'all'>('mine')
  const [claimingClient, setClaimingClient] = useState(false)
  const [clientAccess, setClientAccess] = useState<ClientAccess[]>([])
  const [recruiters, setRecruiters] = useState<Recruiter[]>([])
  const [showGrantAccessModal, setShowGrantAccessModal] = useState(false)
  const [selectedRecruiterId, setSelectedRecruiterId] = useState('')
  const [activityLogs, setActivityLogs] = useState<ClientActivityLog[]>([])
  const [showLogActivityModal, setShowLogActivityModal] = useState(false)
  const [activityFormData, setActivityFormData] = useState({
    activity_type: 'note',
    channel: '',
    direction: '',
    notes: '',
    duration_seconds: '',
    call_answered: false
  })
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([])
  const [showAddContactModal, setShowAddContactModal] = useState(false)
  const [contactFormData, setContactFormData] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    notes: ''
  })
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [formData, setFormData] = useState({
    company_name: '',
    industry: '',
    website: '',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    city: '',
    state: '',
    country: 'CA',
    notes: '',
    status: 'active'
  })

  const availableProvinces = provinces[formData.country] || []

  // Handle deep linking from query params
  useEffect(() => {
    const clientId = searchParams.get('id')
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId)
      if (client) {
        setSelectedClient(client)
        setShowDetailView(true)
      }
    }
  }, [searchParams, clients])

  useEffect(() => {
    getCurrentUser()
    fetchClients()
    fetchRecruiters()
  }, [])

  useEffect(() => {
    if (formData.state && !availableProvinces.find(p => p.code === formData.state)) {
      setFormData(prev => ({ ...prev, state: '' }))
    }
  }, [formData.country])

  useEffect(() => {
    if (selectedClient) {
      fetchJobsForClient(selectedClient.id)
      fetchClientAccess(selectedClient.id)
      fetchActivityLogs(selectedClient.id)
      fetchClientContacts(selectedClient.id)
    }
  }, [selectedClient])

  async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
      
      // Check if user is admin
      const { data: recruiter } = await supabase
        .from('recruiters')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      if (recruiter?.is_admin) {
        setIsAdmin(true)
      }
    }
  }

  async function fetchClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*, owner:recruiters!owned_by(full_name)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching clients:', error)
    } else {
      setClients((data as unknown as Client[]) || [])
    }
    setLoading(false)
  }

  async function fetchRecruiters() {
    const { data, error } = await supabase
      .from('recruiters')
      .select('id, full_name, email')
      .order('full_name')

    if (error) {
      console.error('Error fetching recruiters:', error)
    } else {
      setRecruiters((data as unknown as Recruiter[]) || [])
    }
  }

  async function fetchClientAccess(clientId: string) {
    const { data, error } = await supabase
      .from('client_access')
      .select('id, recruiter_id, recruiter:recruiters(id, full_name, email)')
      .eq('client_id', clientId)

    if (error) {
      console.error('Error fetching client access:', error)
    } else {
      setClientAccess((data as unknown as ClientAccess[]) || [])
    }
  }

  async function fetchJobsForClient(clientId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, status')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching jobs:', error)
    } else {
      setJobs((data as unknown as Job[]) || [])
    }
  }

  async function fetchActivityLogs(clientId: string) {
    const { data, error } = await supabase
      .from('client_activity_logs')
      .select('*, recruiter:recruiters(full_name)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching activity logs:', error)
    } else {
      setActivityLogs((data as unknown as ClientActivityLog[]) || [])
    }
  }

  async function fetchClientContacts(clientId: string) {
    const { data, error } = await supabase
      .from('client_contacts')
      .select('*')
      .eq('client_id', clientId)
      .order('name')

    if (error) {
      console.error('Error fetching client contacts:', error)
    } else {
      setClientContacts((data as unknown as ClientContact[]) || [])
    }
  }

  async function addClientContact() {
    if (!selectedClient || !contactFormData.name) {
      alert('Name is required')
      return
    }

    const { error } = await supabase
      .from('client_contacts')
      .insert([{
        client_id: selectedClient.id,
        name: contactFormData.name,
        title: contactFormData.title || null,
        email: contactFormData.email || null,
        phone: contactFormData.phone || null,
        notes: contactFormData.notes || null
      }])

    if (error) {
      console.error('Error adding contact:', error)
      alert('Error adding contact')
    } else {
      setContactFormData({ name: '', title: '', email: '', phone: '', notes: '' })
      setShowAddContactModal(false)
      fetchClientContacts(selectedClient.id)
    }
  }

  async function deleteClientContact(contactId: string) {
    if (!confirm('Are you sure you want to delete this contact?')) return

    const { error } = await supabase
      .from('client_contacts')
      .delete()
      .eq('id', contactId)

    if (error) {
      console.error('Error deleting contact:', error)
      alert('Error deleting contact')
    } else if (selectedClient) {
      fetchClientContacts(selectedClient.id)
    }
  }

  async function submitActivity() {
    if (!selectedClient || !currentUserId) return

    const metadata: any = {}
    if (activityFormData.activity_type === 'call') {
      metadata.answered = activityFormData.call_answered
      if (activityFormData.duration_seconds) {
        metadata.duration = parseInt(activityFormData.duration_seconds)
      }
    }

    const { error } = await supabase.from('client_activity_logs').insert([{
      client_id: selectedClient.id,
      recruiter_id: currentUserId,
      activity_type: activityFormData.activity_type,
      channel: activityFormData.channel || null,
      direction: activityFormData.direction || null,
      notes: activityFormData.notes || null,
      duration_seconds: activityFormData.duration_seconds ? parseInt(activityFormData.duration_seconds) : null,
      metadata: Object.keys(metadata).length > 0 ? metadata : null
    }])

    if (error) {
      console.error('Error logging activity:', error)
      alert('Error logging activity')
    } else {
      // Reset form
      setActivityFormData({
        activity_type: 'note',
        channel: '',
        direction: '',
        notes: '',
        duration_seconds: '',
        call_answered: false
      })
      setShowLogActivityModal(false)
      
      // Refresh data
      fetchActivityLogs(selectedClient.id)
      
      // Refresh client to get updated ownership timestamps
      const { data: updatedClient } = await supabase
        .from('clients')
        .select('*, owner:recruiters!owned_by(full_name)')
        .eq('id', selectedClient.id)
        .single()
      
      if (updatedClient) {
        setSelectedClient(updatedClient as unknown as Client)
        fetchClients() // Refresh list too
      }
    }
  }

  // Ownership status calculation
  function getOwnershipStatus(client: Client): 'open' | 'claimed' | 'claimed_plus' | 'engaged' | 'contracted' | 'expired' {
    if (!client.owned_by) return 'open'
    
    const now = new Date()
    
    // If contract signed, check 3-month window
    if (client.contract_signed_at) {
      if (!client.last_two_way_at || new Date(client.last_two_way_at) < new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)) {
        return 'expired'
      }
      return 'contracted'
    }
    
    // If two-way established, check 1-month window
    if (client.two_way_established_at) {
      if (!client.last_two_way_at || new Date(client.last_two_way_at) < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) {
        return 'expired'
      }
      return 'engaged'
    }
    
    // If first outbound logged, check 7-day window
    if (client.first_outbound_at) {
      if (new Date(client.first_outbound_at) < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) {
        return 'expired'
      }
      return 'claimed_plus'
    }
    
    // If just claimed, check 24-hour window
    if (client.owned_at) {
      if (new Date(client.owned_at) < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
        return 'expired'
      }
      return 'claimed'
    }
    
    return 'open'
  }

  function isOwner(client: Client): boolean {
    return client.owned_by === currentUserId
  }

  function hasAccess(client: Client): boolean {
    if (isOwner(client)) return true
    if (isAdmin) return true
    return clientAccess.some(ca => ca.recruiter_id === currentUserId)
  }

  function canClaim(client: Client): boolean {
    const status = getOwnershipStatus(client)
    return status === 'open' || status === 'expired'
  }

  async function claimClient(client: Client) {
    if (!currentUserId) return
    setClaimingClient(true)

    const { error } = await supabase
      .from('clients')
      .update({
        owned_by: currentUserId,
        owned_at: new Date().toISOString(),
        first_outbound_at: null,
        two_way_established_at: null,
        contract_signed_at: null,
        last_two_way_at: null
      })
      .eq('id', client.id)

    if (error) {
      console.error('Error claiming client:', error)
      alert('Error claiming client')
    } else {
      // Log the claim activity
      await supabase.from('client_activity_logs').insert([{
        client_id: client.id,
        recruiter_id: currentUserId,
        activity_type: 'claimed',
        notes: 'Client claimed'
      }])

      fetchClients()
      if (selectedClient?.id === client.id) {
        setSelectedClient({
          ...selectedClient,
          owned_by: currentUserId,
          owned_at: new Date().toISOString(),
          first_outbound_at: null,
          two_way_established_at: null,
          contract_signed_at: null,
          last_two_way_at: null
        })
        fetchActivityLogs(client.id)
      }
    }
    setClaimingClient(false)
  }

  async function releaseClient(client: Client) {
    if (!confirm('Are you sure you want to release this client? Another recruiter can claim them.')) return
    if (!currentUserId) return

    // Log the release activity first (before removing ownership)
    await supabase.from('client_activity_logs').insert([{
      client_id: client.id,
      recruiter_id: currentUserId,
      activity_type: 'released',
      notes: 'Client released'
    }])

    const { error } = await supabase
      .from('clients')
      .update({
        owned_by: null,
        owned_at: null,
        first_outbound_at: null,
        two_way_established_at: null,
        contract_signed_at: null,
        last_two_way_at: null
      })
      .eq('id', client.id)

    if (error) {
      console.error('Error releasing client:', error)
      alert('Error releasing client')
    } else {
      // Also remove all granted access
      await supabase.from('client_access').delete().eq('client_id', client.id)
      
      fetchClients()
      if (selectedClient?.id === client.id) {
        setSelectedClient({
          ...selectedClient,
          owned_by: null,
          owned_at: null,
          first_outbound_at: null,
          two_way_established_at: null,
          contract_signed_at: null,
          last_two_way_at: null
        })
        setClientAccess([])
        fetchActivityLogs(client.id)
      }
    }
  }

  async function grantAccess() {
    if (!selectedClient || !selectedRecruiterId || !currentUserId) return

    const { error } = await supabase
      .from('client_access')
      .insert({
        client_id: selectedClient.id,
        recruiter_id: selectedRecruiterId,
        granted_by: currentUserId
      })

    if (error) {
      console.error('Error granting access:', error)
      alert('Error granting access')
    } else {
      fetchClientAccess(selectedClient.id)
      setShowGrantAccessModal(false)
      setSelectedRecruiterId('')
    }
  }

  async function revokeAccess(accessId: string) {
    if (!confirm('Remove this recruiter\'s access to this client?')) return

    const { error } = await supabase
      .from('client_access')
      .delete()
      .eq('id', accessId)

    if (error) {
      console.error('Error revoking access:', error)
      alert('Error revoking access')
    } else {
      if (selectedClient) {
        fetchClientAccess(selectedClient.id)
      }
    }
  }

  async function markContractSigned() {
    if (!selectedClient || !isOwner(selectedClient)) return

    const { error } = await supabase
      .from('clients')
      .update({
        contract_signed_at: new Date().toISOString(),
        last_two_way_at: new Date().toISOString()
      })
      .eq('id', selectedClient.id)

    if (error) {
      console.error('Error marking contract signed:', error)
      alert('Error marking contract signed')
    } else {
      fetchClients()
      setSelectedClient({
        ...selectedClient,
        contract_signed_at: new Date().toISOString(),
        last_two_way_at: new Date().toISOString()
      })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const clientData = {
      company_name: formData.company_name,
      industry: formData.industry || null,
      website: formData.website || null,
      primary_contact_name: formData.primary_contact_name || null,
      primary_contact_email: formData.primary_contact_email || null,
      primary_contact_phone: formData.primary_contact_phone || null,
      city: formData.city || null,
      state: formData.state || null,
      country: formData.country,
      notes: formData.notes || null,
      status: formData.status
    }

    if (editingClient) {
      const { error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', editingClient.id)

      if (error) {
        console.error('Error updating client:', error)
        alert('Error updating client')
      } else {
        setShowModal(false)
        setEditingClient(null)
        resetForm()
        fetchClients()
        if (selectedClient?.id === editingClient.id) {
          setSelectedClient({ ...selectedClient, ...clientData })
        }
      }
    } else {
      const { error } = await supabase
        .from('clients')
        .insert([{ 
          ...clientData, 
          recruiter_id: user.id,
          owned_by: user.id,
          owned_at: new Date().toISOString()
        }])

      if (error) {
        console.error('Error creating client:', error)
        alert('Error creating client')
      } else {
        setShowModal(false)
        resetForm()
        fetchClients()
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this client? This will also remove them from any jobs.')) return

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting client:', error)
      alert('Error deleting client')
    } else {
      fetchClients()
      if (selectedClient?.id === id) {
        setShowDetailView(false)
        setSelectedClient(null)
      }
    }
    setMenuOpen(null)
  }

  function openDetailView(client: Client) {
    setSelectedClient(client)
    setShowDetailView(true)
    setMenuOpen(null)
    router.push(`/dashboard/clients?id=${client.id}`, { scroll: false })
  }

  function openEditModal(client: Client) {
    setEditingClient(client)
    setFormData({
      company_name: client.company_name,
      industry: client.industry || '',
      website: client.website || '',
      primary_contact_name: client.primary_contact_name || '',
      primary_contact_email: client.primary_contact_email || '',
      primary_contact_phone: client.primary_contact_phone || '',
      city: client.city || '',
      state: client.state || '',
      country: client.country || 'CA',
      notes: client.notes || '',
      status: client.status
    })
    setShowModal(true)
    setMenuOpen(null)
  }

  function resetForm() {
    setFormData({
      company_name: '',
      industry: '',
      website: '',
      primary_contact_name: '',
      primary_contact_email: '',
      primary_contact_phone: '',
      city: '',
      state: '',
      country: 'CA',
      notes: '',
      status: 'active'
    })
    setEditingClient(null)
  }

  const filteredClients = clients.filter(client => {
    // Search filter
    const matchesSearch = 
      client.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.industry?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false

    // Check ownership status for expired clients
    const status = getOwnershipStatus(client)
    const effectivelyOwned = client.owned_by && status !== 'expired'

    // Tab filter
    if (activeTab === 'mine') {
      return client.owned_by === currentUserId && status !== 'expired'
    }
    if (activeTab === 'unclaimed') {
      return !effectivelyOwned
    }
    
    return true
  })

  // Counts for tabs
  const myClientsCount = clients.filter(c => {
    const status = getOwnershipStatus(c)
    return c.owned_by === currentUserId && status !== 'expired'
  }).length
  
  const unclaimedClientsCount = clients.filter(c => {
    const status = getOwnershipStatus(c)
    return !c.owned_by || status === 'expired'
  }).length

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    prospect: 'bg-blue-100 text-blue-700'
  }

  const ownershipColors: Record<string, { bg: string; text: string; icon: any }> = {
    open: { bg: 'bg-green-100', text: 'text-green-700', icon: Unlock },
    expired: { bg: 'bg-green-100', text: 'text-green-700', icon: Unlock },
    claimed: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
    claimed_plus: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
    engaged: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Lock },
    contracted: { bg: 'bg-purple-100', text: 'text-purple-700', icon: FileText }
  }

  const ownershipLabels: Record<string, string> = {
    open: 'Open',
    expired: 'Open',
    claimed: 'Claimed (24hr)',
    claimed_plus: 'Claimed (7 day)',
    engaged: 'Engaged',
    contracted: 'Contracted'
  }

  const activityTypeLabels: Record<string, string> = {
    note: 'Note',
    message: 'Message',
    call: 'Call',
    linkedin: 'LinkedIn',
    meeting: 'Meeting',
    client_interview: 'Client Interview',
    contract_sent: 'Contract Sent',
    contract_signed: 'Contract Signed',
    claimed: 'Claimed',
    released: 'Released'
  }

  const activityTypeIcons: Record<string, any> = {
    note: StickyNote,
    message: MessageSquare,
    call: PhoneCall,
    linkedin: Linkedin,
    meeting: Calendar,
    client_interview: Users,
    contract_sent: Send,
    contract_signed: FileSignature,
    claimed: Lock,
    released: Unlock
  }

  const jobStatusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    open: 'bg-green-100 text-green-700',
    on_hold: 'bg-yellow-100 text-yellow-700',
    filled: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700'
  }

  const formatLocation = (city: string | null, state: string | null, country: string | null) => {
    const stateName = country && state ? provinces[country]?.find(p => p.code === state)?.name || state : state
    return [city, stateName].filter(Boolean).join(', ') || null
  }

  // Detail View
  if (showDetailView && selectedClient) {
    const ownershipStatus = getOwnershipStatus(selectedClient)
    const colors = ownershipColors[ownershipStatus]
    const OwnershipIcon = colors.icon
    const isOwnedByOther = selectedClient.owned_by && selectedClient.owned_by !== currentUserId && ownershipStatus !== 'expired'

    return (
      <div className="p-8">
        <button
          onClick={() => { setShowDetailView(false); setSelectedClient(null); router.push('/dashboard/clients', { scroll: false }) }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Clients
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue font-semibold text-2xl">
                    {selectedClient.company_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-2xl font-bold text-gray-900">{selectedClient.company_name}</h1>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[selectedClient.status]}`}>
                        {selectedClient.status}
                      </span>
                      {/* Ownership Badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                        <OwnershipIcon className="w-3 h-3" />
                        {ownershipLabels[ownershipStatus]}
                        {selectedClient.owned_by && ownershipStatus !== 'expired' && (
                          <span className="ml-1">
                            ({selectedClient.owned_by === currentUserId ? 'You' : selectedClient.owner?.full_name || 'Another'})
                          </span>
                        )}
                      </span>
                    </div>
                    {selectedClient.industry && (
                      <p className="text-gray-600">{selectedClient.industry}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Claim Button */}
                  {canClaim(selectedClient) && (
                    <button
                      onClick={() => claimClient(selectedClient)}
                      disabled={claimingClient}
                      className="flex items-center gap-2 px-3 py-2 bg-brand-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {claimingClient ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      Claim
                    </button>
                  )}
                  {/* Release Button */}
                  {isOwner(selectedClient) && (
                    <button
                      onClick={() => releaseClient(selectedClient)}
                      className="flex items-center gap-2 px-3 py-2 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50"
                    >
                      <Unlock className="w-4 h-4" />
                      Release
                    </button>
                  )}
                  {/* Edit Button - only for owner or granted */}
                  {(isOwner(selectedClient) || isAdmin) && (
                    <button
                      onClick={() => openEditModal(selectedClient)}
                      className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Ownership Timeline - only for owner */}
              {isOwner(selectedClient) && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">Ownership Timeline</div>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                    <div>
                      <span className="text-gray-400">Claimed:</span>{' '}
                      {selectedClient.owned_at ? new Date(selectedClient.owned_at).toLocaleDateString() : '-'}
                    </div>
                    <div>
                      <span className="text-gray-400">First Outbound:</span>{' '}
                      {selectedClient.first_outbound_at ? new Date(selectedClient.first_outbound_at).toLocaleDateString() : '-'}
                    </div>
                    <div>
                      <span className="text-gray-400">Two-Way:</span>{' '}
                      {selectedClient.two_way_established_at ? new Date(selectedClient.two_way_established_at).toLocaleDateString() : '-'}
                    </div>
                    <div>
                      <span className="text-gray-400">Contract:</span>{' '}
                      {selectedClient.contract_signed_at ? new Date(selectedClient.contract_signed_at).toLocaleDateString() : '-'}
                    </div>
                    <div>
                      <span className="text-gray-400">Last Two-Way:</span>{' '}
                      {selectedClient.last_two_way_at ? new Date(selectedClient.last_two_way_at).toLocaleDateString() : '-'}
                    </div>
                  </div>
                  {/* Mark Contract Signed Button */}
                  {!selectedClient.contract_signed_at && selectedClient.two_way_established_at && (
                    <button
                      onClick={markContractSigned}
                      className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 text-sm rounded-lg hover:bg-purple-200"
                    >
                      <FileText className="w-4 h-4" />
                      Mark Contract Signed
                    </button>
                  )}
                </div>
              )}

              {/* Contact & Location */}
              <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100">
                {selectedClient.website && (
                  <a href={selectedClient.website.startsWith('http') ? selectedClient.website : `https://${selectedClient.website}`} 
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-brand-blue hover:underline">
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
                {formatLocation(selectedClient.city, selectedClient.state, selectedClient.country) && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {formatLocation(selectedClient.city, selectedClient.state, selectedClient.country)}
                  </div>
                )}
              </div>
            </div>

            {/* Client Contacts (Employees) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Contacts ({clientContacts.length})</h2>
                <button
                  onClick={() => setShowAddContactModal(true)}
                  className="flex items-center gap-1 text-sm text-brand-accent hover:text-brand-blue"
                >
                  <Plus className="w-4 h-4" />
                  Add Contact
                </button>
              </div>
              {clientContacts.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No contacts added yet</p>
                  <p className="text-xs mt-1">Add contacts to assign as hiring managers on jobs</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientContacts.map((contact) => (
                    <div key={contact.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{contact.name}</div>
                        {contact.title && (
                          <div className="text-sm text-gray-500">{contact.title}</div>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2">
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-sm text-gray-600 hover:text-brand-blue">
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </a>
                          )}
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-sm text-gray-600 hover:text-brand-blue">
                              <Phone className="w-3 h-3" />
                              {contact.phone}
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteClientContact(contact.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedClient.notes && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                <p className="text-gray-600 whitespace-pre-wrap">{selectedClient.notes}</p>
              </div>
            )}

            {/* Activity Log */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Activity Log ({activityLogs.length})</h2>
                {(isOwner(selectedClient) || hasAccess(selectedClient)) && (
                  <button
                    onClick={() => setShowLogActivityModal(true)}
                    className="flex items-center gap-1 text-sm text-brand-accent hover:text-brand-blue"
                  >
                    <Plus className="w-4 h-4" />
                    Log Activity
                  </button>
                )}
              </div>
              {activityLogs.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activities logged yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activityLogs.map((log) => {
                    const ActivityIcon = activityTypeIcons[log.activity_type] || StickyNote
                    const isTwoWay = (log.direction === 'inbound') || 
                                     log.activity_type === 'client_interview' || 
                                     log.activity_type === 'meeting' ||
                                     (log.activity_type === 'call' && log.metadata?.answered)
                    
                    return (
                      <div key={log.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          log.activity_type === 'claimed' ? 'bg-green-100 text-green-600' :
                          log.activity_type === 'released' ? 'bg-red-100 text-red-600' :
                          log.activity_type === 'contract_signed' ? 'bg-purple-100 text-purple-600' :
                          isTwoWay ? 'bg-blue-100 text-blue-600' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          <ActivityIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 text-sm">
                              {activityTypeLabels[log.activity_type] || log.activity_type}
                            </span>
                            {log.direction && (
                              <span className={`px-1.5 py-0.5 text-xs rounded ${
                                log.direction === 'inbound' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                              }`}>
                                {log.direction}
                              </span>
                            )}
                            {log.channel && (
                              <span className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                                {log.channel}
                              </span>
                            )}
                            {log.activity_type === 'call' && log.metadata?.answered && (
                              <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                answered
                              </span>
                            )}
                            {isTwoWay && (
                              <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                two-way ✓
                              </span>
                            )}
                          </div>
                          {log.notes && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{log.notes}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            <span>{new Date(log.created_at).toLocaleString()}</span>
                            {log.recruiter?.full_name && (
                              <>
                                <span>•</span>
                                <span>{log.recruiter.full_name}</span>
                              </>
                            )}
                            {log.duration_seconds && (
                              <>
                                <span>•</span>
                                <span>{Math.floor(log.duration_seconds / 60)}m {log.duration_seconds % 60}s</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Granted Access - only for owner */}
            {isOwner(selectedClient) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Shared Access ({clientAccess.length})</h2>
                  <button
                    onClick={() => setShowGrantAccessModal(true)}
                    className="flex items-center gap-1 text-sm text-brand-accent hover:text-brand-blue"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add
                  </button>
                </div>
                {clientAccess.length === 0 ? (
                  <p className="text-sm text-gray-500">No other recruiters have access</p>
                ) : (
                  <div className="space-y-2">
                    {clientAccess.map((access) => (
                      <div key={access.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {access.recruiter?.full_name || access.recruiter?.email}
                          </div>
                          <div className="text-xs text-gray-500">{access.recruiter?.email}</div>
                        </div>
                        <button
                          onClick={() => revokeAccess(access.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove access"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Open Jobs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                Open Jobs ({jobs.filter(j => j.status === 'open' || j.status === 'on_hold' || j.status === 'draft').length})
              </h2>
              {jobs.filter(j => j.status === 'open' || j.status === 'on_hold' || j.status === 'draft').length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No open jobs for this client</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.filter(j => j.status === 'open' || j.status === 'on_hold' || j.status === 'draft').map((job) => (
                    <Link 
                      key={job.id} 
                      href={`/dashboard/jobs?id=${job.id}&fromClient=${selectedClient.id}`}
                      className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="font-medium text-gray-900 hover:text-brand-accent">{job.title}</div>
                      <span className={`inline-flex mt-2 px-2 py-0.5 text-xs font-medium rounded-full ${jobStatusColors[job.status]}`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Closed Jobs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Closed Jobs ({jobs.filter(j => j.status === 'filled' || j.status === 'cancelled').length})
              </h2>
              {jobs.filter(j => j.status === 'filled' || j.status === 'cancelled').length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No closed jobs with this client yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.filter(j => j.status === 'filled' || j.status === 'cancelled').map((job) => (
                    <Link 
                      key={job.id} 
                      href={`/dashboard/jobs?id=${job.id}&fromClient=${selectedClient.id}`}
                      className="block p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <div className="font-medium text-gray-900 hover:text-brand-accent">{job.title}</div>
                      <span className={`inline-flex mt-2 px-2 py-0.5 text-xs font-medium rounded-full ${jobStatusColors[job.status]}`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Info</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Added</span>
                  <span className="text-gray-900">{new Date(selectedClient.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="text-gray-900 capitalize">{selectedClient.status}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={() => handleDelete(selectedClient.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Client
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal - in Detail View */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingClient ? 'Edit Client' : 'Add New Client'}
                </h2>
                <button onClick={() => { setShowModal(false); resetForm() }} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  >
                    <option value="">Select industry...</option>
                    {industries.map((industry) => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    placeholder="www.example.com"
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
                <hr className="my-4" />
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
                    <option value="prospect">Prospect</option>
                    <option value="inactive">Inactive</option>
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
                    className="flex-1 px-4 py-2.5 bg-brand-blue text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingClient ? 'Save Changes' : 'Add Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Grant Access Modal */}
        {showGrantAccessModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Grant Access</h2>
                <button onClick={() => { setShowGrantAccessModal(false); setSelectedRecruiterId('') }} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Select a recruiter to grant them access to this client. They will be able to view the client, add activities, and add jobs.
              </p>
              <select
                value={selectedRecruiterId}
                onChange={(e) => setSelectedRecruiterId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent mb-4"
              >
                <option value="">Select a recruiter...</option>
                {recruiters
                  .filter(r => r.id !== currentUserId && !clientAccess.some(ca => ca.recruiter_id === r.id))
                  .map((recruiter) => (
                    <option key={recruiter.id} value={recruiter.id}>
                      {recruiter.full_name || recruiter.email}
                    </option>
                  ))}
              </select>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowGrantAccessModal(false); setSelectedRecruiterId('') }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={grantAccess}
                  disabled={!selectedRecruiterId}
                  className="flex-1 px-4 py-2.5 bg-brand-accent text-white font-medium rounded-lg hover:bg-brand-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Grant Access
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Log Activity Modal */}
        {showLogActivityModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Log Activity</h2>
                <button 
                  onClick={() => {
                    setShowLogActivityModal(false)
                    setActivityFormData({
                      activity_type: 'note',
                      channel: '',
                      direction: '',
                      notes: '',
                      duration_seconds: '',
                      call_answered: false
                    })
                  }} 
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Activity Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
                  <select
                    value={activityFormData.activity_type}
                    onChange={(e) => setActivityFormData({ ...activityFormData, activity_type: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  >
                    <option value="note">Note</option>
                    <option value="message">Message</option>
                    <option value="call">Call</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="meeting">Meeting</option>
                    <option value="client_interview">Client Interview</option>
                    <option value="contract_sent">Contract Sent</option>
                    <option value="contract_signed">Contract Signed</option>
                  </select>
                </div>

                {/* Direction - for message, call, linkedin */}
                {(activityFormData.activity_type === 'message' || activityFormData.activity_type === 'call' || activityFormData.activity_type === 'linkedin') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                    <select
                      value={activityFormData.direction}
                      onChange={(e) => setActivityFormData({ ...activityFormData, direction: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                      <option value="">Select direction...</option>
                      <option value="outbound">Outbound (You → Client)</option>
                      <option value="inbound">Inbound (Client → You)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {activityFormData.direction === 'inbound' 
                        ? '✓ Inbound = Two-way communication (resets ownership clock)' 
                        : activityFormData.direction === 'outbound'
                        ? '→ Outbound = Counts toward initial outreach requirement'
                        : ''}
                    </p>
                  </div>
                )}

                {/* Channel - for message */}
                {activityFormData.activity_type === 'message' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                    <select
                      value={activityFormData.channel}
                      onChange={(e) => setActivityFormData({ ...activityFormData, channel: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                      <option value="">Select channel...</option>
                      <option value="email">Email</option>
                      <option value="text">Text/SMS</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}

                {/* Call Answered */}
                {activityFormData.activity_type === 'call' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="call_answered"
                      checked={activityFormData.call_answered}
                      onChange={(e) => setActivityFormData({ ...activityFormData, call_answered: e.target.checked })}
                      className="w-4 h-4 text-brand-accent border-gray-300 rounded focus:ring-brand-accent"
                    />
                    <label htmlFor="call_answered" className="text-sm text-gray-700">
                      Client answered the call
                    </label>
                    {activityFormData.call_answered && (
                      <span className="text-xs text-blue-600 ml-2">✓ Two-way communication</span>
                    )}
                  </div>
                )}

                {/* Duration - for call */}
                {activityFormData.activity_type === 'call' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (seconds)</label>
                    <input
                      type="number"
                      value={activityFormData.duration_seconds}
                      onChange={(e) => setActivityFormData({ ...activityFormData, duration_seconds: e.target.value })}
                      placeholder="e.g. 300 for 5 minutes"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={activityFormData.notes}
                    onChange={(e) => setActivityFormData({ ...activityFormData, notes: e.target.value })}
                    rows={3}
                    placeholder="What happened? Any important details?"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none"
                  />
                </div>

                {/* Two-way indicator */}
                {(activityFormData.activity_type === 'meeting' || 
                  activityFormData.activity_type === 'client_interview' ||
                  activityFormData.activity_type === 'contract_signed') && (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                    ✓ This activity counts as two-way communication and will reset your ownership clock.
                  </div>
                )}

                {activityFormData.activity_type === 'contract_signed' && (
                  <div className="p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
                    📜 Logging a signed contract will extend your ownership window to 3 months.
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowLogActivityModal(false)
                    setActivityFormData({
                      activity_type: 'note',
                      channel: '',
                      direction: '',
                      notes: '',
                      duration_seconds: '',
                      call_answered: false
                    })
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitActivity}
                  className="flex-1 px-4 py-2.5 bg-brand-accent text-white font-medium rounded-lg hover:bg-brand-blue transition-colors"
                >
                  Log Activity
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Contact Modal - in Detail View */}
        {showAddContactModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Add Contact</h2>
                <button 
                  onClick={() => {
                    setShowAddContactModal(false)
                    setContactFormData({ name: '', title: '', email: '', phone: '', notes: '' })
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={contactFormData.name}
                    onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                    placeholder="John Smith"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={contactFormData.title}
                    onChange={(e) => setContactFormData({ ...contactFormData, title: e.target.value })}
                    placeholder="VP of Engineering"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={contactFormData.email}
                    onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                    placeholder="john@company.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={contactFormData.phone}
                    onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={contactFormData.notes}
                    onChange={(e) => setContactFormData({ ...contactFormData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => {
                    setShowAddContactModal(false)
                    setContactFormData({ name: '', title: '', email: '', phone: '', notes: '' })
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addClientContact}
                  disabled={!contactFormData.name}
                  className="flex-1 px-4 py-2.5 bg-brand-accent text-white font-medium rounded-lg hover:bg-brand-blue transition-colors disabled:opacity-50"
                >
                  Add Contact
                </button>
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
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">Manage your client relationships</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Client
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('mine')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'mine'
              ? 'border-brand-accent text-brand-accent'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          My Clients
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'mine' ? 'bg-brand-accent/10 text-brand-accent' : 'bg-gray-100 text-gray-600'
          }`}>
            {myClientsCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('unclaimed')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'unclaimed'
              ? 'border-brand-accent text-brand-accent'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Unclaimed
          {unclaimedClientsCount > 0 && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'unclaimed' ? 'bg-brand-accent/10 text-brand-accent' : 'bg-green-100 text-green-600'
            }`}>
              {unclaimedClientsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-brand-accent text-brand-accent'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All Clients
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'all' ? 'bg-brand-accent/10 text-brand-accent' : 'bg-gray-100 text-gray-600'
          }`}>
            {clients.length}
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No clients found' : 'No clients yet'}
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {searchQuery ? 'Try a different search term' : 'Add your first client to start managing relationships and job orders.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Your First Client
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Company</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Location</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Ownership</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.map((client) => {
                const ownershipStatus = getOwnershipStatus(client)
                const isOwnedByOther = client.owned_by && client.owned_by !== currentUserId && ownershipStatus !== 'expired'
                const colors = ownershipColors[ownershipStatus]
                const OwnershipIcon = colors.icon

                return (
                  <tr 
                    key={client.id} 
                    className={`transition-colors ${
                      isOwnedByOther 
                        ? 'bg-gray-50 opacity-60 cursor-not-allowed' 
                        : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                    onClick={() => !isOwnedByOther && openDetailView(client)}
                  >
                    <td className="px-6 py-4">
                      <div className={`font-medium ${isOwnedByOther ? 'text-gray-500' : 'text-gray-900'}`}>
                        {client.company_name}
                      </div>
                      {client.industry && <div className="text-sm text-gray-500">{client.industry}</div>}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatLocation(client.city, client.state, client.country) || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[client.status]}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                          <OwnershipIcon className="w-3 h-3" />
                          {ownershipLabels[ownershipStatus]}
                        </span>
                        {client.owned_by && ownershipStatus !== 'expired' && client.owned_by !== currentUserId && (
                          <span className="text-xs text-gray-500">
                            {client.owner?.full_name || 'Another'}
                          </span>
                        )}
                        {client.owned_by === currentUserId && ownershipStatus !== 'expired' && (
                          <span className="text-xs text-gray-500">You</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 relative" onClick={(e) => e.stopPropagation()}>
                      {/* Only show menu for owners, admins, or claimable clients */}
                      {(isOwner(client) || isAdmin || canClaim(client)) && (
                        <>
                          <button
                            onClick={() => setMenuOpen(menuOpen === client.id ? null : client.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-400" />
                          </button>
                          {menuOpen === client.id && (
                            <div className="absolute right-6 top-12 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                              {canClaim(client) && (
                                <button
                                  onClick={() => { claimClient(client); setMenuOpen(null) }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-brand-green hover:bg-gray-50"
                                >
                                  <Lock className="w-4 h-4" />
                                  Claim
                                </button>
                              )}
                              {isOwner(client) && (
                                <>
                                  <button
                                    onClick={() => openEditModal(client)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Pencil className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => { releaseClient(client); setMenuOpen(null) }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-gray-50"
                                  >
                                    <Unlock className="w-4 h-4" />
                                    Release
                                  </button>
                                </>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => handleDelete(client.id)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                >
                  <option value="">Select industry...</option>
                  {industries.map((industry) => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  placeholder="www.example.com"
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
              <hr className="my-4" />
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
                  <option value="prospect">Prospect</option>
                  <option value="inactive">Inactive</option>
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
                  className="flex-1 px-4 py-2.5 bg-brand-blue text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingClient ? 'Save Changes' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
