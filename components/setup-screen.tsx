'use client'

import { useState } from 'react'
import { MessageSquare, Target, User, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ConversationType,
  AIPersonality,
  ConversationSetup,
  conversationTypeLabels,
  aiPersonalityLabels,
} from '@/lib/types'

interface SetupScreenProps {
  onStart: (setup: ConversationSetup) => void
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [conversationType, setConversationType] = useState<ConversationType | ''>('')
  const [userRole, setUserRole] = useState('')
  const [aiPersonality, setAIPersonality] = useState<AIPersonality | ''>('')
  const [userGoal, setUserGoal] = useState('')

  const isValid = conversationType && userRole.trim() && aiPersonality && userGoal.trim()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    onStart({
      conversationType: conversationType as ConversationType,
      userRole: userRole.trim(),
      aiPersonality: aiPersonality as AIPersonality,
      userGoal: userGoal.trim(),
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5">
            <MessageSquare className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-balance mb-3">
            RealTalk AI
          </h1>
          <p className="text-muted-foreground text-base text-pretty max-w-md mx-auto">
            Practice real-life conversations with AI. Get instant feedback and improve your communication skills.
          </p>
        </div>

        {/* Setup Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            {/* Conversation Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Conversation Type
              </label>
              <Select
                value={conversationType}
                onValueChange={(v) => setConversationType(v as ConversationType)}
              >
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Select a scenario..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(conversationTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Role */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Your Role
              </label>
              <Input
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                placeholder="e.g., Software Engineering Student"
                className="h-11"
              />
            </div>

            {/* AI Personality */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                AI Character Personality
              </label>
              <Select
                value={aiPersonality}
                onValueChange={(v) => setAIPersonality(v as AIPersonality)}
              >
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Select personality..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(aiPersonalityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Goal */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                Your Goal
              </label>
              <Input
                value={userGoal}
                onChange={(e) => setUserGoal(e.target.value)}
                placeholder="e.g., Get the job, Calm the situation"
                className="h-11"
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={!isValid}
            className="w-full h-12 text-base font-medium gap-2"
          >
            Start Conversation
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Practice makes perfect. Your conversations are not stored.
        </p>
      </div>
    </div>
  )
}
