import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, referenceName, candidateName, recruiterName, referenceUrl } = body

    const apiKey = process.env.RESEND_API_KEY

    // If RESEND_API_KEY is configured, send via Resend API
    if (apiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Search.Market <noreply@search.market>',
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
      
      if (!response.ok) {
        console.error('Resend error:', result)
        return NextResponse.json(
          { success: false, error: result.message || 'Email failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, messageId: result.id })
    }

    // No email service configured - just log and return success
    console.log('=== REFERENCE EMAIL (not sent - no RESEND_API_KEY) ===')
    console.log('To:', to)
    console.log('Candidate:', candidateName)
    console.log('Link:', referenceUrl)
    console.log('=========================================')

    return NextResponse.json({ 
      success: true, 
      message: 'Email service not configured' 
    })

  } catch (error) {
    console.error('Error in send-email:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
