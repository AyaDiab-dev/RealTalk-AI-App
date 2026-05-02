import { GoogleGenerativeAI } from '@google/generative-ai'
import { ConversationSetup, ConversationType, conversationTypeLabels, aiPersonalityLabels } from '@/lib/types'

export const maxDuration = 60

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function getScenarioFeedbackFocus(conversationType: ConversationType): string {
  const focusAreas: Record<ConversationType, string> = {
    'job-interview': `Focus your feedback on:
- Clarity and specificity of answers (did they use concrete examples?)
- Confidence and professionalism in communication
- Technical depth and relevant experience demonstration
- Handling of behavioral questions (STAR method usage)
- Recovery from difficult or unexpected questions`,

    'strict-manager': `Focus your feedback on:
- Professionalism and composure under pressure
- Accountability and ownership of issues
- Calmness and non-defensive communication
- Quality of action plans and proposed solutions
- Ability to set realistic expectations`,

    'negotiation': `Focus your feedback on:
- Persuasion techniques and value articulation
- Use of leverage and positioning
- Maintaining boundaries while staying flexible
- Quality of counteroffers and creative solutions
- Handling pressure and pushback`,

    'friends-conflict': `Focus your feedback on:
- Empathy and emotional intelligence
- Emotional control and non-escalation
- Clarity in expressing feelings and needs
- Tone appropriateness for friendship context
- Balance between assertiveness and understanding`,

    'presentation': `Focus your feedback on:
- Structure and logical flow of arguments
- Confidence and clarity in delivery
- Use of evidence and supporting data
- Ability to handle Q&A effectively
- Audience engagement and responsiveness`,

    'debate': `Focus your feedback on:
- Logical strength of arguments
- Use of evidence and facts
- Handling of counterarguments
- Confidence and assertiveness
- Ability to stay on point under pressure`,
  }

  return focusAreas[conversationType]
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

    const scenarioFocus = getScenarioFeedbackFocus(setup.conversationType)

    const prompt = `You are an expert conversation coach analyzing a practice conversation.

SCENARIO DETAILS:
- Conversation Type: ${conversationTypeLabels[setup.conversationType]}
- User's Role: ${setup.userRole}
- AI Partner Personality: ${aiPersonalityLabels[setup.aiPersonality]}
- User's Goal: ${setup.userGoal}

${scenarioFocus}

CONVERSATION TRANSCRIPT:
${conversationText}

Analyze how well the user performed in achieving their goal. Be specific and reference actual things the user said. Don't be generic or overly positive.

You MUST respond with ONLY valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "readinessScore": <number 1-10>,
  "whatUserDidWell": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "whatUserDidWrong": ["<specific weakness or missed opportunity 1>", "<specific weakness 2>", "<specific weakness 3>"],
  "betterResponse": {
    "original": "<exact quote of user's weakest response>",
    "improved": "<rewritten version showing how it could be much better>"
  },
  "practicalTips": ["<actionable tip 1>", "<actionable tip 2>", "<actionable tip 3>", "<actionable tip 4>", "<actionable tip 5>"],
  "thingsToWorkOn": ["<specific focus area 1>", "<specific focus area 2>", "<specific focus area 3>"]
}

Important:
- Be honest and constructive, not just encouraging
- Reference specific quotes from the conversation
- Make tips actionable and scenario-specific
- The improved response should be noticeably better than the original`

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    })

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    // Clean the response - remove markdown code blocks if present
    let cleanedResponse = responseText.trim()
    
    // Remove markdown code fences (```json ... ``` or ``` ... ```)
    const jsonMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      cleanedResponse = jsonMatch[1].trim()
    } else {
      // Try to extract JSON object directly
      const jsonObjectMatch = cleanedResponse.match(/\{[\s\S]*\}/)
      if (jsonObjectMatch) {
        cleanedResponse = jsonObjectMatch[0]
      }
    }

    let feedback
    try {
      feedback = JSON.parse(cleanedResponse)
    } catch {
      // Return a safe fallback if parsing fails
      console.error('Failed to parse Gemini response:', cleanedResponse)
      feedback = {
        readinessScore: 5,
        whatUserDidWell: [
          'Engaged in the conversation actively',
          'Showed willingness to practice difficult scenarios',
          'Maintained the conversation flow'
        ],
        whatUserDidWrong: [
          'Could provide more specific examples',
          'Could be more concise in responses',
          'Could ask more clarifying questions'
        ],
        betterResponse: {
          original: 'Your response',
          improved: 'Try to be more specific and provide concrete examples when answering questions.'
        },
        practicalTips: [
          'Prepare specific examples before important conversations',
          'Practice active listening and ask follow-up questions',
          'Stay calm under pressure and take time to think before responding',
          'Use the STAR method for behavioral questions',
          'End conversations on a positive note with clear next steps'
        ],
        thingsToWorkOn: [
          'Specificity in answers',
          'Confidence in delivery',
          'Handling unexpected questions'
        ]
      }
    }

    return Response.json(feedback)
  } catch (error) {
    console.error('Feedback API error:', error)
    // Return fallback feedback instead of error
    return Response.json({
      readinessScore: 5,
      whatUserDidWell: [
        'Completed the practice session',
        'Showed commitment to improving',
        'Engaged with the scenario'
      ],
      whatUserDidWrong: [
        'Could not analyze specific areas due to a technical issue',
        'Try another session for detailed feedback',
        'Consider reviewing your responses'
      ],
      betterResponse: {
        original: 'Unable to analyze',
        improved: 'Try running the feedback again for specific suggestions.'
      },
      practicalTips: [
        'Practice with different scenarios to build versatility',
        'Record yourself and review your responses',
        'Ask for feedback from real people when possible',
        'Stay calm and take your time when responding',
        'Focus on clarity and specificity'
      ],
      thingsToWorkOn: [
        'General communication skills',
        'Scenario-specific techniques',
        'Confidence and composure'
      ]
    })
  }
}
