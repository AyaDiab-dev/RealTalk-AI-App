import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  ConversationSetup,
  ConversationType,
  conversationTypeLabels,
  aiPersonalityLabels,
} from '@/lib/types'

export const maxDuration = 60

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function getScenarioFeedbackFocus(conversationType: ConversationType): string {
  const focusAreas: Record<ConversationType, string> = {
    'job-interview': `Focus on interview performance: clarity, structure, technical depth, confidence, relevance, specificity, and ability to answer under pressure.`,
    'strict-manager': `Focus on professionalism, accountability, calmness under pressure, action plans, ownership, and expectation-setting.`,
    negotiation: `Focus on persuasion, leverage, boundaries, counteroffers, confidence, and ability to handle pushback.`,
    'friends-conflict': `Focus on empathy, emotional control, clarity, tone, assertiveness, and conflict resolution.`,
    presentation: `Focus on structure, clarity, confidence, evidence, Q&A handling, and audience engagement.`,
    debate: `Focus on logic, evidence, counterarguments, confidence, staying on point, and handling pressure.`,
  }

  return focusAreas[conversationType]
}

function extractJson(text: string): string {
  let cleaned = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim()

  // Try to extract JSON safely
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    console.error('RAW RESPONSE:', cleaned)
    throw new Error('No valid JSON found in response')
  }

  return jsonMatch[0]
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

    if (!messages || messages.length < 3) {
      return Response.json({
        readinessScore: 3,
        scoreJustification:
          'There are not enough exchanges to provide detailed feedback yet. Complete at least a few back-and-forth messages first.',
        whatUserDidWell: ['You started the practice session and engaged with the scenario.'],
        whatUserDidWrong: ['The conversation is too short to analyze strengths and weaknesses meaningfully.'],
        betterResponse: {
          original: 'Not enough response data',
          improved:
            'Continue the conversation with at least two detailed answers so the feedback can analyze your clarity, structure, and specificity.',
        },
        practicalTips: [
          'Answer at least 2–3 questions before requesting feedback.',
          'Use concrete examples from your projects.',
          'Mention your specific actions, not only the general problem.',
          'Add measurable outcomes when possible.',
          'Stay calm and answer directly under pressure.',
        ],
        thingsToWorkOn: ['Provide more answers', 'Use specific examples', 'Add measurable impact'],
      })
    }

    const genAI = new GoogleGenerativeAI(apiKey)

    const conversationText = messages
      .map((m, i) => `[${i + 1}] ${m.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${m.content}`)
      .join('\n\n')

    const scenarioFocus = getScenarioFeedbackFocus(setup.conversationType)
    const isJobInterview = setup.conversationType === 'job-interview'

    const prompt = isJobInterview
      ? `
You are a senior interview coach analyzing a job interview practice session.

IMPORTANT:
Your feedback must be based ONLY on the actual conversation transcript.
Generic feedback is forbidden.
You must quote or clearly reference the candidate's real answers.

INTERVIEW CONTEXT:
- Candidate Role: ${setup.userRole}
- Candidate Goal: ${setup.userGoal}
- Interviewer Style: ${aiPersonalityLabels[setup.aiPersonality]}

FULL CONVERSATION TRANSCRIPT:
${conversationText}

SCORING SYSTEM:
Give a readinessScore from 1 to 10 based on:
- Clarity
- Structure
- Technical depth
- Specificity and examples
- Confidence under pressure
- Relevance to the role

REQUIREMENTS:
1. whatUserDidWell:
- Must include specific references or quotes from the candidate.
- Do not write generic lines like "engaged in the conversation".

2. whatUserDidWrong:
- Must identify real weaknesses from the candidate's answers.
- If the candidate was honest about lack of production experience, mention it constructively.
- If answers lacked metrics, say that specifically.

3. betterResponse:
- original must be copied or summarized from one real weaker candidate answer.
- improved must be a complete better answer, not advice.
- The improved answer should be 4–6 sentences and more confident, structured, and specific.

4. practicalTips:
- Must be based on the actual weaknesses in this conversation.

5. thingsToWorkOn:
- Must be concrete focus areas from this exact interview.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanations outside JSON.
Start with { and end with }.

JSON FORMAT:
{
  "readinessScore": 7,
  "scoreJustification": "Explain the score in 2-3 sentences using evidence from the conversation.",
  "whatUserDidWell": [
    "Specific strength with quote or reference.",
    "Specific strength with quote or reference.",
    "Specific strength with quote or reference."
  ],
  "whatUserDidWrong": [
    "Specific weakness with quote or reference.",
    "Specific weakness with quote or reference.",
    "Specific weakness with quote or reference."
  ],
  "betterResponse": {
    "original": "A real weaker answer or part of an answer from the candidate.",
    "improved": "A complete rewritten stronger answer."
  },
  "practicalTips": [
    "Specific practical tip 1.",
    "Specific practical tip 2.",
    "Specific practical tip 3.",
    "Specific practical tip 4.",
    "Specific practical tip 5."
  ],
  "thingsToWorkOn": [
    "Focus area 1.",
    "Focus area 2.",
    "Focus area 3."
  ]
}
`
      : `
You are an expert communication coach analyzing a roleplay conversation.

SCENARIO DETAILS:
- Conversation Type: ${conversationTypeLabels[setup.conversationType]}
- User Role: ${setup.userRole}
- AI Personality: ${aiPersonalityLabels[setup.aiPersonality]}
- User Goal: ${setup.userGoal}

FOCUS:
${scenarioFocus}

CONVERSATION TRANSCRIPT:
${conversationText}

Analyze the user's performance based only on the transcript.
Be specific. Quote or reference actual user responses.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanations outside JSON.
Start with { and end with }.

JSON FORMAT:
{
  "readinessScore": 7,
  "scoreJustification": "Explain the score in 2-3 sentences.",
  "whatUserDidWell": [
    "Specific strength with quote or reference.",
    "Specific strength with quote or reference.",
    "Specific strength with quote or reference."
  ],
  "whatUserDidWrong": [
    "Specific weakness with quote or reference.",
    "Specific weakness with quote or reference.",
    "Specific weakness with quote or reference."
  ],
  "betterResponse": {
    "original": "A real weaker answer or part of an answer from the user.",
    "improved": "A complete rewritten stronger answer."
  },
  "practicalTips": [
    "Specific practical tip 1.",
    "Specific practical tip 2.",
    "Specific practical tip 3.",
    "Specific practical tip 4.",
    "Specific practical tip 5."
  ],
  "thingsToWorkOn": [
    "Focus area 1.",
    "Focus area 2.",
    "Focus area 3."
  ]
}
`

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature:0.3,
        maxOutputTokens: 8192,
      },
    })

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    console.log('RAW GEMINI RESPONSE:', responseText)

    const jsonText = extractJson(responseText)

    let feedback

    try {
      feedback = JSON.parse(jsonText)
    } catch (error) {
      console.error('Failed to parse Gemini JSON:', jsonText)
      throw new Error('Failed to parse Gemini feedback JSON')
    }

    return Response.json({
      readinessScore: feedback.readinessScore ?? 5,
      scoreJustification: feedback.scoreJustification ?? '',
      whatUserDidWell: feedback.whatUserDidWell ?? [],
      whatUserDidWrong: feedback.whatUserDidWrong ?? [],
      betterResponse: feedback.betterResponse ?? {
        original: '',
        improved: '',
      },
      practicalTips: feedback.practicalTips ?? [],
      thingsToWorkOn: feedback.thingsToWorkOn ?? [],
    })
  } catch (error) {
    console.error('Feedback API error:', error)

    return Response.json(
      {
        error: 'Something went wrong while generating feedback. Please try again.',
      },
      { status: 500 }
    )
  }
}