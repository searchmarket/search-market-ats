import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, referenceName, candidateName, recruiterName, referenceUrl } = body

    const apiKey = process.env.RESEND_API_KEY

    // Check if API key exists
    if (!apiKey) {
      console.log('RESEND_API_KEY not configured')
      return NextResponse.json({ 
        success: false, 
        error: 'Email service not configured - RESEND_API_KEY missing' 
      })
    }

    // Use Resend's test domain until your domain is verified
    // Change to 'Search.Market <noreply@search.market>' after domain verification
    const fromAddress = 'Search.Market <onboarding@resend.dev>'

    console.log('Sending email to:', to)
    console.log('From:', fromAddress)
    console.log('Reference URL:', referenceUrl)

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: to,
        subject: `Reference Check for ${candidateName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Hi,</p>
            
            <p>My name is ${recruiterName} and I'm a recruiter working with Search Market, a new AI powered talent finding platform. I was given your information as a reference for <strong>${candidateName}</strong>.</p>
            
            <p>I am wondering if you could take a moment to visit the following page and fill in the reference information.</p>
            
            <p style="margin: 30px 0;">
              <a href="${referenceUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Complete Reference Check
              </a>
            </p>
            
            <p>Or copy this link: <a href="${referenceUrl}">${referenceUrl}</a></p>
            
            <p>Thanks very much in advance!</p>
            
            <p style="margin-top: 30px;">
              Craig Ferguson<br>
              <a href="https://Search.Market">https://Search.Market</a><br>
              <a href="mailto:craig.ferguson@search.market">craig.ferguson@search.market</a>
            </p>
          </div>
        `,
      }),
    })

    const result = await response.json()
    
    console.log('Resend response status:', response.status)
    console.log('Resend response:', JSON.stringify(result))
    
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: result.message || result.name || 'Email failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, messageId: result.id })

  } catch (error) {
    console.error('Error in send-email:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
