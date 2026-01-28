import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This route is called by Vercel Cron to:
// 1. Send reminder emails after 24 hours
// 2. Mark references as 'no_response' after 72 hours

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000)

  let remindersSent = 0
  let statusesChanged = 0

  try {
    // 1. Find pending references that need a reminder (24+ hours, no reminder sent yet)
    const { data: needsReminder, error: reminderError } = await supabase
      .from('reference_requests')
      .select(`
        *,
        candidates!inner(first_name, last_name),
        recruiters!inner(full_name)
      `)
      .eq('status', 'pending')
      .is('reminder_sent_at', null)
      .lt('last_sent_at', twentyFourHoursAgo.toISOString())

    if (reminderError) {
      console.error('Error fetching references for reminder:', reminderError)
    } else if (needsReminder && needsReminder.length > 0) {
      console.log(`Found ${needsReminder.length} references needing reminder`)
      
      for (const ref of needsReminder) {
        const candidateName = `${ref.candidates.first_name} ${ref.candidates.last_name}`
        const recruiterName = ref.recruiters.full_name || 'A recruiter'
        const referenceUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ats.search.market'}/reference/${ref.token}`
        
        // Send reminder email
        try {
          const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://ats.search.market'}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: ref.reference_email,
              referenceName: ref.reference_name,
              candidateName: candidateName,
              recruiterName: recruiterName,
              referenceUrl: referenceUrl,
              isReminder: true
            })
          })
          
          const result = await emailResponse.json()
          
          if (result.success) {
            // Update reminder_sent_at
            await supabase
              .from('reference_requests')
              .update({ reminder_sent_at: now.toISOString() })
              .eq('id', ref.id)
            
            remindersSent++
            console.log(`Reminder sent for reference ${ref.id}`)
          }
        } catch (err) {
          console.error(`Failed to send reminder for ${ref.id}:`, err)
        }
      }
    }

    // 2. Find references that should be marked as 'no_response' (72+ hours)
    const { data: needsNoResponse, error: noResponseError } = await supabase
      .from('reference_requests')
      .select('id')
      .eq('status', 'pending')
      .not('reminder_sent_at', 'is', null)
      .lt('last_sent_at', seventyTwoHoursAgo.toISOString())

    if (noResponseError) {
      console.error('Error fetching references for no_response:', noResponseError)
    } else if (needsNoResponse && needsNoResponse.length > 0) {
      console.log(`Found ${needsNoResponse.length} references to mark as no_response`)
      
      const ids = needsNoResponse.map(r => r.id)
      
      const { error: updateError } = await supabase
        .from('reference_requests')
        .update({ status: 'no_response' })
        .in('id', ids)
      
      if (updateError) {
        console.error('Error updating statuses:', updateError)
      } else {
        statusesChanged = ids.length
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      statusesChanged,
      timestamp: now.toISOString()
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
