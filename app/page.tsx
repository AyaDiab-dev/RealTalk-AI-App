'use client'

import { useState } from 'react'
import { UIMessage } from 'ai'
import { SetupScreen } from '@/components/setup-screen'
import { ChatScreen } from '@/components/chat-screen'
import { FeedbackScreen } from '@/components/feedback-screen'
import { ConversationSetup } from '@/lib/types'

type AppState = 'setup' | 'chat' | 'feedback'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('setup')
  const [setup, setSetup] = useState<ConversationSetup | null>(null)
  const [conversationMessages, setConversationMessages] = useState<UIMessage[]>([])

  const handleStart = (newSetup: ConversationSetup) => {
    setSetup(newSetup)
    setConversationMessages([])
    setAppState('chat')
  }

  const handleEndConversation = () => {
    setAppState('setup')
    setSetup(null)
    setConversationMessages([])
  }

  const handleGetFeedback = (messages: UIMessage[]) => {
    setConversationMessages(messages)
    setAppState('feedback')
  }

  const handleStartNew = () => {
    setSetup(null)
    setConversationMessages([])
    setAppState('setup')
  }

  const handleTryAgain = () => {
    setConversationMessages([])
    setAppState('chat')
  }

  if (appState === 'setup') {
    return <SetupScreen onStart={handleStart} />
  }

  if (appState === 'chat' && setup) {
    return (
      <ChatScreen
        setup={setup}
        onEnd={handleEndConversation}
        onGetFeedback={handleGetFeedback}
      />
    )
  }

  if (appState === 'feedback' && setup) {
    return (
      <FeedbackScreen
        setup={setup}
        messages={conversationMessages}
        onStartNew={handleStartNew}
        onTryAgain={handleTryAgain}
      />
    )
  }

  return <SetupScreen onStart={handleStart} />
}
