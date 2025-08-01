'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Lightbulb,
  Calculator,
  FileText,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowLeft,
  Sparkles,
  Copy,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  context?: {
    permitId?: string
    projectId?: string
  }
}

interface QuickPrompt {
  id: string
  title: string
  prompt: string
  icon: any
  category: 'estimation' | 'permits' | 'planning' | 'regulations'
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: '1',
    title: 'Cost Estimation Help',
    prompt: 'Help me estimate costs for a commercial renovation project. What factors should I consider?',
    icon: Calculator,
    category: 'estimation'
  },
  {
    id: '2',
    title: 'Permit Requirements',
    prompt: 'What permits do I need for electrical work in a residential building in California?',
    icon: FileText,
    category: 'permits'
  },
  {
    id: '3',
    title: 'Project Planning',
    prompt: 'How should I plan the timeline for a multi-phase construction project?',
    icon: Building,
    category: 'planning'
  },
  {
    id: '4',
    title: 'Safety Regulations',
    prompt: 'What are the key OSHA safety requirements for construction sites in 2024?',
    icon: AlertTriangle,
    category: 'regulations'
  },
  {
    id: '5',
    title: 'Bidding Strategy',
    prompt: 'How should I price my bid to be competitive while maintaining profitability?',
    icon: Lightbulb,
    category: 'planning'
  },
  {
    id: '6',
    title: 'Material Specifications',
    prompt: 'What are the current best practices for sustainable construction materials?',
    icon: CheckCircle,
    category: 'planning'
  }
]

export default function ConstructionAssistantPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Initialize with welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm Claude, your AI construction assistant. I'm here to help NAMC members with:

🏗️ **Project Planning & Analysis**
📊 **Cost Estimation & Budgeting**  
📋 **Permit Requirements & Regulations**
🔧 **Technical Specifications & Best Practices**
💼 **Business Strategy & Bidding**
⚡ **Industry Trends & Market Intelligence**

What construction challenge can I help you solve today?`,
      timestamp: new Date()
    }
    setMessages([welcomeMessage])

    // Focus input
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async (messageContent?: string) => {
    const content = messageContent || currentMessage.trim()
    if (!content || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    setIsLoading(true)

    try {
      // Call the Claude API
      const response = await fetch('/api/construction-assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          conversationId,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
      
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
    // Could add a toast notification here
  }

  const formatMessageContent = (content: string) => {
    // Simple formatting for better readability
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/🏗️|📊|📋|🔧|💼|⚡/g, '<span class="text-lg">$&</span>')
      .split('\n')
      .map((line, index) => (
        <div key={index} className={line.trim() === '' ? 'h-2' : ''}>
          <span dangerouslySetInnerHTML={{ __html: line }} />
        </div>
      ))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">AI Construction Assistant</h1>
                  <p className="text-sm text-gray-600">Claude • Expert construction knowledge at your fingertips</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Quick Prompts Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  <span>Quick Prompts</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {QUICK_PROMPTS.map((prompt) => {
                    const Icon = prompt.icon
                    return (
                      <button
                        key={prompt.id}
                        onClick={() => sendMessage(prompt.prompt)}
                        disabled={isLoading}
                        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-start space-x-2">
                          <Icon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {prompt.title}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {prompt.prompt.slice(0, 60)}...
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <Card className="h-[calc(100vh-200px)] flex flex-col">
              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className={`flex space-x-4 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="flex-shrink-0">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                              <Bot className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        )}
                        
                        <div className={`max-w-3xl ${
                          message.role === 'user' ? 'order-first' : ''
                        }`}>
                          <div className={`rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white ml-auto'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <div className="text-sm leading-relaxed">
                              {formatMessageContent(message.content)}
                            </div>
                          </div>
                          
                          <div className={`flex items-center mt-2 space-x-2 text-xs text-gray-500 ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}>
                            <span>{message.timestamp.toLocaleTimeString()}</span>
                            {message.role === 'assistant' && (
                              <>
                                <button
                                  onClick={() => copyToClipboard(message.content)}
                                  className="hover:text-gray-700 transition-colors"
                                  title="Copy message"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  className="hover:text-green-600 transition-colors"
                                  title="Helpful response"
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                </button>
                                <button
                                  className="hover:text-red-600 transition-colors"
                                  title="Not helpful"
                                >
                                  <ThumbsDown className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {message.role === 'user' && (
                          <div className="flex-shrink-0">
                            <div className="p-2 bg-gray-300 rounded-full">
                              <User className="w-5 h-5 text-gray-600" />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Loading indicator */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex space-x-4"
                    >
                      <div className="flex-shrink-0">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="bg-gray-100 rounded-2xl px-4 py-3">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Input Area */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Input
                      ref={inputRef}
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about construction projects, permits, costs, regulations..."
                      disabled={isLoading}
                      className="w-full"
                    />
                  </div>
                  <Button
                    onClick={() => sendMessage()}
                    disabled={!currentMessage.trim() || isLoading}
                    className="flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </Button>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Claude is powered by AI and may make mistakes. Always verify important construction information.
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}