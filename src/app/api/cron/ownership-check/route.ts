import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This endpoint is called by Vercel Cron
// It checks for:
// 1. Claimed candidates with no two-way communication after 24 hours - release them
// 2. Owned candidates with no two-way communication for 30 days - release them
// 3. Expired exclusive windows - clear them

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role key for admin access
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  let released24hr = 0
  let released30day = 0
  let expiredExclusive = 0

  try {
    // 1. Release candidates claimed > 24 hours ago with no two-way communication
    const { data: staleClaimsData, error: staleClaimsError } = await supabase
      .from('candidates')
      .select('id, owned_by, first_name, last_name')
      .not('owned_by', 'is', null)
      .lt('owned_at', twentyFourHoursAgo.toISOString())
      .is('last_two_way_contact', null)

    if (staleClaimsError) {
      console.error('Error fetching stale claims:', staleClaimsError)
    } else if (staleClaimsData && staleClaimsData.length > 0) {
      for (const candidate of staleClaimsData) {
        // Log the auto-release
        await supabase.from('activity_logs').insert([{
          candidate_id: candidate.id,
          recruiter_id: candidate.owned_by,
          activity_type: 'released',
          channel: 'system',
          notes: 'Auto-released: No two-way communication within 24 hours of claim'
        }])

        // Release the candidate
        await supabase
          .from('candidates')
          .update({ owned_by: null, owned_at: null })
          .eq('id', candidate.id)

        released24hr++
      }
    }

    // 2. Release candidates owned > 30 days with no recent two-way communication
    const { data: staleOwnershipData, error: staleOwnershipError } = await supabase
      .from('candidates')
      .select('id, owned_by, first_name, last_name, last_two_way_contact')
      .not('owned_by', 'is', null)
      .not('last_two_way_contact', 'is', null)
      .lt('last_two_way_contact', thirtyDaysAgo.toISOString())

    if (staleOwnershipError) {
      console.error('Error fetching stale ownership:', staleOwnershipError)
    } else if (staleOwnershipData && staleOwnershipData.length > 0) {
      for (const candidate of staleOwnershipData) {
        // Log the auto-release
        await supabase.from('activity_logs').insert([{
          candidate_id: candidate.id,
          recruiter_id: candidate.owned_by,
          activity_type: 'released',
          channel: 'system',
          notes: 'Auto-released: No two-way communication for 30+ days'
        }])

        // Release the candidate
        await supabase
          .from('candidates')
          .update({ owned_by: null, owned_at: null })
          .eq('id', candidate.id)

        released30day++
      }
    }

    // 3. Clear expired exclusive windows (just for cleanup, not releasing ownership)
    const { data: expiredExclusiveData, error: expiredExclusiveError } = await supabase
      .from('candidates')
      .select('id')
      .not('exclusive_until', 'is', null)
      .lt('exclusive_until', now.toISOString())

    if (expiredExclusiveError) {
      console.error('Error fetching expired exclusives:', expiredExclusiveError)
    } else if (expiredExclusiveData && expiredExclusiveData.length > 0) {
      await supabase
        .from('candidates')
        .update({ exclusive_until: null })
        .lt('exclusive_until', now.toISOString())

      expiredExclusive = expiredExclusiveData.length
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      released: {
        noContactIn24hr: released24hr,
        noContactIn30days: released30day,
        expiredExclusiveWindows: expiredExclusive
      }
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
