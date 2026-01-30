import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    // Get reference request details
    const { data: reference, error: refError } = await supabase
      .from('reference_requests')
      .select(`
        id,
        reference_email,
        reference_name,
        candidate_id,
        recruiter_id
      `)
      .eq('token', token)
      .single()

    if (refError || !reference) {
      console.error('Error fetching reference:', refError)
      return NextResponse.json({ error: 'Reference not found' }, { status: 404 })
    }

    // Get candidate details
    const { data: candidate } = await supabase
      .from('candidates')
      .select('first_name')
      .eq('id', reference.candidate_id)
      .single()

    // Get recruiter details
    const { data: recruiter } = await supabase
      .from('recruiters')
      .select('full_name, email, slug')
      .eq('id', reference.recruiter_id)
      .single()

    if (!recruiter) {
      return NextResponse.json({ error: 'Recruiter not found' }, { status: 404 })
    }

    const referenceEmail = reference.reference_email.toLowerCase()
    const referenceFirstName = reference.reference_name?.split(' ')[0] || 'there'
    const candidateFirstName = candidate?.first_name || 'the candidate'
    const recruiterName = recruiter.full_name || 'The Search.Market Team'
    const recruiterSlug = recruiter.slug
    const recruiterEmailAddress = recruiter.email

    // Check if reference email is in client_contacts and if client is claimed
    let isClaimedContact = false
    const { data: clientContact } = await supabase
      .from('client_contacts')
      .select('client_id')
      .eq('email', referenceEmail)
      .limit(1)
      .single()

    if (clientContact) {
      const { data: client } = await supabase
        .from('clients')
        .select('owned_by')
        .eq('id', clientContact.client_id)
        .single()
      
      if (client?.owned_by) {
        isClaimedContact = true
      }
    }

    // Check if reference email is in candidates and if claimed
    let isClaimedCandidate = false
    if (!clientContact) {
      const { data: candidateRecord } = await supabase
        .from('candidates')
        .select('owned_by')
        .eq('email', referenceEmail)
        .limit(1)
        .single()

      if (candidateRecord?.owned_by) {
        isClaimedCandidate = true
      }
    }

    const isClaimed = isClaimedContact || isClaimedCandidate
    const recruiterPageUrl = recruiterSlug 
      ? `https://jobs.search.market/r/${recruiterSlug}` 
      : 'https://search.market'

    // Build email content based on claimed status
    let emailHtml: string
    let subject = 'A big thanks from Search.Market'
    
    // Professional teal-blue link color - noticeable but not offensive
    const linkColor = '#0369a1'

    if (isClaimed) {
      // Simple thank you for claimed contacts/candidates
      emailHtml = `
        <div style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="color: #374151; margin-bottom: 20px;">
            Hi ${referenceFirstName},
          </p>
          <p style="color: #374151; margin-bottom: 20px;">
            Thanks again for taking time to fill in ${candidateFirstName}'s reference form!
          </p>
          <p style="color: #374151; margin-bottom: 8px;">
            Best Regards,
          </p>
          <p style="color: #374151; line-height: 1.4; margin: 0;">${recruiterName}<br><a href="${recruiterPageUrl}" style="color: ${linkColor};">Search.Market</a><br><a href="mailto:${recruiterEmailAddress}" style="color: ${linkColor};">${recruiterEmailAddress}</a></p>
        </div>
      `
    } else {
      // Marketing thank you for unclaimed contacts/candidates
      emailHtml = `
        <div style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="color: #374151; margin-bottom: 20px;">
            Hi ${referenceFirstName},
          </p>
          <p style="color: #374151; margin-bottom: 20px;">
            Thanks again for taking time to fill in ${candidateFirstName}'s reference form! If you need help hiring or you ever want to start looking for new job opportunities, simply visit my <a href="${recruiterPageUrl}" style="color: ${linkColor};">Search.Market</a> page.
          </p>
          <p style="color: #374151; margin-bottom: 20px;">
            <a href="https://search.market" style="color: ${linkColor};">Search.Market</a> connects elite recruiters who collaborate on filling your jobs.
          </p>
          <p style="color: #374151; line-height: 1.4; margin: 0;">${recruiterName}<br><a href="${recruiterPageUrl}" style="color: ${linkColor};">Search.Market</a><br><a href="mailto:${recruiterEmailAddress}" style="color: ${linkColor};">${recruiterEmailAddress}</a></p>
        </div>
      `
    }

    // Send email via Resend
    if (!process.env.RESEND_API_KEY) {
      console.log('RESEND_API_KEY not configured, skipping email')
      console.log('Would have sent thank you email to:', referenceEmail)
      return NextResponse.json({ success: true, warning: 'Email service not configured' })
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Search Market <onboarding@resend.dev>',
        to: referenceEmail,
        subject: subject,
        html: emailHtml
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend API error:', errorData)
      return NextResponse.json({ error: 'Failed to send email', details: errorData }, { status: 500 })
    }

    return NextResponse.json({ success: true, claimed: isClaimed })
  } catch (error) {
    console.error('Error sending thank you email:', error)
    return NextResponse.json({ error: 'Failed to send email', details: String(error) }, { status: 500 })
  }
}
