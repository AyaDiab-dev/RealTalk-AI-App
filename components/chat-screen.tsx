'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, UIMessage } from 'ai'
import { Send, Square, MessageSquare, Sparkles, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ConversationSetup, conversationTypeLabels } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'

interface ChatScreenProps {
  setup: ConversationSetup
  onEnd: () => void
  onGetFeedback: (messages: UIMessage[]) => void
}

function getMessageText(message: UIMessage): string {
  if (!message.parts || !Array.isArray(message.parts)) return ''
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export function ChatScreen({ setup, onEnd, onGetFeedback }: ChatScreenProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          id,
          messages,
          setup,
        },
      }),
    }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-start conversation
  useEffect(() => {
    if (messages.length === 0) {
      sendMessage({ text: `Hello, I'm ready to practice this ${conversationTypeLabels[setup.conversationType].toLowerCase()} scenario.` })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input.trim() })
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onEnd}
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
              onClick={onEnd}
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

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
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
                  {getMessageText(message)}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
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
            {isLoading ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={stop}
                className="h-[52px] w-[52px]"
              >
                <Square className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                className="h-[52px] w-[52px]"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
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
