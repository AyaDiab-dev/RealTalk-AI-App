import { GoogleGenerativeAI } from '@google/generative-ai'
import { ConversationSetup, conversationTypeLabels, aiPersonalityLabels } from '@/lib/types'

export const maxDuration = 60

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: Request) {
  try {
    const { messages, setup }: { messages: Message[]; setup: ConversationSetup } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return Response.json(
        { error: 'GEMINI_API_KEY is not configured. Please add it to your environment variables.' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)

    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'AI Partner'}: ${m.content}`)
      .join('\n\n')

    const prompt = `You are an expert conversation coach analyzing a practice conversation.

SCENARIO DETAILS:
- Conversation Type: ${conversationTypeLabels[setup.conversationType]}
- User's Role: ${setup.userRole}
- AI Partner Personality: ${aiPersonalityLabels[setup.aiPersonality]}
- User's Goal: ${setup.userGoal}

CONVERSATION TRANSCRIPT:
${conversationText}

Analyze how well the user performed in achieving their goal. Provide constructive, specific feedback.

You MUST respond with ONLY valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "readinessScore": <number 1-10>,
  "whatUserDidWell": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "whatUserDidWrong": ["<specific area for improvement 1>", "<specific area for improvement 2>", "<specific area for improvement 3>"],
  "betterResponse": {
    "original": "<exact quote of user's weakest response>",
    "improved": "<rewritten version showing how it could be better>"
  },
  "practicalTips": ["<actionable tip 1>", "<actionable tip 2>", "<actionable tip 3>", "<actionable tip 4>", "<actionable tip 5>"],
  "thingsToWorkOn": ["<focus area 1>", "<focus area 2>", "<focus area 3>"]
}

Be specific and reference actual things the user said. Don't be generic.`

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
      },
    })

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    // Clean the response - remove markdown code blocks if present
    let cleanedResponse = responseText.trim()
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7)
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3)
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3)
    }
    cleanedResponse = cleanedResponse.trim()

    const feedback = JSON.parse(cleanedResponse)

    return Response.json(feedback)
  } catch (error) {
    console.error('Feedback API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return Response.json(
      { error: `Failed to generate feedback: ${errorMessage}` },
      { status: 500 }
    )
  }
}
