'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Square, MessageSquare, Sparkles, ArrowLeft, AlertCircle, RefreshCw, Home, Share2, Link2, Check, Swords, Trophy, ThumbsUp, Skull, Copy } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// Boss Fight Phase Configuration
const BOSS_FIGHT_PHASES = [
  { name: 'Warmup', color: 'bg-green-500', textColor: 'text-green-500', title: 'The Friendly Recruiter', icon: '👋' },
  { name: 'Technical', color: 'bg-blue-500', textColor: 'text-blue-500', title: 'The Probing Tech Lead', icon: '🔧' },
  { name: 'Pressure', color: 'bg-orange-500', textColor: 'text-orange-500', title: 'The Skeptical Manager', icon: '🔥' },
  { name: 'Final Boss', color: 'bg-red-500', textColor: 'text-red-500', title: 'The Cold VP', icon: '⚔️' },
]

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
  const [linkCopied, setLinkCopied] = useState(false)
  const [currentPhase, setCurrentPhase] = useState(0)
  const [showPhaseTransition, setShowPhaseTransition] = useState(false)
  const [transitionPhase, setTransitionPhase] = useState(0)
  const [hp, setHp] = useState(70)
  const [hpDelta, setHpDelta] = useState<number | null>(null)
  const [isDefeated, setIsDefeated] = useState(false)
  const [showVerdict, setShowVerdict] = useState(false)
  const [verdictCopied, setVerdictCopied] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  const isBossFight = setup.conversationType === 'boss-fight'

  // Calculate phase based on AI message count (every 3 AI messages = new phase)
  const calculatePhase = useCallback((msgs: Message[]) => {
    const aiMessageCount = msgs.filter(m => m.role === 'assistant').length
    return Math.min(Math.floor(aiMessageCount / 3), 3)
  }, [])

  // Get verdict based on HP
  const getVerdict = useCallback((finalHp: number) => {
    if (finalHp >= 70) {
      return {
        result: 'HIRED',
        icon: Trophy,
        emoji: '🏆',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        description: 'Congratulations! You demonstrated excellent interview skills and made a strong impression.',
      }
    } else if (finalHp >= 40) {
      return {
        result: 'STRONG POTENTIAL',
        icon: ThumbsUp,
        emoji: '👍',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20',
        description: 'Good effort! You showed promise but there is room for improvement in some areas.',
      }
    } else {
      return {
        result: 'REJECTED',
        icon: Skull,
        emoji: '💀',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        description: 'The interview did not go well. Review your answers and try again.',
      }
    }
  }, [])

  // Calculate HP change based on answer quality using local heuristics
  const calculateHpChange = useCallback((answer: string): number => {
    const trimmed = answer.trim()
    const wordCount = trimmed.split(/\s+/).length
    const sentenceCount = (trimmed.match(/[.!?]+/g) || []).length
    const hasStructure = /first|second|third|because|therefore|however|for example|specifically|in my experience/i.test(trimmed)
    const hasNumbers = /\d+/.test(trimmed)
    const isVague = /maybe|i think|probably|not sure|i guess|kind of|sort of/i.test(trimmed)
    
    // Very short or vague answers: -10 HP
    if (wordCount < 15 || (wordCount < 30 && isVague)) {
      return -10
    }
    
    // Long, structured answers: +8 HP
    if (wordCount >= 50 && (sentenceCount >= 3 || hasStructure) && (hasNumbers || !isVague)) {
      return 8
    }
    
    // Average answers: +2 HP
    return 2
  }, [])

  // Create a shareable conversation snapshot
  const createShareableLink = useCallback(() => {
    const snapshot = {
      setup: {
        type: setup.conversationType,
        role: setup.userRole,
        personality: setup.aiPersonality,
        goal: setup.userGoal,
      },
      messages: messages.map(m => ({
        r: m.role === 'user' ? 'u' : 'a',
        c: m.content.substring(0, 500), // Limit content length
      })),
      ts: Date.now(),
    }
    
    const encoded = btoa(encodeURIComponent(JSON.stringify(snapshot)))
    const baseUrl = window.location.origin
    return `${baseUrl}/share?data=${encoded}`
  }, [setup, messages])

  const handleCopyLink = useCallback(async () => {
    if (messages.length === 0) {
      toast({
        title: 'No conversation to share',
        description: 'Start a conversation first before sharing.',
      })
      return
    }

    try {
      const link = createShareableLink()
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
      toast({
        title: 'Link copied',
        description: 'Conversation link copied to clipboard.',
      })
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy link to clipboard.',
      })
    }
  }, [messages, createShareableLink, toast])

  const handleShare = useCallback(async () => {
    if (messages.length === 0) {
      toast({
        title: 'No conversation to share',
        description: 'Start a conversation first before sharing.',
      })
      return
    }

    const link = createShareableLink()
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `RealTalk AI - ${conversationTypeLabels[setup.conversationType]} Practice`,
          text: `Check out my conversation practice session!`,
          url: link,
        })
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        if ((err as Error).name !== 'AbortError') {
          handleCopyLink()
        }
      }
    } else {
      // Fallback to copy link
      handleCopyLink()
    }
  }, [messages, createShareableLink, setup.conversationType, toast, handleCopyLink])

  const handleCopyVerdict = useCallback(async () => {
    const verdict = getVerdict(hp)
    const shareText = `I just completed the Boss Fight Interview and got ${verdict.result} with ${hp}% HP ⚔️`
    
    try {
      await navigator.clipboard.writeText(shareText)
      setVerdictCopied(true)
      toast({
        title: 'Copied to clipboard',
        description: 'Share your result with friends!',
      })
      setTimeout(() => setVerdictCopied(false), 2000)
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard.',
      })
    }
  }, [hp, getVerdict, toast])

  const handlePlayAgain = useCallback(() => {
    setShowVerdict(false)
    setMessages([])
    setHp(70)
    setCurrentPhase(0)
    setIsDefeated(false)
    onRestart()
  }, [onRestart])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (userMessage: string, isAutoStart = false) => {
    setError(null)
    setIsLoading(true)

    const newUserMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
    }

    const updatedMessages = [...messages, newUserMessage]
    setMessages(updatedMessages)

    // Calculate HP change for Boss Fight (skip auto-start message)
    if (isBossFight && !isAutoStart && !isDefeated) {
      const hpChange = calculateHpChange(userMessage)
      setHpDelta(hpChange)
      
      setHp(prevHp => {
        const newHp = Math.max(0, Math.min(100, prevHp + hpChange))
        if (newHp === 0) {
          setIsDefeated(true)
          setTimeout(() => setShowVerdict(true), 1500)
        }
        return newHp
      })
      
      // Clear delta display after 1.5 seconds
      setTimeout(() => setHpDelta(null), 1500)
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          setup,
          phase: isBossFight ? currentPhase : undefined,
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

      const newMessages = [...updatedMessages, assistantMessage]
      setMessages(newMessages)

      // Check for phase transition in Boss Fight mode
      if (isBossFight) {
        const newPhase = calculatePhase(newMessages)
        if (newPhase > currentPhase && newPhase <= 3) {
          setTransitionPhase(newPhase)
          setShowPhaseTransition(true)
          setTimeout(() => {
            setCurrentPhase(newPhase)
            setShowPhaseTransition(false)
          }, 2000)
        }
        
        // Check if interview naturally concluded (final phase + enough exchanges)
        const aiMessageCount = newMessages.filter(m => m.role === 'assistant').length
        if (newPhase === 3 && aiMessageCount >= 12 && !isDefeated) {
          // Delay showing verdict to let the final message appear
          setTimeout(() => setShowVerdict(true), 1500)
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong while generating the response. Please try again.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [messages, setup, isBossFight, currentPhase, calculatePhase, calculateHpChange, isDefeated])

  // Auto-start conversation
  useEffect(() => {
    if (messages.length === 0) {
      sendMessage(`Hello, I'm ready to practice this ${conversationTypeLabels[setup.conversationType].toLowerCase()} scenario.`, true)
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
              <h1 className="text-sm font-semibold flex items-center gap-2">
                {isBossFight && <Swords className="w-4 h-4 text-red-500" />}
                {conversationTypeLabels[setup.conversationType]}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isBossFight 
                  ? `${setup.userRole} • Phase ${currentPhase + 1}/4`
                  : `${setup.userRole} • Goal: ${setup.userGoal}`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleShare}
              disabled={messages.length === 0}
              title="Share conversation"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCopyLink}
              disabled={messages.length === 0}
              title="Copy link"
            >
              {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEndModal(true)}
            >
              <Square className="w-3 h-3 mr-1.5" />
              Finish Session
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

      {/* Boss Fight Phase Header */}
      {isBossFight && (
        <div className="bg-card border-b border-border">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold text-white',
                  BOSS_FIGHT_PHASES[currentPhase].color
                )}>
                  PHASE {currentPhase + 1}
                </span>
                <span className={cn('font-semibold', BOSS_FIGHT_PHASES[currentPhase].textColor)}>
                  {BOSS_FIGHT_PHASES[currentPhase].icon} {BOSS_FIGHT_PHASES[currentPhase].name}
                </span>
                <span className="text-muted-foreground text-sm">
                  — {BOSS_FIGHT_PHASES[currentPhase].title}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {BOSS_FIGHT_PHASES.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'w-2.5 h-2.5 rounded-full transition-colors',
                      index <= currentPhase ? BOSS_FIGHT_PHASES[index].color : 'bg-muted'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Boss Fight HP Bar */}
      {isBossFight && (
        <div className="bg-card/50 border-b border-border">
          <div className="max-w-3xl mx-auto px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground w-6">HP</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden relative">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500 ease-out',
                    hp > 60 ? 'bg-green-500' : hp > 30 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  style={{ width: `${hp}%` }}
                />
              </div>
              <div className="flex items-center gap-2 min-w-[80px] justify-end">
                <span className={cn(
                  'text-sm font-bold tabular-nums',
                  hp > 60 ? 'text-green-500' : hp > 30 ? 'text-yellow-500' : 'text-red-500'
                )}>
                  {hp}%
                </span>
                {hpDelta !== null && (
                  <span className={cn(
                    'text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-300',
                    hpDelta > 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {hpDelta > 0 ? '+' : ''}{hpDelta}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase Transition Banner */}
      {showPhaseTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-in fade-in duration-300">
          <div className={cn(
            'text-center px-8 py-6 rounded-2xl border-2 animate-in zoom-in-95 duration-500',
            BOSS_FIGHT_PHASES[transitionPhase].color,
            'border-white/20'
          )}>
            <div className="text-4xl mb-3">{BOSS_FIGHT_PHASES[transitionPhase].icon}</div>
            <div className="text-white text-sm font-medium tracking-wider mb-1">
              PHASE {transitionPhase + 1}
            </div>
            <div className="text-white text-2xl font-bold mb-2">
              {BOSS_FIGHT_PHASES[transitionPhase].name.toUpperCase()}
            </div>
            <div className="text-white/80 text-sm">
              {transitionPhase === 1 && 'Prove your technical skills'}
              {transitionPhase === 2 && 'Survive the heat'}
              {transitionPhase === 3 && 'Face the final challenge'}
            </div>
          </div>
        </div>
      )}

      {/* End Conversation Modal */}
      <Dialog open={showEndModal} onOpenChange={setShowEndModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finish Session</DialogTitle>
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

      {/* Verdict Screen */}
      {isBossFight && showVerdict && (() => {
        const verdict = getVerdict(hp)
        const VerdictIcon = verdict.icon
        return (
          <div className="bg-card border-t border-border">
            <div className="max-w-3xl mx-auto px-4 py-8">
              {/* Main Verdict */}
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">{verdict.emoji}</div>
                <h2 className={cn('text-3xl font-bold mb-2', verdict.color)}>
                  {verdict.result}
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {verdict.description}
                </p>
                <div className={cn('inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full', verdict.bgColor)}>
                  <span className="text-sm font-medium">Final HP:</span>
                  <span className={cn('text-lg font-bold', verdict.color)}>{hp}%</span>
                </div>
              </div>

              {/* Shareable Result Card */}
              <div className={cn(
                'border rounded-xl p-6 mb-6',
                verdict.borderColor,
                verdict.bgColor
              )}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', verdict.bgColor)}>
                      <VerdictIcon className={cn('w-6 h-6', verdict.color)} />
                    </div>
                    <div>
                      <p className="font-semibold">{setup.userRole || 'Candidate'}</p>
                      <p className="text-sm text-muted-foreground">Boss Fight Interview Completed</p>
                    </div>
                  </div>
                  <Swords className="w-5 h-5 text-muted-foreground" />
                </div>
                
                <div className="flex items-center justify-between border-t border-border/50 pt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Result</p>
                    <p className={cn('font-bold', verdict.color)}>{verdict.result}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Final HP</p>
                    <p className={cn('font-bold', verdict.color)}>{hp}%</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleCopyVerdict} variant="outline" className="gap-2">
                  {verdictCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {verdictCopied ? 'Copied!' : 'Share Result'}
                </Button>
                <Button onClick={handlePlayAgain} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Play Again
                </Button>
                <Button onClick={() => onGetFeedback(messages)} disabled={messages.length < 4} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Get Detailed Feedback
                </Button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Input */}
      <footer className="sticky bottom-0 bg-background border-t border-border">
        <div className="max-w-3xl mx-auto px-4 py-4">
          {isBossFight && (isDefeated || showVerdict) ? (
            <div className="text-center py-3 text-muted-foreground text-sm">
              {showVerdict ? 'Interview complete. View your verdict above.' : 'Interview ended. Get feedback or try again.'}
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your response..."
                    disabled={isLoading || isDefeated || showVerdict}
                    className="min-h-[52px] max-h-[200px] resize-none pr-4"
                    rows={1}
                  />
                </div>
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading || isDefeated || showVerdict}
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
            </>
          )}
        </div>
      </footer>
    </div>
  )
}
