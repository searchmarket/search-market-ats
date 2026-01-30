'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'

interface ReferenceData {
  id: string
  candidate_name: string
  questions: string[]
  status: string
}

export default function PublicReferenceFormPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null)
  const [answers, setAnswers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    if (token) {
      fetchReferenceData()
    }
  }, [token])

  async function fetchReferenceData() {
    setLoading(true)
    setError(null)
    
    try {
      // Use the RPC function to get reference data
      const { data, error } = await supabase
        .rpc('get_reference_by_token', { p_token: token })
      
      if (error) {
        console.error('Error fetching reference:', error)
        setError('Unable to load reference form. The link may be invalid or expired.')
        setLoading(false)
        return
      }
      
      if (!data || data.length === 0) {
        setError('Reference request not found. The link may be invalid or expired.')
        setLoading(false)
        return
      }
      
      const refData = data[0]
      
      // Redirect to search.market if already completed
      if (refData.status === 'completed') {
        window.location.href = 'https://search.market'
        return
      }
      
      setReferenceData({
        id: refData.id,
        candidate_name: refData.candidate_name,
        questions: refData.questions,
        status: refData.status
      })
      
      // Initialize answers array
      setAnswers(new Array(refData.questions.length).fill(''))
      
    } catch (err) {
      console.error('Error:', err)
      setError('An error occurred while loading the form.')
    }
    
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!referenceData) return
    
    setSubmitting(true)
    
    // Format answers as array of {question, answer} objects
    const formattedAnswers = referenceData.questions.map((question, index) => ({
      question,
      answer: answers[index] || ''
    }))
    
    try {
      // Use the RPC function to complete the reference
      const { data, error } = await supabase
        .rpc('complete_reference', {
          p_token: token,
          p_answers: formattedAnswers
        })
      
      if (error) {
        console.error('Error submitting reference:', error)
        alert('Error submitting reference. Please try again.')
        setSubmitting(false)
        return
      }
      
      // Send thank you email
      try {
        const emailResponse = await fetch('/api/reference-thankyou', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })
        const emailResult = await emailResponse.json()
        console.log('Thank you email API response:', emailResponse.status, emailResult)
      } catch (emailError) {
        console.error('Error sending thank you email:', emailError)
        // Don't block submission if email fails
      }
      
      setSubmitted(true)
      
    } catch (err) {
      console.error('Error:', err)
      alert('An error occurred. Please try again.')
    }
    
    setSubmitting(false)
  }

  function updateAnswer(index: number, value: string) {
    const newAnswers = [...answers]
    newAnswers[index] = value
    setAnswers(newAnswers)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading reference form...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Link Not Valid</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanks Very Much!</h1>
          <p className="text-gray-600 mb-6">
            Your reference has been submitted successfully. We really appreciate you taking the time to provide feedback.
          </p>
          <div className="text-sm text-gray-400">
            You can close this window now.
          </div>
        </div>
      </div>
    )
  }

  if (!referenceData) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="/search-market-logo-white.png" 
                alt="Search Market" 
                className="h-8"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
            <h1 className="text-2xl font-bold text-center">Reference Check</h1>
            <p className="text-blue-100 text-center mt-2">
              For: <span className="font-semibold text-white">{referenceData.candidate_name}</span>
            </p>
          </div>
          
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
            <p className="text-sm text-blue-800 text-center">
              Thank you for taking the time to provide a reference. Your feedback is valuable and will be kept confidential.
            </p>
          </div>
        </div>

        {/* Questions Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Reference Questions</h2>
            
            <div className="space-y-6">
              {referenceData.questions.map((question, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    <span className="text-blue-600">{index + 1}.</span> {question}
                  </label>
                  <textarea
                    value={answers[index]}
                    onChange={(e) => updateAnswer(index, e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Enter your response..."
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Reference'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-400">
          <p>Powered by <a href="https://search.market" className="text-blue-600 hover:underline">Search.Market</a></p>
        </div>
      </div>
    </div>
  )
}
