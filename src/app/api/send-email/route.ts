import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, referenceName, candidateName, recruiterName, referenceUrl } = body

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return NextResponse.json(
        { success: false, error: 'Email service not configured' },
        { status: 500 }
      )
    }

    const { data, error } = await resend.emails.send({
      from: 'Search.Market <noreply@search.market>', // Change to your verified domain
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
      text: `Hi,

My name is ${recruiterName} and I'm a recruiter working with Search Market, a new AI powered talent finding platform. I was given your information as a reference for ${candidateName}.

I am wondering if you could take a moment to visit the following page and fill in the reference information.

${referenceUrl}

Thanks very much in advance!

Craig Ferguson
https://Search.Market
craig.ferguson@search.market`
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, messageId: data?.id })

  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
