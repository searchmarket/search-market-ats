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
          content: `You are a professional job description rewriter. Your task is to COMPLETELY REWRITE both the job description AND the requirements from scratch.

CRITICAL: YOU MUST REWRITE BOTH SECTIONS. Do not skip or leave either section unchanged.

REWRITING RULES:
1. REWRITE EVERY SINGLE SENTENCE in BOTH the description AND requirements using completely different words and sentence structures
2. DO NOT copy any phrases, sentences, or unique wording from the original
3. Remove ALL company names, brand names, product names, project names, and any identifying information
4. Use only generic terms like "the company", "our client", "the organization", "the team"
5. Convey the same job responsibilities and requirements but with entirely new wording
6. Change the order of bullet points and sections
7. Use different verbs, adjectives, and phrasing throughout
8. The rewritten version should be impossible to match back to the original through text comparison
9. Maintain professional tone and proper HTML formatting (<p>, <ul>, <li>, <strong>, etc.)
10. Keep the same level of detail but express it completely differently

FORMATTING RULES - VERY IMPORTANT:
- NEVER use the em dash character (—) anywhere in your response
- NEVER use hyphens (-) to connect compound words. Instead of "well-known" write "well known". Instead of "fast-paced" write "fast paced". Instead of "self-motivated" write "self motivated". Rewrite to avoid hyphenated words entirely when possible.
- Use commas, periods, and colons instead of dashes for punctuation

ORIGINAL DESCRIPTION TO REWRITE:
${description || '(No description provided - skip this section)'}

ORIGINAL REQUIREMENTS TO REWRITE:
${requirements || '(No requirements provided - skip this section)'}

Return your response as JSON only with this structure:
{
  "description": "completely rewritten description with HTML formatting, no dashes",
  "requirements": "completely rewritten requirements with HTML formatting, no dashes"
}

IMPORTANT: Both "description" and "requirements" fields MUST contain the fully rewritten content. Do not return empty strings or "N/A".

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
      
      // Extra safety: remove any em dashes and en dashes
      if (result.description) {
        result.description = result.description.replace(/—/g, ', ').replace(/–/g, ', ')
      }
      if (result.requirements) {
        result.requirements = result.requirements.replace(/—/g, ', ').replace(/–/g, ', ')
      }
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
