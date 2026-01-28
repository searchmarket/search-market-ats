'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { 
  Plus, Search, Megaphone, MoreVertical, Pencil, Trash2, X, 
  Send, Users, Building2, FileCheck, Clock, CheckCircle, 
  AlertCircle, Mail, Eye, Copy, Filter, Loader2, Play,
  FileText, ChevronDown
} from 'lucide-react'

interface Campaign {
  id: string
  recruiter_id: string
  name: string
  description: string | null
  audience_type: 'candidates' | 'clients' | 'references'
  filters: Record<string, any>
  subject: string
  body: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
  scheduled_at: string | null
  sent_at: string | null
  total_recipients: number
  sent_count: number
  opened_count: number
  clicked_count: number
  created_at: string
}

interface CampaignTemplate {
  id: string
  name: string
  description: string | null
  audience_type: string
  filters: Record<string, any>
  subject: string
  body: string
  is_system: boolean
}

interface Recruiter {
  id: string
  full_name: string | null
  email: string
}

const AUDIENCE_TYPES = [
  { value: 'candidates', label: 'Candidates', icon: Users, color: 'blue' },
  { value: 'clients', label: 'Clients', icon: Building2, color: 'purple' },
  { value: 'references', label: 'References', icon: FileCheck, color: 'green' },
]

const CANDIDATE_FILTERS = [
  { key: 'status', label: 'Status', options: ['All', 'Open', 'Placed', 'Archived'] },
  { key: 'days_inactive', label: 'Inactive for (days)', type: 'number' },
  { key: 'skills', label: 'Skills contain', type: 'text' },
  { key: 'title', label: 'Title contains', type: 'text' },
]

const CLIENT_FILTERS = [
  { key: 'days_since_contact', label: 'Days since last contact', type: 'number' },
  { key: 'industry', label: 'Industry', type: 'text' },
  { key: 'has_open_jobs', label: 'Has open jobs', options: ['Any', 'Yes', 'No'] },
]

const REFERENCE_FILTERS = [
  { key: 'status', label: 'Status', options: ['All', 'Completed', 'Pending', 'No Response'] },
]

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<CampaignTemplate[]>([])
  const [recruiter, setRecruiter] = useState<Recruiter | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [loadingCount, setLoadingCount] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    audience_type: 'candidates' as 'candidates' | 'clients' | 'references',
    filters: {} as Record<string, any>,
    subject: '',
    body: ''
  })
  
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    // Close menu when clicking outside
    const handleClick = () => setMenuOpen(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  async function fetchData() {
    setLoading(true)
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: recruiterData } = await supabase
        .from('recruiters')
        .select('id, full_name, email')
        .eq('id', user.id)
        .single()
      
      if (recruiterData) {
        setRecruiter(recruiterData)
      }
      
      // Get campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('recruiter_id', user.id)
        .order('created_at', { ascending: false })
      
      if (campaignsData) {
        setCampaigns(campaignsData)
      }
    }
    
    // Get templates
    const { data: templatesData } = await supabase
      .from('campaign_templates')
      .select('*')
      .order('name')
    
    if (templatesData) {
      setTemplates(templatesData)
    }
    
    setLoading(false)
  }

  async function fetchRecipientCount() {
    if (!formData.audience_type) return
    
    setLoadingCount(true)
    let count = 0
    
    try {
      if (formData.audience_type === 'candidates') {
        let query = supabase.from('candidates').select('id', { count: 'exact', head: true })
        
        if (formData.filters.status && formData.filters.status !== 'All') {
          // Add status filter logic
        }
        if (formData.filters.skills) {
          query = query.ilike('skills', `%${formData.filters.skills}%`)
        }
        if (formData.filters.title) {
          query = query.ilike('title', `%${formData.filters.title}%`)
        }
        
        const { count: candidateCount } = await query
        count = candidateCount || 0
        
      } else if (formData.audience_type === 'clients') {
        let query = supabase.from('clients').select('id', { count: 'exact', head: true })
        
        if (formData.filters.industry) {
          query = query.ilike('industry', `%${formData.filters.industry}%`)
        }
        
        const { count: clientCount } = await query
        count = clientCount || 0
        
      } else if (formData.audience_type === 'references') {
        let query = supabase.from('reference_requests').select('id', { count: 'exact', head: true })
        
        if (formData.filters.status && formData.filters.status !== 'All') {
          const statusMap: Record<string, string> = {
            'Completed': 'completed',
            'Pending': 'pending',
            'No Response': 'no_response'
          }
          query = query.eq('status', statusMap[formData.filters.status] || formData.filters.status)
        }
        
        const { count: refCount } = await query
        count = refCount || 0
      }
    } catch (err) {
      console.error('Error fetching count:', err)
    }
    
    setRecipientCount(count)
    setLoadingCount(false)
  }

  useEffect(() => {
    if (showCreateModal) {
      const timer = setTimeout(() => {
        fetchRecipientCount()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [formData.audience_type, formData.filters, showCreateModal])

  function loadTemplate(template: CampaignTemplate) {
    setFormData({
      name: template.name,
      description: template.description || '',
      audience_type: template.audience_type as any,
      filters: template.filters,
      subject: template.subject,
      body: template.body
    })
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      audience_type: 'candidates',
      filters: {},
      subject: '',
      body: ''
    })
    setEditingCampaign(null)
    setRecipientCount(null)
  }

  async function saveCampaign(asDraft = true) {
    if (!recruiter || !formData.name || !formData.subject || !formData.body) {
      alert('Please fill in campaign name, subject, and body')
      return
    }
    
    setSaving(true)
    
    const campaignData = {
      recruiter_id: recruiter.id,
      name: formData.name,
      description: formData.description || null,
      audience_type: formData.audience_type,
      filters: formData.filters,
      subject: formData.subject,
      body: formData.body,
      status: asDraft ? 'draft' : 'draft',
      total_recipients: recipientCount || 0
    }
    
    let error
    if (editingCampaign) {
      const result = await supabase
        .from('campaigns')
        .update(campaignData)
        .eq('id', editingCampaign.id)
      error = result.error
    } else {
      const result = await supabase
        .from('campaigns')
        .insert(campaignData)
      error = result.error
    }
    
    if (error) {
      console.error('Error saving campaign:', error)
      alert('Error saving campaign')
    } else {
      resetForm()
      setShowCreateModal(false)
      fetchData()
    }
    
    setSaving(false)
  }

  async function sendCampaign(campaign: Campaign) {
    if (!confirm(`Are you sure you want to send this campaign to ${campaign.total_recipients} recipients?`)) {
      return
    }
    
    setSending(true)
    
    // Update campaign status
    await supabase
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', campaign.id)
    
    // In a real implementation, this would:
    // 1. Fetch all recipients based on filters
    // 2. Queue emails via a background job
    // 3. Track delivery status
    
    // For now, we'll simulate sending
    try {
      // Fetch recipients based on audience type
      let recipients: { email: string; name: string; id: string }[] = []
      
      if (campaign.audience_type === 'candidates') {
        const { data } = await supabase
          .from('candidates')
          .select('id, email, first_name, last_name')
          .not('email', 'is', null)
        
        recipients = (data || []).map(c => ({
          id: c.id,
          email: c.email!,
          name: `${c.first_name} ${c.last_name}`
        }))
      } else if (campaign.audience_type === 'clients') {
        const { data } = await supabase
          .from('clients')
          .select('id, contact_email, contact_name, company_name')
          .not('contact_email', 'is', null)
        
        recipients = (data || []).map(c => ({
          id: c.id,
          email: c.contact_email!,
          name: c.contact_name || c.company_name
        }))
      } else if (campaign.audience_type === 'references') {
        const { data } = await supabase
          .from('reference_requests')
          .select('id, reference_email, reference_name')
        
        recipients = (data || []).map(r => ({
          id: r.id,
          email: r.reference_email,
          name: r.reference_name || 'Reference'
        }))
      }
      
      // Insert recipients
      if (recipients.length > 0) {
        await supabase.from('campaign_recipients').insert(
          recipients.map(r => ({
            campaign_id: campaign.id,
            recipient_type: campaign.audience_type.slice(0, -1), // Remove 's'
            recipient_id: r.id,
            recipient_email: r.email,
            recipient_name: r.name,
            status: 'pending'
          }))
        )
      }
      
      // Update campaign as sent
      await supabase
        .from('campaigns')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
          total_recipients: recipients.length,
          sent_count: recipients.length
        })
        .eq('id', campaign.id)
      
      alert(`Campaign sent to ${recipients.length} recipients!`)
      fetchData()
      
    } catch (err) {
      console.error('Error sending campaign:', err)
      alert('Error sending campaign')
      
      // Revert status
      await supabase
        .from('campaigns')
        .update({ status: 'draft' })
        .eq('id', campaign.id)
    }
    
    setSending(false)
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Are you sure you want to delete this campaign?')) return
    
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id)
    
    if (error) {
      alert('Error deleting campaign')
    } else {
      fetchData()
    }
  }

  function openEditModal(campaign: Campaign) {
    setEditingCampaign(campaign)
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      audience_type: campaign.audience_type,
      filters: campaign.filters,
      subject: campaign.subject,
      body: campaign.body
    })
    setShowCreateModal(true)
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      sending: 'bg-yellow-100 text-yellow-700',
      sent: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    }
    return styles[status] || styles.draft
  }

  const getAudienceIcon = (type: string) => {
    const audience = AUDIENCE_TYPES.find(a => a.value === type)
    if (!audience) return Users
    return audience.icon
  }

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getFilterOptions = () => {
    switch (formData.audience_type) {
      case 'candidates': return CANDIDATE_FILTERS
      case 'clients': return CLIENT_FILTERS
      case 'references': return REFERENCE_FILTERS
      default: return []
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500 mt-1">Send targeted emails to candidates, clients, and references</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-accent text-white font-medium rounded-lg hover:bg-brand-blue transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Campaign
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
        </div>
      </div>

      {/* Campaigns List */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No campaigns yet</h2>
          <p className="text-gray-500 mb-6">Create your first campaign to start reaching out to your network</p>
          <button
            onClick={() => { resetForm(); setShowCreateModal(true) }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-accent text-white font-medium rounded-lg hover:bg-brand-blue transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Campaign</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Audience</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Recipients</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Created</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCampaigns.map((campaign) => {
                const AudienceIcon = getAudienceIcon(campaign.audience_type)
                return (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                        <p className="text-sm text-gray-500 truncate max-w-xs">{campaign.subject}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <AudienceIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 capitalize">{campaign.audience_type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadge(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{campaign.total_recipients}</span>
                      {campaign.status === 'sent' && campaign.opened_count > 0 && (
                        <span className="text-xs text-gray-400 ml-2">
                          ({Math.round((campaign.opened_count / campaign.total_recipients) * 100)}% opened)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === campaign.id ? null : campaign.id) }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </button>
                      
                      {menuOpen === campaign.id && (
                        <div className="absolute right-6 top-12 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10 w-40">
                          {campaign.status === 'draft' && (
                            <>
                              <button
                                onClick={() => { openEditModal(campaign); setMenuOpen(null) }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Pencil className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => { sendCampaign(campaign); setMenuOpen(null) }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-gray-50"
                              >
                                <Send className="w-4 h-4" />
                                Send Now
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => { 
                              setFormData({
                                name: campaign.name + ' (Copy)',
                                description: campaign.description || '',
                                audience_type: campaign.audience_type,
                                filters: campaign.filters,
                                subject: campaign.subject,
                                body: campaign.body
                              })
                              setShowCreateModal(true)
                              setMenuOpen(null)
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Copy className="w-4 h-4" />
                            Duplicate
                          </button>
                          <button
                            onClick={() => { deleteCampaign(campaign.id); setMenuOpen(null) }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
              </h2>
              <button onClick={() => { setShowCreateModal(false); resetForm() }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Templates */}
              {!editingCampaign && templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Start from Template (Optional)
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => loadTemplate(template)}
                        className="text-left p-3 border border-gray-200 rounded-lg hover:border-brand-accent hover:bg-brand-accent/5 transition-colors"
                      >
                        <h4 className="font-medium text-gray-900 text-sm">{template.name}</h4>
                        <p className="text-xs text-gray-500 truncate">{template.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Q1 Client Outreach"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>

              {/* Audience Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Audience *</label>
                <div className="flex gap-3">
                  {AUDIENCE_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFormData({ ...formData, audience_type: type.value as any, filters: {} })}
                      className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                        formData.audience_type === type.value
                          ? 'border-brand-accent bg-brand-accent/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <type.icon className={`w-5 h-5 ${formData.audience_type === type.value ? 'text-brand-accent' : 'text-gray-400'}`} />
                      <span className={`font-medium ${formData.audience_type === type.value ? 'text-brand-accent' : 'text-gray-600'}`}>
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Filters
                  {recipientCount !== null && (
                    <span className="ml-2 text-brand-accent font-normal">
                      {loadingCount ? '...' : `(${recipientCount} recipients)`}
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  {getFilterOptions().map((filter) => (
                    <div key={filter.key}>
                      <label className="block text-xs text-gray-500 mb-1">{filter.label}</label>
                      {filter.options ? (
                        <select
                          value={formData.filters[filter.key] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            filters: { ...formData.filters, [filter.key]: e.target.value }
                          })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent text-sm"
                        >
                          <option value="">Select...</option>
                          {filter.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={filter.type || 'text'}
                          value={formData.filters[filter.key] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            filters: { ...formData.filters, [filter.key]: e.target.value }
                          })}
                          placeholder={filter.type === 'number' ? '0' : 'Enter value...'}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Email Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., New Opportunity - {{first_name}}"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Variables: {'{{first_name}}'}, {'{{company_name}}'}, {'{{recruiter_name}}'}
                </p>
              </div>

              {/* Email Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Body *</label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  rows={10}
                  placeholder="Write your email content here..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent font-mono text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Variables: {'{{first_name}}'}, {'{{last_name}}'}, {'{{company_name}}'}, {'{{contact_name}}'}, {'{{recruiter_name}}'}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 sticky bottom-0 bg-white flex items-center justify-between">
              <button
                onClick={() => { setShowCreateModal(false); resetForm() }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => saveCampaign(true)}
                  disabled={saving}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  onClick={() => {
                    saveCampaign(true).then(() => {
                      // After saving, you'd typically preview or send
                    })
                  }}
                  disabled={saving || !formData.name || !formData.subject || !formData.body}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-accent text-white font-medium rounded-lg hover:bg-brand-blue transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Save & Send Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
