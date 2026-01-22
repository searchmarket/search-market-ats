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
    const body = await request.json()
    const { title, company, location, locationType, employmentType, salaryMin, salaryMax, currency } = body

    const prompt = `Generate a professional job description for the following position:

Job Title: ${title}
${company ? `Company: ${company}` : ''}
${location ? `Location: ${location}` : ''}
${locationType ? `Work Type: ${locationType}` : ''}
${employmentType ? `Employment Type: ${employmentType}` : ''}
${salaryMin || salaryMax ? `Salary Range: ${salaryMin ? `${currency} ${salaryMin}` : ''} ${salaryMax ? `- ${currency} ${salaryMax}` : ''}` : ''}

Please provide:
1. A compelling job description (3-4 paragraphs) that includes:
   - Overview of the role
   - Key responsibilities
   - What makes this opportunity exciting

2. A list of requirements in a bulleted format that includes:
   - Required qualifications
   - Required skills
   - Nice-to-have qualifications

Format your response as JSON with two fields:
- "description": the job description text
- "requirements": the requirements text

Only respond with valid JSON, no other text.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
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
        { error: 'Failed to generate job description' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const content = data.content[0].text

    // Parse the JSON response
    try {
      const parsed = JSON.parse(content)
      return NextResponse.json(parsed)
    } catch {
      // If JSON parsing fails, try to extract the content
      return NextResponse.json({
        description: content,
        requirements: ''
      })
    }
  } catch (error) {
    console.error('Error generating JD:', error)
    return NextResponse.json(
      { error: 'Failed to generate job description' },
      { status: 500 }
    )
  }
}
