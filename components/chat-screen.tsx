'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Square, MessageSquare, Sparkles, ArrowLeft, AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ConversationSetup, conversationTypeLabels } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatScreenProps {
  setup: ConversationSetup
  onEnd: () => void
  onGetFeedback: (messages: Message[]) => void
  onRestart: () => void
}

export function ChatScreen({ setup, onEnd, onGetFeedback, onRestart }: ChatScreenProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEndModal, setShowEndModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (userMessage: string) => {
    setError(null)
    setIsLoading(true)

    const newUserMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
    }

    const updatedMessages = [...messages, newUserMessage]
    setMessages(updatedMessages)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          setup,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong while generating the response. Please try again.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [messages, setup])

  // Auto-start conversation
  useEffect(() => {
    if (messages.length === 0) {
      sendMessage(`Hello, I'm ready to practice this ${conversationTypeLabels[setup.conversationType].toLowerCase()} scenario.`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage(input.trim())
    setInput('')
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const canGetFeedback = messages.length >= 4 && !isLoading

  const handleGetFeedbackClick = () => {
    setShowEndModal(false)
    onGetFeedback(messages)
  }

  const handleContinue = () => {
    setShowEndModal(false)
  }

  const handleRestart = () => {
    setShowEndModal(false)
    setMessages([])
    onRestart()
  }

  const handleBackToSetup = () => {
    setShowEndModal(false)
    onEnd()
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowEndModal(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-sm font-semibold">
                {conversationTypeLabels[setup.conversationType]}
              </h1>
              <p className="text-xs text-muted-foreground">
                {setup.userRole} • Goal: {setup.userGoal}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEndModal(true)}
            >
              <Square className="w-3 h-3 mr-1.5" />
              End
            </Button>
            <Button
              size="sm"
              onClick={() => onGetFeedback(messages)}
              disabled={!canGetFeedback}
            >
              <Sparkles className="w-3 h-3 mr-1.5" />
              Get Feedback
            </Button>
          </div>
        </div>
      </header>

      {/* End Conversation Modal */}
      <Dialog open={showEndModal} onOpenChange={setShowEndModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End Conversation</DialogTitle>
            <DialogDescription>
              What would you like to do next?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              onClick={handleGetFeedbackClick}
              disabled={!canGetFeedback}
              className="w-full justify-start h-12"
            >
              <Sparkles className="w-4 h-4 mr-3" />
              Get Performance Feedback
              {!canGetFeedback && (
                <span className="ml-auto text-xs opacity-70">Need more messages</span>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleContinue}
              className="w-full justify-start h-12"
            >
              <MessageSquare className="w-4 h-4 mr-3" />
              Continue Conversation
            </Button>
            <Button
              variant="outline"
              onClick={handleRestart}
              className="w-full justify-start h-12"
            >
              <RefreshCw className="w-4 h-4 mr-3" />
              Restart Conversation
            </Button>
            <Button
              variant="outline"
              onClick={handleBackToSetup}
              className="w-full justify-start h-12"
            >
              <Home className="w-4 h-4 mr-3" />
              Back to Setup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setError(null)
                    if (messages.length > 0) {
                      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
                      if (lastUserMessage) {
                        // Remove the last user message and retry
                        setMessages(prev => prev.slice(0, -1))
                        sendMessage(lastUserMessage.content)
                      }
                    }
                  }}
                  className="ml-4"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary text-secondary-foreground rounded-bl-md'
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-bl-md px-4 py-3">
                  <Spinner className="w-4 h-4" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Input */}
      <footer className="sticky bottom-0 bg-background border-t border-border">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your response..."
                disabled={isLoading}
                className="min-h-[52px] max-h-[200px] resize-none pr-4"
                rows={1}
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="h-[52px] w-[52px]"
            >
              {isLoading ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-3">
            {messages.length < 4
              ? `Have at least ${4 - messages.length} more exchange${4 - messages.length === 1 ? '' : 's'} to get feedback`
              : 'Ready to get feedback on your conversation'}
          </p>
        </div>
      </footer>
    </div>
  )
}
