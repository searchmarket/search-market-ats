'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { User, Building2, Bell, CreditCard, Shield, Save, Globe, Loader2, ExternalLink, Copy, Check } from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    linkedin_url: '',
    slug: '',
    company_name: '',
    photo_url: ''
  })

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'public', label: 'Public Page', icon: Globe },
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
  ]

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('recruiters')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile({
        full_name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        bio: data.bio || '',
        linkedin_url: data.linkedin_url || '',
        slug: data.slug || '',
        company_name: data.company_name || '',
        photo_url: data.photo_url || ''
      })
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('recruiters')
      .update({
        full_name: profile.full_name || null,
        phone: profile.phone || null,
        bio: profile.bio || null,
        linkedin_url: profile.linkedin_url || null,
        slug: profile.slug || null,
        company_name: profile.company_name || null
      })
      .eq('id', user.id)

    if (error) {
      if (error.code === '23505') {
        alert('This URL slug is already taken. Please choose a different one.')
      } else {
        console.error('Error saving profile:', error)
        alert('Error saving profile')
      }
    } else {
      alert('Profile saved successfully!')
    }
    setSaving(false)
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function copyLink() {
    if (profile.slug) {
      navigator.clipboard.writeText(`https://jobs.search.market/r/${profile.slug}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const publicPageUrl = profile.slug ? `https://jobs.search.market/r/${profile.slug}` : null

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12 text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex gap-8">
        {/* Tabs Sidebar */}
        <div className="w-56 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand-light text-brand-navy font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Settings</h2>
              
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-brand-navy rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {profile.full_name?.split(' ').map(n => n[0]).join('') || 'SM'}
                  </div>
                  <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    Change Photo
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={profile.linkedin_url}
                    onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    rows={3}
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    placeholder="Tell candidates about yourself and your recruiting specialty..."
                  />
                </div>

                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-navy text-white font-medium rounded-lg hover:bg-brand-blue transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'public' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Public Job Page</h2>
              <p className="text-gray-500 mb-6">Create your own branded job page to share with candidates.</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your URL Slug</label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center">
                      <span className="px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg text-gray-500 text-sm">
                        jobs.search.market/r/
                      </span>
                      <input
                        type="text"
                        value={profile.slug}
                        onChange={(e) => setProfile({ ...profile, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        placeholder="john-smith"
                      />
                    </div>
                  </div>
                  {profile.full_name && !profile.slug && (
                    <button
                      onClick={() => setProfile({ ...profile, slug: generateSlug(profile.full_name) })}
                      className="text-sm text-brand-accent hover:underline mt-2"
                    >
                      Generate from name: {generateSlug(profile.full_name)}
                    </button>
                  )}
                </div>

                {publicPageUrl && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-800 mb-2">Your public page URL:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-white px-3 py-2 rounded border border-green-200">
                        {publicPageUrl}
                      </code>
                      <button
                        onClick={copyLink}
                        className="p-2 text-green-700 hover:bg-green-100 rounded"
                        title="Copy link"
                      >
                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                      <a
                        href={publicPageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-green-700 hover:bg-green-100 rounded"
                        title="Open page"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company/Brand Name</label>
                  <input
                    type="text"
                    value={profile.company_name}
                    onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    placeholder="Your Company or Brand Name"
                  />
                  <p className="text-xs text-gray-400 mt-1">This will appear in the header of your public page</p>
                </div>

                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-navy text-white font-medium rounded-lg hover:bg-brand-blue transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'company' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Company Settings</h2>
              <p className="text-gray-500">Set up your recruiting business details.</p>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>
              <p className="text-gray-500">Manage how you receive notifications.</p>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Billing & Platform Fee</h2>
              <div className="bg-brand-light rounded-lg p-4 mb-6">
                <p className="text-brand-navy font-medium">Your Platform Fee: 10%</p>
                <p className="text-sm text-gray-600 mt-1">Volume discounts available as you grow.</p>
              </div>
              <p className="text-gray-500">Payment methods and invoices will appear here.</p>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h2>
              <p className="text-gray-500">Manage your password and security preferences.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
