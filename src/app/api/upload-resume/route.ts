import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const candidateId = formData.get('candidateId') as string
    const recruiterId = formData.get('recruiterId') as string

    if (!file || !candidateId || !recruiterId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Only accept PDF for resume conversion
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported for resume conversion' }, { status: 400 })
    }

    // Initialize clients
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    })

    // Read file content
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    // Parse resume with Claude - only PDF supported for document type
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf' as const,
                data: base64
              }
            },
            {
              type: 'text',
              text: `Extract and format this resume into a clean, professional format. Return ONLY the formatted resume content as HTML that can be converted to a Word document. Use proper HTML tags:
              
- <h1> for name
- <h2> for section headers (Summary, Experience, Education, Skills, etc.)
- <p> for paragraphs
- <ul> and <li> for bullet points
- <strong> for bold text
- <em> for italic text

Include all information from the resume. Do not add any explanations, just return the HTML content.`
            }
          ]
        }
      ]
    })

    const htmlContent = (message.content[0] as { type: string; text: string }).text

    // Create Word document using HTML
    const docContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.4; margin: 1in; }
  h1 { font-size: 18pt; margin-bottom: 5pt; color: #1a1a1a; }
  h2 { font-size: 13pt; margin-top: 15pt; margin-bottom: 8pt; color: #2a5599; border-bottom: 1px solid #2a5599; padding-bottom: 3pt; }
  p { margin: 5pt 0; }
  ul { margin: 5pt 0; padding-left: 20pt; }
  li { margin: 3pt 0; }
  strong { font-weight: bold; }
  em { font-style: italic; }
</style>
</head>
<body>
${htmlContent}
</body>
</html>`

    // Convert to blob for Word format
    const wordBlob = Buffer.from(docContent, 'utf-8')
    
    // Generate unique filename
    const timestamp = Date.now()
    const originalName = file.name.replace(/\.[^/.]+$/, '') // Remove extension
    const fileName = `${candidateId}/${timestamp}_${originalName}.doc`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('candidate-files')
      .upload(fileName, wordBlob, {
        contentType: 'application/msword',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Save file record to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('candidate_files')
      .insert([{
        candidate_id: candidateId,
        recruiter_id: recruiterId,
        file_name: `${originalName}.doc`,
        file_type: 'resume',
        file_path: fileName,
        file_size: wordBlob.length,
        mime_type: 'application/msword'
      }])
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save file record' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      file: fileRecord 
    })

  } catch (error) {
    console.error('Error processing resume:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process resume' },
      { status: 500 }
    )
  }
}
