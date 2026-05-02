'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useMemo } from 'react'
import { ArrowLeft, MessageSquare, User, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface SharedMessage {
  r: 'u' | 'a'
  c: string
}

interface SharedData {
  setup: {
    type: string
    role: string
    personality: string
    goal: string
  }
  messages: SharedMessage[]
  ts: number
}

const conversationTypeLabels: Record<string, string> = {
  'job-interview': 'Job Interview',
  'strict-manager': 'Strict Manager',
  'negotiation': 'Negotiation',
  'friends-conflict': 'Friends Conflict',
  'presentation': 'Presentation',
  'debate': 'Debate',
}

const personalityLabels: Record<string, string> = {
  friendly: 'Friendly',
  neutral: 'Neutral',
  strict: 'Strict',
  aggressive: 'Aggressive',
  calm: 'Calm',
}

function ShareContent() {
  const searchParams = useSearchParams()
  const data = searchParams.get('data')

  const sharedData = useMemo(() => {
    if (!data) return null
    try {
      const decoded = decodeURIComponent(atob(data))
      return JSON.parse(decoded) as SharedData
    } catch {
      return null
    }
  }, [data])

  if (!sharedData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Invalid Share Link</h1>
          <p className="text-muted-foreground">
            This conversation link is invalid or has expired.
          </p>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to RealTalk AI
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const formattedDate = new Date(sharedData.ts).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon-sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-sm font-semibold">
                Shared Conversation
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formattedDate}
              </p>
            </div>
          </div>
          <Link href="/">
            <Button size="sm">
              Try RealTalk AI
            </Button>
          </Link>
        </div>
      </header>

      {/* Scenario Info */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {conversationTypeLabels[sharedData.setup.type] || sharedData.setup.type}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Role:</span> {sharedData.setup.role}</p>
            <p><span className="text-muted-foreground">AI Personality:</span> {personalityLabels[sharedData.setup.personality] || sharedData.setup.personality}</p>
            <p><span className="text-muted-foreground">Goal:</span> {sharedData.setup.goal}</p>
          </CardContent>
        </Card>

        {/* Messages */}
        <div className="space-y-4">
          {sharedData.messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.r === 'u' ? 'justify-end' : 'justify-start'}`}
            >
              {message.r === 'a' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  message.r === 'u'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-secondary text-secondary-foreground rounded-bl-md'
                }`}
              >
                {message.c}
              </div>
              {message.r === 'u' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">
            Practice your own conversations with AI-powered feedback
          </p>
          <Link href="/">
            <Button size="lg">
              Start Practicing
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading conversation...</div>
      </div>
    }>
      <ShareContent />
    </Suspense>
  )
}
