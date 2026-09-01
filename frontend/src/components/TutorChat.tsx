import { MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, getStoredUser } from '../lib/api'
import { sendTutorMessage } from '../lib/tutorApi'
import type { ChatMessage } from '../types/tutor'

export default function TutorChat() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isSending])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isSending) return

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setInput('')
    setError('')
    setIsSending(true)

    try {
      const reply = await sendTutorMessage(nextMessages)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setIsOpen(false)
        navigate('/login', { state: { message: err.message } })
        return
      }
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const user = getStoredUser()
  if (!user) return null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-3 flex h-[28rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-slate-950">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              <p className="text-sm font-semibold text-white">AI Tutor</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 transition hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <p className="text-sm text-slate-400">
                Hi {user.name}! Ask me anything about your maths or science work — I know how you&apos;ve been
                doing so far.
              </p>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'ml-auto bg-violet-500/20 text-white'
                    : 'bg-white/5 text-slate-200'
                }`}
              >
                {message.content}
              </div>
            ))}
            {isSending && (
              <div className="max-w-[85%] rounded-2xl bg-white/5 px-3.5 py-2 text-sm text-slate-400">
                Thinking…
              </div>
            )}
            {error && <p className="text-sm text-rose-400">{error}</p>}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-white/10 p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="flex-1 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-950 transition hover:opacity-90 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-slate-950 shadow-lg shadow-violet-500/30 transition hover:opacity-90"
        aria-label={isOpen ? 'Close AI tutor chat' : 'Open AI tutor chat'}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  )
}
