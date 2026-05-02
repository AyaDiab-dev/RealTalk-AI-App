export type ConversationType = 'job-interview' | 'strict-manager' | 'negotiation' | 'friends-conflict' | 'presentation' | 'debate'

export type AIPersonality = 'friendly' | 'neutral' | 'strict' | 'aggressive' | 'calm'

export interface ConversationSetup {
  conversationType: ConversationType
  userRole: string
  aiPersonality: AIPersonality
  userGoal: string
}

export interface Feedback {
  readinessScore: number
  whatUserDidWell: string[]
  whatUserDidWrong: string[]
  betterResponse: {
    original: string
    improved: string
  }
  practicalTips: string[]
  thingsToWorkOn: string[]
}

export const conversationTypeLabels: Record<ConversationType, string> = {
  'job-interview': 'Job Interview',
  'strict-manager': 'Strict Manager',
  'negotiation': 'Negotiation',
  'friends-conflict': 'Friends Conflict',
  'presentation': 'Presentation',
  'debate': 'Debate',
}

export const aiPersonalityLabels: Record<AIPersonality, string> = {
  friendly: 'Friendly',
  neutral: 'Neutral',
  strict: 'Strict',
  aggressive: 'Aggressive',
  calm: 'Calm',
}
