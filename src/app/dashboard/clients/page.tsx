'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { countries, provinces, industries } from '@/lib/location-data'
import { 
  Plus, Search, Building2, MoreVertical, Pencil, Trash2, X, 
  ArrowLeft, Mail, Phone, Globe, MapPin, Briefcase
} from 'lucide-react'

interface Job {
  id: string
  title: string
  status: string
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
  const supabase = createClient()

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

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    if (formData.state && !availableProvinces.find(p => p.code === formData.state)) {
      setFormData(prev => ({ ...prev, state: '' }))
    }
  }, [formData.country])

  useEffect(() => {
    if (selectedClient) {
      fetchJobsForClient(selectedClient.id)
    }
  }, [selectedClient])

  async function fetchClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching clients:', error)
    } else {
      setClients((data as unknown as Client[]) || [])
    }
    setLoading(false)
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
        .insert([{ ...clientData, recruiter_id: user.id }])

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

  const filteredClients = clients.filter(client =>
    client.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.primary_contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    prospect: 'bg-blue-100 text-blue-700'
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
    return (
      <div className="p-8">
        <button
          onClick={() => { setShowDetailView(false); setSelectedClient(null) }}
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
                    </div>
                    {selectedClient.industry && (
                      <p className="text-gray-600">{selectedClient.industry}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openEditModal(selectedClient)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              </div>

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

            {/* Primary Contact */}
            {(selectedClient.primary_contact_name || selectedClient.primary_contact_email || selectedClient.primary_contact_phone) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Primary Contact</h2>
                <div className="space-y-3">
                  {selectedClient.primary_contact_name && (
                    <div className="text-gray-900 font-medium">{selectedClient.primary_contact_name}</div>
                  )}
                  <div className="flex flex-wrap gap-4">
                    {selectedClient.primary_contact_email && (
                      <a href={`mailto:${selectedClient.primary_contact_email}`} 
                        className="flex items-center gap-2 text-gray-600 hover:text-brand-blue">
                        <Mail className="w-4 h-4" />
                        {selectedClient.primary_contact_email}
                      </a>
                    )}
                    {selectedClient.primary_contact_phone && (
                      <a href={`tel:${selectedClient.primary_contact_phone}`}
                        className="flex items-center gap-2 text-gray-600 hover:text-brand-blue">
                        <Phone className="w-4 h-4" />
                        {selectedClient.primary_contact_phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedClient.notes && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                <p className="text-gray-600 whitespace-pre-wrap">{selectedClient.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Jobs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Jobs ({jobs.length})</h2>
              {jobs.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No jobs for this client</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div key={job.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900">{job.title}</div>
                      <span className={`inline-flex mt-2 px-2 py-0.5 text-xs font-medium rounded-full ${jobStatusColors[job.status]}`}>
                        {job.status.replace('_', ' ')}
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
                <h3 className="font-medium text-gray-900">Primary Contact</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={formData.primary_contact_name}
                    onChange={(e) => setFormData({ ...formData, primary_contact_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={formData.primary_contact_email}
                    onChange={(e) => setFormData({ ...formData, primary_contact_email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.primary_contact_phone}
                    onChange={(e) => setFormData({ ...formData, primary_contact_phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
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

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
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
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Contact</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Location</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.map((client) => (
                <tr 
                  key={client.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openDetailView(client)}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{client.company_name}</div>
                    {client.industry && <div className="text-sm text-gray-500">{client.industry}</div>}
                  </td>
                  <td className="px-6 py-4">
                    {client.primary_contact_name && (
                      <div className="text-gray-900">{client.primary_contact_name}</div>
                    )}
                    {client.primary_contact_email && (
                      <div className="text-sm text-gray-500">{client.primary_contact_email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {formatLocation(client.city, client.state, client.country) || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[client.status]}`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setMenuOpen(menuOpen === client.id ? null : client.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                    {menuOpen === client.id && (
                      <div className="absolute right-6 top-12 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                        <button
                          onClick={() => openEditModal(client)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
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
              <h3 className="font-medium text-gray-900">Primary Contact</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={formData.primary_contact_name}
                  onChange={(e) => setFormData({ ...formData, primary_contact_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={formData.primary_contact_email}
                  onChange={(e) => setFormData({ ...formData, primary_contact_email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={formData.primary_contact_phone}
                  onChange={(e) => setFormData({ ...formData, primary_contact_phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
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
