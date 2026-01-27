import { NextRequest, NextResponse } from 'next/server'

// This API route sends reference check emails
// You'll need to configure an email service like Resend, SendGrid, or use Supabase's email capabilities

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, subject, body: emailBody } = body

    // Option 1: Using Resend (recommended)
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({
    //   from: 'Search.Market <noreply@search.market>',
    //   to: to,
    //   subject: subject,
    //   text: emailBody,
    // })

    // Option 2: Using SendGrid
    // const sgMail = require('@sendgrid/mail')
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    // await sgMail.send({
    //   to: to,
    //   from: 'noreply@search.market',
    //   subject: subject,
    //   text: emailBody,
    // })

    // Option 3: Using Supabase Edge Functions for email
    // You can create a Supabase Edge Function that handles email sending

    // For now, log the email details (replace with actual email sending)
    console.log('=== REFERENCE EMAIL ===')
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('Body:', emailBody)
    console.log('========================')

    // Return success even if email isn't actually sent
    // The reference link is displayed to the user as a fallback
    return NextResponse.json({ success: true, message: 'Email queued' })

  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
