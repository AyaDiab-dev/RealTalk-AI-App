'use client'

import { useEffect, useState } from 'react'
import { UIMessage } from 'ai'
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  Target,
  RefreshCw,
  ArrowRight,
  MessageSquare,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ConversationSetup, Feedback, conversationTypeLabels } from '@/lib/types'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface FeedbackScreenProps {
  setup: ConversationSetup
  messages: UIMessage[]
  onStartNew: () => void
  onTryAgain: () => void
}

function getMessageText(message: UIMessage): string {
  if (!message.parts || !Array.isArray(message.parts)) return ''
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export function FeedbackScreen({
  setup,
  messages,
  onStartNew,
  onTryAgain,
}: FeedbackScreenProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoading(true)
        setError(null)

        const formattedMessages = messages.map((m) => ({
          role: m.role,
          content: getMessageText(m),
        }))

        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: formattedMessages, setup }),
        })

        if (!response.ok) {
          throw new Error('Failed to get feedback')
        }

        const data = await response.json()
        setFeedback(data)
      } catch (err) {
        setError('Failed to generate feedback. Please try again.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchFeedback()
  }, [messages, setup])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
            <Spinner className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Analyzing your conversation...</h2>
            <p className="text-muted-foreground">
              Our AI is reviewing your responses
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !feedback) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={onTryAgain}>Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  const scoreColor =
    feedback.readinessScore >= 7
      ? 'text-primary'
      : feedback.readinessScore >= 5
      ? 'text-yellow-500'
      : 'text-destructive'

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <TrendingUp className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Your Feedback</h1>
          <p className="text-muted-foreground">
            {conversationTypeLabels[setup.conversationType]} • {setup.userRole}
          </p>
        </div>

        {/* Readiness Score */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Readiness Score</h3>
                <p className="text-sm text-muted-foreground">
                  How prepared you are for this conversation
                </p>
              </div>
              <div className={cn('text-4xl font-bold', scoreColor)}>
                {feedback.readinessScore}/10
              </div>
            </div>
            <Progress
              value={feedback.readinessScore * 10}
              className="h-2"
            />
          </CardContent>
        </Card>

        {/* What You Did Well */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              What You Did Well
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {feedback.whatUserDidWell.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* What Could Be Improved */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <XCircle className="w-5 h-5 text-orange-500" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {feedback.whatUserDidWrong.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Better Response */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-5 h-5 text-primary" />
              Improved Response Example
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Your Response
              </p>
              <div className="bg-secondary/50 rounded-lg p-3 text-sm">
                {feedback.betterResponse.original}
              </div>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-primary uppercase tracking-wide mb-2">
                Better Version
              </p>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm">
                {feedback.betterResponse.improved}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Practical Tips */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              5 Practical Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {feedback.practicalTips.map((tip, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground pt-0.5">{tip}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Things to Work On */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-primary" />
              Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {feedback.thingsToWorkOn.map((item, i) => (
                <div
                  key={i}
                  className="bg-secondary/50 rounded-lg p-3 text-sm text-muted-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onTryAgain}
            className="flex-1 h-12"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try This Scenario Again
          </Button>
          <Button onClick={onStartNew} className="flex-1 h-12">
            New Conversation
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
