import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  try {
    const { description, requirements } = await request.json()

    if (!description && !requirements) {
      return NextResponse.json({ error: 'No content to anonymize' }, { status: 400 })
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are a recruitment content anonymizer. Your job is to rewrite job descriptions and requirements to completely anonymize them so that:

1. Remove ALL company names, brand names, product names, and any identifying information
2. Replace specific company references with generic terms like "the company", "our client", "the organization"
3. Remove any unique internal project names, proprietary technology names, or trademarked terms
4. Rewrite sentences that could identify the company through context clues (e.g., "leading social media company" instead of specific names)
5. Keep the job requirements and responsibilities accurate but anonymized
6. Maintain professional tone and formatting
7. Preserve any HTML formatting tags (<p>, <ul>, <li>, <strong>, etc.)

Here is the content to anonymize:

DESCRIPTION:
${description || 'N/A'}

REQUIREMENTS:
${requirements || 'N/A'}

Return your response as JSON only with this structure:
{
  "description": "anonymized description with HTML formatting preserved",
  "requirements": "anonymized requirements with HTML formatting preserved"
}

Return ONLY valid JSON, no markdown code blocks or explanations.`
        }
      ]
    })

    const responseText = (message.content[0] as { type: string; text: string }).text

    // Parse the response
    let result
    try {
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      result = JSON.parse(cleanJson)
    } catch {
      console.error('Failed to parse response:', responseText)
      return NextResponse.json({ error: 'Failed to parse anonymized content' }, { status: 500 })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error anonymizing JD:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to anonymize job description' },
      { status: 500 }
    )
  }
}
