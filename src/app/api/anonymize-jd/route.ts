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
          content: `You are a professional job description rewriter. Your task is to COMPLETELY REWRITE the following job description and requirements from scratch. 

CRITICAL REQUIREMENTS:
1. REWRITE EVERY SINGLE SENTENCE using completely different words and sentence structures
2. DO NOT copy any phrases, sentences, or unique wording from the original
3. Remove ALL company names, brand names, product names, project names, and any identifying information
4. Use only generic terms like "the company", "our client", "the organization", "the team"
5. Convey the same job responsibilities and requirements but with entirely new wording
6. Change the order of bullet points and sections
7. Use different verbs, adjectives, and phrasing throughout
8. The rewritten version should be impossible to match back to the original through text comparison
9. Maintain professional tone and proper HTML formatting (<p>, <ul>, <li>, <strong>, etc.)
10. Keep the same level of detail but express it completely differently

Think of this as translating the job posting into "different English" - same meaning, completely different words.

ORIGINAL DESCRIPTION:
${description || 'N/A'}

ORIGINAL REQUIREMENTS:
${requirements || 'N/A'}

Return your response as JSON only with this structure:
{
  "description": "completely rewritten description with HTML formatting",
  "requirements": "completely rewritten requirements with HTML formatting"
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
