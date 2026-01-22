import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { filePath } = await request.json()

    if (!filePath) {
      return NextResponse.json({ error: 'Missing file path' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Create signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from('candidate-files')
      .createSignedUrl(filePath, 3600)

    if (error) {
      console.error('Error creating signed URL:', error)
      return NextResponse.json({ error: 'Failed to create download URL' }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get download URL' },
      { status: 500 }
    )
  }
}
