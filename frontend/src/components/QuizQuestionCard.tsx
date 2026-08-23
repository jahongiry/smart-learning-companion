import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import type { QuizQuestion } from '../types/quiz'

interface QuizQuestionCardProps {
  question: QuizQuestion
  questionNumber: number
  totalQuestions: number
  selectedOptionId: string | null
  onSelect: (optionId: string) => void
  onPrevious: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
}

export default function QuizQuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedOptionId,
  onSelect,
  onPrevious,
  onNext,
  isFirst,
  isLast,
}: QuizQuestionCardProps) {
  const progress = (questionNumber / totalQuestions) * 100

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
          <span>
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-300">
            {question.difficulty}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h2 className="mb-6 text-lg font-semibold leading-relaxed text-white">{question.prompt}</h2>

      <div className="space-y-3">
        {question.options.map((option) => {
          const isSelected = option.id === selectedOptionId
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                isSelected
                  ? 'border-violet-400/60 bg-violet-500/10 text-white'
                  : 'border-white/10 bg-slate-950/50 text-slate-300 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              {option.text}
              {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-300" />}
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirst}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white disabled:opacity-40 disabled:hover:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedOptionId}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/25 transition hover:opacity-90 disabled:opacity-40"
        >
          {isLast ? 'Submit quiz' : 'Next'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
