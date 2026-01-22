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
    const candidate = await request.json()

    const prompt = `Create a professional resume in HTML format for the following candidate. The resume should be clean, modern, and ATS-friendly.

Candidate Information:
- Name: ${candidate.first_name} ${candidate.last_name}
- Email: ${candidate.email || 'Not provided'}
- Phone: ${candidate.phone || 'Not provided'}
- Location: ${[candidate.city, candidate.state, candidate.country].filter(Boolean).join(', ') || 'Not provided'}
- LinkedIn: ${candidate.linkedin_url || 'Not provided'}
- GitHub: ${candidate.github_url || 'Not provided'}
- Current Title: ${candidate.current_title || 'Not provided'}
- Current Company: ${candidate.current_company || 'Not provided'}
- Years of Experience: ${candidate.years_experience || 'Not provided'}
- Skills: ${candidate.skills?.join(', ') || 'Not provided'}
- Summary/Notes: ${candidate.notes || 'Not provided'}

Generate a complete HTML document with inline CSS that:
1. Has a clean, professional design with good typography
2. Uses a single column layout that prints well
3. Includes sections for: Contact Info, Professional Summary, Skills, and Experience
4. Uses the candidate's notes as the basis for a professional summary
5. Is print-ready (fits on standard letter paper)

Return ONLY the HTML code, no markdown code blocks or explanation.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Anthropic API error:', error)
      return NextResponse.json(
        { error: 'Failed to generate resume. Please try again.' },
        { status: 500 }
      )
    }

    const data = await response.json()
    let html = data.content[0].text

    // Clean up if wrapped in code blocks
    if (html.startsWith('```html')) {
      html = html.slice(7)
    } else if (html.startsWith('```')) {
      html = html.slice(3)
    }
    if (html.endsWith('```')) {
      html = html.slice(0, -3)
    }
    html = html.trim()

    return NextResponse.json({ html })
  } catch (error) {
    console.error('Error generating resume:', error)
    return NextResponse.json(
      { error: 'Failed to generate resume. Please try again.' },
      { status: 500 }
    )
  }
}
