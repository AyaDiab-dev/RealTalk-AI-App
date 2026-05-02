'use client'

import { useState } from 'react'
import { SetupScreen } from '@/components/setup-screen'
import { ChatScreen } from '@/components/chat-screen'
import { FeedbackScreen } from '@/components/feedback-screen'
import { ConversationSetup } from '@/lib/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type AppState = 'setup' | 'chat' | 'feedback'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('setup')
  const [setup, setSetup] = useState<ConversationSetup | null>(null)
  const [conversationMessages, setConversationMessages] = useState<Message[]>([])
  const [chatKey, setChatKey] = useState(0)

  const handleStart = (newSetup: ConversationSetup) => {
    setSetup(newSetup)
    setConversationMessages([])
    setChatKey(prev => prev + 1)
    setAppState('chat')
  }

  const handleEndConversation = () => {
    setAppState('setup')
    setSetup(null)
    setConversationMessages([])
  }

  const handleGetFeedback = (messages: Message[]) => {
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
    setChatKey(prev => prev + 1)
    setAppState('chat')
  }

  const handleRestart = () => {
    setConversationMessages([])
    setChatKey(prev => prev + 1)
  }

  if (appState === 'setup') {
    return <SetupScreen onStart={handleStart} />
  }

  if (appState === 'chat' && setup) {
    return (
      <ChatScreen
        key={chatKey}
        setup={setup}
        onEnd={handleEndConversation}
        onGetFeedback={handleGetFeedback}
        onRestart={handleRestart}
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
