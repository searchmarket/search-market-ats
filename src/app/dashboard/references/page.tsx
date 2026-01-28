'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { 
  ArrowLeft, Plus, Send, FileText, Check, Clock, 
  User, Building2, Briefcase, Mail, Phone, Pencil,
  Printer, ChevronDown, ChevronUp, Loader2, X, Copy, ExternalLink
} from 'lucide-react'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string | null
}

interface Recruiter {
  id: string
  full_name: string | null
  email: string
}

interface ReferenceRequest {
  id: string
  candidate_id: string
  recruiter_id: string
  token: string
  reference_name: string | null
  reference_company: string | null
  reference_title: string | null
  reference_email: string
  reference_phone: string | null
  questions: string[]
  answers: { question: string; answer: string }[] | null
  status: 'pending' | 'completed'
  created_at: string
  completed_at: string | null
}

const DEFAULT_QUESTIONS = [
  'How long have you known the candidate and in what capacity?',
  'What were the candidate\'s primary responsibilities in their role?',
  'How would you describe the quality of their work?',
  'How did they handle pressure and tight deadlines?',
  'Can you describe their communication and interpersonal skills?',
  'What are their greatest professional strengths?',
  'What areas could they improve upon?',
  'How well did they work with team members and management?',
  'Would you rehire this person if given the opportunity? Why or why not?',
  'Is there anything else you would like to add about the candidate?'
]

export default function ReferencesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const candidateId = searchParams.get('candidateId')
  
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [recruiter, setRecruiter] = useState<Recruiter | null>(null)
  const [references, setReferences] = useState<ReferenceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  
  const [showCheckReference, setShowCheckReference] = useState(false)
  const [questions, setQuestions] = useState<string[]>(DEFAULT_QUESTIONS)
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null)
  const [editingQuestionText, setEditingQuestionText] = useState('')
  
  const [selectedReference, setSelectedReference] = useState<ReferenceRequest | null>(null)
  
  const [formData, setFormData] = useState({
    reference_name: '',
    reference_company: '',
    reference_title: '',
    reference_email: '',
    reference_phone: ''
  })
  
  const supabase = createClient()

  useEffect(() => {
    if (candidateId) {
      fetchData()
    }
  }, [candidateId])

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
    }
    
    // Get candidate
    const { data: candidateData } = await supabase
      .from('candidates')
      .select('id, first_name, last_name, email')
      .eq('id', candidateId)
      .single()
    
    if (candidateData) {
      setCandidate(candidateData)
    }
    
    // Get reference requests
    const { data: referencesData } = await supabase
      .from('reference_requests')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })
    
    if (referencesData) {
      setReferences(referencesData)
    }
    
    setLoading(false)
  }

  function generateToken(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  async function sendReferenceRequest() {
    if (!candidate || !recruiter || !formData.reference_name || !formData.reference_email) {
      alert('Please fill in the reference name and email')
      return
    }
    
    setSending(true)
    
    const token = generateToken()
    const referenceUrl = `${window.location.origin}/reference/${token}`
    
    // Create reference request
    const { data: request, error } = await supabase
      .from('reference_requests')
      .insert({
        candidate_id: candidate.id,
        recruiter_id: recruiter.id,
        reference_name: formData.reference_name,
        reference_company: formData.reference_company || null,
        reference_title: formData.reference_title || null,
        reference_email: formData.reference_email,
        reference_phone: formData.reference_phone || null,
        token: token,
        questions: questions,
        status: 'pending'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating reference request:', error)
      alert('Error creating reference request')
      setSending(false)
      return
    }
    
    // Try to send email via API
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formData.reference_email,
          referenceName: formData.reference_name,
          candidateName: `${candidate.first_name} ${candidate.last_name}`,
          recruiterName: recruiter.full_name || 'A recruiter',
          referenceUrl: referenceUrl
        })
      })
      
      const result = await response.json()
      if (!result.success) {
        console.warn('Email not sent:', result.error)
      }
    } catch (err) {
      console.warn('Email API not available')
    }
    
    // Reset form and refresh
    setFormData({
      reference_name: '',
      reference_company: '',
      reference_title: '',
      reference_email: '',
      reference_phone: ''
    })
    setShowCheckReference(false)
    fetchData()
    setSending(false)
    
    // Show the reference link to copy
    const copyLink = confirm(`Reference request created!\n\nReference link:\n${referenceUrl}\n\nClick OK to copy the link to clipboard.`)
    if (copyLink) {
      navigator.clipboard.writeText(referenceUrl)
    }
  }

  function startEditQuestion(index: number) {
    setEditingQuestionIndex(index)
    setEditingQuestionText(questions[index])
  }

  function saveQuestion() {
    if (editingQuestionIndex !== null) {
      const newQuestions = [...questions]
      newQuestions[editingQuestionIndex] = editingQuestionText
      setQuestions(newQuestions)
      setEditingQuestionIndex(null)
      setEditingQuestionText('')
    }
  }

  function cancelEditQuestion() {
    setEditingQuestionIndex(null)
    setEditingQuestionText('')
  }

  function printReference(ref: ReferenceRequest) {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !candidate) return
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reference Check - ${candidate.first_name} ${candidate.last_name}</title>
        <style>
          body { 
            font-family: 'Georgia', serif; 
            max-width: 800px; 
            margin: 40px auto; 
            padding: 20px;
            line-height: 1.6;
            color: #333;
          }
          .header { 
            border-bottom: 3px solid #0066cc; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
          }
          h1 { 
            color: #0066cc; 
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .candidate-name {
            font-size: 20px;
            color: #555;
          }
          .meta { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 30px;
            border-left: 4px solid #0066cc;
          }
          .meta-row { 
            display: flex;
            margin-bottom: 8px;
          }
          .meta-label { 
            font-weight: bold; 
            width: 120px;
            color: #555;
          }
          .meta-value {
            color: #333;
          }
          .qa-section { 
            margin-top: 30px; 
          }
          .qa-item { 
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .question { 
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 8px;
            font-size: 14px;
          }
          .answer { 
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 3px solid #0066cc;
            white-space: pre-wrap;
          }
          .footer { 
            margin-top: 50px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd; 
            font-size: 11px; 
            color: #888;
            text-align: center;
          }
          @media print {
            body { margin: 20px; }
            .qa-item { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reference Check Report</h1>
          <div class="candidate-name">Candidate: ${candidate.first_name} ${candidate.last_name}</div>
        </div>
        
        <div class="meta">
          <div class="meta-row">
            <span class="meta-label">Reference:</span>
            <span class="meta-value">${ref.reference_name || 'N/A'}</span>
          </div>
          ${ref.reference_title ? `
          <div class="meta-row">
            <span class="meta-label">Title:</span>
            <span class="meta-value">${ref.reference_title}</span>
          </div>` : ''}
          ${ref.reference_company ? `
          <div class="meta-row">
            <span class="meta-label">Company:</span>
            <span class="meta-value">${ref.reference_company}</span>
          </div>` : ''}
          <div class="meta-row">
            <span class="meta-label">Email:</span>
            <span class="meta-value">${ref.reference_email}</span>
          </div>
          ${ref.reference_phone ? `
          <div class="meta-row">
            <span class="meta-label">Phone:</span>
            <span class="meta-value">${ref.reference_phone}</span>
          </div>` : ''}
          <div class="meta-row">
            <span class="meta-label">Submitted:</span>
            <span class="meta-value">${ref.completed_at ? new Date(ref.completed_at).toLocaleString() : 'N/A'}</span>
          </div>
        </div>
        
        <div class="qa-section">
          <h2 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Questions & Answers</h2>
          ${ref.answers?.map((qa, i) => `
            <div class="qa-item">
              <div class="question">${i + 1}. ${qa.question}</div>
              <div class="answer">${qa.answer || 'No answer provided'}</div>
            </div>
          `).join('') || '<p>No answers recorded</p>'}
        </div>
        
        <div class="footer">
          <p>Generated by Search.Market Reference Check System</p>
          <p>${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `
    
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 250)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Candidate not found</p>
        <Link href="/dashboard/candidates" className="text-brand-accent hover:underline mt-4 inline-block">
          Back to Candidates
        </Link>
      </div>
    )
  }

  // View single completed reference
  if (selectedReference) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedReference(null)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to References
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reference Check</h1>
              <p className="text-gray-500">For {candidate.first_name} {candidate.last_name}</p>
            </div>
            <button
              onClick={() => printReference(selectedReference)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>

          <div className="p-6">
            {/* Reference Info */}
            <div className="bg-gray-50 rounded-lg p-5 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Reference Name</span>
                  <p className="font-medium text-gray-900">{selectedReference.reference_name || 'N/A'}</p>
                </div>
                {selectedReference.reference_title && (
                  <div>
                    <span className="text-sm text-gray-500">Title</span>
                    <p className="font-medium text-gray-900">{selectedReference.reference_title}</p>
                  </div>
                )}
                {selectedReference.reference_company && (
                  <div>
                    <span className="text-sm text-gray-500">Company</span>
                    <p className="font-medium text-gray-900">{selectedReference.reference_company}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-500">Email</span>
                  <p className="font-medium text-gray-900">{selectedReference.reference_email}</p>
                </div>
                {selectedReference.reference_phone && (
                  <div>
                    <span className="text-sm text-gray-500">Phone</span>
                    <p className="font-medium text-gray-900">{selectedReference.reference_phone}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-500">Submitted</span>
                  <p className="font-medium text-gray-900">
                    {selectedReference.completed_at 
                      ? new Date(selectedReference.completed_at).toLocaleString() 
                      : 'Pending'}
                  </p>
                </div>
              </div>
            </div>

            {/* Q&A */}
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Questions & Answers</h2>
            <div className="space-y-5">
              {selectedReference.answers?.map((qa, index) => (
                <div key={index} className="border-l-4 border-brand-accent pl-4">
                  <h3 className="font-medium text-brand-accent text-sm mb-2">
                    {index + 1}. {qa.question}
                  </h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                    {qa.answer || <span className="text-gray-400 italic">No answer provided</span>}
                  </p>
                </div>
              )) || (
                <p className="text-gray-400">No answers recorded</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main references list view
  const completedReferences = references.filter(r => r.status === 'completed')
  const pendingReferences = references.filter(r => r.status === 'pending')

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => router.push(`/dashboard/candidates?id=${candidateId}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to {candidate.first_name} {candidate.last_name}
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">References</h1>
          <p className="text-gray-500 mt-1">
            For {candidate.first_name} {candidate.last_name}
          </p>
        </div>
        <button
          onClick={() => setShowCheckReference(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-accent text-white font-medium rounded-lg hover:bg-brand-blue transition-colors"
        >
          <Plus className="w-5 h-5" />
          Check Reference
        </button>
      </div>

      {/* Completed References */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600" />
          Submitted References ({completedReferences.length})
        </h2>
        
        {completedReferences.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No submitted references yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedReferences.map((ref) => (
              <div
                key={ref.id}
                onClick={() => setSelectedReference(ref)}
                className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 cursor-pointer transition-colors border border-green-100"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{ref.reference_name || 'Unknown'}</h3>
                    <p className="text-sm text-gray-500">
                      {[ref.reference_title, ref.reference_company].filter(Boolean).join(' at ') || ref.reference_email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {ref.completed_at ? new Date(ref.completed_at).toLocaleDateString() : ''}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); printReference(ref) }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                    title="Print"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending References */}
      {pendingReferences.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            Pending Requests ({pendingReferences.length})
          </h2>
          <div className="space-y-3">
            {pendingReferences.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-100"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-700" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{ref.reference_name || 'Unknown'}</h3>
                    <p className="text-sm text-gray-500">{ref.reference_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-yellow-700 font-medium">Awaiting response</span>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/reference/${ref.token}`
                      navigator.clipboard.writeText(url)
                      alert('Reference link copied to clipboard!')
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                    title="Copy Link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Check Reference Modal */}
      {showCheckReference && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">Check Reference</h2>
              <button 
                onClick={() => setShowCheckReference(false)} 
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Reference Questions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Reference Questions</h3>
                <p className="text-sm text-gray-500 mb-4">Click on any question to edit it</p>
                <div className="space-y-2 max-h-72 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {questions.map((question, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-sm font-medium text-gray-400 w-6 pt-2 flex-shrink-0">
                        {index + 1}.
                      </span>
                      {editingQuestionIndex === index ? (
                        <div className="flex-1 space-y-2">
                          <textarea
                            value={editingQuestionText}
                            onChange={(e) => setEditingQuestionText(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-brand-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveQuestion}
                              className="px-3 py-1 bg-brand-accent text-white text-sm rounded-lg hover:bg-brand-blue"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditQuestion}
                              className="px-3 py-1 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditQuestion(index)}
                          className="flex-1 flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer group"
                        >
                          <span className="text-sm text-gray-700">{question}</span>
                          <Pencil className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Reference Contact Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Reference Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <User className="w-4 h-4 inline mr-1" />
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.reference_name}
                      onChange={(e) => setFormData({ ...formData, reference_name: e.target.value })}
                      placeholder="John Smith"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Building2 className="w-4 h-4 inline mr-1" />
                      Company
                    </label>
                    <input
                      type="text"
                      value={formData.reference_company}
                      onChange={(e) => setFormData({ ...formData, reference_company: e.target.value })}
                      placeholder="Acme Corp"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Briefcase className="w-4 h-4 inline mr-1" />
                      Title
                    </label>
                    <input
                      type="text"
                      value={formData.reference_title}
                      onChange={(e) => setFormData({ ...formData, reference_title: e.target.value })}
                      placeholder="VP of Engineering"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.reference_email}
                      onChange={(e) => setFormData({ ...formData, reference_email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Cell
                    </label>
                    <input
                      type="tel"
                      value={formData.reference_phone}
                      onChange={(e) => setFormData({ ...formData, reference_phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 sticky bottom-0 bg-white">
              <button
                onClick={sendReferenceRequest}
                disabled={sending || !formData.reference_name || !formData.reference_email}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-accent text-white font-medium rounded-lg hover:bg-brand-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {sending ? 'Sending...' : 'Send Reference Form'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
