import { GoogleGenerativeAI } from '@google/generative-ai'
import { ConversationSetup, ConversationType, conversationTypeLabels, aiPersonalityLabels } from '@/lib/types'

export const maxDuration = 60

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function getScenarioFeedbackFocus(conversationType: ConversationType, conversationText: string): string {
  const focusAreas: Record<ConversationType, string> = {
    'job-interview': `You are a senior HR professional and interview coach providing detailed feedback.

SCORING CRITERIA (use this to calculate readinessScore 1-10):
- Clarity (0-2 points): Were answers easy to follow? Did they ramble or stay focused?
- Structure (0-2 points): Did they use frameworks like STAR? Were thoughts organized?
- Technical Depth (0-2 points): Did they demonstrate real expertise and knowledge?
- Use of Examples (0-2 points): Did they give specific, concrete examples with details?
- Confidence (0-2 points): Did they sound assured? Did they hedge excessively?

FEEDBACK REQUIREMENTS:
1. STRENGTHS - Quote specific phrases the user said that were effective. Example: "When you said 'I led a team of 5 engineers to deliver the project 2 weeks early', that was excellent because..."

2. WEAKNESSES - Quote specific phrases that were weak or vague. Example: "When asked about your weakness, you said 'I work too hard' - this is a cliché that interviewers see through..."

3. IMPROVED RESPONSE - Find the user's WEAKEST answer in the conversation. Copy it EXACTLY as the "original", then rewrite it completely as "improved" using STAR method, specific numbers, and confident language.

4. Be CRITICAL - Real interviewers are tough. Point out vague answers, missing examples, nervous language ("I think", "maybe", "kind of"), and missed opportunities.

CONVERSATION TO ANALYZE:
${conversationText}`,

    'strict-manager': `Focus your feedback on:
- Professionalism and composure under pressure
- Accountability and ownership of issues
- Calmness and non-defensive communication
- Quality of action plans and proposed solutions
- Ability to set realistic expectations
Quote specific things the user said to support your feedback.`,

    'negotiation': `Focus your feedback on:
- Persuasion techniques and value articulation
- Use of leverage and positioning
- Maintaining boundaries while staying flexible
- Quality of counteroffers and creative solutions
- Handling pressure and pushback
Quote specific things the user said to support your feedback.`,

    'friends-conflict': `Focus your feedback on:
- Empathy and emotional intelligence
- Emotional control and non-escalation
- Clarity in expressing feelings and needs
- Tone appropriateness for friendship context
- Balance between assertiveness and understanding
Quote specific things the user said to support your feedback.`,

    'presentation': `Focus your feedback on:
- Structure and logical flow of arguments
- Confidence and clarity in delivery
- Use of evidence and supporting data
- Ability to handle Q&A effectively
- Audience engagement and responsiveness
Quote specific things the user said to support your feedback.`,

    'debate': `Focus your feedback on:
- Logical strength of arguments
- Use of evidence and facts
- Handling of counterarguments
- Confidence and assertiveness
- Ability to stay on point under pressure
Quote specific things the user said to support your feedback.`,
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
      .map((m, i) => `[${i + 1}] ${m.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${m.content}`)
      .join('\n\n')

    const scenarioFocus = getScenarioFeedbackFocus(setup.conversationType, conversationText)

    const isJobInterview = setup.conversationType === 'job-interview'
    
    const prompt = isJobInterview ? `${scenarioFocus}

CANDIDATE'S STATED GOAL: ${setup.userGoal}
CANDIDATE'S ROLE: ${setup.userRole}
INTERVIEWER STYLE: ${aiPersonalityLabels[setup.aiPersonality]}

IMPORTANT INSTRUCTIONS:
1. Read through EVERY candidate response carefully
2. For "whatUserDidWell" - quote specific phrases they said that were strong
3. For "whatUserDidWrong" - quote specific phrases that were weak, vague, or could hurt them
4. For "betterResponse.original" - copy the candidate's WEAKEST answer word-for-word
5. For "betterResponse.improved" - rewrite that answer using STAR method, specific metrics, and confident language
6. Score realistically: most candidates score 4-7. Only exceptional performances get 8+. Poor performances get 3 or below.

RESPOND WITH ONLY THIS JSON (no markdown, no explanation):
{
  "readinessScore": <1-10 based on the 5 criteria above>,
  "whatUserDidWell": [
    "Strong point with quote: 'exact words they said'",
    "Another strength with evidence from conversation",
    "Third specific strength"
  ],
  "whatUserDidWrong": [
    "Weakness: when asked X, you said 'their exact weak answer' - this fails because...",
    "Missed opportunity: you could have mentioned...",
    "Language issue: phrases like 'their exact hedging words' undermine confidence"
  ],
  "betterResponse": {
    "original": "<copy their weakest answer exactly as they said it>",
    "improved": "<complete rewritten answer of 3-5 sentences using STAR method, specific numbers, and confident tone>"
  },
  "practicalTips": [
    "Specific tip based on their actual mistakes",
    "Another actionable improvement",
    "Third practical suggestion",
    "Fourth concrete technique",
    "Fifth specific recommendation"
  ],
  "thingsToWorkOn": [
    "First priority area based on this conversation",
    "Second development area",
    "Third focus area"
  ]
}` : `You are an expert conversation coach analyzing a practice conversation.

SCENARIO DETAILS:
- Conversation Type: ${conversationTypeLabels[setup.conversationType]}
- User's Role: ${setup.userRole}
- AI Partner Personality: ${aiPersonalityLabels[setup.aiPersonality]}
- User's Goal: ${setup.userGoal}

${scenarioFocus}

CONVERSATION TRANSCRIPT:
${conversationText}

Analyze how well the user performed. Be specific and reference actual things the user said.

RESPOND WITH ONLY THIS JSON (no markdown, no explanation):
{
  "readinessScore": <number 1-10>,
  "whatUserDidWell": ["<specific strength with quote>", "<strength 2>", "<strength 3>"],
  "whatUserDidWrong": ["<specific weakness with quote>", "<weakness 2>", "<weakness 3>"],
  "betterResponse": {
    "original": "<exact quote of user's weakest response>",
    "improved": "<much better rewritten version>"
  },
  "practicalTips": ["<tip 1>", "<tip 2>", "<tip 3>", "<tip 4>", "<tip 5>"],
  "thingsToWorkOn": ["<focus 1>", "<focus 2>", "<focus 3>"]
}`

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
