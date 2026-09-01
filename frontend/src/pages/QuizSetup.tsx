import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QuizSetupForm from '../components/QuizSetupForm'
import { ApiError } from '../lib/api'
import { generateQuiz } from '../lib/quizApi'
import type { QuizConfig } from '../types/quiz'

export default function QuizSetup() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleGenerate(config: QuizConfig) {
    setError('')
    setIsGenerating(true)
    try {
      const questions = await generateQuiz(config)
      navigate('/quiz/play', { state: { questions, config } })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login', { state: { message: err.message } })
        return
      }
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <section className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-slate-950 shadow-lg shadow-violet-500/30">
            <Sparkles className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-white">Generate a quiz</h1>
          <p className="mt-1 text-sm text-slate-400">Pick a subject and topic, and we&apos;ll build a practice quiz for you.</p>
        </div>

        <QuizSetupForm onGenerate={handleGenerate} isGenerating={isGenerating} error={error} />
      </div>
    </section>
  )
}
