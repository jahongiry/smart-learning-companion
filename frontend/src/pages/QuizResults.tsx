import { CheckCircle2, RotateCcw, Trophy, XCircle } from 'lucide-react'
import { Navigate, useLocation, Link } from 'react-router-dom'
import type { QuizResult } from '../types/quiz'

interface QuizResultsState {
  result: QuizResult
}

export default function QuizResults() {
  const location = useLocation()
  const state = location.state as QuizResultsState | null

  if (!state?.result) {
    return <Navigate to="/quiz" replace />
  }

  const { result } = state

  return (
    <section className="flex flex-1 justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-slate-950 shadow-lg shadow-violet-500/30">
            <Trophy className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-white">
            You scored {result.scorePercent}%
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {result.correctCount} out of {result.totalQuestions} questions correct.
          </p>
        </div>

        <div className="space-y-4">
          {result.answers.map(({ question, selectedOptionId, isCorrect }, index) => (
            <div
              key={question.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <p className="text-sm font-medium text-white">
                  {index + 1}. {question.prompt}
                </p>
                {isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-rose-400" />
                )}
              </div>

              <div className="space-y-1.5 text-sm">
                {!isCorrect && (
                  <p className="text-rose-400">
                    Your answer:{' '}
                    {question.options.find((o) => o.id === selectedOptionId)?.text ?? 'No answer selected'}
                  </p>
                )}
                <p className="text-emerald-400">
                  Correct answer: {question.options.find((o) => o.id === question.correctOptionId)?.text}
                </p>
                <p className="text-slate-400">{question.explanation}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            to="/quiz"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/25 transition hover:opacity-90"
          >
            <RotateCcw className="h-4 w-4" />
            Try another quiz
          </Link>
        </div>
      </div>
    </section>
  )
}
