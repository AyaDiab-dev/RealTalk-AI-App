import { generateText, Output } from 'ai'
import { z } from 'zod'
import { ConversationSetup, conversationTypeLabels } from '@/lib/types'

export const maxDuration = 60

const feedbackSchema = z.object({
  readinessScore: z.number().min(1).max(10),
  whatUserDidWell: z.array(z.string()),
  whatUserDidWrong: z.array(z.string()),
  betterResponse: z.object({
    original: z.string(),
    improved: z.string(),
  }),
  practicalTips: z.array(z.string()),
  thingsToWorkOn: z.array(z.string()),
})

export async function POST(req: Request) {
  const { messages, setup }: { messages: { role: string; content: string }[]; setup: ConversationSetup } = await req.json()

  const conversationTranscript = messages
    .map(m => `${m.role === 'user' ? 'USER' : 'AI PARTNER'}: ${m.content}`)
    .join('\n\n')

  const result = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({ schema: feedbackSchema }),
    prompt: `You are an expert communication coach analyzing a practice conversation.

CONTEXT:
- Scenario: ${conversationTypeLabels[setup.conversationType]}
- User's Role: ${setup.userRole}
- User's Goal: ${setup.userGoal}

CONVERSATION TRANSCRIPT:
${conversationTranscript}

Analyze this conversation and provide detailed feedback. Be specific and actionable.

For "readinessScore": Rate from 1-10 how ready the user is for this type of real conversation.

For "whatUserDidWell": List 2-4 specific things the user did well with examples from the conversation.

For "whatUserDidWrong": List 2-4 specific mistakes or missed opportunities with examples.

For "betterResponse": Pick ONE user response that could be improved and provide:
- "original": The exact response the user gave
- "improved": A better version with explanation of why it's better

For "practicalTips": Provide exactly 5 actionable tips for improving in this type of conversation.

For "thingsToWorkOn": List exactly 3 specific skills or areas the user should focus on developing.

Be constructive, specific, and encouraging while being honest about areas for improvement.`,
  })

  return Response.json(result.object)
}
