import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, referenceName, candidateName, recruiterName, recruiterEmail, recruiterSlug, referenceUrl, isReminder } = body

    const apiKey = process.env.RESEND_API_KEY

    // Check if API key exists
    if (!apiKey) {
      console.log('RESEND_API_KEY not configured')
      return NextResponse.json({ 
        success: false, 
        error: 'Email service not configured - RESEND_API_KEY missing' 
      })
    }

    // Use verified domain
    const fromAddress = 'Search.Market <noreply@search.market>'
    
    // Subject line changes based on whether it's a reminder
    const subject = isReminder 
      ? `Reminder: Reference Check for ${candidateName}`
      : `Reference Check for ${candidateName}`

    console.log('Sending email to:', to)
    console.log('From:', fromAddress)
    console.log('Subject:', subject)
    console.log('Reference URL:', referenceUrl)

    // Corporate styling
    const linkColor = '#0369a1' // Professional teal-blue - noticeable but not offensive
    const fontFamily = "Calibri, 'Segoe UI', Arial, sans-serif"
    const fontSize = '14px' // 11pt equivalent for web

    // Get reference first name
    const referenceFirstName = referenceName?.split(' ')[0] || 'there'
    
    // Build recruiter's Search.Market page URL
    const recruiterPageUrl = recruiterSlug 
      ? `https://jobs.search.market/r/${recruiterSlug}` 
      : 'https://search.market'

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: to,
        subject: subject,
        html: `
          <div style="font-family: ${fontFamily}; font-size: ${fontSize}; color: #333333; line-height: 1.5; max-width: 600px;">
            <p style="margin: 0 0 16px 0;">Hi ${referenceFirstName},</p>
            
            <p style="margin: 0 0 16px 0;">My name is ${recruiterName} and I'm a recruiter working with Search Market, a new AI powered talent finding platform. I was given your information as a reference for <strong>${candidateName}</strong>.</p>
            
            <p style="margin: 0 0 16px 0;">I am wondering if you could take a moment to visit the following page and fill in the reference information.</p>
            
            <p style="margin: 24px 0;">
              <a href="${referenceUrl}" style="background-color: ${linkColor}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-family: ${fontFamily}; font-size: ${fontSize};">
                Complete Reference Check
              </a>
            </p>
            
            <p style="margin: 0 0 16px 0;">Or copy this link: <a href="${referenceUrl}" style="color: ${linkColor};">${referenceUrl}</a></p>
            
            <p style="margin: 0 0 16px 0;">Thanks very much in advance!</p>
            
            <p style="margin: 24px 0 0 0; line-height: 1.4;">${recruiterName}<br><a href="${recruiterPageUrl}" style="color: ${linkColor};">Search.Market</a><br><a href="mailto:${recruiterEmail}" style="color: ${linkColor};">${recruiterEmail}</a></p>
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
