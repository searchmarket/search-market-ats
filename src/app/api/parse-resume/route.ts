import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI features not configured. Add ANTHROPIC_API_KEY to environment variables.' },
      { status: 500 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Get file content as base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    
    // Determine media type
    const fileName = file.name.toLowerCase()
    let mediaType = 'application/pdf'
    
    if (fileName.endsWith('.docx')) {
      mediaType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    } else if (fileName.endsWith('.doc')) {
      mediaType = 'application/msword'
    }

    const prompt = `Please analyze this resume and extract the following information. Return ONLY valid JSON with these fields (use null for any field you cannot find):

{
  "first_name": "string",
  "last_name": "string", 
  "email": "string or null",
  "phone": "string or null",
  "linkedin_url": "string or null",
  "github_url": "string or null",
  "city": "string or null",
  "state": "two letter state/province code like ON, CA, NY or null",
  "country": "CA or US based on location, default CA",
  "current_title": "string or null",
  "current_company": "string or null",
  "years_experience": "number or null (estimate from work history)",
  "skills": ["array", "of", "skills"] or null,
  "summary": "brief 2-3 sentence professional summary or null"
}

Important:
- For state/province, use the 2-letter code (e.g., ON for Ontario, CA for California)
- For country, use CA for Canada or US for United States
- For skills, extract technical skills, tools, and technologies mentioned
- Estimate years of experience from the work history dates
- Only return the JSON object, no other text`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Anthropic API error:', error)
      return NextResponse.json(
        { error: 'Failed to parse resume. Please try again.' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const content = data.content[0].text

    // Parse the JSON response
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = content.trim()
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7)
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3)
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3)
      }
      cleanContent = cleanContent.trim()

      const parsed = JSON.parse(cleanContent)
      return NextResponse.json(parsed)
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content)
      return NextResponse.json(
        { error: 'Failed to parse resume data. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error parsing resume:', error)
    return NextResponse.json(
      { error: 'Failed to parse resume. Please try again.' },
      { status: 500 }
    )
  }
}
